-- ==============================================================================
-- KISANSAARTHI AI — SUPABASE INITIAL DATABASE MIGRATION
-- Migration: 001_initial_schema.sql
-- Description: Creates the full Supabase schema for KisanSaarthi AI, including
--              profiles (tied to auth.users), farms, crops, crop_cycles, expenses,
--              crop_tasks, scheme_records, ai_histories, ai_conversations/messages,
--              RLS policies, auth triggers, and verified government schemes seed.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Farmer profile linked to Supabase Auth)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. FARMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    land_area_acres NUMERIC(10,2) NOT NULL CHECK (land_area_acres > 0),
    ownership TEXT NOT NULL CHECK (ownership IN ('OWN', 'LEASE')),
    previous_crop TEXT,
    soil_source TEXT NOT NULL DEFAULT 'UNKNOWN'
        CHECK (soil_source IN ('SOIL_HEALTH_CARD', 'LAB_TEST', 'USER_ENTERED', 'UNKNOWN')),
    soil_type TEXT,
    soil_ph NUMERIC(4,2) CHECK (soil_ph >= 0 AND soil_ph <= 14),
    nitrogen NUMERIC(12,3) CHECK (nitrogen >= 0),
    phosphorus NUMERIC(12,3) CHECK (phosphorus >= 0),
    potassium NUMERIC(12,3) CHECK (potassium >= 0),
    organic_carbon NUMERIC(12,3) CHECK (organic_carbon >= 0),
    water_source TEXT NOT NULL
        CHECK (water_source IN (
            'BOREWELL',
            'OPEN_WELL',
            'CANAL',
            'RIVER',
            'TANK',
            'RAINFED',
            'COMBINATION'
        )),
    pump_capacity_hp NUMERIC(8,2) CHECK (pump_capacity_hp >= 0),
    water_hours_per_day NUMERIC(5,2) CHECK (water_hours_per_day >= 0 AND water_hours_per_day <= 24),
    irrigation_method TEXT,
    rain_dependence_percent NUMERIC(5,2)
        CHECK (rain_dependence_percent >= 0 AND rain_dependence_percent <= 100),
    capital_budget NUMERIC(14,2) NOT NULL CHECK (capital_budget >= 0),
    labour_description TEXT,
    equipment_description TEXT,
    storage_available BOOLEAN NOT NULL DEFAULT FALSE,
    electricity_available BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. RESOURCES (Farm assets & equipment inventory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(12,2),
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. CROPS (Reference agronomic crop master)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    variety TEXT,
    category TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    water_requirement_mm INTEGER,
    soil_suitability TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. AI HISTORIES (Historical reasoning & recommendations from Gemini)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    crop_cycle_id UUID,
    feature_type TEXT NOT NULL
        CHECK (feature_type IN (
            'CROP_RECOMMENDATION',
            'BUSINESS_PLAN',
            'WEATHER_ACTION',
            'CROP_ADVISORY',
            'SCHEME_GUIDANCE',
            'GENERAL_FARM_ASSISTANT'
        )),
    model_name TEXT NOT NULL,
    input_context JSONB NOT NULL,
    output_json JSONB NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'VALIDATED'
        CHECK (validation_status IN ('VALIDATED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. CROP PLANS (AI generated crop recommendations per farm)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crop_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    suitability TEXT NOT NULL,
    water_requirement TEXT,
    investment_min NUMERIC(14,2),
    investment_expected NUMERIC(14,2),
    investment_max NUMERIC(14,2),
    duration_days INTEGER CHECK (duration_days > 0),
    yield_min NUMERIC(14,3),
    yield_expected NUMERIC(14,3),
    yield_max NUMERIC(14,3),
    revenue_min NUMERIC(14,2),
    revenue_expected NUMERIC(14,2),
    revenue_max NUMERIC(14,2),
    risk TEXT CHECK (risk IN ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN')),
    reasoning TEXT NOT NULL,
    tradeoffs TEXT,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    ai_history_id UUID REFERENCES public.ai_histories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. BUSINESS PLANS (Economic projections for selected crop plans)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    crop_plan_id UUID REFERENCES public.crop_plans(id) ON DELETE SET NULL,
    crop_name TEXT NOT NULL,
    land_area_acres NUMERIC(10,2) NOT NULL CHECK (land_area_acres > 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    conservative_cost NUMERIC(14,2) NOT NULL CHECK (conservative_cost >= 0),
    conservative_revenue NUMERIC(14,2) NOT NULL CHECK (conservative_revenue >= 0),
    conservative_net NUMERIC(14,2) NOT NULL,
    expected_cost NUMERIC(14,2) NOT NULL CHECK (expected_cost >= 0),
    expected_revenue NUMERIC(14,2) NOT NULL CHECK (expected_revenue >= 0),
    expected_net NUMERIC(14,2) NOT NULL,
    favorable_cost NUMERIC(14,2) NOT NULL CHECK (favorable_cost >= 0),
    favorable_revenue NUMERIC(14,2) NOT NULL CHECK (favorable_revenue >= 0),
    favorable_net NUMERIC(14,2) NOT NULL,
    cost_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. CROP CYCLES (Active farming cycles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crop_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    crop_plan_id UUID REFERENCES public.crop_plans(id) ON DELETE SET NULL,
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
    crop_name TEXT NOT NULL,
    variety TEXT,
    area_acres NUMERIC(10,2) NOT NULL CHECK (area_acres > 0),
    planting_date DATE NOT NULL,
    expected_duration_days INTEGER NOT NULL CHECK (expected_duration_days > 0),
    current_stage TEXT NOT NULL DEFAULT 'PLANTING'
        CHECK (current_stage IN (
            'PLANTING',
            'GERMINATION',
            'EARLY_GROWTH',
            'VEGETATIVE',
            'FLOWERING',
            'FRUITING',
            'MATURATION',
            'HARVEST'
        )),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('PLANNED', 'ACTIVE', 'HARVESTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional circular foreign key link for ai_histories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_histories_crop_cycle'
    ) THEN
        ALTER TABLE public.ai_histories
        ADD CONSTRAINT fk_ai_histories_crop_cycle
        FOREIGN KEY (crop_cycle_id)
        REFERENCES public.crop_cycles(id)
        ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 9. CROP TASKS (Tasks scheduled for a crop cycle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crop_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE,
    priority TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'COMPLETED', 'SKIPPED')),
    source TEXT NOT NULL DEFAULT 'SYSTEM'
        CHECK (source IN ('SYSTEM', 'AI', 'USER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility view so any client or query calling "tasks" works seamlessly
CREATE OR REPLACE VIEW public.tasks AS
SELECT
    id,
    crop_cycle_id,
    title,
    description,
    scheduled_date AS due_date,
    status,
    priority,
    source,
    created_at,
    updated_at
FROM public.crop_tasks;

-- ------------------------------------------------------------------------------
-- 10. EXPENSES (Input & operational expenses per farm/cycle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE SET NULL,
    category TEXT NOT NULL
        CHECK (category IN (
            'SEEDS',
            'FERTILIZER',
            'LABOUR',
            'IRRIGATION',
            'PEST_MANAGEMENT',
            'MACHINERY',
            'TRANSPORT',
            'OTHER'
        )),
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. FARM OBSERVATIONS (Field scouting records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farm_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. SCHEME RECORDS (Government Agricultural Schemes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheme_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    eligibility_summary TEXT,
    required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    application_route TEXT,
    official_source_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'STALE')),
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility view for queries referring to "government_schemes"
CREATE OR REPLACE VIEW public.government_schemes AS
SELECT
    id,
    name,
    description,
    eligibility_summary AS eligibility,
    description AS benefits,
    official_source_url AS application_link,
    'Central / State' AS category,
    required_documents,
    application_route,
    verification_status,
    last_verified_at,
    created_at,
    updated_at
FROM public.scheme_records;

-- ------------------------------------------------------------------------------
-- 13. AI CONVERSATIONS & MESSAGES (Conversational Assistant Chat History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'model')),
    message TEXT NOT NULL,
    actions JSONB DEFAULT '[]'::jsonb,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_farm_id ON public.resources(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_plans_farm_id ON public.crop_plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_farm_id ON public.business_plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm_id ON public.crop_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_tasks_cycle_id ON public.crop_tasks(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id ON public.expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cycle_id ON public.expenses(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_observations_cycle_id ON public.farm_observations(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_ai_histories_user_id ON public.ai_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_histories_farm_id ON public.ai_histories(farm_id);
CREATE INDEX IF NOT EXISTS idx_ai_histories_feature_type ON public.ai_histories(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON public.ai_messages(conversation_id);

-- ------------------------------------------------------------------------------
-- TIMESTAMP TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
        CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'farms_updated_at') THEN
        CREATE TRIGGER farms_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'resources_updated_at') THEN
        CREATE TRIGGER resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'business_plans_updated_at') THEN
        CREATE TRIGGER business_plans_updated_at BEFORE UPDATE ON public.business_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crop_cycles_updated_at') THEN
        CREATE TRIGGER crop_cycles_updated_at BEFORE UPDATE ON public.crop_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crop_tasks_updated_at') THEN
        CREATE TRIGGER crop_tasks_updated_at BEFORE UPDATE ON public.crop_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'expenses_updated_at') THEN
        CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'scheme_records_updated_at') THEN
        CREATE TRIGGER scheme_records_updated_at BEFORE UPDATE ON public.scheme_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'ai_conversations_updated_at') THEN
        CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- AUTH PROFILE CREATION TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        phone,
        location,
        preferred_language
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'location',
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        location = COALESCE(EXCLUDED.location, public.profiles.location),
        preferred_language = COALESCE(EXCLUDED.preferred_language, public.profiles.preferred_language),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Profiles: Users can only read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Farms: Farmer can only manage their own farms
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farms_select_own" ON public.farms
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "farms_insert_own" ON public.farms
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "farms_update_own" ON public.farms
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "farms_delete_own" ON public.farms
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Resources: Accessible through owning farm
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_select_own" ON public.resources
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = resources.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "resources_insert_own" ON public.resources
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "resources_update_own" ON public.resources
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = resources.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "resources_delete_own" ON public.resources
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = resources.farm_id
            AND f.user_id = auth.uid()
        )
    );

-- Crops: Read-only for authenticated farmers
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crops_read_authenticated" ON public.crops
    FOR SELECT TO authenticated
    USING (true);

-- Crop Plans: Accessible through owning farm
ALTER TABLE public.crop_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crop_plans_select_own" ON public.crop_plans
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = crop_plans.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_plans_insert_own" ON public.crop_plans
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_plans_update_own" ON public.crop_plans
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = crop_plans.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_plans_delete_own" ON public.crop_plans
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = crop_plans.farm_id
            AND f.user_id = auth.uid()
        )
    );

-- Business Plans: Accessible through owning farm
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_plans_select_own" ON public.business_plans
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = business_plans.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "business_plans_insert_own" ON public.business_plans
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "business_plans_update_own" ON public.business_plans
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = business_plans.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "business_plans_delete_own" ON public.business_plans
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = business_plans.farm_id
            AND f.user_id = auth.uid()
        )
    );

