import {
  calculateNutritionPlan,
  findAllergyConflicts,
  getCurrentDayShortName,
  getOffsetDateISO,
  getTodayISO,
} from '../utils/nutrition.js';
import {
  DAYS_OF_WEEK,
  FOOD_IMAGES,
  ILLNESS_OPTIONS,
  MEAL_CATALOG,
  RECOVERY_MEALS,
  generateAssistantReply,
} from '../data/catalog.js';
import { supabase } from '../supabaseClient.js';
import {
  deleteFoodLogRow,
  fetchUserWorkspace,
  insertChatMessage,
  insertFoodLog,
  insertNotification,
  markAllNotificationsReadRows,
  updateUserProfileFields,
  upsertMealPlanAndItems,
  upsertMealPlanDayItems,
  upsertNotificationPrefs,
  upsertProfileHealthAndTargets,
  upsertSingleMealPlanItem,
} from '../services/supabaseDb.js';
import { showToast } from '../components/toast.js';

const LEGACY_STORAGE_KEY = 'nutrisense_state_v1';
const DEMO_STORAGE_KEY = 'nutrisense_demo_state_v1';
const THEME_STORAGE_KEY = 'nutrisense_theme';
const PRIVATE_VIEWS = new Set(['myfoods']);

function pickSafeMeal(slot, userAllergies = [], offset = 0, avoidId = null) {
  const options = MEAL_CATALOG[slot] || [];
  const safeOptions = options.filter(
    (m) => findAllergyConflicts(m.allergens, userAllergies).length === 0
  );
  const pool = safeOptions.length > 0 ? safeOptions : options;
  const filtered = avoidId && pool.length > 1 ? pool.filter((m) => m.id !== avoidId) : pool;
  return { ...filtered[offset % filtered.length] };
}

export function buildWeeklyMealPlan({ allergies = [], illnessMode = 'none', seedOffset = 0 } = {}) {
  const planDays = {};
  const illnessInfo = ILLNESS_OPTIONS.find((i) => i.id === illnessMode) || ILLNESS_OPTIONS[0];

  DAYS_OF_WEEK.forEach((day, idx) => {
    if (illnessMode !== 'none' && RECOVERY_MEALS[illnessMode]) {
      const rec = RECOVERY_MEALS[illnessMode];
      planDays[day] = {
        breakfast:
          findAllergyConflicts(rec.breakfast.allergens, allergies).length === 0
            ? { ...rec.breakfast }
            : pickSafeMeal('breakfast', allergies, idx + seedOffset),
        lunch:
          findAllergyConflicts(rec.lunch.allergens, allergies).length === 0
            ? { ...rec.lunch }
            : pickSafeMeal('lunch', allergies, idx + seedOffset),
        snack:
          findAllergyConflicts(rec.snack.allergens, allergies).length === 0
            ? { ...rec.snack }
            : pickSafeMeal('snack', allergies, idx + seedOffset),
        dinner:
          findAllergyConflicts(rec.dinner.allergens, allergies).length === 0
            ? { ...rec.dinner }
            : pickSafeMeal('dinner', allergies, idx + seedOffset),
      };
    } else {
      planDays[day] = {
        breakfast: pickSafeMeal('breakfast', allergies, idx + seedOffset),
        lunch: pickSafeMeal('lunch', allergies, idx + seedOffset),
        snack: pickSafeMeal('snack', allergies, idx + seedOffset),
        dinner: pickSafeMeal('dinner', allergies, idx + seedOffset),
      };
    }
  });

  return {
    days: planDays,
    adaptedForIllness: illnessMode,
    wellnessSummary: illnessInfo.guidance,
    generatedAt: new Date().toISOString(),
  };
}

