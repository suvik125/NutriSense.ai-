import { icon, renderFoodImage } from '../components/icons.js';
import { store } from '../state/store.js';
import { renderCalorieRingSVG } from '../utils/charts.js';
import {
  DAYS_OF_WEEK,
  FOOD_IMAGES,
  NUTRI_NOTES,
  PRODUCT_INSIGHTS,
} from '../data/catalog.js';
import { formatNumber, getTodayISO, summarizeDailyLogs } from '../utils/nutrition.js';
import { showToast } from '../components/toast.js';

export function renderHomeView(state) {
  const targets = state.nutritionTargets;
  const todaySummary = summarizeDailyLogs(state.foodLogs, getTodayISO());
  const note = NUTRI_NOTES[state.nutriNoteIndex % NUTRI_NOTES.length];

  const heroConsumed = state.isAuthenticated ? todaySummary.calories : 1847;
  const heroTarget = targets.targetCalories || 2200;

  const pVal = state.isAuthenticated ? todaySummary.proteinG : Math.round(targets.proteinG * 0.72);
  const cVal = state.isAuthenticated ? todaySummary.carbsG : Math.round(targets.carbsG * 0.78);
  const fVal = state.isAuthenticated ? todaySummary.fatG : Math.round(targets.fatG * 0.68);

  const dayButtons = DAYS_OF_WEEK.map((d) => {
    const active = state.selectedPlannerDay === d;
    return `
        <button
          type="button"
          data-hero-day="${d}"
          class="flex-1 min-w-[38px] sm:min-w-0 px-1.5 sm:px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-center transition-colors whitespace-nowrap shrink-0 ${
            active
              ? 'bg-[#B8F527] text-zinc-950'
              : 'bg-zinc-200 dark:bg-[#22252C] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-[#2C3039]'
          }"
        >${d}</button>
      `;
  }).join('');

  return `
    <div class="space-y-10 sm:space-y-12">
      <!-- 1. Welcome Hero & Reference Spotlight Card -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <div class="lg:col-span-7 space-y-6">
          <p class="text-xs font-semibold tracking-wide text-[#658C0A] dark:text-[#B8F527]">
            Personalized Nutrition &amp; Adaptive Diet Platform
          </p>
          <h1 class="font-display text-4xl sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.08]" style="text-wrap: balance;">
            Adaptive nutrition engineered around your real week.
          </h1>
          <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Calculate precision macro and micronutrient targets, generate allergy-safe weekly meal plans that adapt when you feel unwell, and analyze dish photos in seconds.
          </p>

          <div class="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              type="button"
              data-nav="calculator"
              class="px-6 py-3.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 font-semibold text-sm inline-flex items-center gap-2 transition-transform active:scale-[0.98] shadow-sm whitespace-nowrap"
            >
              <span>Calculate My Nutrition</span>
              ${icon('chevronRight', 'w-4 h-4')}
            </button>
            <button
              type="button"
              data-nav="planner"
              class="px-6 py-3.5 rounded-full border border-zinc-300 dark:border-[#2C3038] bg-white dark:bg-[#15171B] hover:border-[#B8F527]/70 text-zinc-900 dark:text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <span>Plan My Meals</span>
            </button>
          </div>

          <div class="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Mifflin-St Jeor BMR</span>
            <span aria-hidden="true">·</span>
            <span>Illness Recovery Adaptation</span>
            <span aria-hidden="true">·</span>
            <span>Approximate Macro Estimates</span>
          </div>
        </div>

        <!-- Reference-inspired Charcoal & Neon-Lime Live Preview Card -->
        <div class="lg:col-span-5">
          <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 space-y-5 shadow-xl">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Good Morning</p>
                <h2 class="font-display text-lg font-bold text-zinc-950 dark:text-white">
                  ${state.isAuthenticated ? state.profile.name : 'Athlete Preview'}
                </h2>
              </div>
              <button
                type="button"
                data-nav="scanner"
                class="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#1E2128] text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-[#658C0A] dark:hover:text-[#B8F527] inline-flex items-center gap-1.5 transition-colors"
              >
                ${icon('scan', 'w-3.5 h-3.5')}
                <span>Scan Dish</span>
              </button>
            </div>

            <!-- Neon Lime Daily Challenge Card (matching top-left screenshot) -->
            <div class="rounded-2xl bg-[#B8F527] text-zinc-950 overflow-hidden grid grid-cols-12 items-stretch">
              <div class="col-span-7 p-4 flex flex-col justify-between gap-2">
                <div>
                  <p class="text-[11px] font-semibold opacity-75">Daily Focus</p>
                  <p class="font-display text-lg font-bold leading-tight mt-0.5">Hit ${targets.proteinG}g Protein</p>
                </div>
                <button
                  type="button"
                  data-nav="planner"
                  class="self-start text-xs font-bold underline underline-offset-4 hover:opacity-80"
                >
                  View Today's Menu
                </button>
              </div>
              <div class="col-span-5 min-h-[104px]">
                ${renderFoodImage(FOOD_IMAGES.bdFishCurry, 'Traditional Bangladeshi fish curry and steamed rice meal', 'w-full h-full object-cover')}
              </div>
            </div>

            <!-- Day Pills -->
            <div class="flex items-center justify-between gap-1 sm:gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Days of the week">
              ${dayButtons}
            </div>

            <!-- Glowing Progress Ring -->
            <div class="flex justify-center py-1">
              ${renderCalorieRingSVG({
                consumed: heroConsumed,
                target: heroTarget,
                size: 190,
                strokeWidth: 15,
                label: 'kcal',
                sublabel: `of ${formatNumber(heroTarget)} kcal target`,
              })}
            </div>

            <!-- Macro Progress Bars -->
            <div class="space-y-2.5 pt-1">
              ${renderCompactMacroRow('Protein', pVal, targets.proteinG, '#B8F527')}
              ${renderCompactMacroRow('Carbs', cVal, targets.carbsG, '#E4E4E7')}
              ${renderCompactMacroRow('Fat', fVal, targets.fatG, '#71717A')}
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Rotating Nutri Note -->
      <section class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-5 sm:p-6 space-y-3">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">
            <span>Nutri Note</span>
            <span aria-hidden="true">·</span>
            <span>${note.topic}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-action="prev-note"
              aria-label="Previous nutrition note"
              class="w-9 h-9 rounded-full border border-zinc-200 dark:border-[#282B33] bg-zinc-50 dark:bg-[#1B1E24] flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:border-[#B8F527]"
            >${icon('chevronLeft', 'w-4 h-4')}</button>
            <button
              type="button"
              data-action="next-note"
              aria-label="Next nutrition note"
              class="w-9 h-9 rounded-full border border-zinc-200 dark:border-[#282B33] bg-zinc-50 dark:bg-[#1B1E24] flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:border-[#B8F527]"
            >${icon('chevronRight', 'w-4 h-4')}</button>
          </div>
        </div>
        <p class="text-sm sm:text-base text-zinc-700 dark:text-zinc-200 leading-relaxed max-w-4xl">
          ${note.note}
        </p>
      </section>

      <!-- 3. Feature Shortcuts -->
      <section class="space-y-5">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">Core Tools</h2>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Jump directly into any NutriSense workflow.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${renderShortcutCard(
            'calculator',
            'Nutrition Calculator',
            'Compute Mifflin-St Jeor BMR, BMI gauge, macro split & micronutrients.',
            'Open Calculator',
            'calculator'
          )}
          ${renderShortcutCard(
            'calendar',
            'Adaptive Meal Planner',
            'Monday–Sunday plans with instant swaps & Feeling Unwell recovery meals.',
            'Open Meal Plan',
            'planner'
          )}
          ${renderShortcutCard(
            'scan',
            'Food Photo Analyzer',
            'Upload or test sample dishes for instant macro & allergy estimates.',
            'Analyze Photo',
            'scanner'
          )}
          ${renderShortcutCard(
            'utensils',
            'My Foods Dashboard',
            'Track progress rings, 7/30-day charts, biometrics & food log history.',
            state.isAuthenticated ? 'Open My Foods' : 'Preview My Foods',
            'myfoods'
          )}
        </div>
      </section>

      <!-- 4. Locked My Foods Preview (or Unlocked Summary) -->
      <section class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 sm:p-8">
        ${
          state.isAuthenticated
            ? `
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2">
              <p class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">My Foods · Unlocked</p>
              <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">
                ${formatNumber(todaySummary.calories)} / ${formatNumber(targets.targetCalories)} kcal logged today
              </h2>
              <p class="text-sm text-zinc-600 dark:text-zinc-400">
                ${todaySummary.count} meals tracked today · Protein ${todaySummary.proteinG}g / ${targets.proteinG}g · Illness mode: ${state.profile.illnessMode === 'none' ? 'Normal' : state.profile.illnessMode}
              </p>
            </div>
            <button
              type="button"
              data-nav="myfoods"
              class="px-5 py-3 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-sm font-semibold whitespace-nowrap self-start md:self-center"
            >
              Go to My Foods
            </button>
          </div>
        `
            : `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div class="lg:col-span-6 space-y-3">
              <div class="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                ${icon('lock', 'w-4 h-4 text-[#658C0A] dark:text-[#B8F527]')}
                <span>My Foods · Member Workspace</span>
              </div>
              <h2 class="font-display text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
                Unlock your daily rings, 30-day charts &amp; food log.
              </h2>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Sign in or launch one-click Demo Mode to inspect editable biometrics, illness synchronization, searchable meal logs, and target adherence trends.
              </p>
              <div class="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  data-action="home-demo-signin"
                  class="px-5 py-2.5 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-sm font-semibold transition-colors"
                >
                  Unlock with Demo Sign-in
                </button>
                <button
                  type="button"
                  data-action="home-open-auth"
                  class="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-[#2C3038] text-zinc-900 dark:text-white text-sm font-semibold hover:border-[#B8F527] transition-colors"
                >
                  Sign In / Sign Up
                </button>
              </div>
            </div>

            <div class="lg:col-span-6 relative rounded-2xl border border-zinc-200 dark:border-[#262932] bg-zinc-50 dark:bg-[#181B20] p-5 overflow-hidden">
              <div class="blur-[3px] opacity-60 pointer-events-none select-none space-y-4" aria-hidden="true">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-zinc-900 dark:text-white">7-Day Calorie Adherence</span>
                  <span class="font-mono-num text-xs text-[#B8F527]">2,140 avg kcal</span>
                </div>
                <div class="grid grid-cols-7 gap-2 items-end h-24 pt-4">
                  <div class="bg-zinc-600 rounded-t h-12"></div>
                  <div class="bg-zinc-600 rounded-t h-16"></div>
                  <div class="bg-[#B8F527] rounded-t h-20"></div>
                  <div class="bg-zinc-600 rounded-t h-14"></div>
                  <div class="bg-zinc-600 rounded-t h-18"></div>
                  <div class="bg-[#B8F527] rounded-t h-20"></div>
                  <div class="bg-[#B8F527] rounded-t h-16"></div>
                </div>
                <div class="h-px bg-zinc-200 dark:bg-zinc-700"></div>
                <div class="flex justify-between text-xs text-zinc-500">
                  <span>Avocado Toast + Eggs</span>
                  <span>440 kcal</span>
                </div>
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-zinc-950/20">
                <div class="px-4 py-2.5 rounded-2xl bg-zinc-900/90 text-white border border-zinc-700 flex items-center gap-2 text-xs font-semibold shadow-lg">
                  ${icon('lock', 'w-4 h-4 text-[#B8F527]')}
                  <span>Sign in or use Demo Mode to unlock</span>
                </div>
              </div>
            </div>
          </div>
        `
        }
      </section>

      <!-- 5. Product Insights: Stats, Workflow & Testimonials -->
      <section class="space-y-10">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${PRODUCT_INSIGHTS.stats
            .map(
              (st) => `
            <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6">
              <p class="font-display text-3xl font-bold tabular-nums text-zinc-950 dark:text-[#B8F527]">${st.value}</p>
              <p class="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">${st.label}</p>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">${st.detail}</p>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="space-y-4">
          <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">How NutriSense Works</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${PRODUCT_INSIGHTS.workflow
              .map(
                (w) => `
              <div class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 space-y-2">
                <span class="font-mono-num text-xs font-bold text-[#658C0A] dark:text-[#B8F527]">${w.step}</span>
                <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white">${w.title}</h3>
                <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">${w.desc}</p>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="font-display text-2xl font-bold text-zinc-950 dark:text-white">Community Outcomes</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${PRODUCT_INSIGHTS.testimonials
              .map(
                (t) => `
              <blockquote class="rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] p-6 flex flex-col justify-between gap-4">
                <p class="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">“${t.quote}”</p>
                <footer>
                  <p class="text-sm font-semibold text-zinc-950 dark:text-white">${t.name}</p>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">${t.role}</p>
                </footer>
              </blockquote>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderCompactMacroRow(label, current, target, colorHex) {
  const safeTarget = Math.max(1, Number(target) || 100);
  const pct = Math.min(100, Math.round((current / safeTarget) * 100));
  return `
    <div class="space-y-1">
      <div class="flex justify-between text-xs">
        <span class="font-medium text-zinc-600 dark:text-zinc-300">${label}</span>
        <span class="font-mono-num text-zinc-900 dark:text-zinc-100">${current}g / ${safeTarget}g</span>
      </div>
      <div class="h-1.5 rounded-full bg-zinc-200 dark:bg-[#24272F] overflow-hidden">
        <div class="h-full rounded-full transition-all duration-300" style="width:${pct}%;background:${colorHex};"></div>
      </div>
    </div>
  `;
}

function renderShortcutCard(iconName, title, desc, ctaLabel, viewId) {
  return `
    <button
      type="button"
      data-nav="${viewId}"
      class="text-left rounded-3xl bg-white dark:bg-[#131518] border border-zinc-200 dark:border-[#24272F] hover:border-[#B8F527]/70 p-5 flex flex-col justify-between gap-4 transition-colors group"
    >
      <div class="space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-[#1D2026] text-zinc-900 dark:text-[#B8F527] flex items-center justify-center">
          ${icon(iconName, 'w-5 h-5')}
        </div>
        <h3 class="font-display text-lg font-bold text-zinc-950 dark:text-white">${title}</h3>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">${desc}</p>
      </div>
      <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#658C0A] dark:text-[#B8F527]">
        <span>${ctaLabel}</span>
        ${icon('chevronRight', 'w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5')}
      </span>
    </button>
  `;
}

export function bindHomeViewEvents(root) {
  root.querySelectorAll('[data-hero-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setState({ selectedPlannerDay: btn.getAttribute('data-hero-day') });
    });
  });

  root.querySelector('[data-action="prev-note"]')?.addEventListener('click', () => {
    store.cycleNutriNote(-1);
  });
  root.querySelector('[data-action="next-note"]')?.addEventListener('click', () => {
    store.cycleNutriNote(1);
  });

  root.querySelector('[data-action="home-demo-signin"]')?.addEventListener('click', () => {
    store.demoSignIn();
    store.setView('myfoods');
    showToast('Signed in to Demo Profile');
  });

  root.querySelector('[data-action="home-open-auth"]')?.addEventListener('click', () => {
    store.setUI({ authModalOpen: true, authModalTab: 'login' });
  });
}
