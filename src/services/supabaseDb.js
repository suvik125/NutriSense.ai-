import { supabase } from '../supabaseClient.js';
import {
  deriveInitials,
  mapChatRowToState,
  mapFoodLogRowToState,
  mapFoodLogToRow,
  mapHealthProfileToRow,
  mapHealthRowToState,
  mapMealPlanItemsToRows,
  mapMealPlanRowsToState,
  mapNotifPrefsRowToState,
  mapNotifPrefsToRow,
  mapNotificationRowToState,
  mapTargetsRowToState,
  mapTargetsToRow,
  mapUserProfileToRow,
} from '../utils/dbMappers.js';

function assertNoError(error, context) {
  if (!error) return;
  const code = error.code ? ` (${error.code})` : '';
  throw new Error(`${context}: ${error.message || 'Database request failed'}${code}`);
}

/**
 * Loads all user-specific workspace records from Supabase after authentication.
 * Automatically seeds missing 1:1 records for newly created users.
 */
export async function fetchUserWorkspace(user, defaults) {
  const userId = user.id;
  const fallbackName = (
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    defaults.profile.name ||
    'Member'
  ).trim();
  const fallbackEmail = user.email || defaults.profile.email;

  const [
    profileRes,
    healthRes,
    targetsRes,
    planRes,
    foodLogsRes,
    prefsRes,
    notifsRes,
    chatRes,
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_health_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('nutrition_targets').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('meal_plans').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  assertNoError(profileRes.error, 'Failed to load user profile');
  assertNoError(healthRes.error, 'Failed to load health profile');
  assertNoError(targetsRes.error, 'Failed to load nutrition targets');
  assertNoError(planRes.error, 'Failed to load meal plan');
  assertNoError(foodLogsRes.error, 'Failed to load food logs');
  assertNoError(prefsRes.error, 'Failed to load notification preferences');
  assertNoError(notifsRes.error, 'Failed to load notifications');
  assertNoError(chatRes.error, 'Failed to load AI chat history');

  // 1. User Profile
  let profileRow = profileRes.data;
  if (!profileRow) {
    const initialProfileState = {
      ...defaults,
      profile: {
        ...defaults.profile,
        name: fallbackName,
        email: fallbackEmail,
        avatarInitials: deriveInitials(fallbackName),
      },
    };
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(mapUserProfileToRow(userId, initialProfileState), { onConflict: 'user_id' })
      .select()
      .single();
    assertNoError(error, 'Failed to initialize user profile');
    profileRow = data;
  }

  // 2. Health Profile
  let healthRow = healthRes.data;
  if (!healthRow) {
    const { data, error } = await supabase
      .from('user_health_profiles')
      .upsert(mapHealthProfileToRow(userId, defaults.profile), { onConflict: 'user_id' })
      .select()
      .single();
    assertNoError(error, 'Failed to initialize health profile');
    healthRow = data;
  }

  // 3. Nutrition Targets
  let targetsRow = targetsRes.data;
  if (!targetsRow) {
    const { data, error } = await supabase
      .from('nutrition_targets')
      .upsert(mapTargetsToRow(userId, defaults.nutritionTargets), { onConflict: 'user_id' })
      .select()
      .single();
    assertNoError(error, 'Failed to initialize nutrition targets');
    targetsRow = data;
  }

  // 4. Meal Plan + 28 Meal Plan Items
  let planRow = planRes.data;
  let planItemRows = [];
  if (!planRow) {
    const seededPlan = await upsertMealPlanAndItems(userId, defaults.mealPlan);
    planRow = {
      id: seededPlan.id,
      adapted_for_illness: seededPlan.adaptedForIllness,
      wellness_summary: seededPlan.wellnessSummary,
      generated_at: seededPlan.generatedAt,
    };
    const { data: seededItems, error: itemsErr } = await supabase
      .from('meal_plan_items')
      .select('*')
      .eq('meal_plan_id', planRow.id);
    assertNoError(itemsErr, 'Failed to read initialized meal plan items');
    planItemRows = seededItems || [];
  } else {
    const { data: items, error: itemsErr } = await supabase
      .from('meal_plan_items')
      .select('*')
      .eq('meal_plan_id', planRow.id);
    assertNoError(itemsErr, 'Failed to load meal plan items');
    planItemRows = items || [];

    if (planItemRows.length === 0) {
      await upsertMealPlanItemsOnly(userId, planRow.id, defaults.mealPlan.days);
      const { data: refetchedItems, error: refetchErr } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', planRow.id);
      assertNoError(refetchErr, 'Failed to reload meal plan items');
      planItemRows = refetchedItems || [];
    }
  }

  // 5. Notification Preferences
  let prefsRow = prefsRes.data;
  if (!prefsRow) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(mapNotifPrefsToRow(userId, defaults.notificationPrefs), { onConflict: 'user_id' })
      .select()
      .single();
    assertNoError(error, 'Failed to initialize notification preferences');
    prefsRow = data;
  }

  // 6. Welcome Notification (only if user has zero notifications yet)
  let notifRows = notifsRes.data || [];
  if (notifRows.length === 0) {
    const welcomeNotif = await insertNotification(userId, {
      title: `Welcome to NutriSense, ${profileRow.name.split(' ')[0]}`,
      message: 'Your nutrition profile, adaptive weekly plan, and food log workspace are synced.',
      category: 'Account',
      timeLabel: 'Just now',
    });
    notifRows = [welcomeNotif];
  } else {
    notifRows = notifRows.map(mapNotificationRowToState);
  }

  // 7. Welcome AI Chat Message (only if conversation is empty)
  let chatRows = chatRes.data || [];
  if (chatRows.length === 0) {
    const initialChat = defaults.chatHistory[0] || {
      role: 'assistant',
      text: 'Hello! Ask me about macro targets, gentle foods when feeling unwell, or sodium and fiber balance. Nutrition estimates are informational and not medical advice.',
      timeLabel: 'Now',
    };
    const savedMsg = await insertChatMessage(userId, initialChat);
    chatRows = [savedMsg];
  } else {
    chatRows = chatRows.map(mapChatRowToState);
  }

  const healthState = mapHealthRowToState(healthRow);
  const mealPlan = mapMealPlanRowsToState(planRow, planItemRows);

  return {
    theme: profileRow.theme === 'light' ? 'light' : 'dark',
    selectedPlannerDay: profileRow.selected_planner_day || 'Wed',
    chartRangeDays: profileRow.chart_range_days === 30 ? 30 : 7,
    profile: {
      id: userId,
      name: profileRow.name || fallbackName,
      email: profileRow.email || fallbackEmail,
      avatarInitials: profileRow.avatar_initials || deriveInitials(profileRow.name || fallbackName),
      illnessMode: profileRow.illness_mode || 'none',
      biometrics: healthState.biometrics,
      healthConditions: healthState.healthConditions,
      allergies: healthState.allergies,
    },
    nutritionTargets: mapTargetsRowToState(targetsRow),
    mealPlan,
    foodLogs: (foodLogsRes.data || []).map(mapFoodLogRowToState),
    notificationPrefs: mapNotifPrefsRowToState(prefsRow),
    notifications: notifRows,
    chatHistory: chatRows,
  };
}