-- Crop Cycles: Accessible through owning farm
ALTER TABLE public.crop_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crop_cycles_select_own" ON public.crop_cycles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = crop_cycles.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_cycles_insert_own" ON public.crop_cycles
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_cycles_update_own" ON public.crop_cycles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = crop_cycles.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_cycles_delete_own" ON public.crop_cycles
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = crop_cycles.farm_id
            AND f.user_id = auth.uid()
        )
    );

-- Crop Tasks: Accessible through crop_cycles -> farms
ALTER TABLE public.crop_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crop_tasks_select_own" ON public.crop_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crop_cycles cc
            JOIN public.farms f ON f.id = cc.farm_id
            WHERE cc.id = crop_tasks.crop_cycle_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_tasks_insert_own" ON public.crop_tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crop_cycles cc
            JOIN public.farms f ON f.id = cc.farm_id
            WHERE cc.id = crop_cycle_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_tasks_update_own" ON public.crop_tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crop_cycles cc
            JOIN public.farms f ON f.id = cc.farm_id
            WHERE cc.id = crop_tasks.crop_cycle_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "crop_tasks_delete_own" ON public.crop_tasks
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crop_cycles cc
            JOIN public.farms f ON f.id = cc.farm_id
            WHERE cc.id = crop_tasks.crop_cycle_id
            AND f.user_id = auth.uid()
        )
    );

