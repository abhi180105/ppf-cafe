-- Migration 008: SECURITY DEFINER Functions for Netlify Functions
-- Created: 2026-10-22
-- Description: Fixed SECURITY DEFINER functions with proper syntax, search_path, and grants

-- ============================================================
-- SECURITY DEFINER FUNCTION: create_order_server
-- ============================================================
CREATE OR REPLACE FUNCTION create_order_server(
    p_customer_name TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_order_type TEXT,
    p_order_mode TEXT,
    p_scheduled_for TIMESTAMPTZ,
    p_special_instructions TEXT,
    p_delivery_latitude NUMERIC,
    p_delivery_longitude NUMERIC,
    p_items JSONB,
    p_idempotency_key TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_order_id UUID;
    v_subtotal_paise INT := 0;
    v_discount_paise INT := 0;
    v_total_paise INT := 0;
    v_item JSONB;
    v_menu_item RECORD;
    v_combo RECORD;
    v_idempotency_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM orders WHERE idempotency_key = p_idempotency_key)
    INTO v_idempotency_exists;
    IF v_idempotency_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Duplicate order submission', 'code', 'IDEMPOTENCY_CONFLICT');
    END IF;

    IF p_order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid order type');
    END IF;
    IF p_order_mode NOT IN ('ASAP', 'Scheduled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid order mode');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item->>'is_combo')::boolean THEN
            SELECT * INTO v_combo FROM combos WHERE id = (v_item->>'item_id')::uuid AND is_active = true;
            IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive combo'); END IF;
            v_subtotal_paise := v_subtotal_paise + (v_combo.combo_price_paise * (v_item->>'quantity')::int);
        ELSE
            SELECT * INTO v_menu_item FROM menu_items WHERE id = (v_item->>'item_id')::uuid AND is_active = true;
            IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid or unavailable menu item'); END IF;
            IF NOT v_menu_item.availability THEN RETURN jsonb_build_object('success', false, 'error', 'Item not available'); END IF;
            IF p_order_type = 'delivery' AND NOT v_menu_item.deliverable THEN RETURN jsonb_build_object('success', false, 'error', 'Item not deliverable'); END IF;
            v_subtotal_paise := v_subtotal_paise + (
                CASE WHEN p_order_type = 'delivery' THEN v_menu_item.delivery_price_paise ELSE v_menu_item.dine_price_paise END
                * (v_item->>'quantity')::int
            );
        END IF;
    END LOOP;

    IF p_order_type = 'delivery' AND v_subtotal_paise < 20000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum order 200 for delivery');
    END IF;

    v_total_paise := v_subtotal_paise - v_discount_paise;

    INSERT INTO orders (
        idempotency_key, customer_name, phone, address,
        order_type, order_mode, scheduled_for,
        subtotal_paise, discount_paise, total_paise,
        special_instructions, delivery_latitude, delivery_longitude, status
    ) VALUES (
        p_idempotency_key, p_customer_name, p_phone, p_address,
        p_order_type, p_order_mode, p_scheduled_for,
        v_subtotal_paise, v_discount_paise, v_total_paise,
        p_special_instructions, p_delivery_latitude, p_delivery_longitude, 'pending'
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item->>'is_combo')::boolean THEN
            SELECT * INTO v_combo FROM combos WHERE id = (v_item->>'item_id')::uuid;
            INSERT INTO order_items (order_id, combo_id, name_snapshot, quantity, unit_price_paise, is_combo)
            VALUES (v_order_id, v_combo.id, v_combo.name, (v_item->>'quantity')::int, v_combo.combo_price_paise, true);
        ELSE
            SELECT * INTO v_menu_item FROM menu_items WHERE id = (v_item->>'item_id')::uuid;
            INSERT INTO order_items (order_id, menu_item_id, name_snapshot, quantity, unit_price_paise, is_combo)
            VALUES (v_order_id, v_menu_item.id, v_menu_item.name, (v_item->>'quantity')::int,
                CASE WHEN p_order_type = 'delivery' THEN v_menu_item.delivery_price_paise ELSE v_menu_item.dine_price_paise END, false);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'total_paise', v_total_paise, 'subtotal_paise', v_subtotal_paise);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order creation failed: ' || SQLERRM);
END;
$$;

