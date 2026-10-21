-- Migration 002: Financial Core (Orders, Bills, Payments, Expenses, Refunds, Audit Log)
-- Created: 2026-10-21
-- Description: Financial tables with proper separation of orders, bills, payments, and audit trails

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORDERS (Customer-facing order - pre-bill)
-- ============================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    order_mode TEXT NOT NULL DEFAULT 'ASAP' CHECK (order_mode IN ('ASAP', 'Scheduled')),
    scheduled_for TIMESTAMPTZ,
    subtotal_paise INT NOT NULL DEFAULT 0,
    discount_paise INT NOT NULL DEFAULT 0,
    total_paise INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    special_instructions TEXT,
    delivery_latitude NUMERIC(10, 7),
    delivery_longitude NUMERIC(10, 7),
    delivery_distance_km NUMERIC(6, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_phone_created ON orders(phone, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_source_id ON orders(source_id) WHERE source_id IS NOT NULL;

-- ============================================================
-- ORDER ITEMS (Snapshot of menu item pricing at order time)
-- ============================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    combo_id UUID REFERENCES combos(id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_paise INT NOT NULL CHECK (unit_price_paise >= 0),
    line_total_paise INT GENERATED ALWAYS AS (unit_price_paise * quantity) STORED,
    is_combo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (menu_item_id IS NOT NULL AND combo_id IS NULL) OR
        (menu_item_id IS NULL AND combo_id IS NOT NULL)
    )
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id) WHERE menu_item_id IS NOT NULL;

-- ============================================================
-- BILLS (Finalized bill - separate from order for POS workflow)
-- ============================================================
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_name TEXT,
    phone TEXT,
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    subtotal_paise INT NOT NULL DEFAULT 0,
    discount_paise INT NOT NULL DEFAULT 0,
    tax_paise INT NOT NULL DEFAULT 0,
    total_paise INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void', 'refunded')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'split')),
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_order_id ON bills(order_id);
CREATE INDEX idx_bills_status_created ON bills(status, created_at DESC);

-- ============================================================
-- BILL ITEMS (Snapshot at bill finalization)
-- ============================================================
CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    name_snapshot TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_paise INT NOT NULL CHECK (unit_price_paise >= 0),
    line_total_paise INT GENERATED ALWAYS AS (unit_price_paise * quantity) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);

-- ============================================================
-- PAYMENTS (Multiple payment methods per bill)
-- ============================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card', 'other')),
    amount_paise INT NOT NULL CHECK (amount_paise > 0),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_bill_id ON payments(bill_id);

-- ============================================================
-- EXPENSES (Cafe operating expenses)
-- ============================================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('ingredients', 'rent', 'utilities', 'staff', 'marketing', 'maintenance', 'other')),
    amount_paise INT NOT NULL CHECK (amount_paise > 0),
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ============================================================
-- REFUNDS (Auditable refund/void operations)
-- ============================================================
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    amount_paise INT NOT NULL CHECK (amount_paise > 0),
    reason TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('full', 'partial', 'void')),
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_bill_id ON refunds(bill_id);

-- ============================================================
-- AUDIT LOG (Immutable audit trail for sensitive changes)
-- ============================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id) WHERE user_id IS NOT NULL;
