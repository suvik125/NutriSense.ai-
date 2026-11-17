import test from 'node:test';
import assert from 'node:assert/strict';
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
} from './dbMappers.js';

test('deriveInitials extracts up to two uppercase initials', () => {
  assert.equal(deriveInitials('Alex Mercer'), 'AM');
  assert.equal(deriveInitials('Maya'), 'M');
  assert.equal(deriveInitials(''), 'NS');
});

test('health profile round-trip mapping preserves biometrics, conditions, and allergies', () => {
  const profile = {
    biometrics: {
      age: 31,
      gender: 'female',
      heightCm: 168.5,
      weightKg: 62.5,
      heightUnit: 'ft',
      weightUnit: 'lb',
      jobType: 'standing',
      activityLevel: 'very',
      goal: 'lose',
    },
    healthConditions: ['Hypertension', 'Anemia'],
    allergies: ['Dairy', 'Fish'],
  };

  const row = mapHealthProfileToRow('user-123', profile);
  assert.equal(row.user_id, 'user-123');
  assert.equal(row.height_unit, 'ft');
  assert.deepEqual(row.allergies, ['Dairy', 'Fish']);

  const roundTrip = mapHealthRowToState(row);
  assert.deepEqual(roundTrip, profile);
});

test('nutrition targets round-trip preserves all macro and micro values', () => {
  const targets = {
    bmr: 1719,
    tdee: 2664,
    targetCalories: 2514,
    bmi: 24.0,
    bmiCategory: 'Healthy Weight',
    bmiGaugePercent: 36,
    proteinG: 220,
    carbsG: 239,
    fatG: 75,
    fiberG: 35,
    ironMg: 8,
    calciumMg: 1000,
    vitaminDMcg: 15,
    sodiumMg: 2300,
  };

  const row = mapTargetsToRow('user-1', targets);
  const state = mapTargetsRowToState({ ...row, updated_at: '2026-11-14T10:00:00Z' });
  assert.equal(state.targetCalories, 2514);
  assert.equal(state.sodiumMg, 2300);
  assert.equal(state.bmi, 24.0);
});

test('meal plan items flatten 7x4 schedule and reconstruct weekly structure', () => {
  const sampleMeal = {
    id: 'bk-avo-eggs',
    name: 'Avocado Sourdough & Poached Eggs',
    calories: 440,
    proteinG: 22,
    carbsG: 34,
    fatG: 24,
    fiberG: 8,
    portion: '2 slices',
    image: '/img/avo.jpg',
    allergens: ['Gluten', 'Eggs'],
    prepMins: 12,
    tags: ['Balanced'],
  };
  const days = {
    Mon: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
    Tue: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
    Wed: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
    Thu: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
    Fri: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
    Sat: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
    Sun: { breakfast: sampleMeal, lunch: sampleMeal, snack: sampleMeal, dinner: sampleMeal },
  };

  const rows = mapMealPlanItemsToRows('u1', 'plan-1', days);
  assert.equal(rows.length, 28);
  assert.equal(rows[0].meal_plan_id, 'plan-1');
  assert.equal(rows[0].catalog_meal_id, 'bk-avo-eggs');

  const reconstructed = mapMealPlanRowsToState(
    { id: 'plan-1', adapted_for_illness: 'cold', wellness_summary: 'Warm soups' },
    rows
  );
  assert.equal(reconstructed.id, 'plan-1');
  assert.equal(reconstructed.adaptedForIllness, 'cold');
  assert.equal(reconstructed.days.Wed.dinner.name, 'Avocado Sourdough & Poached Eggs');
});

test('food log, notification preferences, notifications, and chat mappers map cleanly', () => {
  const logRow = mapFoodLogToRow('u1', {
    name: 'Grilled Salmon',
    mealType: 'Dinner',
    calories: 525,
    proteinG: 44,
    carbsG: 22,
    fatG: 28,
    fiberG: 6,
    portion: '1 fillet',
    image: '/salmon.jpg',
    confidence: 94,
    allergens: ['Fish'],
    dateISO: '2026-11-14',
    timeLabel: '07:20 PM',
    source: 'Photo Scan',
  });
  const mappedLog = mapFoodLogRowToState({ id: 'log-uuid-1', ...logRow });
  assert.equal(mappedLog.id, 'log-uuid-1');
  assert.equal(mappedLog.proteinG, 44);
  assert.deepEqual(mappedLog.allergens, ['Fish']);

  const prefsRow = mapNotifPrefsToRow('u1', {
    mealReminders: true,
    hydrationAlerts: false,
    weeklySummary: true,
    illnessCheckins: true,
    quietHoursEnabled: false,
    quietStart: '23:00',
    quietEnd: '06:30',
    mealTimes: { Breakfast: '07:30', Lunch: '13:00', Snack: '16:30', Dinner: '19:30' },
  });
  const mappedPrefs = mapNotifPrefsRowToState(prefsRow);
  assert.equal(mappedPrefs.hydrationAlerts, false);
  assert.equal(mappedPrefs.mealTimes.Dinner, '19:30');

  const notif = mapNotificationRowToState({
    id: 'n1',
    title: 'Saved',
    message: 'Synced',
    category: 'Account',
    time_label: 'Just now',
    is_read: false,
  });
  assert.equal(notif.read, false);

  const chat = mapChatRowToState({
    id: 'c1',
    role: 'assistant',
    message_text: 'Hello!',
    time_label: 'Now',
  });
  assert.equal(chat.text, 'Hello!');
});
