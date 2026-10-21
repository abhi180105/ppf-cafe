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
-- STAFF POLICIES (authenticated with email claim)
-- Note: Single staff account initially identified by email in JWT
-- ============================================================

-- Helper: Staff check function
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT auth.jwt()->>'email' = 'abhi.7r1x@gmail.com';
$$;

-- Menu categories: staff full access
CREATE POLICY "Staff full access menu categories" ON menu_categories
    FOR ALL USING (is_staff());

-- Menu items: staff full access
CREATE POLICY "Staff full access menu items" ON menu_items
    FOR ALL USING (is_staff());

-- Combos: staff full access
CREATE POLICY "Staff full access combos" ON combos
    FOR ALL USING (is_staff());

-- Combo items: staff full access
CREATE POLICY "Staff full access combo items" ON combo_items
    FOR ALL USING (is_staff());

-- Promotions: staff full access
CREATE POLICY "Staff full access promotions" ON promotions
    FOR ALL USING (is_staff());

-- Cafe settings: staff full access
CREATE POLICY "Staff full access cafe settings" ON cafe_settings
    FOR ALL USING (is_staff());

-- Orders: staff full access
CREATE POLICY "Staff full access orders" ON orders
    FOR ALL USING (is_staff());

-- Order items: staff full access
CREATE POLICY "Staff full access order items" ON order_items
    FOR ALL USING (is_staff());

-- Bills: staff full access
CREATE POLICY "Staff full access bills" ON bills
    FOR ALL USING (is_staff());

-- Bill items: staff full access
CREATE POLICY "Staff full access bill items" ON bill_items
    FOR ALL USING (is_staff());

-- Payments: staff full access
CREATE POLICY "Staff full access payments" ON payments
    FOR ALL USING (is_staff());

-- Expenses: staff full access
CREATE POLICY "Staff full access expenses" ON expenses
    FOR ALL USING (is_staff());

-- Refunds: staff full access
CREATE POLICY "Staff full access refunds" ON refunds
    FOR ALL USING (is_staff());

-- Audit log: staff read only
CREATE POLICY "Staff read audit log" ON audit_log
    FOR SELECT USING (is_staff());

-- Reviews: staff full access (moderation)
CREATE POLICY "Staff full access reviews" ON reviews
    FOR ALL USING (is_staff());

-- ============================================================
-- NOTES FOR FUTURE ENHANCEMENT
-- ============================================================
-- 1. Replace is_staff() with role-based claims when multiple staff accounts exist
-- 2. Add policies for Netlify Functions (service role) to bypass RLS via security definer functions
-- 3. Consider adding customer-specific order read access via edge function
-- 4. Add rate limiting policies if needed