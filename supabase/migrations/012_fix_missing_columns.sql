-- Migration 012: Fix Missing Idempotency Key and Rate Limit Table
-- Created: 2026-10-22
-- Description: Add idempotency_key to orders, create rate_limits table with proper indexing

-- Add idempotency_key column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for idempotency keys (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
    ON orders(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP address or user identifier
    endpoint TEXT NOT NULL,   -- e.g., 'submit-review', 'place-order'
    request_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(identifier, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits (via SECURITY DEFINER functions)
-- No direct user policies - managed by check_rate_limit() function

-- Updated at trigger for rate_limits
CREATE TRIGGER trg_rate_limits_updated BEFORE UPDATE ON rate_limits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN orders.idempotency_key IS 'Client-generated UUID for idempotent order creation';