function createSeedFoodLogs() {
  const today = getTodayISO();
  const yesterday = getOffsetDateISO(1);
  const twoDaysAgo = getOffsetDateISO(2);
  return [
    {
      id: 'log-seed-1',
      name: 'Avocado Toast + Poached Eggs',
      mealType: 'Breakfast',
      calories: 440,
      proteinG: 22,
      carbsG: 34,
      fatG: 24,
      fiberG: 8,
      portion: '2 slices + 2 eggs',
      image: FOOD_IMAGES.avocadoEggs,
      confidence: 92,
      allergens: ['Gluten', 'Eggs'],
      dateISO: today,
      timeLabel: '08:15 AM',
      source: 'Meal Plan',
    },
    {
      id: 'log-seed-2',
      name: 'Herb Chicken & Quinoa Power Bowl',
      mealType: 'Lunch',
      calories: 560,
      proteinG: 46,
      carbsG: 48,
      fatG: 19,
      fiberG: 9,
      portion: '1 bowl (420g)',
      image: FOOD_IMAGES.quinoaBowl,
      confidence: 95,
      allergens: [],
      dateISO: today,
      timeLabel: '12:50 PM',
      source: 'Photo Scan',
    },
    {
      id: 'log-seed-3',
      name: 'Blueberry Yogurt & Toasted Almonds',
      mealType: 'Snack',
      calories: 245,
      proteinG: 18,
      carbsG: 20,
      fatG: 10,
      fiberG: 4,
      portion: '1 small bowl (180g)',
      image: FOOD_IMAGES.berryYogurt,
      confidence: 91,
      allergens: ['Dairy', 'Tree Nuts'],
      dateISO: today,
      timeLabel: '04:10 PM',
      source: 'Quick Log',
    },
    {
      id: 'log-seed-4',
      name: 'Grilled Atlantic Salmon & Lemon Asparagus',
      mealType: 'Dinner',
      calories: 525,
      proteinG: 44,
      carbsG: 22,
      fatG: 28,
      fiberG: 6,
      portion: '1 fillet (180g)',
      image: FOOD_IMAGES.salmon,
      confidence: 94,
      allergens: ['Fish'],
      dateISO: yesterday,
      timeLabel: '07:20 PM',
      source: 'Photo Scan',
    },
    {
      id: 'log-seed-5',
      name: 'Herb Chicken & Quinoa Power Bowl',
      mealType: 'Lunch',
      calories: 560,
      proteinG: 46,
      carbsG: 48,
      fatG: 19,
      fiberG: 9,
      portion: '1 bowl (420g)',
      image: FOOD_IMAGES.quinoaBowl,
      confidence: 95,
      allergens: [],
      dateISO: yesterday,
      timeLabel: '01:05 PM',
      source: 'Meal Plan',
    },
    {
      id: 'log-seed-6',
      name: 'Greek Yogurt Berry & Chia Bowl',
      mealType: 'Breakfast',
      calories: 365,
      proteinG: 28,
      carbsG: 38,
      fatG: 11,
      fiberG: 7,
      portion: '1 bowl (290g)',
      image: FOOD_IMAGES.berryYogurt,
      confidence: 91,
      allergens: ['Dairy', 'Tree Nuts'],
      dateISO: twoDaysAgo,
      timeLabel: '08:40 AM',
      source: 'Meal Plan',
    },
  ];
}

function readStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function createInitialState(preservedTheme = readStoredTheme()) {
  const defaultProfile = {
    id: 'usr-demo-alex',
    name: 'Alex Mercer',
    email: 'alex.mercer@nutrisense.demo',
    avatarInitials: 'AM',
    biometrics: {
      age: 29,
      gender: 'male',
      heightCm: 178,
      weightKg: 76,
      heightUnit: 'cm',
      weightUnit: 'kg',
      jobType: 'desk',
      activityLevel: 'moderate',
      goal: 'recomp',
    },
    healthConditions: [],
    allergies: [],
    illnessMode: 'none',
  };

  const nutritionTargets = calculateNutritionPlan(
    defaultProfile.biometrics,
    defaultProfile.healthConditions
  );

  const mealPlan = buildWeeklyMealPlan({
    allergies: defaultProfile.allergies,
    illnessMode: defaultProfile.illnessMode,
  });

  const today = getTodayISO();

  return {
    theme: preservedTheme,
    authUserId: null,
    isAuthenticated: false,
    isDemoMode: false,
    activeView: 'home',
    selectedPlannerDay: getCurrentDayShortName(),
    selectedDashboardDay: today,
    chartRangeDays: 7,
    nutriNoteIndex: 0,
    profile: defaultProfile,
    nutritionTargets,
    mealPlan,
    foodLogs: createSeedFoodLogs(),
    notifications: [
      {
        id: 'notif-1',
        title: 'Dinner Reminder · 7:00 PM',
        message: 'Grilled Atlantic Salmon & Lemon Asparagus (525 kcal) is scheduled for tonight.',
        category: 'Meal Reminder',
        timeLabel: '18m ago',
        read: false,
      },
      {
        id: 'notif-2',
        title: 'Protein Target Pace',
        message: 'You have logged 86g of your daily protein target so far today.',
        category: 'Macro Insight',
        timeLabel: '2h ago',
        read: false,
      },
      {
        id: 'notif-3',
        title: 'Adaptive Plan Ready',
        message: 'Your Monday–Sunday meal plan is synced to your body recomposition target.',
        category: 'Planner',
        timeLabel: 'Yesterday',
        read: true,
      },
    ],
    notificationPrefs: {
      mealReminders: true,
      hydrationAlerts: true,
      weeklySummary: true,
      illnessCheckins: true,
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '07:00',
      mealTimes: {
        Breakfast: '08:00',
        Lunch: '12:45',
        Snack: '16:00',
        Dinner: '19:00',
      },
    },
    chatHistory: [
      {
        id: 'chat-welcome',
        role: 'assistant',
        text: 'Hello! Ask me about macro targets, gentle foods when feeling unwell, or sodium and fiber balance. Nutrition estimates are informational and not medical advice.',
        timeLabel: 'Now',
      },
    ],
  };
}

