-- Migration 009: Expenses Triggers and Audit Triggers for New Tables
-- Created: 2026-10-22
-- Description: Add updated_at triggers and audit triggers for expenses, refunds, and staff_users tables

-- ============================================================
-- EXPENSES UPDATED_AT TRIGGER (now that expenses table exists)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'expenses') THEN
        CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- ============================================================
-- REFUNDS UPDATED_AT TRIGGER
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'refunds') THEN
        CREATE TRIGGER trg_refunds_updated BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- ============================================================
-- STAFF_USERS UPDATED_AT TRIGGER
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff_users') THEN
        -- Check if trigger already exists
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_staff_users_updated') THEN
            CREATE TRIGGER trg_staff_users_updated BEFORE UPDATE ON staff_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
    END IF;
END $$;

-- ============================================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================================
-- expenses audit trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'expenses') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expenses_audit') THEN
            CREATE TRIGGER trg_expenses_audit AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger();
        END IF;
    END IF;
END $$;

-- refunds audit trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'refunds') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refunds_audit') THEN
            CREATE TRIGGER trg_refunds_audit AFTER INSERT OR UPDATE OR DELETE ON refunds FOR EACH ROW EXECUTE FUNCTION audit_trigger();
        END IF;
    END IF;
END $$;

-- staff_users audit trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff_users') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_staff_users_audit') THEN
            CREATE TRIGGER trg_staff_users_audit AFTER INSERT OR UPDATE OR DELETE ON staff_users FOR EACH ROW EXECUTE FUNCTION audit_trigger();
        END IF;
    END IF;
END $$;

-- ============================================================
-- RATE_LIMITS UPDATED_AT TRIGGER
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'rate_limits') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rate_limits_updated') THEN
            CREATE TRIGGER trg_rate_limits_updated BEFORE UPDATE ON rate_limits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
    END IF;
END $$;