export async function updateUserProfileFields(userId, fields) {
  const { error } = await supabase
    .from('user_profiles')
    .update(fields)
    .eq('user_id', userId);
  assertNoError(error, 'Failed to update profile settings');
}

export async function upsertProfileHealthAndTargets(userId, state) {
  const [profileRes, healthRes, targetsRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .upsert(mapUserProfileToRow(userId, state), { onConflict: 'user_id' }),
    supabase
      .from('user_health_profiles')
      .upsert(mapHealthProfileToRow(userId, state.profile), { onConflict: 'user_id' }),
    supabase
      .from('nutrition_targets')
      .upsert(mapTargetsToRow(userId, state.nutritionTargets), { onConflict: 'user_id' }),
  ]);

  assertNoError(profileRes.error, 'Failed to save user profile');
  assertNoError(healthRes.error, 'Failed to save health profile');
  assertNoError(targetsRes.error, 'Failed to save nutrition targets');
}

async function upsertMealPlanItemsOnly(userId, mealPlanId, daysObj) {
  const itemRows = mapMealPlanItemsToRows(userId, mealPlanId, daysObj);
  if (itemRows.length === 0) return;
  const { error } = await supabase
    .from('meal_plan_items')
    .upsert(itemRows, { onConflict: 'meal_plan_id,day_of_week,meal_slot' });
  assertNoError(error, 'Failed to save meal plan items');
}