-- ============================================================
-- SECURITY DEFINER FUNCTION: submit_review_server
-- ============================================================
CREATE OR REPLACE FUNCTION submit_review_server(
    p_name TEXT,
    p_rating INT,
    p_comment TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_name IS NULL OR length(trim(p_name)) = 0 OR length(p_name) > 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Name must be 1-100 characters');
    END IF;
    IF p_rating < 1 OR p_rating > 5 THEN RETURN jsonb_build_object('success', false, 'error', 'Rating must be 1-5'); END IF;
    IF p_comment IS NOT NULL AND length(p_comment) > 500 THEN RETURN jsonb_build_object('success', false, 'error', 'Comment must be <=500 characters'); END IF;
    INSERT INTO reviews (name, rating, comment) VALUES (trim(p_name), p_rating, COALESCE(trim(p_comment), ''));
    RETURN jsonb_build_object('success', true, 'message', 'Review submitted');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', 'Review submission failed: ' || SQLERRM);
END;
$$;

-- ============================================================
-- SECURITY DEFINER FUNCTION: get_orders_staff
-- ============================================================
CREATE OR REPLACE FUNCTION get_orders_staff(
    p_status TEXT,
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ,
    p_limit INT,
    p_offset INT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'orders', COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC), '[]'::jsonb),
        'total', COUNT(*) OVER()
    ) INTO v_result
    FROM (
        SELECT * FROM orders
        WHERE (p_status IS NULL OR status = p_status)
        AND (p_from IS NULL OR created_at >= p_from)
        AND (p_to IS NULL OR created_at <= p_to)
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) o;
    RETURN COALESCE(v_result, jsonb_build_object('orders', '[]'::jsonb, 'total', 0));
END;
$$;

-- ============================================================
-- SECURITY DEFINER FUNCTION: create_bill_from_order_server
-- ============================================================
CREATE OR REPLACE FUNCTION create_bill_from_order_server(
    p_order_id UUID,
    p_payment_method TEXT,
    p_discount_paise INT,
    p_tax_paise INT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_order RECORD;
    v_bill_id UUID;
    v_bill_number TEXT;
    v_subtotal_paise INT;
    v_total_paise INT;
    v_item RECORD;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
    IF v_order.status NOT IN ('confirmed', 'preparing', 'ready', 'completed') THEN RETURN jsonb_build_object('success', false, 'error', 'Order not in billable state'); END IF;
    IF p_payment_method NOT IN ('cash', 'upi', 'card', 'split') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid payment method'); END IF;
    SELECT COALESCE(SUM(line_total_paise), 0) INTO v_subtotal_paise FROM order_items WHERE order_id = p_order_id;
    v_total_paise := v_subtotal_paise - p_discount_paise + p_tax_paise;
    INSERT INTO bills (order_id, customer_name, phone, order_type, subtotal_paise, discount_paise, tax_paise, total_paise, status, payment_method)
    VALUES (p_order_id, v_order.customer_name, v_order.phone, v_order.order_type, v_subtotal_paise, p_discount_paise, p_tax_paise, v_total_paise, 'open', p_payment_method)
    RETURNING id, bill_number INTO v_bill_id, v_bill_number;
    FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
        INSERT INTO bill_items (bill_id, order_item_id, menu_item_id, name_snapshot, quantity, unit_price_paise) VALUES (v_bill_id, v_item.id, v_item.menu_item_id, v_item.name_snapshot, v_item.quantity, v_item.unit_price_paise);
    END LOOP;
    UPDATE orders SET status = 'completed', completed_at = now() WHERE id = p_order_id;
    RETURN jsonb_build_object('success', true, 'bill_id', v_bill_id, 'bill_number', v_bill_number, 'total_paise', v_total_paise);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', 'Bill creation failed: ' || SQLERRM);
END;
$$;

-- ============================================================
-- SECURITY DEFINER FUNCTION: check_rate_limit
-- ============================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_max_requests INT,
    p_window_minutes INT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_window_start TIMESTAMPTZ := now() - (p_window_minutes || ' minutes')::interval;
    v_current_count INT;
    v_remaining INT;
BEGIN
    DELETE FROM rate_limits WHERE window_start < v_window_start;
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now())
    ON CONFLICT (identifier, endpoint) DO UPDATE SET
        request_count = rate_limits.request_count + 1,
        updated_at = now()
    RETURNING request_count INTO v_current_count;
    v_remaining := GREATEST(p_max_requests - v_current_count, 0);
    IF v_current_count > p_max_requests THEN
        RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reset_at', (now() + (p_window_minutes || ' minutes')::interval)::text, 'error', 'Rate limit exceeded. Try again later.');
    END IF;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', p_max_requests, 'reset_at', (now() + (p_window_minutes || ' minutes')::interval)::text);
END;
$$;

REVOKE ALL ON FUNCTION create_order_server(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_review_server(TEXT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_orders_staff(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_bill_from_order_server(UUID, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION check_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC;

-- ============================================================
-- SECURITY DEFINER FUNCTION: is_staff_v2_safe
-- Safe wrapper for Netlify Functions to check staff status
-- Returns false instead of error if auth.uid() unavailable
-- ============================================================
CREATE OR REPLACE FUNCTION is_staff_v2_safe(
    p_user_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_staff BOOLEAN := false;
BEGIN
    -- Use PL/pgSQL to handle missing auth.uid() gracefully
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM staff_users
            WHERE user_id = p_user_id
            AND is_active = true
        ) INTO v_is_staff;
    EXCEPTION WHEN OTHERS THEN
        -- Fail closed: deny access on any error
        v_is_staff := false;
    END;
    RETURN v_is_staff;
END;
$$;

-- Revoke execute from PUBLIC (service role only via SECURITY DEFINER)
REVOKE ALL ON FUNCTION is_staff_v2_safe(UUID) FROM PUBLIC;
