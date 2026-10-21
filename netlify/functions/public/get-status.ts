// Netlify Function: Public Cafe Status Endpoint
// GET /.netlify/functions/get-status

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin } from '../_shared/supabase';
import { handleError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'get-status' });

    if (event.httpMethod !== 'GET') {
        return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);
    }

    try {
        const supabase = getSupabaseAdmin();
        const { data: settings, error } = await supabase.from('cafe_settings').select('is_open, open_time, close_time, timezone').single();
        if (error) throw error;

        const response = { is_open: settings.is_open, open_time: settings.open_time, close_time: settings.close_time, timezone: settings.timezone };
        logger.info('Status fetched successfully');
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' }, body: JSON.stringify(createSuccessResponse(response, correlationId)) };
    } catch (err) { logError('Failed to fetch status', { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : undefined); return handleError(err, correlationId); }
};

export { handler };