-- Migration 010: Final Indexes, Constraints, and Cleanup
-- Created: 2026-10-22
-- Description: Final indexes, constraints, and cleanup after restructuring

-- ============================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_refunds_bill_id ON refunds(bill_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_staff_users_active ON staff_users(is_active) WHERE is_active = true;

-- ============================================================
-- VERIFY CONSTRAINTS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_orders_idempotency_key' 
        AND tablename = 'orders'
    ) THEN
        RAISE NOTICE 'WARNING: idx_orders_idempotency_key missing!';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bills' 
        AND column_name = 'bill_number' 
        AND column_default LIKE '%generate_bill_number%'
    ) THEN
        RAISE NOTICE 'WARNING: bills.bill_number default missing!';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rate_limits_identifier_endpoint_key'
    ) THEN
        RAISE NOTICE 'WARNING: rate_limits unique constraint missing!';
    END IF;
END $$;

-- ============================================================
-- CLEANUP: REMOVE DUPLICATE OBJECTS FROM ORIGINAL MIGRATIONS (008, 009, 011, 012, 013)
-- DO NOT drop functions created in migration 007 (is_staff, is_staff_v2) or 008 (new security functions)
-- ============================================================

-- Drop OLD broken functions from original migration 008 (different signatures from new ones)
DROP FUNCTION IF EXISTS create_order_server(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT);
DROP FUNCTION IF EXISTS submit_review_server(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_orders_staff(TEXT, TEXT, TEXT, INT, INT);
-- Keep new create_bill_from_order_server and check_rate_limit

-- Drop OLD broken functions from original migrations 006/007 (but NOT the new is_staff/is_staff_v2 from 007)
-- The old is_staff was a SQL function, new one is PL/pgSQL - same signature but we want to keep the new one
-- DROP FUNCTION IF EXISTS is_staff();
-- DROP FUNCTION IF EXISTS is_staff_v2();

-- Drop OLD broken audit_trigger from original migrations 005/009
DROP FUNCTION IF EXISTS audit_trigger();

-- Drop OLD triggers from original migrations 004/005
DROP TRIGGER IF EXISTS trg_expenses_updated ON expenses;
DROP TRIGGER IF EXISTS trg_refunds_updated ON refunds;
DROP TRIGGER IF EXISTS trg_staff_users_updated ON staff_users;

-- ============================================================
-- VERIFICATION: VERIFY ALL REQUIRED OBJECTS EXIST
-- ============================================================

DO $$
BEGIN
    -- Verify core tables exist
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'menu_categories'), 'menu_categories missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'menu_items'), 'menu_items missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'combos'), 'combos missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'combo_items'), 'combo_items missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'promotions'), 'promotions missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cafe_settings'), 'cafe_settings missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reviews'), 'reviews missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders'), 'orders missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_items'), 'order_items missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bills'), 'bills missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bill_items'), 'bill_items missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments'), 'payments missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'expenses'), 'expenses missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'refunds'), 'refunds missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_log'), 'audit_log missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reviews'), 'reviews missing';
    ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cafe_settings'), 'cafe_settings missing';
    
    -- Verify functions exist (new ones from migration 007 and 008)
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_bill_number'), 'generate_bill_number missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'), 'set_updated_at missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger'), 'audit_trigger missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_staff_v2'), 'is_staff_v2 missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_order_server'), 'create_order_server missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'submit_review_server'), 'submit_review_server missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_orders_staff'), 'get_orders_staff missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_bill_from_order_server'), 'create_bill_from_order_server missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit'), 'check_rate_limit missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_staff_v2'), 'is_staff_v2 missing';
    ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_staff'), 'is_staff missing';
    
    -- Verify key indexes exist
    ASSERT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_idempotency_key'), 'idempotency_key index missing';
    ASSERT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_phone_created'), 'orders phone index missing';
    ASSERT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bills_bill_number'), 'bills bill_number index missing';
    
    RAISE NOTICE 'All verifications passed!';
END $$;
