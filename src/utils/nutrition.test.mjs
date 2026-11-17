import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ftInToCm,
  cmToFtIn,
  lbToKg,
  kgToLb,
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  calculateNutritionPlan,
  findAllergyConflicts,
  summarizeDailyLogs,
  getCurrentDayShortName,
} from './nutrition.js';

test('unit conversions convert accurately between imperial and metric', () => {
  assert.equal(ftInToCm(5, 10), 177.8);
  const back = cmToFtIn(177.8);
  assert.equal(back.feet, 5);
  assert.equal(back.inches, 10);

  assert.equal(lbToKg(154), 69.9);
  assert.equal(kgToLb(70), 154.3);
});

test('Mifflin-St Jeor BMR and TDEE compute expected values', () => {
  const maleBmr = calculateBMR({ age: 30, gender: 'male', heightCm: 180, weightKg: 80 });
  // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
  assert.equal(maleBmr, 1780);

  const femaleBmr = calculateBMR({ age: 30, gender: 'female', heightCm: 165, weightKg: 60 });
  // 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320
  assert.equal(femaleBmr, 1320);

  const tdee = calculateTDEE(1780, 'moderate', 'desk');
  assert.equal(tdee, Math.round(1780 * 1.55));
});

test('BMI calculation categorizes weights properly', () => {
  const normal = calculateBMI(70, 175);
  assert.equal(normal.bmi, 22.9);
  assert.equal(normal.category, 'Healthy Weight');

  const under = calculateBMI(50, 175);
  assert.equal(under.category, 'Underweight');

  const over = calculateBMI(85, 175);
  assert.equal(over.category, 'Overweight');
});

test('calculateNutritionPlan adapts for conditions and enforces 1200 kcal floor', () => {
  const plan = calculateNutritionPlan(
    {
      age: 29,
      gender: 'female',
      heightCm: 155,
      weightKg: 48,
      activityLevel: 'sedentary',
      jobType: 'desk',
      goal: 'lose',
    },
    ['Hypertension', 'Anemia']
  );

  assert.ok(plan.targetCalories >= 1200);
  assert.equal(plan.sodiumMg, 1500);
  assert.equal(plan.ironMg, 24);
  assert.ok(plan.proteinG > 0 && plan.carbsG > 0 && plan.fatG > 0 && plan.fiberG >= 22);
});

test('allergy conflict detection identifies matching allergens', () => {
  const conflicts = findAllergyConflicts(['Fish', 'Soy', 'Sesame'], ['Dairy', 'Fish']);
  assert.deepEqual(conflicts, ['Fish']);
  assert.deepEqual(findAllergyConflicts(['Eggs'], ['Peanuts']), []);
});

test('summarizeDailyLogs totals macros for a specific date', () => {
  const logs = [
    { dateISO: '2026-11-14', calories: 420, proteinG: 24, carbsG: 36, fatG: 18, fiberG: 7 },
    { dateISO: '2026-11-14', calories: 580, proteinG: 42, carbsG: 48, fatG: 20, fiberG: 9 },
    { dateISO: '2026-11-13', calories: 700, proteinG: 50, carbsG: 60, fatG: 22, fiberG: 8 },
  ];
  const today = summarizeDailyLogs(logs, '2026-11-14');
  assert.equal(today.calories, 1000);
  assert.equal(today.proteinG, 66);
  assert.equal(today.count, 2);
});

test('getCurrentDayShortName maps Date weekday indices to Mon-Sun short names', () => {
  assert.equal(getCurrentDayShortName(new Date(2026, 10, 16)), 'Mon');
  assert.equal(getCurrentDayShortName(new Date(2026, 10, 21)), 'Sat');
  assert.equal(getCurrentDayShortName(new Date(2026, 10, 22)), 'Sun');
});
