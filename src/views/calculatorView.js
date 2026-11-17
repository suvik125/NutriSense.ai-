import { icon } from '../components/icons.js';
import { store } from '../state/store.js';
import { ALLERGY_OPTIONS, HEALTH_CONDITIONS } from '../data/catalog.js';
import {
  calculateNutritionPlan,
  cmToFtIn,
  formatNumber,
  ftInToCm,
  kgToLb,
  lbToKg,
} from '../utils/nutrition.js';
import { renderBMIGauge, renderMacroDonutSVG } from '../utils/charts.js';
import { showToast } from '../components/toast.js';

let draftBio = null;
let draftConditions = null;
let draftAllergies = null;
let draftOwnerKey = null;

function ensureDraft(state) {
  const ownerKey = `${state.authUserId || 'guest'}:${state.isDemoMode ? 'demo' : 'pub'}`;
  if (!draftBio || draftOwnerKey !== ownerKey) {
    draftBio = { ...state.profile.biometrics };
    draftConditions = [...state.profile.healthConditions];
    draftAllergies = [...state.profile.allergies];
    draftOwnerKey = ownerKey;
  }
}

export function resetCalculatorDraft(state) {
  draftBio = { ...state.profile.biometrics };
  draftConditions = [...state.profile.healthConditions];
  draftAllergies = [...state.profile.allergies];
  draftOwnerKey = `${state.authUserId || 'guest'}:${state.isDemoMode ? 'demo' : 'pub'}`;
}

