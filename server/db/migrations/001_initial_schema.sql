-- Optional extension for older Postgres; Postgres 13+ and PGlite have gen_random_uuid() built-in
DO $$ 
BEGIN 
    CREATE EXTENSION IF NOT EXISTS pgcrypto; 
EXCEPTION 
    WHEN OTHERS THEN NULL; 
END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Farms Table
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(12,2),
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Histories Table (created before crop_plans referencing it)
CREATE TABLE IF NOT EXISTS ai_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
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

-- Crop Plans Table
CREATE TABLE IF NOT EXISTS crop_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
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
    ai_history_id UUID REFERENCES ai_histories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Plans Table
CREATE TABLE IF NOT EXISTS business_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_plan_id UUID REFERENCES crop_plans(id) ON DELETE SET NULL,
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

-- Crop Cycles Table
CREATE TABLE IF NOT EXISTS crop_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_plan_id UUID REFERENCES crop_plans(id) ON DELETE SET NULL,
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

-- Add crop_cycle_id reference to ai_histories if exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_histories_crop_cycle'
    ) THEN
        ALTER TABLE ai_histories
        ADD CONSTRAINT fk_ai_histories_crop_cycle
        FOREIGN KEY (crop_cycle_id)
        REFERENCES crop_cycles(id)
        ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Crop Tasks Table
CREATE TABLE IF NOT EXISTS crop_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
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

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
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

-- Farm Observations Table
CREATE TABLE IF NOT EXISTS farm_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheme Records Table
CREATE TABLE IF NOT EXISTS scheme_records (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_farm_id ON resources(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_plans_farm_id ON crop_plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_farm_id ON business_plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm_id ON crop_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_tasks_cycle_id ON crop_tasks(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cycle_id ON expenses(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_observations_cycle_id ON farm_observations(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_ai_histories_user_id ON ai_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_histories_farm_id ON ai_histories(farm_id);
CREATE INDEX IF NOT EXISTS idx_ai_histories_feature_type ON ai_histories(feature_type);

-- Updated at Trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
        CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'farms_updated_at') THEN
        CREATE TRIGGER farms_updated_at BEFORE UPDATE ON farms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'resources_updated_at') THEN
        CREATE TRIGGER resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'business_plans_updated_at') THEN
        CREATE TRIGGER business_plans_updated_at BEFORE UPDATE ON business_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crop_cycles_updated_at') THEN
        CREATE TRIGGER crop_cycles_updated_at BEFORE UPDATE ON crop_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crop_tasks_updated_at') THEN
        CREATE TRIGGER crop_tasks_updated_at BEFORE UPDATE ON crop_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'expenses_updated_at') THEN
        CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'scheme_records_updated_at') THEN
        CREATE TRIGGER scheme_records_updated_at BEFORE UPDATE ON scheme_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