-- Expenses: Accessible through farm_id OR crop_cycle_id -> farms
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select_own" ON public.expenses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = expenses.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "expenses_insert_own" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "expenses_update_own" ON public.expenses
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = expenses.farm_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "expenses_delete_own" ON public.expenses
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.farms f
            WHERE f.id = expenses.farm_id
            AND f.user_id = auth.uid()
        )
    );

-- Farm Observations: Accessible through crop_cycles -> farms
ALTER TABLE public.farm_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observations_select_own" ON public.farm_observations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.crop_cycles cc
            JOIN public.farms f ON f.id = cc.farm_id
            WHERE cc.id = farm_observations.crop_cycle_id
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "observations_insert_own" ON public.farm_observations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crop_cycles cc
            JOIN public.farms f ON f.id = cc.farm_id
            WHERE cc.id = crop_cycle_id
            AND f.user_id = auth.uid()
        )
    );

-- Scheme Records: Public and read-only for all users (anon and authenticated)
ALTER TABLE public.scheme_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheme_records_read_public" ON public.scheme_records
    FOR SELECT TO anon, authenticated
    USING (true);

-- AI Histories: Accessible by owning user
ALTER TABLE public.ai_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_histories_select_own" ON public.ai_histories
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "ai_histories_insert_own" ON public.ai_histories
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_histories_delete_own" ON public.ai_histories
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- AI Conversations: Accessible by owning user
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conv_select_own" ON public.ai_conversations
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "ai_conv_insert_own" ON public.ai_conversations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_conv_delete_own" ON public.ai_conversations
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- AI Messages: Accessible through ai_conversations -> user_id
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_msg_select_own" ON public.ai_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = ai_messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "ai_msg_insert_own" ON public.ai_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- SEED DATA: 7 VERIFIED GOVERNMENT SCHEMES
-- Exact records from server/db/seeds/seedSchemes.js
-- ------------------------------------------------------------------------------
INSERT INTO public.scheme_records (
    name,
    description,
    eligibility_summary,
    required_documents,
    application_route,
    official_source_url,
    verification_status,
    last_verified_at
)
VALUES
    (
        'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        'Comprehensive crop insurance coverage against non-preventable natural risks from pre-sowing to post-harvest stages.',
        'All farmers growing notified crops in notified areas including sharecroppers and tenant farmers. Both loanee and non-loanee farmers are eligible.',
        '["Aadhaar Card", "Land Ownership Documents (7/12 extract, Patta / Record of Rights) or Tenant Agreement", "Bank Account Passbook / Statement", "Sowing Certificate / Declaration from local Patwari/Revenue officer"]'::jsonb,
        'Apply via National Crop Insurance Portal (pmfby.gov.in), Common Service Centers (CSC), designated commercial/cooperative banks, or Agriculture Department office.',
        'https://pmfby.gov.in',
        'VERIFIED',
        '2025-01-15T00:00:00Z'::timestamptz
    ),
    (
        'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        'Direct income support of ₹6,000 per year in three equal instalments of ₹2,000 to all landholding farmer families across the country.',
        'All landholding farmer families who hold cultivable land in their names. Subject to exclusion criteria like institutional landholders, income tax payees, and constitutional post holders.',
        '["Aadhaar Card (e-KYC mandatory)", "Landholding documents proving land registry", "Active bank account linked with Aadhaar (NPCI mapped)", "Active mobile number"]'::jsonb,
        'Direct self-registration at pmkisan.gov.in (Farmer Corner) or nearest CSC center and State Nodal Officer.',
        'https://pmkisan.gov.in',
        'VERIFIED',
        '2025-02-01T00:00:00Z'::timestamptz
    ),
    (
        'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY - Per Drop More Crop)',
        'Promotes micro-irrigation systems (drip and sprinkler) with 45% to 55% government subsidy to maximize water use efficiency.',
        'All farmers owning agricultural land with access to a water source. Small and marginal farmers receive higher subsidy rates (up to 55%).',
        '["Identity and Address proof (Aadhaar Card)", "Land ownership document (RoR / Patta / 7/12)", "Water source proof (Borewell / Well / Canal permission)", "Electricity connection bill or NOC for solar pump", "Bank account details"]'::jsonb,
        'State Agriculture or Horticulture Department portal or District Horticulture Office.',
        'https://pmksy.gov.in',
        'VERIFIED',
        '2025-01-10T00:00:00Z'::timestamptz
    ),
    (
        'Kisan Credit Card (KCC) Scheme',
        'Provides timely and adequate credit at subsidized interest rates (effective 4% per annum upon prompt repayment) for cultivation, farm inputs, and maintenance.',
        'Individual/joint borrowers who are owner-cultivators, tenant farmers, oral lessees, sharecroppers, and SHGs/JLGs of farmers.',
        '["Duly completed KCC application form", "Identity & Address proof (Aadhaar, Voter ID, PAN)", "Land record documents verified by revenue official", "Cropping pattern details (crops cultivated and acreage)"]'::jsonb,
        'Apply at any commercial bank, Regional Rural Bank (RRB), Cooperative Bank, or via PM-KISAN portal (One Page KCC Form).',
        'https://myscheme.gov.in/schemes/kcc',
        'VERIFIED',
        '2025-02-10T00:00:00Z'::timestamptz
    ),
    (
        'Sub-Mission on Agricultural Mechanization (SMAM)',
        'Financial assistance and subsidies (40% to 50%) for purchasing farm machinery, tractors, power tillers, rotavators, and setting up Custom Hiring Centers.',
        'Farmers across all categories with priority given to small, marginal, women, and SC/ST farmers.',
        '["Aadhaar Card", "Land records (Patta / Khatauni)", "Bank passbook photocopy", "Category certificate (for SC/ST where applicable)"]'::jsonb,
        'Online application through agrimachinery.nic.in (SMAM portal) or District Agriculture / Engineering Department.',
        'https://agrimachinery.nic.in',
        'VERIFIED',
        '2025-01-20T00:00:00Z'::timestamptz
    ),
    (
        'Paramparagat Krishi Vikas Yojana (PKVY)',
        'Support for organic farming through adoption of organic village clusters and PGS (Participatory Guarantee System) certification, with financial assistance of ₹50,000/ha over 3 years.',
        'Farmers willing to form organic farming clusters (minimum 20 hectares or 50 farmers per cluster) and commit to chemical-free farming.',
        '["Aadhaar Card", "Cluster Farmer Group registration document", "Land record details", "Bank account details of group/individual"]'::jsonb,
        'State Agriculture Department, District Agriculture Office, or Jaivikkheti portal (jaivikkheti.in).',
        'https://pgsindia-ncof.gov.in',
        'VERIFIED',
        '2025-01-18T00:00:00Z'::timestamptz
    ),
    (
        'National Mission on Edible Oils - Oilseeds & Oil Palm (NMEO)',
        'Financial assistance for seed kits, cluster demonstrations, micro-irrigation, and intercropping inputs to boost domestic oilseed production (Mustard, Groundnut, Soybean, Sunflower).',
        'Farmers cultivating oilseed crops in identified districts and agro-climatic zones.',
        '["Aadhaar Card", "Land records", "Sowing report/certificate", "Bank account details"]'::jsonb,
        'Local Block Agriculture Officer, Krishi Vigyan Kendra (KVK), or State Department of Agriculture.',
        'https://nmeo.dac.gov.in',
        'VERIFIED',
        '2025-01-25T00:00:00Z'::timestamptz
    )
ON CONFLICT DO NOTHING;
