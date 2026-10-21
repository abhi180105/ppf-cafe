// Netlify Function: Customer Order Creation
// POST /.netlify/functions/place-order

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin } from '../_shared/supabase';
import { PlaceOrderBodySchema, validate } from '../_shared/validation';
import { handleError, handleValidationError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'place-order' });

    if (event.httpMethod !== 'POST') return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);
    if (!event.body) return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Request body required', statusCode: 400 }, correlationId);

    // Rate limiting by IP
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || event.headers['x-real-ip'] || 'unknown';
    const supabase = getSupabaseAdmin();
    const { data: rateLimit } = await supabase.rpc('check_rate_limit', { p_identifier: clientIp, p_endpoint: 'place-order', p_max_requests: 10, p_window_minutes: 15 });
    if (rateLimit && !rateLimit.allowed) return { statusCode: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '900' }, body: JSON.stringify(createErrorResponse({ code: ErrorCodes.RATE_LIMITED, message: 'Rate limit exceeded. Try again later.', statusCode: 429 }, correlationId)) };

    let body: unknown;
    try { body = JSON.parse(event.body || '{}'); } catch { return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid JSON', statusCode: 400 }, correlationId); }

    const bodyValidation = validate(PlaceOrderBodySchema, body);
    if (!bodyValidation.success) return handleValidationError(bodyValidation.errors, correlationId);

    const orderData = bodyValidation.data;

    try {
        const { data: result, error } = await supabase.rpc('create_order_server', {
            p_customer_name: orderData.customer_name,
            p_phone: orderData.phone,
            p_address: orderData.address,
            p_order_type: orderData.order_type,
            p_order_mode: orderData.order_mode,
            p_scheduled_for: orderData.scheduled_for || null,
            p_special_instructions: orderData.special_instructions,
            p_delivery_latitude: orderData.delivery_latitude || null,
            p_delivery_longitude: orderData.delivery_longitude || null,
            p_items: orderData.items,
            p_idempotency_key: orderData.idempotency_key,
        });

        if (error) throw error;
        if (!result.success) return createErrorResponse({ code: result.code || ErrorCodes.INTERNAL_ERROR, message: result.error, statusCode: result.code === 'IDEMPOTENCY_CONFLICT' ? 409 : 400 }, correlationId);

        logger.info('Order created successfully', { orderId: result.order_id, totalPaise: result.total_paise });
        return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createSuccessResponse({ order_id: result.order_id, total_paise: result.total_paise, subtotal_paise: result.subtotal_paise }, correlationId)) };
    } catch (err) { logError('Failed to place order', { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : undefined); return handleError(err, correlationId); }
};

export { handler };