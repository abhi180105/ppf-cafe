-- Migration 006: Row Level Security Policies
-- Created: 2026-10-21
-- Description: RLS policies for public read, staff write, and secure financial operations

-- Enable RLS on all tables
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ POLICIES (anon role)
-- ============================================================

-- Menu categories: public read all
CREATE POLICY "Public read active menu categories" ON menu_categories
    FOR SELECT USING (true);

-- Menu items: public read active items only
CREATE POLICY "Public read active menu items" ON menu_items
    FOR SELECT USING (is_active = true);

-- Combos: public read active combos only
CREATE POLICY "Public read active combos" ON combos
    FOR SELECT USING (is_active = true);

-- Combo items: public read (no sensitive data)
CREATE POLICY "Public read combo items" ON combo_items
    FOR SELECT USING (true);

-- Promotions: public read valid promotions only
CREATE POLICY "Public read valid promotions" ON promotions
    FOR SELECT USING (is_active = true AND valid_from <= now() AND valid_to >= now());

-- Cafe settings: public read
CREATE POLICY "Public read cafe settings" ON cafe_settings
    FOR SELECT USING (true);

-- Reviews: public read
CREATE POLICY "Public read reviews" ON reviews
    FOR SELECT USING (true);

-- ============================================================
-- ANON INSERT POLICIES (validated via edge function)
-- ============================================================

-- Reviews: public insert with validation
CREATE POLICY "Anon insert reviews" ON reviews
    FOR INSERT WITH CHECK (
        name IS NOT NULL AND length(name) <= 100
        AND rating BETWEEN 1 AND 5
        AND length(comment) <= 500
    );

-- ============================================================
-- STAFF POLICIES (table-based authorization via staff_users table)
-- ============================================================

-- Secure helper function to check staff status via staff_users table
-- This uses auth.uid() which is Supabase Auth infrastructure
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

-- Menu categories: staff full access
CREATE POLICY "Staff full access menu categories" ON menu_categories
    FOR ALL USING (is_staff_v2());

-- Menu items: staff full access
CREATE POLICY "Staff full access menu items" ON menu_items
    FOR ALL USING (is_staff_v2());

-- Combos: staff full access
CREATE POLICY "Staff full access combos" ON combos
    FOR ALL USING (is_staff_v2());

-- Combo items: staff full access
CREATE POLICY "Staff full access combo items" ON combo_items
    FOR ALL USING (is_staff_v2());

-- Promotions: staff full access
CREATE POLICY "Staff full access promotions" ON promotions
    FOR ALL USING (is_staff_v2());

-- Cafe settings: staff full access
CREATE POLICY "Staff full access cafe settings" ON cafe_settings
    FOR ALL USING (is_staff_v2());

-- Orders: staff full access
CREATE POLICY "Staff full access orders" ON orders
    FOR ALL USING (is_staff_v2());

-- Order items: staff full access
CREATE POLICY "Staff full access order items" ON order_items
    FOR ALL USING (is_staff_v2());

-- Bills: staff full access
CREATE POLICY "Staff full access bills" ON bills
    FOR ALL USING (is_staff_v2());

-- Bill items: staff full access
CREATE POLICY "Staff full access bill items" ON bill_items
    FOR ALL USING (is_staff_v2());

-- Payments: staff full access
CREATE POLICY "Staff full access payments" ON payments
    FOR ALL USING (is_staff_v2());

-- Expenses: staff full access
CREATE POLICY "Staff full access expenses" ON expenses
    FOR ALL USING (is_staff_v2());

-- Refunds: staff full access
CREATE POLICY "Staff full access refunds" ON refunds
    FOR ALL USING (is_staff_v2());

-- Audit log: staff read only
CREATE POLICY "Staff read audit log" ON audit_log
    FOR SELECT USING (is_staff_v2());

-- Reviews: staff full access (moderation)
CREATE POLICY "Staff full access reviews" ON reviews
    FOR ALL USING (is_staff_v2());

-- ============================================================
-- STAFF_USERS TABLE POLICIES
-- ============================================================
-- Staff users can read their own record (uses auth.uid() which is Supabase-only)
-- In plain PostgreSQL, this policy will be created but auth.uid() will return NULL
-- This is acceptable as the policy just won't match any rows
CREATE POLICY "Staff read own record" ON staff_users
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- RATE_LIMITS TABLE POLICIES
-- ============================================================
-- Only service role can manage rate limits (via SECURITY DEFINER functions)
-- No direct user policies - service role bypasses RLS automatically in Supabase

-- ============================================================
-- SERVICE ROLE POLICIES (for Netlify Functions with service role key)
-- ============================================================
-- Service role bypasses RLS entirely, but we explicitly allow for clarity
-- These are defensive - service role bypasses RLS automatically in Supabase