function loadDemoOrPublicState() {
  const fallback = createInitialState();
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed.isDemoMode) return fallback;
    return {
      ...fallback,
      ...parsed,
      authUserId: null,
      selectedPlannerDay: fallback.selectedPlannerDay,
      activeView:
        PRIVATE_VIEWS.has(parsed.activeView) && !parsed.isDemoMode
          ? 'home'
          : parsed.activeView || fallback.activeView,
      profile: {
        ...fallback.profile,
        ...(parsed.profile || {}),
        biometrics: {
          ...fallback.profile.biometrics,
          ...(parsed.profile?.biometrics || {}),
        },
      },
      nutritionTargets: {
        ...fallback.nutritionTargets,
        ...(parsed.nutritionTargets || {}),
      },
      mealPlan: {
        ...fallback.mealPlan,
        ...(parsed.mealPlan || {}),
        days: {
          ...fallback.mealPlan.days,
          ...(parsed.mealPlan?.days || {}),
        },
      },
      notificationPrefs: {
        ...fallback.notificationPrefs,
        ...(parsed.notificationPrefs || {}),
        mealTimes: {
          ...fallback.notificationPrefs.mealTimes,
          ...(parsed.notificationPrefs?.mealTimes || {}),
        },
      },
    };
  } catch {
    return fallback;
  }
}

class NutriStore {
  constructor() {
    this.state = loadDemoOrPublicState();
    this.listeners = new Set();
    this._hydratedUserId = null;
    this._hydrationPromise = null;
    this.ui = {
      authModalOpen: false,
      authModalTab: 'login',
      authPrefillEmail: '',
      authSuccessMessage: '',
      notificationsOpen: false,
      chatOpen: false,
      chatTyping: false,
      simulatedError: false,
      syncError: '',
      isLoadingDashboard: false,
      scannerState: {
        selectedPresetId: 'preset-salmon',
        customUpload: null,
        isScanning: false,
        awaitingConfirmation: false,
        isConfirmed: true,
        detectionSummary: null,
        selectedCandidateKey: null,
        portionMultiplier: 1,
        selectedMealType: 'Dinner',
        result: null,
      },
      foodFilter: {
        query: '',
        mealType: 'All',
      },
    };
  }

  getState() {
    return this.state;
  }

  getUI() {
    return this.ui;
  }

