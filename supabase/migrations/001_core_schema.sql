-- Migration 001: Core Schema (Menu, Combos, Promos, Settings, Reviews)
-- Created: 2026-10-21
-- Description: Normalized core tables for menu management, combos, promotions, cafe settings, and reviews

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL UNIQUE,  -- original Google Sheets ID for reconciliation
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('veg', 'egg', 'drinks')),
    dine_price_paise INT NOT NULL,        -- stored as paise (₹150.00 → 15000)
    delivery_price_paise INT NOT NULL,
    availability BOOLEAN NOT NULL DEFAULT true,
    deliverable BOOLEAN NOT NULL DEFAULT true,
    image TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_active ON menu_items(is_active) WHERE is_active = true;
CREATE INDEX idx_menu_items_type ON menu_items(item_type);

-- ============================================================
-- COMBOS
-- ============================================================
CREATE TABLE combos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    regular_price_paise INT NOT NULL,
    combo_price_paise INT NOT NULL,
    savings_paise INT GENERATED ALWAYS AS (regular_price_paise - combo_price_paise) STORED,
    image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_combos_active ON combos(is_active) WHERE is_active = true;

-- ============================================================
-- COMBO ITEMS (Many-to-Many: Combo ↔ Menu Items)
-- ============================================================
CREATE TABLE combo_items (
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (combo_id, menu_item_id)
);

-- ============================================================
-- PROMOTIONS
-- ============================================================
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'free_delivery')),
    discount_value INT NOT NULL,  -- paise for fixed, basis points for percent (10% = 1000)
    min_order_paise INT NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_to > valid_from)
);

CREATE INDEX idx_promotions_active_valid ON promotions(is_active, valid_from, valid_to) WHERE is_active = true;
CREATE INDEX idx_promotions_code ON promotions(code);

-- ============================================================
-- CAFE SETTINGS (Single-row table for operational settings)
-- ============================================================
CREATE TABLE cafe_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    is_open BOOLEAN NOT NULL DEFAULT true,
    open_time TIME NOT NULL DEFAULT '10:00',
    close_time TIME NOT NULL DEFAULT '23:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    latitude NUMERIC(10, 7) NOT NULL DEFAULT 28.5418728,
    longitude NUMERIC(10, 7) NOT NULL DEFAULT 77.3357723,
    delivery_radius_km INT NOT NULL DEFAULT 2,
    whatsapp_number TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Insert default settings row
INSERT INTO cafe_settings (id, whatsapp_number)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '917409945954')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT UNIQUE,  -- original GAS review ID if migrated
    name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_created ON reviews(created_at DESC);