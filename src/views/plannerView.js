import { icon, renderFoodImage } from '../components/icons.js';
import { store } from '../state/store.js';
import { DAYS_OF_WEEK, ILLNESS_OPTIONS } from '../data/catalog.js';
import { findAllergyConflicts, formatNumber } from '../utils/nutrition.js';
import { showToast } from '../components/toast.js';

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

export function renderPlannerView(state) {
  const activeDay = state.selectedPlannerDay || 'Wed';
  const dayPlan = state.mealPlan.days?.[activeDay] || {};
  const illnessMode = state.profile.illnessMode || 'none';
  const illnessInfo = ILLNESS_OPTIONS.find((i) => i.id === illnessMode) || ILLNESS_OPTIONS[0];
  const userAllergies = state.profile.allergies || [];

  const dayTotals = MEAL_SLOTS.reduce(
    (acc, slot) => {
      const m = dayPlan[slot.key];
      if (!m) return acc;
      acc.calories += m.calories || 0;
      acc.proteinG += m.proteinG || 0;
      acc.carbsG += m.carbsG || 0;
      acc.fatG += m.fatG || 0;
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const dayTabs = DAYS_OF_WEEK.map((day) => {
    const active = day === activeDay;
    return `
      <button
        type="button"
        data-planner-day="${day}"
        class="px-4 py-2.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
          active
            ? 'bg-[#B8F527] text-zinc-950 shadow-sm'
            : 'bg-zinc-100 dark:bg-[#1A1C22] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#252830]'
        }"
      >${day}</button>
    `;
  }).join('');

  const wellnessButtons = ILLNESS_OPTIONS.map((opt) => {
    const active = opt.id === illnessMode;
    return `
      <button
        type="button"
        data-illness="${opt.id}"
        aria-pressed="${active}"
        class="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
          active
            ? opt.id === 'none'
              ? 'bg-[#B8F527] text-zinc-950 border-[#B8F527]'
              : 'bg-amber-400 text-zinc-950 border-amber-400'
            : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#2B2E36] hover:border-zinc-400'
        }"
      >${opt.id === 'none' ? 'Feeling Great' : opt.label}</button>
    `;
  }).join('');

  const mealCards = MEAL_SLOTS.map((slot) => {
    const meal = dayPlan[slot.key];
    if (!meal) return '';
    const conflicts = findAllergyConflicts(meal.allergens, userAllergies);

    return `
      <article class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] overflow-hidden flex flex-col">
        <div class="relative h-44 sm:h-48 overflow-hidden">
          ${renderFoodImage(meal.image, meal.name, 'w-full h-full object-cover')}
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
          <div class="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold text-[#B8F527]">${slot.label} · ${meal.prepMins || 15} min</p>
              <h3 class="font-display text-lg font-bold text-white leading-snug">${meal.name}</h3>
            </div>
            <span class="font-mono-num text-sm font-bold text-white bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-lg shrink-0">
              ${meal.calories} kcal
            </span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between gap-4">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>${meal.portion}</span>
              <span>${(meal.tags || []).slice(0, 2).join(' · ')}</span>
            </div>

            <div class="grid grid-cols-4 gap-2 text-center py-2.5 px-2 rounded-2xl bg-zinc-50 dark:bg-[#1A1C22]">
              <div>
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400">Protein</p>
                <p class="font-mono-num text-sm font-bold text-zinc-950 dark:text-[#B8F527]">${meal.proteinG}g</p>
              </div>
              <div>
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400">Carbs</p>
                <p class="font-mono-num text-sm font-bold text-zinc-900 dark:text-white">${meal.carbsG}g</p>
              </div>
              <div>
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400">Fat</p>
                <p class="font-mono-num text-sm font-bold text-zinc-900 dark:text-white">${meal.fatG}g</p>
              </div>
              <div>
                <p class="text-[10px] text-zinc-500 dark:text-zinc-400">Fiber</p>
                <p class="font-mono-num text-sm font-bold text-zinc-900 dark:text-white">${meal.fiberG}g</p>
              </div>
            </div>

            ${
              conflicts.length > 0
                ? `<div class="p-2.5 rounded-xl bg-amber-500/12 border border-amber-500/35 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    ${icon('alert', 'w-4 h-4 shrink-0')}
                    <span>May contain ${conflicts.join(', ')} (listed in your allergies). Try Swap Meal.</span>
                  </div>`
                : `<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Allergens: ${meal.allergens?.length ? meal.allergens.join(', ') : 'None of major 8 listed'}
                  </p>`
            }
          </div>

          <div class="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              data-swap-meal="${slot.key}"
              class="flex-1 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-[#2B2E36] bg-zinc-50 dark:bg-[#1B1D23] hover:border-[#B8F527] text-xs font-semibold text-zinc-900 dark:text-white inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              ${icon('swap', 'w-3.5 h-3.5')}
              <span>Swap Meal</span>
            </button>
            <button
              type="button"
              data-log-planned="${slot.key}"
              class="py-2.5 px-4 rounded-xl bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              ${icon('plus', 'w-3.5 h-3.5')}
              <span>Log</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  return `
    <div class="space-y-8">
      <!-- Header & Primary Actions -->
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">Monday – Sunday Schedule</p>
          <h1 class="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white mt-1">
            Adaptive Meal Planner
          </h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
            Balanced around ~${formatNumber(state.nutritionTargets.targetCalories)} kcal/day${
              userAllergies.length ? ` · Filtering ${userAllergies.join(', ')}` : ''
            }.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-action="generate-plan"
            class="px-4 py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            ${icon('refresh', 'w-3.5 h-3.5')}
            <span>Generate Plan</span>
          </button>
          <button
            type="button"
            data-action="regenerate-day"
            class="px-4 py-2.5 rounded-full border border-zinc-300 dark:border-[#2C3038] bg-white dark:bg-[#15171B] hover:border-[#B8F527] text-zinc-900 dark:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>Regenerate ${activeDay}</span>
          </button>
          <button
            type="button"
            data-action="open-meal-reminders"
            class="px-4 py-2.5 rounded-full border border-zinc-300 dark:border-[#2C3038] bg-white dark:bg-[#15171B] hover:border-[#B8F527] text-zinc-900 dark:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            ${icon('bell', 'w-3.5 h-3.5')}
            <span>Meal Reminders</span>
          </button>
        </div>
      </div>

      <!-- I'm Feeling Unwell Wellness Adaptation Panel -->
      <section class="rounded-3xl bg-white dark:bg-[#131518] border ${
        illnessMode !== 'none'
          ? 'border-amber-500/50'
          : 'border-zinc-200 dark:border-[#24272F]'
      } p-5 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-[#1D2026] text-amber-500 flex items-center justify-center shrink-0">
              ${icon('heartPulse', 'w-5 h-5')}
            </span>
            <div>
              <h2 class="font-display text-base font-bold text-zinc-950 dark:text-white">I'm Feeling Unwell</h2>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Select symptoms to adapt this week's meals with gentler, hydrating recovery alternatives.
              </p>
            </div>
          </div>
          ${
            illnessMode !== 'none'
              ? `<span class="text-xs font-semibold text-amber-600 dark:text-amber-300">Wellness Adaptation Active: ${illnessInfo.label}</span>`
              : ''
          }
        </div>

        <div class="flex flex-wrap gap-2">
          ${wellnessButtons}
        </div>

        ${
          illnessMode !== 'none'
            ? `
          <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-300">Wellness Explanation · ${illnessInfo.label}</p>
            <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">${illnessInfo.guidance}</p>
          </div>
        `
            : ''
        }
      </section>

      <!-- Day Selector & Day Summary -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Days of the week">
          ${dayTabs}
        </div>
        <div class="text-xs font-mono-num text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
          ${activeDay} Total: <strong class="text-zinc-950 dark:text-[#B8F527]">${formatNumber(dayTotals.calories)} kcal</strong>
          · ${dayTotals.proteinG}g P · ${dayTotals.carbsG}g C · ${dayTotals.fatG}g F
        </div>
      </div>

      <!-- 4 Meal Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        ${mealCards}
      </div>
    </div>
  `;
}

export function bindPlannerViewEvents(root) {
  root.querySelectorAll('[data-planner-day]').forEach((btn) =>
    btn.addEventListener('click', () => {
      store.setSelectedPlannerDay(btn.getAttribute('data-planner-day'));
    })
  );

  root.querySelectorAll('[data-illness]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-illness');
      store.setIllnessMode(id);
      const label = ILLNESS_OPTIONS.find((i) => i.id === id)?.label || 'Normal';
      showToast(
        id === 'none'
          ? 'Restored standard weekly meal plan'
          : `Adapted meal plan for ${label} recovery`
      );
    })
  );

  root.querySelector('[data-action="generate-plan"]')?.addEventListener('click', () => {
    store.generateMealPlan();
    showToast('Generated fresh Monday–Sunday meal plan');
  });

  root.querySelector('[data-action="regenerate-day"]')?.addEventListener('click', () => {
    const day = store.getState().selectedPlannerDay;
    store.regenerateDay(day);
    showToast(`Regenerated ${day} meals`);
  });

  root.querySelector('[data-action="open-meal-reminders"]')?.addEventListener('click', () => {
    store.setUI({ notificationsOpen: true });
  });

  root.querySelectorAll('[data-swap-meal]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const slot = btn.getAttribute('data-swap-meal');
      const day = store.getState().selectedPlannerDay;
      const next = store.swapMeal(day, slot);
      showToast(`Swapped ${slot} to ${next.name}`);
    })
  );

  root.querySelectorAll('[data-log-planned]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const slot = btn.getAttribute('data-log-planned');
      const day = store.getState().selectedPlannerDay;
      const meal = store.getState().mealPlan.days?.[day]?.[slot];
      if (!meal) return;
      const slotTitle = slot.charAt(0).toUpperCase() + slot.slice(1);
      const saved = await store.addFoodLog({
        name: meal.name,
        mealType: slotTitle,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        fiberG: meal.fiberG,
        portion: meal.portion,
        image: meal.image,
        allergens: meal.allergens,
        source: 'Meal Plan',
      });
      if (saved) {
        showToast(`Logged ${meal.name} to My Foods`);
      }
    })
  );
}