export function renderCalculatorView(state) {
  ensureDraft(state);
  const live = calculateNutritionPlan(draftBio, draftConditions);
  const { feet, inches } = cmToFtIn(draftBio.heightCm);
  const weightLb = kgToLb(draftBio.weightKg);

  return `
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Mifflin-St Jeor Calculator</p>
          <h1 class="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white mt-1">
            Nutrition &amp; Macro Calculator
          </h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
            Customize your biometrics, daily movement, goals, and sensitivities to calculate live calorie, macro, and micronutrient targets.
          </p>
        </div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400">Approximate estimates · Educational use</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Form -->
        <form id="calculator-form" class="lg:col-span-7 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-7 space-y-6">
          <!-- Age & Gender -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="calc-age" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Age (years)</label>
              <input
                id="calc-age"
                type="number"
                min="13"
                max="100"
                value="${draftBio.age}"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
              />
            </div>

            <div>
              <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Sex / Physiology</span>
              <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-[#1B1D23]">
                ${['male', 'female', 'other']
                  .map(
                    (g) => `
                  <button
                    type="button"
                    data-calc-gender="${g}"
                    class="py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      draftBio.gender === g
                        ? 'bg-[#B8F527] text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }"
                  >${g}</button>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- Height & Weight with Unit Toggles -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300" for="${
                  draftBio.heightUnit === 'cm' ? 'calc-height-cm' : 'calc-height-ft'
                }">Height</label>
                <div class="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D23]">
                  <button type="button" data-height-unit="cm" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                    draftBio.heightUnit === 'cm'
                      ? 'bg-[#B8F527] text-zinc-950'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }">cm</button>
                  <button type="button" data-height-unit="ft" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                    draftBio.heightUnit === 'ft'
                      ? 'bg-[#B8F527] text-zinc-950'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }">ft / in</button>
                </div>
              </div>

              ${
                draftBio.heightUnit === 'cm'
                  ? `<input
                      id="calc-height-cm"
                      type="number"
                      min="110"
                      max="230"
                      step="0.5"
                      value="${draftBio.heightCm}"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                    />`
                  : `<div class="grid grid-cols-2 gap-2">
                      <div class="relative">
                        <input
                          id="calc-height-ft"
                          type="number"
                          min="3"
                          max="7"
                          value="${feet}"
                          aria-label="Height feet"
                          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                        />
                        <span class="absolute right-3 top-2.5 text-xs text-zinc-400">ft</span>
                      </div>
                      <div class="relative">
                        <input
                          id="calc-height-in"
                          type="number"
                          min="0"
                          max="11"
                          value="${inches}"
                          aria-label="Height inches"
                          class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                        />
                        <span class="absolute right-3 top-2.5 text-xs text-zinc-400">in</span>
                      </div>
                    </div>`
              }
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300" for="calc-weight">Weight</label>
                <div class="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D23]">
                  <button type="button" data-weight-unit="kg" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                    draftBio.weightUnit === 'kg'
                      ? 'bg-[#B8F527] text-zinc-950'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }">kg</button>
                  <button type="button" data-weight-unit="lb" class="px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                    draftBio.weightUnit === 'lb'
                      ? 'bg-[#B8F527] text-zinc-950'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }">lb</button>
                </div>
              </div>
              <div class="relative">
                <input
                  id="calc-weight"
                  type="number"
                  min="${draftBio.weightUnit === 'kg' ? '30' : '66'}"
                  max="${draftBio.weightUnit === 'kg' ? '250' : '550'}"
                  step="0.5"
                  value="${draftBio.weightUnit === 'kg' ? draftBio.weightKg : weightLb}"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm font-mono-num text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-zinc-400">${draftBio.weightUnit}</span>
              </div>
            </div>
          </div>

          <!-- Job Type & Activity Level -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="calc-job" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Daily Job Type</label>
              <select
                id="calc-job"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
              >
                <option value="desk" ${draftBio.jobType === 'desk' ? 'selected' : ''}>Desk / Sedentary Work</option>
                <option value="light_active" ${draftBio.jobType === 'light_active' ? 'selected' : ''}>Light Active (Teacher, Retail)</option>
                <option value="standing" ${draftBio.jobType === 'standing' ? 'selected' : ''}>Standing / Walking (Nurse, Chef)</option>
                <option value="physical" ${draftBio.jobType === 'physical' ? 'selected' : ''}>Physical Labor / Trade</option>
              </select>
            </div>

            <div>
              <label for="calc-activity" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Exercise Level</label>
              <select
                id="calc-activity"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-[#B8F527]"
              >
                <option value="sedentary" ${draftBio.activityLevel === 'sedentary' ? 'selected' : ''}>Sedentary (Little exercise)</option>
                <option value="light" ${draftBio.activityLevel === 'light' ? 'selected' : ''}>Light (1–2 workouts/wk)</option>
                <option value="moderate" ${draftBio.activityLevel === 'moderate' ? 'selected' : ''}>Moderate (3–5 workouts/wk)</option>
                <option value="very" ${draftBio.activityLevel === 'very' ? 'selected' : ''}>Very Active (6–7 workouts/wk)</option>
                <option value="athlete" ${draftBio.activityLevel === 'athlete' ? 'selected' : ''}>Athlete (2x daily training)</option>
              </select>
            </div>
          </div>

          <!-- Fitness Goal -->
          <div>
            <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Fitness Goal</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              ${[
                { id: 'lose', label: 'Fat Loss' },
                { id: 'maintain', label: 'Maintain' },
                { id: 'recomp', label: 'Body Recomp' },
                { id: 'gain', label: 'Lean Gain' },
              ]
                .map(
                  (g) => `
                <button
                  type="button"
                  data-calc-goal="${g.id}"
                  class="py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    draftBio.goal === g.id
                      ? 'bg-[#B8F527] text-zinc-950 border-[#B8F527]'
                      : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#2B2E36] hover:border-zinc-400'
                  }"
                >${g.label}</button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Health Conditions -->
          <div>
            <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Health Considerations (optional)</span>
            <div class="flex flex-wrap gap-2">
              ${HEALTH_CONDITIONS.map((cond) => {
                const active = draftConditions.includes(cond);
                return `
                  <button
                    type="button"
                    data-calc-condition="${cond}"
                    aria-pressed="${active}"
                    class="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-zinc-950 text-[#B8F527] border-[#B8F527] dark:bg-[#B8F527]/15 dark:text-[#B8F527]'
                        : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#2B2E36]'
                    }"
                  >${cond}</button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Allergies -->
          <div>
            <span class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Allergies &amp; Exclusions</span>
            <div class="flex flex-wrap gap-2">
              ${ALLERGY_OPTIONS.map((alg) => {
                const active = draftAllergies.includes(alg);
                return `
                  <button
                    type="button"
                    data-calc-allergy="${alg}"
                    aria-pressed="${active}"
                    class="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/60'
                        : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#2B2E36]'
                    }"
                  >${alg}</button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 dark:border-[#23262E]">
            <button
              type="button"
              data-action="reset-calc"
              class="px-4 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            >Reset to Saved Profile</button>
            <button
              type="submit"
              class="px-6 py-3 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              ${icon('check', 'w-4 h-4')}
              <span>Save to Profile</span>
            </button>
          </div>
        </form>

        <!-- Right Live Results Panel -->
        <div id="calculator-live-results" class="lg:col-span-5 space-y-5">
          <!-- Primary Targets Card -->
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Daily Target Calories</p>
                <p class="font-display text-4xl font-bold tabular-nums text-zinc-950 dark:text-[#B8F527] mt-1">
                  ${formatNumber(live.targetCalories)} <span class="text-base font-medium text-zinc-500 dark:text-zinc-400">kcal</span>
                </p>
              </div>
              <div class="text-right space-y-1">
                <p class="text-xs text-zinc-500 dark:text-zinc-400">BMR: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.bmr)} kcal</span></p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">TDEE: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.tdee)} kcal</span></p>
              </div>
            </div>

            <div class="pt-4 border-t border-zinc-200 dark:border-[#23262E]">
              ${renderBMIGauge({ bmi: live.bmi, category: live.bmiCategory, gaugePercent: live.bmiGaugePercent })}
            </div>
          </div>

          <!-- Macro Donut Card -->
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Macro Targets</h2>
              <span class="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">Fiber ${live.fiberG}g/day</span>
            </div>
            ${renderMacroDonutSVG({ proteinG: live.proteinG, carbsG: live.carbsG, fatG: live.fatG })}
          </div>

          <!-- Micronutrient Targets Card -->
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
            <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Key Micronutrient Targets</h2>
            <div class="grid grid-cols-2 gap-3">
              ${renderMicroTile('Iron', `${live.ironMg} mg`, draftConditions.includes('Anemia') ? 'Adjusted for anemia support' : 'Daily reference')}
              ${renderMicroTile('Calcium', `${formatNumber(live.calciumMg)} mg`, 'Bone & muscle function')}
              ${renderMicroTile('Vitamin D', `${live.vitaminDMcg} mcg`, `${live.vitaminDMcg * 40} IU equivalent`)}
              ${renderMicroTile('Sodium Cap', `${formatNumber(live.sodiumMg)} mg`, draftConditions.includes('Hypertension') ? 'DASH-aligned cap' : 'Standard ceiling')}
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Calculations use Mifflin-St Jeor equations and standard dietary reference intakes as approximate informational targets, not clinical prescriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMicroTile(name, value, note) {
  return `
    <div class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#1A1C22] border border-zinc-200/70 dark:border-[#262932]">
      <p class="text-xs text-zinc-500 dark:text-zinc-400">${name}</p>
      <p class="font-mono-num text-lg font-bold text-zinc-950 dark:text-white mt-0.5">${value}</p>
      <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">${note}</p>
    </div>
  `;
}

export function bindCalculatorViewEvents(root, rerender) {
  const ageInput = root.querySelector('#calc-age');
  ageInput?.addEventListener('input', () => {
    draftBio.age = Math.max(13, Math.min(100, Number(ageInput.value) || 28));
    updateResultsOnly(root);
  });

  root.querySelectorAll('[data-calc-gender]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.gender = btn.getAttribute('data-calc-gender');
      rerender();
    })
  );

  root.querySelectorAll('[data-height-unit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.heightUnit = btn.getAttribute('data-height-unit');
      rerender();
    })
  );

  root.querySelectorAll('[data-weight-unit]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.weightUnit = btn.getAttribute('data-weight-unit');
      rerender();
    })
  );

  root.querySelector('#calc-height-cm')?.addEventListener('input', (e) => {
    draftBio.heightCm = Math.max(100, Math.min(240, Number(e.target.value) || 170));
    updateResultsOnly(root);
  });

  const syncFtIn = () => {
    const ft = Number(root.querySelector('#calc-height-ft')?.value) || 5;
    const inch = Number(root.querySelector('#calc-height-in')?.value) || 0;
    draftBio.heightCm = ftInToCm(ft, inch);
    updateResultsOnly(root);
  };
  root.querySelector('#calc-height-ft')?.addEventListener('input', syncFtIn);
  root.querySelector('#calc-height-in')?.addEventListener('input', syncFtIn);

  root.querySelector('#calc-weight')?.addEventListener('input', (e) => {
    const val = Number(e.target.value) || 70;
    draftBio.weightKg = draftBio.weightUnit === 'kg' ? val : lbToKg(val);
    updateResultsOnly(root);
  });

  root.querySelector('#calc-job')?.addEventListener('change', (e) => {
    draftBio.jobType = e.target.value;
    updateResultsOnly(root);
  });

  root.querySelector('#calc-activity')?.addEventListener('change', (e) => {
    draftBio.activityLevel = e.target.value;
    updateResultsOnly(root);
  });

  root.querySelectorAll('[data-calc-goal]').forEach((btn) =>
    btn.addEventListener('click', () => {
      draftBio.goal = btn.getAttribute('data-calc-goal');
      rerender();
    })
  );

  root.querySelectorAll('[data-calc-condition]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const cond = btn.getAttribute('data-calc-condition');
      if (draftConditions.includes(cond)) {
        draftConditions = draftConditions.filter((c) => c !== cond);
      } else {
        draftConditions = [...draftConditions, cond];
      }
      rerender();
    })
  );

  root.querySelectorAll('[data-calc-allergy]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const alg = btn.getAttribute('data-calc-allergy');
      if (draftAllergies.includes(alg)) {
        draftAllergies = draftAllergies.filter((a) => a !== alg);
      } else {
        draftAllergies = [...draftAllergies, alg];
      }
      rerender();
    })
  );

  root.querySelector('[data-action="reset-calc"]')?.addEventListener('click', () => {
    resetCalculatorDraft(store.getState());
    rerender();
    showToast('Reset calculator to saved profile');
  });

  root.querySelector('#calculator-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    store.saveProfileAndTargets({
      biometrics: draftBio,
      healthConditions: draftConditions,
      allergies: draftAllergies,
    });
    showToast('Saved targets to your profile & synced meal plan');
  });
}

function updateResultsOnly(root) {
  const container = root.querySelector('#calculator-live-results');
  if (!container) return;
  const live = calculateNutritionPlan(draftBio, draftConditions);
  container.innerHTML = `
    <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Daily Target Calories</p>
          <p class="font-display text-4xl font-bold tabular-nums text-zinc-950 dark:text-[#B8F527] mt-1">
            ${formatNumber(live.targetCalories)} <span class="text-base font-medium text-zinc-500 dark:text-zinc-400">kcal</span>
          </p>
        </div>
        <div class="text-right space-y-1">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">BMR: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.bmr)} kcal</span></p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">TDEE: <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${formatNumber(live.tdee)} kcal</span></p>
        </div>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-[#23262E]">
        ${renderBMIGauge({ bmi: live.bmi, category: live.bmiCategory, gaugePercent: live.bmiGaugePercent })}
      </div>
    </div>

    <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Macro Targets</h2>
        <span class="text-xs font-mono-num text-zinc-500 dark:text-zinc-400">Fiber ${live.fiberG}g/day</span>
      </div>
      ${renderMacroDonutSVG({ proteinG: live.proteinG, carbsG: live.carbsG, fatG: live.fatG })}
    </div>

    <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-4">
      <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Key Micronutrient Targets</h2>
      <div class="grid grid-cols-2 gap-3">
        ${renderMicroTile('Iron', `${live.ironMg} mg`, draftConditions.includes('Anemia') ? 'Adjusted for anemia support' : 'Daily reference')}
        ${renderMicroTile('Calcium', `${formatNumber(live.calciumMg)} mg`, 'Bone & muscle function')}
        ${renderMicroTile('Vitamin D', `${live.vitaminDMcg} mcg`, `${live.vitaminDMcg * 40} IU equivalent`)}
        ${renderMicroTile('Sodium Cap', `${formatNumber(live.sodiumMg)} mg`, draftConditions.includes('Hypertension') ? 'DASH-aligned cap' : 'Standard ceiling')}
      </div>
      <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Calculations use Mifflin-St Jeor equations and standard dietary reference intakes as approximate informational targets, not clinical prescriptions.
      </p>
    </div>
  `;
}
