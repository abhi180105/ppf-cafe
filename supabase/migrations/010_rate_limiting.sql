-- Migration 010: Rate Limiting for Public Endpoints
-- Created: 2026-10-21
-- Description: Rate limiting functions for public endpoints (reviews, orders)

-- Create rate limit tracking table
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
-- No direct user policies

-- Updated at trigger
CREATE TRIGGER trg_rate_limits_updated BEFORE UPDATE ON rate_limits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Rate limit check function (SECURITY DEFINER for service role)
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_max_requests INT DEFAULT 10,
    p_window_minutes INT DEFAULT 15
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_window_start TIMESTAMPTZ := now() - (p_window_minutes || ' minutes')::interval;
    v_current_count INT;
    v_remaining INT;
BEGIN
    -- Clean old entries
    DELETE FROM rate_limits WHERE window_start < v_window_start;

    -- Get or create rate limit record
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    ON CONFLICT (identifier, endpoint) DO UPDATE SET
        request_count = rate_limits.request_count + 1,
        updated_at = now()
    RETURNING request_count INTO v_current_count;

    v_remaining := GREATEST(p_max_requests - v_current_count, 0);

    IF v_current_count > p_max_requests THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'remaining', 0,
            'reset_at', (now() + (p_window_minutes || ' minutes')::interval)::text,
            'error', 'Rate limit exceeded. Try again later.'
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'remaining', v_remaining,
        'limit', p_max_requests,
        'reset_at', (now() + (p_window_minutes || ' minutes')::interval)::text
    );
END;
$$;

-- Configuration for different endpoints
-- Reviews: 5 per 15 minutes per IP
-- Orders: 10 per 15 minutes per IP
-- These can be adjusted via function parameters

REVOKE ALL ON FUNCTION check_rate_limit FROM PUBLIC;