-- Migration 011: Idempotency Keys for Orders
-- Created: 2026-10-21
-- Description: Add idempotency_key column to orders table for duplicate prevention

-- Add idempotency_key column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for idempotency keys (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
    ON orders(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.idempotency_key IS 'Client-generated UUID for idempotent order creation';