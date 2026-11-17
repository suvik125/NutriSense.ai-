// Pure mapping helpers between Supabase snake_case rows and NutriSense camelCase state

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];

export function deriveInitials(name, fallback = 'NS') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  return initials || fallback;
}

export function mapUserProfileToRow(userId, state) {
  return {
    user_id: userId,
    name: state.profile.name,
    email: state.profile.email,
    avatar_initials: state.profile.avatarInitials || deriveInitials(state.profile.name),
    theme: state.theme === 'light' ? 'light' : 'dark',
    illness_mode: state.profile.illnessMode || 'none',
    selected_planner_day: state.selectedPlannerDay || 'Wed',
    chart_range_days: state.chartRangeDays === 30 ? 30 : 7,
  };
}

export function mapHealthProfileToRow(userId, profile) {
  const bio = profile.biometrics || {};
  return {
    user_id: userId,
    age: Number(bio.age) || 29,
    gender: bio.gender || 'male',
    height_cm: Number(bio.heightCm) || 178,
    weight_kg: Number(bio.weightKg) || 76,
    height_unit: bio.heightUnit === 'ft' ? 'ft' : 'cm',
    weight_unit: bio.weightUnit === 'lb' ? 'lb' : 'kg',
    job_type: bio.jobType || 'desk',
    activity_level: bio.activityLevel || 'moderate',
    goal: bio.goal || 'recomp',
    health_conditions: Array.isArray(profile.healthConditions) ? profile.healthConditions : [],
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
  };
}

export function mapHealthRowToState(row) {
  return {
    biometrics: {
      age: Number(row.age),
      gender: row.gender,
      heightCm: Number(row.height_cm),
      weightKg: Number(row.weight_kg),
      heightUnit: row.height_unit,
      weightUnit: row.weight_unit,
      jobType: row.job_type,
      activityLevel: row.activity_level,
      goal: row.goal,
    },
    healthConditions: Array.isArray(row.health_conditions) ? row.health_conditions : [],
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
  };
}

export function mapTargetsToRow(userId, targets) {
  return {
    user_id: userId,
    bmr: Math.round(Number(targets.bmr) || 1700),
    tdee: Math.round(Number(targets.tdee) || 2500),
    target_calories: Math.max(1200, Math.round(Number(targets.targetCalories) || 2200)),
    bmi: Number(targets.bmi) || 24.0,
    bmi_category: targets.bmiCategory || 'Healthy Weight',
    bmi_gauge_percent: Math.max(0, Math.min(100, Math.round(Number(targets.bmiGaugePercent) || 36))),
    protein_g: Math.round(Number(targets.proteinG) || 150),
    carbs_g: Math.round(Number(targets.carbsG) || 220),
    fat_g: Math.round(Number(targets.fatG) || 68),
    fiber_g: Math.round(Number(targets.fiberG) || 30),
    iron_mg: Math.round(Number(targets.ironMg) || 8),
    calcium_mg: Math.round(Number(targets.calciumMg) || 1000),
    vitamin_d_mcg: Math.round(Number(targets.vitaminDMcg) || 15),
    sodium_mg: Math.round(Number(targets.sodiumMg) || 2300),
  };
}

