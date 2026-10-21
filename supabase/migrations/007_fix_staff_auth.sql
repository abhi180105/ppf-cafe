-- Migration 007: Fix Staff Authorization
-- Created: 2026-10-21
-- Description: Replace insecure is_staff() with secure role-based authorization using app_metadata
-- This corrects the security issue where is_staff() relied on user-editable JWT metadata

-- Drop the insecure is_staff() function
DROP FUNCTION IF EXISTS is_staff();

-- Create a secure staff authorization check using app_metadata (admin-managed)
-- app_metadata can only be modified by Supabase Admin API, not by the user
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT COALESCE(auth.jwt()->'app_metadata'->>'role', '') = 'staff';
$$;

-- Alternative: Staff authorization via dedicated table (more flexible for future)
-- This allows multiple staff accounts with different permissions
CREATE TABLE IF NOT EXISTS staff_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on staff_users
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- Staff users can read their own record
CREATE POLICY "Staff read own record" ON staff_users
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can manage staff (using service role or admin API)
-- No direct user policies - managed via Supabase Admin API

-- Secure helper function to check staff status via table
CREATE OR REPLACE FUNCTION is_staff_v2()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM staff_users
        WHERE user_id = auth.uid()
        AND is_active = true
    );
$$;

-- For backward compatibility, is_staff() still uses app_metadata
-- Phase 3 functions should use is_staff_v2() for table-based auth
-- Admin must set app_metadata.role = 'staff' via Supabase Admin API for new staff

-- Index for staff lookup
CREATE INDEX IF NOT EXISTS idx_staff_users_active ON staff_users(is_active) WHERE is_active = true;