export async function upsertMealPlanAndItems(userId, mealPlan) {
  const { data: planRow, error: planErr } = await supabase
    .from('meal_plans')
    .upsert(
      {
        user_id: userId,
        adapted_for_illness: mealPlan.adaptedForIllness || 'none',
        wellness_summary: mealPlan.wellnessSummary || '',
        generated_at: mealPlan.generatedAt || new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  assertNoError(planErr, 'Failed to save meal plan');
  await upsertMealPlanItemsOnly(userId, planRow.id, mealPlan.days);
  return { ...mealPlan, id: planRow.id };
}

export async function upsertMealPlanDayItems(userId, mealPlanId, dayOfWeek, dayMeals, generatedAt) {
  const daysSubset = { [dayOfWeek]: dayMeals };
  const itemRows = mapMealPlanItemsToRows(userId, mealPlanId, daysSubset);
  const [planRes, itemsRes] = await Promise.all([
    supabase
      .from('meal_plans')
      .update({ generated_at: generatedAt || new Date().toISOString() })
      .eq('id', mealPlanId)
      .eq('user_id', userId),
    supabase
      .from('meal_plan_items')
      .upsert(itemRows, { onConflict: 'meal_plan_id,day_of_week,meal_slot' }),
  ]);
  assertNoError(planRes.error, 'Failed to update meal plan timestamp');
  assertNoError(itemsRes.error, 'Failed to save day meal items');
}

export async function upsertSingleMealPlanItem(userId, mealPlanId, dayOfWeek, slot, meal) {
  const rows = mapMealPlanItemsToRows(userId, mealPlanId, {
    [dayOfWeek]: { [slot]: meal },
  });
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('meal_plan_items')
    .upsert(rows[0], { onConflict: 'meal_plan_id,day_of_week,meal_slot' });
  assertNoError(error, 'Failed to swap meal item');
}

export async function insertFoodLog(userId, entry) {
  const payload = mapFoodLogToRow(userId, entry);
  const { data, error } = await supabase
    .from('food_logs')
    .insert(payload)
    .select()
    .single();
  assertNoError(error, 'Failed to log food entry');
  return mapFoodLogRowToState(data);
}

export async function deleteFoodLogRow(userId, logId) {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId);
  assertNoError(error, 'Failed to delete food log entry');
}

export async function upsertNotificationPrefs(userId, prefs) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(mapNotifPrefsToRow(userId, prefs), { onConflict: 'user_id' });
  assertNoError(error, 'Failed to save notification preferences');
}

export async function insertNotification(userId, item) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: item.title,
      message: item.message,
      category: item.category || 'System',
      time_label: item.timeLabel || 'Just now',
      is_read: Boolean(item.read),
    })
    .select()
    .single();
  assertNoError(error, 'Failed to save notification');
  return mapNotificationRowToState(data);
}

export async function markAllNotificationsReadRows(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  assertNoError(error, 'Failed to mark notifications as read');
}

export async function insertChatMessage(userId, msg) {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      user_id: userId,
      role: msg.role === 'user' ? 'user' : 'assistant',
      message_text: msg.text,
      time_label: msg.timeLabel || 'Now',
    })
    .select()
    .single();
  assertNoError(error, 'Failed to save chat message');
  return mapChatRowToState(data);
}
