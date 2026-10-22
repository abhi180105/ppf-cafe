-- Migration 007: Staff Authorization Table and Functions
-- Created: 2026-10-22
-- Description: Staff authorization via dedicated staff_users table (table-based authorization)

-- Staff authorization table - managed via Supabase Admin API
-- In Supabase, this references auth.users. In plain PostgreSQL, we create without FK.
-- Use IF NOT EXISTS to handle both environments gracefully
CREATE TABLE IF NOT EXISTS staff_users (
    user_id UUID PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK to auth.users if auth schema exists (Supabase environment)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        -- Supabase environment: add FK constraint
        BEGIN
            ALTER TABLE staff_users 
            ADD CONSTRAINT staff_users_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists
            NULL;
        END;
    END IF;
END $$;

CREATE INDEX idx_staff_users_active ON staff_users(is_active) WHERE is_active = true;

-- Enable RLS on staff_users
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- Staff users can read their own record (uses auth.uid() which is Supabase-only)
-- In plain PostgreSQL, this policy will be created but auth.uid() will return NULL
-- This is acceptable as the policy just won't match any rows
CREATE POLICY "Staff read own record" ON staff_users
    FOR SELECT USING (auth.uid() = user_id);

-- Admin manages staff via Supabase Admin API (service role bypasses RLS)
-- No direct user policies for INSERT/UPDATE/DELETE

-- Trigger for updated_at
CREATE TRIGGER trg_staff_users_updated BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Secure helper function to check staff status via staff_users table
-- Uses auth.uid() which is Supabase Auth infrastructure
-- In plain PostgreSQL (without Supabase), auth.uid() will raise an exception
-- We handle this by using PL/pgSQL and catching the exception
CREATE OR REPLACE FUNCTION is_staff_v2()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    -- Use PL/pgSQL to handle missing auth.uid() gracefully
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM staff_users
            WHERE user_id = auth.uid()
            AND is_active = true
        );
    EXCEPTION WHEN OTHERS THEN
        -- auth.uid() not available (plain PostgreSQL without Supabase)
        RETURN FALSE;
    END;
END;
$$;

-- Backward compatibility: is_staff() now delegates to is_staff_v2()
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN is_staff_v2();
END;
$$;
