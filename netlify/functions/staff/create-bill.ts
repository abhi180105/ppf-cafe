// Netlify Function: Staff Create Bill from Order
// POST /.netlify/functions/staff-create-bill

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin, getUserFromToken, isStaff } from '../_shared/supabase';
import { CreateBillBodySchema, validate } from '../_shared/validation';
import { handleError, handleValidationError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'staff-create-bill' });

    if (event.httpMethod !== 'POST') return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);
    if (!event.body) return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Request body required', statusCode: 400 }, correlationId);

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) return createErrorResponse({ code: ErrorCodes.UNAUTHORIZED, message: 'Missing or invalid authorization header', statusCode: 401 }, correlationId);

    const token = authHeader.slice(7);
    const { user, error: authError } = await getUserFromToken(token);
    if (authError || !user) return createErrorResponse({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid or expired token', statusCode: 401 }, correlationId);
    
    // Verify staff status via staff_users table (authoritative source)
    if (!await isStaff(user.id)) return createErrorResponse({ code: ErrorCodes.FORBIDDEN, message: 'Staff access required', statusCode: 403 }, correlationId);

    let body: unknown;
    try { body = JSON.parse(event.body); } catch { return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid JSON', statusCode: 400 }, correlationId); }

    const bodyValidation = validate(CreateBillBodySchema, body);
    if (!bodyValidation.success) return handleValidationError(bodyValidation.errors, correlationId);

    const { order_id, payment_method, discount_paise, tax_paise } = bodyValidation.data;

    try {
        const { data: result, error } = await supabase.rpc('create_bill_from_order_server', { p_order_id: order_id, p_payment_method: payment_method, p_discount_paise: discount_paise || 0, p_tax_paise: tax_paise || 0 });
        if (error) throw error;
        if (!result.success) return createErrorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: result.error, statusCode: 400 }, correlationId);

        logger.info('Bill created from order', { billId: result.bill_id, billNumber: result.bill_number });
        return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createSuccessResponse({ bill_id: result.bill_id, bill_number: result.bill_number, total_paise: result.total_paise }, correlationId)) };
    } catch (err) { logError('Failed to create bill', { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : undefined); return handleError(err, correlationId); }
};

export { handler };
