import { icon, renderFoodImage } from '../components/icons.js';
import { store } from '../state/store.js';
import { ALLERGY_OPTIONS, HEALTH_CONDITIONS, ILLNESS_OPTIONS } from '../data/catalog.js';
import {
  GOAL_ADJUSTMENTS,
  formatNumber,
  getOffsetDateISO,
  getTodayISO,
  summarizeDailyLogs,
} from '../utils/nutrition.js';
import { renderCalorieRingSVG, renderNutritionHistorySVG } from '../utils/charts.js';
import { showToast } from '../components/toast.js';

export function renderMyFoodsView(state, ui) {
  if (!state.isAuthenticated) {
    return `
      <section class="max-w-3xl mx-auto py-8">
        <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-7 sm:p-10 text-center space-y-5">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-[#B8F527]/15 text-[#658C0A] dark:text-[#B8F527] flex items-center justify-center">
            ${icon('lock', 'w-7 h-7')}
          </div>
          <div class="space-y-2">
            <h1 class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
              My Foods Member Dashboard
            </h1>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Sign in or launch instant Demo Mode to unlock daily calorie progress rings, 7/30-day charts, editable biometrics, illness mode sync, and searchable food logs.
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              data-action="myfoods-demo-signin"
              class="px-6 py-3 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-sm font-semibold transition-colors"
            >
              Demo Sign-in (Alex Mercer)
            </button>
            <button
              type="button"
              data-action="myfoods-open-auth"
              class="px-6 py-3 rounded-full border border-zinc-300 dark:border-[#2C3038] text-zinc-900 dark:text-white text-sm font-semibold hover:border-[#B8F527] transition-colors"
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
      </section>
    `;
  }

  const todayISO = getTodayISO();
  const yesterdayISO = getOffsetDateISO(1);
  const targets = state.nutritionTargets;
  const todayStats = summarizeDailyLogs(state.foodLogs, todayISO);
  const remaining = Math.max(0, targets.targetCalories - todayStats.calories);

  const rangeDays = state.chartRangeDays === 30 ? 30 : 7;
  const chartSeries = buildHistorySeries(state.foodLogs, targets.targetCalories, rangeDays);

  // Filter food logs
  const q = (ui.foodFilter?.query || '').toLowerCase().trim();
  const mealFilter = ui.foodFilter?.mealType || 'All';
  const filteredLogs = state.foodLogs.filter((entry) => {
    const matchQuery =
      !q ||
      entry.name.toLowerCase().includes(q) ||
      (entry.mealType || '').toLowerCase().includes(q);
    const matchMeal = mealFilter === 'All' || entry.mealType === mealFilter;
    return matchQuery && matchMeal;
  });

  // Group by dateISO
  const grouped = filteredLogs.reduce((acc, item) => {
    const key = item.dateISO || todayISO;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDateGroup = (iso) => {
    if (iso === todayISO) return 'Today';
    if (iso === yesterdayISO) return 'Yesterday';
    return iso;
  };

  return `
    <div class="space-y-8">
      <!-- Top Greeting & Illness Mode Sync Toolbar -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">My Foods · Synced Workspace</p>
          <h1 class="font-display text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white mt-1">
            Good morning, ${state.profile.name.split(' ')[0]}
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Goal: ${GOAL_ADJUSTMENTS[state.profile.biometrics.goal]?.label || 'Body Recomp'} · ${formatNumber(targets.targetCalories)} kcal/day target
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <label class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#14161A] border border-zinc-200 dark:border-[#272A32] text-xs">
            <span class="text-zinc-500 dark:text-zinc-400">Wellness Mode:</span>
            <select
              id="myfoods-illness-select"
              aria-label="Synchronized illness mode"
              class="bg-transparent font-semibold text-zinc-950 dark:text-[#B8F527] focus:outline-none"
            >
              ${ILLNESS_OPTIONS.map(
                (opt) =>
                  `<option value="${opt.id}" class="bg-white dark:bg-[#14161A]" ${
                    state.profile.illnessMode === opt.id ? 'selected' : ''
                  }>${opt.label}</option>`
              ).join('')}
            </select>
          </label>

          <button
            type="button"
            data-action="refresh-dashboard"
            class="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-[#272A32] bg-white dark:bg-[#14161A] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-[#B8F527] inline-flex items-center gap-1.5"
          >
            ${icon('refresh', 'w-3.5 h-3.5')}
            <span>Sync</span>
          </button>

          <button
            type="button"
            data-action="toggle-sim-error"
            class="px-3.5 py-2 rounded-full border border-zinc-200 dark:border-[#272A32] bg-white dark:bg-[#14161A] text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            ${ui.simulatedError ? 'Clear Error' : 'Test Error State'}
          </button>
        </div>
      </div>

      ${
        ui.syncError || ui.simulatedError
          ? `
        <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3" role="alert">
          <div class="flex items-start gap-2.5 text-red-600 dark:text-red-400">
            ${icon('alert', 'w-5 h-5 shrink-0 mt-0.5')}
            <div>
              <p class="text-sm font-semibold">${ui.syncError ? 'Supabase Sync Error' : 'Simulated Sync Interruption'}</p>
              <p class="text-xs opacity-90">${
                ui.syncError
                  ? String(ui.syncError).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  : 'Unable to reach cloud sync endpoint. Local browser data remains safely cached.'
              }</p>
            </div>
          </div>
          <button
            type="button"
            data-action="retry-sync"
            class="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold self-start sm:self-center shrink-0"
          >Retry Sync</button>
        </div>
      `
          : ''
      }

      ${
        ui.isLoadingDashboard
          ? `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy="true">
          <div class="lg:col-span-5 h-80 rounded-3xl skeleton-shimmer"></div>
          <div class="lg:col-span-7 h-80 rounded-3xl skeleton-shimmer"></div>
        </div>
      `
          : `
        <!-- Daily Rings & 7/30-Day Analytics -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <!-- Glowing Progress Ring Card -->
          <section class="lg:col-span-5 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 flex flex-col justify-between gap-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Today's Intake</h2>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">${formatNumber(remaining)} kcal remaining</p>
              </div>
              <button
                type="button"
                data-nav="scanner"
                class="px-3.5 py-1.5 rounded-full bg-[#B8F527] text-zinc-950 text-xs font-semibold inline-flex items-center gap-1"
              >
                ${icon('plus', 'w-3.5 h-3.5')}
                <span>Scan Food</span>
              </button>
            </div>

            <div class="flex justify-center">
              ${renderCalorieRingSVG({
                consumed: todayStats.calories,
                target: targets.targetCalories,
                size: 205,
                strokeWidth: 16,
                label: 'kcal eaten',
                sublabel: `Goal ${formatNumber(targets.targetCalories)} kcal`,
              })}
            </div>

            <div class="space-y-2.5">
              ${renderMacroBar('Protein', todayStats.proteinG, targets.proteinG, '#B8F527')}
              ${renderMacroBar('Carbs', todayStats.carbsG, targets.carbsG, '#E4E4E7')}
              ${renderMacroBar('Fat', todayStats.fatG, targets.fatG, '#71717A')}
              ${renderMacroBar('Fiber', todayStats.fiberG, targets.fiberG, '#A1A1AA')}
            </div>
          </section>

          <!-- 7 / 30-Day Analytics Chart Card (matching bottom-left Analytics screenshot) -->
          <section class="lg:col-span-7 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 flex flex-col justify-between gap-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">Calorie &amp; Target Analytics</h2>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  Average ${formatNumber(
                    Math.round(chartSeries.reduce((s, d) => s + d.calories, 0) / chartSeries.length)
                  )} kcal/day vs ${formatNumber(targets.targetCalories)} kcal target
                </p>
              </div>
              <div class="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#1C1F25]">
                <button
                  type="button"
                  data-chart-range="7"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    rangeDays === 7
                      ? 'bg-[#B8F527] text-zinc-950'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }"
                >7 Days</button>
                <button
                  type="button"
                  data-chart-range="30"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    rangeDays === 30
                      ? 'bg-[#B8F527] text-zinc-950'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }"
                >30 Days</button>
              </div>
            </div>

            ${renderNutritionHistorySVG({
              series: chartSeries,
              targetCalories: targets.targetCalories,
              rangeDays,
            })}

            <div class="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-[#23262E]">
              <div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Current Weight</p>
                <p class="font-mono-num text-lg font-bold text-zinc-950 dark:text-white">${state.profile.biometrics.weightKg} kg</p>
              </div>
              <div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">BMI Reference</p>
                <p class="font-mono-num text-lg font-bold text-zinc-950 dark:text-white">${Number(targets.bmi).toFixed(1)}</p>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">${targets.bmiCategory}</p>
              </div>
              <div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Sodium Ceiling</p>
                <p class="font-mono-num text-lg font-bold text-zinc-950 dark:text-[#B8F527]">${formatNumber(targets.sodiumMg)} mg</p>
              </div>
            </div>
          </section>
        </div>
      `
      }

      <!-- Bottom Grid: Searchable Food Logs + Editable Profile/Biometrics -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Food Logs -->
        <section class="lg:col-span-7 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 class="font-display text-xl font-bold text-zinc-950 dark:text-white">Food Log History</h2>
            <div class="relative w-full sm:w-60">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">${icon('search', 'w-4 h-4')}</span>
              <input
                id="food-search-input"
                type="search"
                value="${ui.foodFilter?.query || ''}"
                placeholder="Search logged meals..."
                aria-label="Search logged meals"
                class="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
              />
            </div>
          </div>

          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            ${['All', 'Breakfast', 'Lunch', 'Snack', 'Dinner']
              .map(
                (tab) => `
              <button
                type="button"
                data-food-filter="${tab}"
                class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  mealFilter === tab
                    ? 'bg-[#B8F527] text-zinc-950'
                    : 'bg-zinc-100 dark:bg-[#1C1F25] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#252830]'
                }"
              >${tab}</button>
            `
              )
              .join('')}
          </div>

          ${
            sortedDates.length === 0
              ? `
            <div class="py-12 px-4 text-center space-y-3 rounded-2xl bg-zinc-50 dark:bg-[#17191E] border border-dashed border-zinc-200 dark:border-[#292D36]">
              <p class="text-sm font-semibold text-zinc-900 dark:text-white">
                ${state.foodLogs.length === 0 ? 'No foods logged yet' : 'No logged foods match your filter'}
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Analyze a meal photo or log a planned dish to track daily macros.
              </p>
              <div class="flex justify-center gap-2 pt-1">
                ${
                  state.foodLogs.length > 0
                    ? `<button type="button" data-action="clear-food-filter" class="px-4 py-2 rounded-full border border-zinc-300 dark:border-[#2D313B] text-xs font-semibold text-zinc-700 dark:text-zinc-200">Clear Filters</button>`
                    : ''
                }
                <button type="button" data-nav="scanner" class="px-4 py-2 rounded-full bg-[#B8F527] text-zinc-950 text-xs font-semibold">Scan Food Photo</button>
              </div>
            </div>
          `
              : `
            <div class="space-y-5">
              ${sortedDates
                .map(
                  (dateISO) => `
                <div class="space-y-2.5">
                  <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">${formatDateGroup(dateISO)}</h3>
                  <div class="space-y-2.5">
                    ${grouped[dateISO]
                      .map(
                        (entry) => `
                      <div class="p-3 rounded-2xl bg-zinc-50 dark:bg-[#181A20] border border-zinc-200/70 dark:border-[#252831] flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                          ${renderFoodImage(entry.image, entry.name, 'w-full h-full object-cover')}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between gap-2">
                            <p class="text-sm font-semibold text-zinc-950 dark:text-white truncate">${entry.name}</p>
                            <span class="font-mono-num text-xs font-bold text-zinc-900 dark:text-[#B8F527] shrink-0">${entry.calories} kcal</span>
                          </div>
                          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            ${entry.mealType} · ${entry.timeLabel} · ${entry.source}
                          </p>
                          <p class="text-[11px] font-mono-num text-zinc-600 dark:text-zinc-300 mt-1">
                            P ${entry.proteinG}g · C ${entry.carbsG}g · F ${entry.fatG}g
                          </p>
                        </div>
                        <button
                          type="button"
                          data-delete-log="${entry.id}"
                          aria-label="Delete ${entry.name}"
                          class="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                        >${icon('trash', 'w-4 h-4')}</button>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
          }
        </section>

        <!-- Editable Profile, Biometrics, Conditions & Allergies -->
        <section class="lg:col-span-5 rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 space-y-5">
          <div>
            <h2 class="font-display text-xl font-bold text-zinc-950 dark:text-white">Profile &amp; Biometrics</h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Updates targets and allergy filters across all screens.</p>
          </div>

          <form id="profile-edit-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="prof-name" class="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Display Name</label>
                <input id="prof-name" name="name" type="text" value="${state.profile.name}" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label for="prof-weight" class="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Weight (kg)</label>
                <input id="prof-weight" name="weightKg" type="number" step="0.5" min="35" max="250" value="${state.profile.biometrics.weightKg}" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs font-mono-num text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label for="prof-height" class="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Height (cm)</label>
                <input id="prof-height" name="heightCm" type="number" step="0.5" min="110" max="230" value="${state.profile.biometrics.heightCm}" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs font-mono-num text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label for="prof-goal" class="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Goal</label>
                <select id="prof-goal" name="goal" class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#1B1D23] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-900 dark:text-white">
                  <option value="lose" ${state.profile.biometrics.goal === 'lose' ? 'selected' : ''}>Fat Loss</option>
                  <option value="maintain" ${state.profile.biometrics.goal === 'maintain' ? 'selected' : ''}>Maintenance</option>
                  <option value="recomp" ${state.profile.biometrics.goal === 'recomp' ? 'selected' : ''}>Body Recomp</option>
                  <option value="gain" ${state.profile.biometrics.goal === 'gain' ? 'selected' : ''}>Lean Gain</option>
                </select>
              </div>
            </div>

            <div>
              <span class="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5">Health Conditions</span>
              <div class="flex flex-wrap gap-1.5">
                ${HEALTH_CONDITIONS.map((c) => {
                  const active = state.profile.healthConditions.includes(c);
                  return `
                    <label class="cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                      active
                        ? 'bg-[#B8F527]/15 text-[#658C0A] dark:text-[#B8F527] border-[#B8F527]/60'
                        : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#2B2E36]'
                    }">
                      <input type="checkbox" name="conditions" value="${c}" ${active ? 'checked' : ''} class="sr-only" />
                      <span>${c}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <div>
              <span class="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5">Allergies</span>
              <div class="flex flex-wrap gap-1.5">
                ${ALLERGY_OPTIONS.map((a) => {
                  const active = state.profile.allergies.includes(a);
                  return `
                    <label class="cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                      active
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/60'
                        : 'bg-zinc-50 dark:bg-[#1B1D23] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#2B2E36]'
                    }">
                      <input type="checkbox" name="allergies" value="${a}" ${active ? 'checked' : ''} class="sr-only" />
                      <span>${a}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <button
              type="submit"
              class="w-full py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-bold transition-colors"
            >Save Profile Changes</button>
          </form>
        </section>
      </div>
    </div>
  `;
}

function renderMacroBar(label, current, target, colorHex) {
  const safeTarget = Math.max(1, Number(target) || 100);
  const pct = Math.min(100, Math.round((current / safeTarget) * 100));
  return `
    <div class="space-y-1">
      <div class="flex justify-between text-xs">
        <span class="font-medium text-zinc-600 dark:text-zinc-300">${label}</span>
        <span class="font-mono-num font-semibold text-zinc-900 dark:text-white">${current}g / ${safeTarget}g</span>
      </div>
      <div class="h-2 rounded-full bg-zinc-200 dark:bg-[#24272F] overflow-hidden">
        <div class="h-full rounded-full transition-all duration-300" style="width:${pct}%;background:${colorHex};"></div>
      </div>
    </div>
  `;
}

function buildHistorySeries(foodLogs, targetCalories, rangeDays) {
  const series = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const iso = getOffsetDateISO(i);
    const actual = summarizeDailyLogs(foodLogs, iso);
    let calories = actual.calories;
    let proteinG = actual.proteinG;
    let carbsG = actual.carbsG;
    let fatG = actual.fatG;

    // Fill historical days where user has not logged yet with deterministic baseline history
    if (actual.count === 0 && i > 0) {
      const wave = ((i * 7 + 3) % 11) - 5; // -5..+5 deterministic variance
      calories = Math.max(1350, Math.round(targetCalories + wave * 42));
      proteinG = Math.round((calories * 0.3) / 4);
      carbsG = Math.round((calories * 0.42) / 4);
      fatG = Math.round((calories * 0.28) / 9);
    }

    const d = new Date();
    d.setDate(d.getDate() - i);
    const shortLabel =
      rangeDays === 7
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : `${d.getMonth() + 1}/${d.getDate()}`;

    series.push({
      iso,
      label: iso,
      shortLabel,
      calories,
      proteinG,
      carbsG,
      fatG,
    });
  }
  return series;
}

export function bindMyFoodsViewEvents(root) {
  root.querySelector('[data-action="myfoods-demo-signin"]')?.addEventListener('click', () => {
    store.demoSignIn();
    showToast('Signed in to Demo Profile');
  });

  root.querySelector('[data-action="myfoods-open-auth"]')?.addEventListener('click', () => {
    store.setUI({ authModalOpen: true, authModalTab: 'login' });
  });

  root.querySelector('#myfoods-illness-select')?.addEventListener('change', (e) => {
    store.setIllnessMode(e.target.value);
    showToast('Synced wellness mode with Meal Planner');
  });

  root.querySelector('[data-action="refresh-dashboard"]')?.addEventListener('click', () => {
    store.refreshWorkspace();
  });

  root.querySelector('[data-action="toggle-sim-error"]')?.addEventListener('click', () => {
    store.setUI({ simulatedError: !store.getUI().simulatedError });
  });

  root.querySelector('[data-action="retry-sync"]')?.addEventListener('click', () => {
    store.setUI({ simulatedError: false, syncError: '' });
    store.refreshWorkspace();
  });

  root.querySelectorAll('[data-chart-range]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const days = Number(btn.getAttribute('data-chart-range')) || 7;
      store.setChartRangeDays(days);
    })
  );

  root.querySelector('#food-search-input')?.addEventListener('input', (e) => {
    const val = e.target.value;
    store.setUI({
      foodFilter: {
        ...store.getUI().foodFilter,
        query: val,
      },
    });
    // Keep focus inside search input after render
    requestAnimationFrame(() => {
      const inp = document.querySelector('#food-search-input');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(val.length, val.length);
      }
    });
  });

  root.querySelectorAll('[data-food-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      store.setUI({
        foodFilter: {
          ...store.getUI().foodFilter,
          mealType: btn.getAttribute('data-food-filter'),
        },
      });
    })
  );

  root.querySelector('[data-action="clear-food-filter"]')?.addEventListener('click', () => {
    store.setUI({ foodFilter: { query: '', mealType: 'All' } });
  });

  root.querySelectorAll('[data-delete-log]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-delete-log');
      store.deleteFoodLog(id);
      showToast('Removed food log entry');
    })
  );

  // Instant visual toggle on checkbox labels inside profile form
  root.querySelectorAll('#profile-edit-form input[type="checkbox"]').forEach((cb) =>
    cb.addEventListener('change', () => {
      const form = root.querySelector('#profile-edit-form');
      if (!form) return;
      const conditions = Array.from(form.querySelectorAll('input[name="conditions"]:checked')).map(
        (i) => i.value
      );
      const allergies = Array.from(form.querySelectorAll('input[name="allergies"]:checked')).map(
        (i) => i.value
      );
      store.saveProfileAndTargets({
        name: form.name.value.trim() || store.getState().profile.name,
        biometrics: {
          weightKg: Number(form.weightKg.value) || store.getState().profile.biometrics.weightKg,
          heightCm: Number(form.heightCm.value) || store.getState().profile.biometrics.heightCm,
          goal: form.goal.value,
        },
        healthConditions: conditions,
        allergies,
      });
      showToast('Updated profile filters & targets');
    })
  );

  root.querySelector('#profile-edit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const conditions = Array.from(form.querySelectorAll('input[name="conditions"]:checked')).map(
      (i) => i.value
    );
    const allergies = Array.from(form.querySelectorAll('input[name="allergies"]:checked')).map(
      (i) => i.value
    );
    store.saveProfileAndTargets({
      name: form.name.value.trim() || store.getState().profile.name,
      biometrics: {
        weightKg: Number(form.weightKg.value) || 75,
        heightCm: Number(form.heightCm.value) || 175,
        goal: form.goal.value,
      },
      healthConditions: conditions,
      allergies,
    });
    showToast('Saved profile & recalculated nutrition targets');
  });
}