  isSupabaseUser() {
    return Boolean(
      this.state.authUserId && !this.state.isDemoMode && this.state.isAuthenticated
    );
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  persist() {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, this.state.theme);
      if (this.state.isDemoMode) {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(this.state));
      } else {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors in private browsing
    }
  }

  notify() {
    this.persist();
    this.listeners.forEach((fn) => fn(this.state, this.ui));
  }

  setState(updater) {
    const patch = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  setUI(updater) {
    const patch = typeof updater === 'function' ? updater(this.ui) : updater;
    this.ui = { ...this.ui, ...patch };
    this.listeners.forEach((fn) => fn(this.state, this.ui));
  }

  async runDbSync(taskFn) {
    try {
      const data = await taskFn();
      if (this.ui.syncError) {
        this.setUI({ syncError: '' });
      }
      return { ok: true, data };
    } catch (err) {
      const message = err?.message || 'Unable to sync changes with Supabase.';
      this.setUI({ syncError: message });
      showToast(message, 'error');
      return { ok: false, error: message };
    }
  }

  async hydrateFromSupabase(user, { force = false } = {}) {
    if (!user?.id) return null;
    if (!force && this._hydratedUserId === user.id && this.isSupabaseUser()) {
      return this.state;
    }
    if (this._hydrationPromise && !force) {
      return this._hydrationPromise;
    }

    this.setUI({ isLoadingDashboard: true, syncError: '' });

    this._hydrationPromise = (async () => {
      try {
        const defaults = createInitialState(this.state.theme);
        const workspace = await fetchUserWorkspace(user, defaults);
        this._hydratedUserId = user.id;
        this.setState({
          ...workspace,
          selectedPlannerDay: getCurrentDayShortName(),
          authUserId: user.id,
          isAuthenticated: true,
          isDemoMode: false,
        });
        this.setUI({
          isLoadingDashboard: false,
          syncError: '',
          authModalOpen: false,
          authPrefillEmail: '',
          authSuccessMessage: '',
        });
        return this.state;
      } catch (err) {
        const message = err?.message || 'Unable to load your Supabase workspace.';
        const fallbackName = (
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Member'
        ).trim();
        const initials =
          fallbackName
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() || '')
            .join('') || 'NS';

        this.setState((prev) => ({
          authUserId: user.id,
          isAuthenticated: true,
          isDemoMode: false,
          profile: {
            ...prev.profile,
            id: user.id,
            name: fallbackName,
            email: user.email || prev.profile.email,
            avatarInitials: initials,
          },
        }));
        this.setUI({
          isLoadingDashboard: false,
          syncError: message,
          authModalOpen: false,
          authPrefillEmail: '',
          authSuccessMessage: '',
        });
        showToast(message, 'error');
        return null;
      } finally {
        this._hydrationPromise = null;
      }
    })();

    return this._hydrationPromise;
  }

  async refreshWorkspace() {
    if (!this.isSupabaseUser()) {
      this.setUI({ isLoadingDashboard: true, simulatedError: false, syncError: '' });
      setTimeout(() => {
        this.setUI({ isLoadingDashboard: false });
        showToast('Dashboard synced');
      }, 450);
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      showToast('Session expired. Please sign in again.', 'error');
      await this.signOut();
      return;
    }

    const hydrated = await this.hydrateFromSupabase(data.user, { force: true });
    if (hydrated) {
      showToast('Synced with Supabase');
    }
  }

  toggleTheme() {
    const next = this.state.theme === 'dark' ? 'light' : 'dark';
    this.setState({ theme: next });
    if (this.isSupabaseUser()) {
      this.runDbSync(() => updateUserProfileFields(this.state.authUserId, { theme: next }));
    }
  }

  setSelectedPlannerDay(day) {
    this.setState({ selectedPlannerDay: day });
    if (this.isSupabaseUser()) {
      this.runDbSync(() =>
        updateUserProfileFields(this.state.authUserId, { selected_planner_day: day })
      );
    }
  }

  setChartRangeDays(days) {
    const range = days === 30 ? 30 : 7;
    this.setState({ chartRangeDays: range });
    if (this.isSupabaseUser()) {
      this.runDbSync(() =>
        updateUserProfileFields(this.state.authUserId, { chart_range_days: range })
      );
    }
  }

  async setView(view) {
    if (PRIVATE_VIEWS.has(view)) {
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;
      } catch {
        session = null;
      }

      if (!session && !this.state.isDemoMode) {
        if (window.location.pathname !== '/login') {
          window.history.pushState(null, '', '/login');
        }
        this.setState({ isAuthenticated: false, authUserId: null, activeView: 'home' });
        this.setUI({ authModalOpen: true, authModalTab: 'login' });
        return;
      }

      if (session?.user && (!this.isSupabaseUser() || this._hydratedUserId !== session.user.id)) {
        await this.hydrateFromSupabase(session.user);
      }
    } else if (window.location.pathname === '/login') {
      window.history.pushState(null, '', '/');
    }

    this.setState({ activeView: view });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async syncFromSupabaseSession(session) {
    if (session?.user) {
      await this.hydrateFromSupabase(session.user);
    } else if (!this.state.isDemoMode && (this.state.isAuthenticated || this.state.authUserId)) {
      this._hydratedUserId = null;
      const fresh = createInitialState(this.state.theme);
      this.setState({
        ...fresh,
        activeView: PRIVATE_VIEWS.has(this.state.activeView) ? 'home' : this.state.activeView,
      });
    }
  }

  demoSignIn({ name = 'Alex Mercer', email = 'alex.mercer@nutrisense.demo' } = {}) {
    this._hydratedUserId = null;
    const cleanName = name.trim();
    const initials =
      cleanName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || 'AM';

    this.setState((prev) => ({
      authUserId: null,
      isAuthenticated: true,
      isDemoMode: true,
      selectedPlannerDay: getCurrentDayShortName(),
      profile: {
        ...prev.profile,
        name: cleanName,
        email,
        avatarInitials: initials,
      },
    }));
    this.setUI({
      authModalOpen: false,
      authPrefillEmail: '',
      authSuccessMessage: '',
      syncError: '',
    });
    this.addNotification({
      title: `Signed in as ${cleanName}`,
      message: 'My Foods dashboard, 7/30-day charts, and profile sync are now unlocked.',
      category: 'Account',
    });
  }

  async signOut() {
    const wasPrivate = PRIVATE_VIEWS.has(this.state.activeView);
    this._hydratedUserId = null;
    const fresh = createInitialState(this.state.theme);
    this.setState({
      ...fresh,
      activeView: wasPrivate ? 'home' : this.state.activeView,
    });
    this.setUI({ syncError: '' });
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    await supabase.auth.signOut().catch(() => {});
    if (wasPrivate) {
      window.history.pushState(null, '', '/login');
      this.setUI({ authModalOpen: true, authModalTab: 'login' });
    }
  }

  async saveProfileAndTargets({ name, email, biometrics, healthConditions, allergies }) {
    const prevProfile = this.state.profile;
    const nextBiometrics = { ...prevProfile.biometrics, ...(biometrics || {}) };
    const nextConditions = Array.isArray(healthConditions)
      ? healthConditions
      : prevProfile.healthConditions;
    const nextAllergies = Array.isArray(allergies) ? allergies : prevProfile.allergies;

    const nextTargets = calculateNutritionPlan(nextBiometrics, nextConditions);
    const nextMealPlan = buildWeeklyMealPlan({
      allergies: nextAllergies,
      illnessMode: prevProfile.illnessMode,
      seedOffset: 0,
    });

    const nextName = name !== undefined ? name : prevProfile.name;
    const initials =
      nextName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || prevProfile.avatarInitials;

    this.setState({
      profile: {
        ...prevProfile,
        name: nextName,
        email: email !== undefined ? email : prevProfile.email,
        avatarInitials: initials,
        biometrics: nextBiometrics,
        healthConditions: nextConditions,
        allergies: nextAllergies,
      },
      nutritionTargets: nextTargets,
      mealPlan: {
        ...nextMealPlan,
        id: this.state.mealPlan?.id,
      },
    });

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      await this.runDbSync(async () => {
        await upsertProfileHealthAndTargets(userId, this.state);
        const savedPlan = await upsertMealPlanAndItems(userId, this.state.mealPlan);
        this.setState({ mealPlan: savedPlan });
      });
    }

    this.addNotification({
      title: 'Nutrition Targets Updated',
      message: `Saved ~${nextTargets.targetCalories} kcal/day target (${nextTargets.proteinG}g P · ${nextTargets.carbsG}g C · ${nextTargets.fatG}g F) and synced your meal plan.`,
      category: 'Profile',
    });
  }

  async setIllnessMode(illnessId) {
    const nextIllness = illnessId || 'none';
    const nextPlan = buildWeeklyMealPlan({
      allergies: this.state.profile.allergies,
      illnessMode: nextIllness,
      seedOffset: 0,
    });

    const info = ILLNESS_OPTIONS.find((i) => i.id === nextIllness) || ILLNESS_OPTIONS[0];
    this.setState((prev) => ({
      profile: {
        ...prev.profile,
        illnessMode: nextIllness,
      },
      mealPlan: {
        ...nextPlan,
        id: prev.mealPlan?.id,
      },
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      await this.runDbSync(async () => {
        await updateUserProfileFields(userId, { illness_mode: nextIllness });
        const savedPlan = await upsertMealPlanAndItems(userId, this.state.mealPlan);
        this.setState({ mealPlan: savedPlan });
      });
    }

    this.addNotification({
      title: nextIllness === 'none' ? 'Standard Meal Plan Restored' : `Recovery Mode: ${info.label}`,
      message:
        nextIllness === 'none'
          ? 'Your weekly meal plan has returned to standard macro-balanced meals.'
          : 'Meal Planner and My Foods synced with gentle recovery alternatives.',
      category: 'Wellness',
    });
  }

  async generateMealPlan(seedOffset = Math.floor(Math.random() * 6) + 1) {
    const nextPlan = buildWeeklyMealPlan({
      allergies: this.state.profile.allergies,
      illnessMode: this.state.profile.illnessMode,
      seedOffset,
    });
    this.setState((prev) => ({
      mealPlan: { ...nextPlan, id: prev.mealPlan?.id },
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      await this.runDbSync(async () => {
        const savedPlan = await upsertMealPlanAndItems(userId, this.state.mealPlan);
        this.setState({ mealPlan: savedPlan });
      });
    }

    this.addNotification({
      title: 'Weekly Meal Plan Generated',
      message: 'All 7 days refreshed around your targets and allergen filters.',
      category: 'Planner',
    });
  }

  async regenerateDay(day) {
    const currentDay = this.state.mealPlan.days[day] || {};
    const allergies = this.state.profile.allergies;
    const seed = Math.floor(Math.random() * 5) + 1;
    const updatedDay = {
      breakfast: pickSafeMeal('breakfast', allergies, seed, currentDay.breakfast?.id),
      lunch: pickSafeMeal('lunch', allergies, seed + 1, currentDay.lunch?.id),
      snack: pickSafeMeal('snack', allergies, seed + 2, currentDay.snack?.id),
      dinner: pickSafeMeal('dinner', allergies, seed + 3, currentDay.dinner?.id),
    };
    const generatedAt = new Date().toISOString();

    this.setState((prev) => ({
      mealPlan: {
        ...prev.mealPlan,
        days: {
          ...prev.mealPlan.days,
          [day]: updatedDay,
        },
        generatedAt,
      },
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      await this.runDbSync(async () => {
        if (this.state.mealPlan.id) {
          await upsertMealPlanDayItems(userId, this.state.mealPlan.id, day, updatedDay, generatedAt);
        } else {
          const savedPlan = await upsertMealPlanAndItems(userId, this.state.mealPlan);
          this.setState({ mealPlan: savedPlan });
        }
      });
    }
  }

  swapMeal(day, slot) {
    const currentMeal = this.state.mealPlan.days?.[day]?.[slot];
    const allergies = this.state.profile.allergies;
    const pool = (MEAL_CATALOG[slot] || []).filter(
      (m) => findAllergyConflicts(m.allergens, allergies).length === 0
    );
    const list = pool.length > 0 ? pool : MEAL_CATALOG[slot] || [];
    const curIdx = list.findIndex((m) => m.id === currentMeal?.id);
    const nextMeal = { ...list[(curIdx + 1) % list.length] };

    this.setState((prev) => ({
      mealPlan: {
        ...prev.mealPlan,
        days: {
          ...prev.mealPlan.days,
          [day]: {
            ...prev.mealPlan.days[day],
            [slot]: nextMeal,
          },
        },
      },
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      this.runDbSync(async () => {
        if (this.state.mealPlan.id) {
          await upsertSingleMealPlanItem(userId, this.state.mealPlan.id, day, slot, nextMeal);
        } else {
          const savedPlan = await upsertMealPlanAndItems(userId, this.state.mealPlan);
          this.setState({ mealPlan: savedPlan });
        }
      });
    }

    return nextMeal;
  }

  async addFoodLog(entry) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const tempId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEntry = {
      id: tempId,
      name: entry.name,
      mealType: entry.mealType || 'Lunch',
      calories: Math.round(Number(entry.calories) || 0),
      proteinG: Math.round(Number(entry.proteinG) || 0),
      carbsG: Math.round(Number(entry.carbsG) || 0),
      fatG: Math.round(Number(entry.fatG) || 0),
      fiberG: Math.round(Number(entry.fiberG) || 0),
      portion: entry.portion || '1 serving',
      image: entry.image || FOOD_IMAGES.quinoaBowl,
      confidence: entry.confidence || 92,
      allergens: entry.allergens || [],
      dateISO: entry.dateISO || getTodayISO(),
      timeLabel: entry.timeLabel || timeLabel,
      source: entry.source || 'Photo Scan',
    };

    this.setState((prev) => ({
      foodLogs: [newEntry, ...prev.foodLogs],
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      const res = await this.runDbSync(() => insertFoodLog(userId, newEntry));
      if (res.ok && res.data) {
        this.setState((prev) => ({
          foodLogs: prev.foodLogs.map((item) => (item.id === tempId ? res.data : item)),
        }));
      } else {
        this.setState((prev) => ({
          foodLogs: prev.foodLogs.filter((item) => item.id !== tempId),
        }));
        return null;
      }
    }

    this.addNotification({
      title: `Logged ${newEntry.name}`,
      message: `+${newEntry.calories} kcal (${newEntry.proteinG}g P) added to ${newEntry.mealType}.`,
      category: 'Food Log',
    });

    return newEntry;
  }

  async deleteFoodLog(id) {
    const removed = this.state.foodLogs.find((entry) => entry.id === id);
    this.setState((prev) => ({
      foodLogs: prev.foodLogs.filter((entry) => entry.id !== id),
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      const res = await this.runDbSync(() => deleteFoodLogRow(userId, id));
      if (!res.ok && removed) {
        this.setState((prev) => ({
          foodLogs: [removed, ...prev.foodLogs],
        }));
      }
    }
  }

  addNotification({ title, message, category = 'System' }) {
    const tempId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const item = {
      id: tempId,
      title,
      message,
      category,
      timeLabel: 'Just now',
      read: false,
    };
    this.setState((prev) => ({
      notifications: [item, ...prev.notifications].slice(0, 20),
    }));

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      insertNotification(userId, item)
        .then((saved) => {
          this.setState((prev) => ({
            notifications: prev.notifications.map((n) => (n.id === tempId ? saved : n)),
          }));
        })
        .catch(() => {
          // Keep UI notification non-blocking if background notification insert fails
        });
    }
  }

  markAllNotificationsRead() {
    this.setState((prev) => ({
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    if (this.isSupabaseUser()) {
      this.runDbSync(() => markAllNotificationsReadRows(this.state.authUserId));
    }
  }

  updateNotificationPrefs(patch) {
    const nextPrefs = {
      ...this.state.notificationPrefs,
      ...patch,
      mealTimes: {
        ...this.state.notificationPrefs.mealTimes,
        ...(patch.mealTimes || {}),
      },
    };
    this.setState({ notificationPrefs: nextPrefs });
    if (this.isSupabaseUser()) {
      this.runDbSync(() => upsertNotificationPrefs(this.state.authUserId, nextPrefs));
    }
  }

  sendChatMessage(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const nowLabel = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `chat-u-${Date.now()}`, role: 'user', text: trimmed, timeLabel: nowLabel };

    this.setState((prev) => ({
      chatHistory: [...prev.chatHistory, userMsg],
    }));
    this.setUI({ chatTyping: true });

    if (this.isSupabaseUser()) {
      const userId = this.state.authUserId;
      insertChatMessage(userId, userMsg)
        .then((saved) => {
          this.setState((prev) => ({
            chatHistory: prev.chatHistory.map((m) => (m.id === userMsg.id ? saved : m)),
          }));
        })
        .catch((err) => {
          this.setUI({ syncError: err?.message || 'Failed to save chat message.' });
        });
    }

    setTimeout(() => {
      const reply = generateAssistantReply(trimmed, this.state);
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const assistantMsg = {
        id: `chat-a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timeLabel: replyTime,
      };
      this.setState((prev) => ({
        chatHistory: [...prev.chatHistory, assistantMsg],
      }));
      this.setUI({ chatTyping: false });

      if (this.isSupabaseUser()) {
        const userId = this.state.authUserId;
        insertChatMessage(userId, assistantMsg)
          .then((saved) => {
            this.setState((prev) => ({
              chatHistory: prev.chatHistory.map((m) => (m.id === assistantMsg.id ? saved : m)),
            }));
          })
          .catch((err) => {
            this.setUI({ syncError: err?.message || 'Failed to save assistant reply.' });
          });
      }
    }, 550);
  }

  cycleNutriNote(delta = 1) {
    this.setState((prev) => ({
      nutriNoteIndex: (prev.nutriNoteIndex + delta + 4) % 4,
    }));
  }
}

export const store = new NutriStore();