export function mapTargetsRowToState(row) {
  return {
    bmr: Number(row.bmr),
    tdee: Number(row.tdee),
    targetCalories: Number(row.target_calories),
    bmi: Number(row.bmi),
    bmiCategory: row.bmi_category,
    bmiGaugePercent: Number(row.bmi_gauge_percent),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    fiberG: Number(row.fiber_g),
    ironMg: Number(row.iron_mg),
    calciumMg: Number(row.calcium_mg),
    vitaminDMcg: Number(row.vitamin_d_mcg),
    sodiumMg: Number(row.sodium_mg),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapMealPlanItemsToRows(userId, mealPlanId, daysObj) {
  const rows = [];
  DAYS.forEach((day) => {
    const dayMeals = daysObj?.[day] || {};
    SLOTS.forEach((slot) => {
      const meal = dayMeals[slot];
      if (!meal) return;
      rows.push({
        meal_plan_id: mealPlanId,
        user_id: userId,
        day_of_week: day,
        meal_slot: slot,
        catalog_meal_id: meal.id || `${day}-${slot}`,
        name: meal.name,
        calories: Math.round(Number(meal.calories) || 0),
        protein_g: Math.round(Number(meal.proteinG) || 0),
        carbs_g: Math.round(Number(meal.carbsG) || 0),
        fat_g: Math.round(Number(meal.fatG) || 0),
        fiber_g: Math.round(Number(meal.fiberG) || 0),
        portion: meal.portion || '1 serving',
        image_url: meal.image || '',
        allergens: Array.isArray(meal.allergens) ? meal.allergens : [],
        prep_mins: Math.round(Number(meal.prepMins) || 15),
        tags: Array.isArray(meal.tags) ? meal.tags : [],
      });
    });
  });
  return rows;
}

export function mapMealPlanRowsToState(planRow, itemRows = []) {
  const days = {};
  DAYS.forEach((day) => {
    days[day] = {};
  });
  itemRows.forEach((row) => {
    if (!days[row.day_of_week]) days[row.day_of_week] = {};
    days[row.day_of_week][row.meal_slot] = {
      id: row.catalog_meal_id,
      name: row.name,
      calories: Number(row.calories),
      proteinG: Number(row.protein_g),
      carbsG: Number(row.carbs_g),
      fatG: Number(row.fat_g),
      fiberG: Number(row.fiber_g),
      portion: row.portion,
      image: row.image_url,
      allergens: Array.isArray(row.allergens) ? row.allergens : [],
      prepMins: Number(row.prep_mins),
      tags: Array.isArray(row.tags) ? row.tags : [],
    };
  });
  return {
    id: planRow.id,
    days,
    adaptedForIllness: planRow.adapted_for_illness || 'none',
    wellnessSummary: planRow.wellness_summary || '',
    generatedAt: planRow.generated_at || new Date().toISOString(),
  };
}

export function mapFoodLogToRow(userId, entry) {
  return {
    user_id: userId,
    name: entry.name,
    meal_type: entry.mealType || 'Lunch',
    calories: Math.round(Number(entry.calories) || 0),
    protein_g: Math.round(Number(entry.proteinG) || 0),
    carbs_g: Math.round(Number(entry.carbsG) || 0),
    fat_g: Math.round(Number(entry.fatG) || 0),
    fiber_g: Math.round(Number(entry.fiberG) || 0),
    portion: entry.portion || '1 serving',
    image_url: entry.image || '',
    confidence: Math.round(Number(entry.confidence) || 92),
    allergens: Array.isArray(entry.allergens) ? entry.allergens : [],
    logged_date: entry.dateISO,
    time_label: entry.timeLabel || '',
    source: entry.source || 'Photo Scan',
  };
}

export function mapFoodLogRowToState(row) {
  return {
    id: row.id,
    name: row.name,
    mealType: row.meal_type,
    calories: Number(row.calories),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    fiberG: Number(row.fiber_g),
    portion: row.portion,
    image: row.image_url,
    confidence: Number(row.confidence),
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    dateISO: row.logged_date,
    timeLabel: row.time_label,
    source: row.source,
  };
}

export function mapNotifPrefsToRow(userId, prefs) {
  return {
    user_id: userId,
    meal_reminders: Boolean(prefs.mealReminders),
    hydration_alerts: Boolean(prefs.hydrationAlerts),
    weekly_summary: Boolean(prefs.weeklySummary),
    illness_checkins: Boolean(prefs.illnessCheckins),
    quiet_hours_enabled: Boolean(prefs.quietHoursEnabled),
    quiet_start: prefs.quietStart || '22:00',
    quiet_end: prefs.quietEnd || '07:00',
    breakfast_time: prefs.mealTimes?.Breakfast || '08:00',
    lunch_time: prefs.mealTimes?.Lunch || '12:45',
    snack_time: prefs.mealTimes?.Snack || '16:00',
    dinner_time: prefs.mealTimes?.Dinner || '19:00',
  };
}

export function mapNotifPrefsRowToState(row) {
  return {
    mealReminders: Boolean(row.meal_reminders),
    hydrationAlerts: Boolean(row.hydration_alerts),
    weeklySummary: Boolean(row.weekly_summary),
    illnessCheckins: Boolean(row.illness_checkins),
    quietHoursEnabled: Boolean(row.quiet_hours_enabled),
    quietStart: row.quiet_start || '22:00',
    quietEnd: row.quiet_end || '07:00',
    mealTimes: {
      Breakfast: row.breakfast_time || '08:00',
      Lunch: row.lunch_time || '12:45',
      Snack: row.snack_time || '16:00',
      Dinner: row.dinner_time || '19:00',
    },
  };
}

export function mapNotificationRowToState(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    category: row.category,
    timeLabel: row.time_label || 'Just now',
    read: Boolean(row.is_read),
  };
}

export function mapChatRowToState(row) {
  return {
    id: row.id,
    role: row.role,
    text: row.message_text,
    timeLabel: row.time_label || 'Now',
  };
}
