// Netlify Function: Staff Orders List
// GET /.netlify/functions/staff-orders

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin, getUserFromToken, isStaff } from '../_shared/supabase';
import { StaffOrdersQuerySchema, validate } from '../_shared/validation';
import { handleError, handleValidationError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'staff-orders' });

    if (event.httpMethod !== 'GET') return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) return createErrorResponse({ code: ErrorCodes.UNAUTHORIZED, message: 'Missing or invalid authorization header', statusCode: 401 }, correlationId);

    const token = authHeader.slice(7);
    const { user, error: authError } = await getUserFromToken(token);
    if (authError || !user) return createErrorResponse({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid or expired token', statusCode: 401 }, correlationId);
    if (!isStaff(user)) return createErrorResponse({ code: ErrorCodes.FORBIDDEN, message: 'Staff access required', statusCode: 403 }, correlationId);

    const queryValidation = validate(StaffOrdersQuerySchema, event.queryStringParameters || {});
    if (!queryValidation.success) return handleValidationError(queryValidation.errors, correlationId);

    const { status, from, to, limit, offset } = queryValidation.data;

    try {
        const { data: result, error } = await supabase.rpc('get_orders_staff', { p_status: status || null, p_from: from || null, p_to: to || null, p_limit: limit, p_offset: offset });
        if (error) throw error;

        logger.info('Staff orders fetched', { count: result?.orders?.length || 0 });
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createSuccessResponse(result || { orders: [], total: 0 }, correlationId)) };
    } catch (err) { logError('Failed to fetch staff orders', { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : undefined); return handleError(err, correlationId); }
};

export { handler };