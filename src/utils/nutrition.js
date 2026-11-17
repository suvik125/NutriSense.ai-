// Pure nutrition, biometric, allergy-matching, and log-aggregation logic (ES6+)

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

export const JOB_ADJUSTMENTS = {
  desk: 0,
  light_active: 75,
  standing: 160,
  physical: 300,
};

export const GOAL_ADJUSTMENTS = {
  lose: { delta: -450, proteinRatio: 0.34, carbRatio: 0.36, fatRatio: 0.30, label: 'Fat Loss' },
  maintain: { delta: 0, proteinRatio: 0.28, carbRatio: 0.44, fatRatio: 0.28, label: 'Maintenance' },
  gain: { delta: 350, proteinRatio: 0.30, carbRatio: 0.45, fatRatio: 0.25, label: 'Lean Muscle' },
  recomp: { delta: -150, proteinRatio: 0.35, carbRatio: 0.38, fatRatio: 0.27, label: 'Body Recomp' },
};

export function ftInToCm(feet, inches = 0) {
  const totalInches = Math.max(0, Number(feet) || 0) * 12 + Math.max(0, Number(inches) || 0);
  return Math.round(totalInches * 2.54 * 10) / 10;
}

export function cmToFtIn(cm) {
  const safeCm = Math.max(0, Number(cm) || 0);
  const totalInches = Math.round(safeCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

export function lbToKg(lb) {
  return Math.round(Math.max(0, Number(lb) || 0) * 0.45359237 * 10) / 10;
}

export function kgToLb(kg) {
  return Math.round(Math.max(0, Number(kg) || 0) * 2.20462262 * 10) / 10;
}

/**
 * Mifflin-St Jeor Equation
 * Male:   10*weight(kg) + 6.25*height(cm) - 5*age + 5
 * Female: 10*weight(kg) + 6.25*height(cm) - 5*age - 161
 * Other:  midpoint (-78)
 */
export function calculateBMR({ age, gender, heightCm, weightKg }) {
  const w = Math.max(30, Number(weightKg) || 70);
  const h = Math.max(100, Number(heightCm) || 170);
  const a = Math.max(13, Math.min(100, Number(age) || 28));
  const base = 10 * w + 6.25 * h - 5 * a;
  if (gender === 'male') return Math.round(base + 5);
  if (gender === 'female') return Math.round(base - 161);
  return Math.round(base - 78);
}

export function calculateTDEE(bmr, activityLevel = 'moderate', jobType = 'desk') {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;
  const jobBonus = JOB_ADJUSTMENTS[jobType] ?? 0;
  return Math.round(bmr * mult + jobBonus);
}

export function calculateBMI(weightKg, heightCm) {
  const hMeters = Math.max(1.0, (Number(heightCm) || 170) / 100);
  const w = Math.max(30, Number(weightKg) || 70);
  const bmi = Math.round((w / (hMeters * hMeters)) * 10) / 10;

  let category = 'Healthy Weight';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Healthy Weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Elevated BMI';

  // Gauge normalized from BMI 15 to 40
  const gaugePercent = Math.max(0, Math.min(100, Math.round(((bmi - 15) / 25) * 100)));
  return { bmi, category, gaugePercent };
}

export function calculateMicronutrients({ gender, age, healthConditions = [] }) {
  const isFemale = gender === 'female';
  const over50 = Number(age) >= 50;
  const hasHypertension = healthConditions.includes('Hypertension');
  const hasAnemia = healthConditions.includes('Anemia');

  const ironMg = hasAnemia ? 24 : isFemale && !over50 ? 18 : 8;
  const calciumMg = over50 ? 1200 : 1000;
  const vitaminDMcg = over50 ? 20 : 15; // 600–800 IU
  const sodiumMg = hasHypertension ? 1500 : 2300;

  return { ironMg, calciumMg, vitaminDMcg, sodiumMg };
}

export function calculateNutritionPlan(biometrics = {}, healthConditions = []) {
  const bmr = calculateBMR(biometrics);
  const tdee = calculateTDEE(bmr, biometrics.activityLevel, biometrics.jobType);
  const goal = GOAL_ADJUSTMENTS[biometrics.goal] ?? GOAL_ADJUSTMENTS.maintain;

  // Floor at 1200 kcal for safety
  let targetCalories = Math.max(1200, Math.round(tdee + goal.delta));

  // Gentle adjustment for Diabetes / High Cholesterol carb moderation
  let { proteinRatio, carbRatio, fatRatio } = goal;
  if (healthConditions.includes('Diabetes / Blood Sugar') || healthConditions.includes('PCOS')) {
    carbRatio = Math.max(0.30, carbRatio - 0.06);
    proteinRatio = Math.min(0.38, proteinRatio + 0.04);
    fatRatio = Math.round((1 - proteinRatio - carbRatio) * 100) / 100;
  }

  const proteinG = Math.round((targetCalories * proteinRatio) / 4);
  const carbsG = Math.round((targetCalories * carbRatio) / 4);
  const fatG = Math.round((targetCalories * fatRatio) / 9);
  const fiberG = Math.max(22, Math.round((targetCalories / 1000) * 14));

  const { bmi, category: bmiCategory, gaugePercent: bmiGaugePercent } = calculateBMI(
    biometrics.weightKg,
    biometrics.heightCm
  );
  const micros = calculateMicronutrients({
    gender: biometrics.gender,
    age: biometrics.age,
    healthConditions,
  });

  return {
    bmr,
    tdee,
    targetCalories,
    bmi,
    bmiCategory,
    bmiGaugePercent,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    ...micros,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Checks whether a food item's allergens intersect with user allergies
 */
export function findAllergyConflicts(itemAllergens = [], userAllergies = []) {
  if (!Array.isArray(itemAllergens) || !Array.isArray(userAllergies)) return [];
  const normalizedUser = userAllergies.map((a) => String(a).toLowerCase().trim());
  return itemAllergens.filter((allergen) =>
    normalizedUser.some((u) => allergen.toLowerCase().includes(u) || u.includes(allergen.toLowerCase()))
  );
}

/**
 * Aggregates logged food entries for a given ISO date (YYYY-MM-DD)
 */
export function summarizeDailyLogs(foodLogs = [], dateISO) {
  const filtered = dateISO ? foodLogs.filter((entry) => entry.dateISO === dateISO) : foodLogs;
  return filtered.reduce(
    (acc, item) => {
      acc.calories += Number(item.calories) || 0;
      acc.proteinG += Number(item.proteinG) || 0;
      acc.carbsG += Number(item.carbsG) || 0;
      acc.fatG += Number(item.fatG) || 0;
      acc.fiberG += Number(item.fiberG) || 0;
      acc.count += 1;
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, count: 0 }
  );
}

export function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(Number(n) || 0));
}

export function getTodayISO() {
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

export function getOffsetDateISO(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

export function getCurrentDayShortName(date = new Date()) {
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const idx = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getDay() : new Date().getDay();
  return shortDays[idx] || 'Mon';
}
