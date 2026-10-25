// Netlify Function: Staff Session Verification
// POST /.netlify/functions/staff-verify

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin, getUserFromToken, isStaff } from '../_shared/supabase';
import { handleError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'staff-verify' });

    if (event.httpMethod !== 'POST') return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) return createErrorResponse({ code: ErrorCodes.UNAUTHORIZED, message: 'Missing or invalid authorization header', statusCode: 401 }, correlationId);

    const token = authHeader.slice(7);
    const { user, error } = await getUserFromToken(token);
    if (error || !user) return createErrorResponse({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid or expired token', statusCode: 401 }, correlationId);

    // Verify staff status via staff_users table (authoritative source)
    const staff = await isStaff(user.id);
    if (!staff) return createErrorResponse({ code: ErrorCodes.FORBIDDEN, message: 'Staff access required', statusCode: 403 }, correlationId);

    logger.info('Staff session verified', { userId: user.id });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createSuccessResponse({ staff: true, user: { id: user.id, email: user.email, role: user.app_metadata?.role } }, correlationId)) };
};

export { handler };
