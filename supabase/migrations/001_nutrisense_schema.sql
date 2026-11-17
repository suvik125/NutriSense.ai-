-- =============================================================================
-- NutriSense — Complete Supabase PostgreSQL Schema & RLS Migration
-- Run this migration in your Supabase Dashboard -> SQL Editor.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Shared updated_at trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. user_profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Member',
  email TEXT NOT NULL DEFAULT '',
  avatar_initials TEXT NOT NULL DEFAULT 'NS',
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  illness_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (illness_mode IN ('none', 'fever', 'cold', 'stomach', 'sore_throat', 'fatigue')),
  selected_planner_day TEXT NOT NULL DEFAULT 'Wed'
    CHECK (selected_planner_day IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  chart_range_days INTEGER NOT NULL DEFAULT 7 CHECK (chart_range_days IN (7, 30)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3. user_health_profiles (biometrics, conditions, allergies — 1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_health_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL DEFAULT 29 CHECK (age BETWEEN 13 AND 100),
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC(5, 1) NOT NULL DEFAULT 178.0 CHECK (height_cm BETWEEN 100 AND 240),
  weight_kg NUMERIC(5, 1) NOT NULL DEFAULT 76.0 CHECK (weight_kg BETWEEN 30 AND 250),
  height_unit TEXT NOT NULL DEFAULT 'cm' CHECK (height_unit IN ('cm', 'ft')),
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  job_type TEXT NOT NULL DEFAULT 'desk'
    CHECK (job_type IN ('desk', 'light_active', 'standing', 'physical')),
  activity_level TEXT NOT NULL DEFAULT 'moderate'
    CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very', 'athlete')),
  goal TEXT NOT NULL DEFAULT 'recomp' CHECK (goal IN ('lose', 'maintain', 'recomp', 'gain')),
  health_conditions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  allergies TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_user_health_profiles_updated_at
  BEFORE UPDATE ON public.user_health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. nutrition_targets (calculated macro & micronutrient targets — 1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bmr INTEGER NOT NULL CHECK (bmr > 0),
  tdee INTEGER NOT NULL CHECK (tdee > 0),
  target_calories INTEGER NOT NULL CHECK (target_calories >= 1200),
  bmi NUMERIC(4, 1) NOT NULL CHECK (bmi > 0),
  bmi_category TEXT NOT NULL,
  bmi_gauge_percent INTEGER NOT NULL CHECK (bmi_gauge_percent BETWEEN 0 AND 100),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  fiber_g INTEGER NOT NULL CHECK (fiber_g >= 0),
  iron_mg INTEGER NOT NULL CHECK (iron_mg >= 0),
  calcium_mg INTEGER NOT NULL CHECK (calcium_mg >= 0),
  vitamin_d_mcg INTEGER NOT NULL CHECK (vitamin_d_mcg >= 0),
  sodium_mg INTEGER NOT NULL CHECK (sodium_mg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_nutrition_targets_updated_at
  BEFORE UPDATE ON public.nutrition_targets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 5. meal_plans (active weekly plan header — 1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  adapted_for_illness TEXT NOT NULL DEFAULT 'none'
    CHECK (adapted_for_illness IN ('none', 'fever', 'cold', 'stomach', 'sore_throat', 'fatigue')),
  wellness_summary TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 6. meal_plan_items (7 days x 4 slots per meal_plan)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'snack', 'dinner')),
  catalog_meal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories >= 0),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  fiber_g INTEGER NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
  portion TEXT NOT NULL DEFAULT '1 serving',
  image_url TEXT NOT NULL DEFAULT '',
  allergens TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  prep_mins INTEGER NOT NULL DEFAULT 15 CHECK (prep_mins >= 0),
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_meal_plan_day_slot UNIQUE (meal_plan_id, day_of_week, meal_slot)
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_day
  ON public.meal_plan_items (meal_plan_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_user_id
  ON public.meal_plan_items (user_id);

CREATE TRIGGER trg_meal_plan_items_updated_at
  BEFORE UPDATE ON public.meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 7. food_logs (1:N logged meals per user)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'Lunch'
    CHECK (meal_type IN ('Breakfast', 'Lunch', 'Snack', 'Dinner')),
  calories INTEGER NOT NULL CHECK (calories >= 0),
  protein_g INTEGER NOT NULL CHECK (protein_g >= 0),
  carbs_g INTEGER NOT NULL CHECK (carbs_g >= 0),
  fat_g INTEGER NOT NULL CHECK (fat_g >= 0),
  fiber_g INTEGER NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
  portion TEXT NOT NULL DEFAULT '1 serving',
  image_url TEXT NOT NULL DEFAULT '',
  confidence INTEGER NOT NULL DEFAULT 92 CHECK (confidence BETWEEN 0 AND 100),
  allergens TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_label TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Photo Scan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
  ON public.food_logs (user_id, logged_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal_type
  ON public.food_logs (user_id, meal_type);

CREATE TRIGGER trg_food_logs_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 8. notification_preferences (1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_reminders BOOLEAN NOT NULL DEFAULT true,
  hydration_alerts BOOLEAN NOT NULL DEFAULT true,
  weekly_summary BOOLEAN NOT NULL DEFAULT true,
  illness_checkins BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_start TEXT NOT NULL DEFAULT '22:00',
  quiet_end TEXT NOT NULL DEFAULT '07:00',
  breakfast_time TEXT NOT NULL DEFAULT '08:00',
  lunch_time TEXT NOT NULL DEFAULT '12:45',
  snack_time TEXT NOT NULL DEFAULT '16:00',
  dinner_time TEXT NOT NULL DEFAULT '19:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 9. notifications (1:N per user)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'System',
  time_label TEXT NOT NULL DEFAULT 'Just now',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read) WHERE is_read = false;

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 10. ai_chat_messages (1:N assistant conversation per user)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message_text TEXT NOT NULL,
  time_label TEXT NOT NULL DEFAULT 'Now',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created
  ON public.ai_chat_messages (user_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 11. Auto-create initial user_profiles row on new auth.users signup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_initials TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Member'
  );
  v_initials := upper(
    left(split_part(v_name, ' ', 1), 1) ||
    COALESCE(NULLIF(left(split_part(v_name, ' ', 2), 1), ''), '')
  );
  IF length(v_initials) = 0 THEN
    v_initials := 'NS';
  END IF;

  INSERT INTO public.user_profiles (user_id, name, email, avatar_initials)
  VALUES (NEW.id, v_name, COALESCE(NEW.email, ''), v_initials)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 12. Row Level Security (RLS) — Strict Per-User Isolation via auth.uid()
-- =============================================================================

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_profiles_delete_own" ON public.user_profiles
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- user_health_profiles
ALTER TABLE public.user_health_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_health_profiles_select_own" ON public.user_health_profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_health_profiles_insert_own" ON public.user_health_profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_health_profiles_update_own" ON public.user_health_profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "user_health_profiles_delete_own" ON public.user_health_profiles
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- nutrition_targets
ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition_targets_select_own" ON public.nutrition_targets
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "nutrition_targets_insert_own" ON public.nutrition_targets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "nutrition_targets_update_own" ON public.nutrition_targets
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "nutrition_targets_delete_own" ON public.nutrition_targets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plans_select_own" ON public.meal_plans
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plans_insert_own" ON public.meal_plans
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plans_update_own" ON public.meal_plans
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plans_delete_own" ON public.meal_plans
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- meal_plan_items
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plan_items_select_own" ON public.meal_plan_items
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "meal_plan_items_insert_own" ON public.meal_plan_items
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_id AND mp.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "meal_plan_items_update_own" ON public.meal_plan_items
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_plan_id AND mp.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "meal_plan_items_delete_own" ON public.meal_plan_items
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- food_logs
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_logs_select_own" ON public.food_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "food_logs_insert_own" ON public.food_logs
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "food_logs_update_own" ON public.food_logs
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "food_logs_delete_own" ON public.food_logs
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_preferences_select_own" ON public.notification_preferences
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "notification_preferences_insert_own" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "notification_preferences_update_own" ON public.notification_preferences
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "notification_preferences_delete_own" ON public.notification_preferences
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- ai_chat_messages
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_chat_messages_select_own" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "ai_chat_messages_insert_own" ON public.ai_chat_messages
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "ai_chat_messages_update_own" ON public.ai_chat_messages
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "ai_chat_messages_delete_own" ON public.ai_chat_messages
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
