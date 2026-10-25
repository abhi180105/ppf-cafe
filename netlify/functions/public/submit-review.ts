// Netlify Function: Public Review Submission
// POST /.netlify/functions/submit-review

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin } from '../_shared/supabase';
import { SubmitReviewBodySchema, validate } from '../_shared/validation';
import { handleError, handleValidationError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

// Extract client IP with fallback chain (Netlify sets these headers)
function getClientIp(event: HandlerEvent): string {
    const forwarded = event.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',').map(ip => ip.trim());
        for (const ip of ips) {
            if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.')) {
                return ip;
            }
        }
        return ips[0];
    }
    if (event.headers['x-real-ip']) return event.headers['x-real-ip'];
    // @ts-ignore
    if (typeof globalThis !== 'undefined' && (globalThis as any).netlifyContext?.clientContext?.custom?.ip) {
        // @ts-ignore
        return (globalThis as any).netlifyContext.clientContext.custom.ip;
    }
    return 'unknown';
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'submit-review' });

    if (event.httpMethod !== 'POST') return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);
    if (!event.body) return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Request body required', statusCode: 400 }, correlationId);

    // Rate limiting by IP (with improved IP extraction)
    const clientIp = getClientIp(event);
    const supabase = getSupabaseAdmin();
    const { data: rateLimit } = await supabase.rpc('check_rate_limit', { p_identifier: clientIp, p_endpoint: 'submit-review', p_max_requests: 5, p_window_minutes: 15 });
    if (rateLimit && !rateLimit.allowed) return { statusCode: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '900' }, body: JSON.stringify(createErrorResponse({ code: ErrorCodes.RATE_LIMITED, message: 'Rate limit exceeded. Try again later.', statusCode: 429 }, correlationId)) };

    try { const body = JSON.parse(event.body); } catch { return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Invalid JSON', statusCode: 400 }, correlationId); }

    const bodyValidation = validate(SubmitReviewBodySchema, JSON.parse(event.body));
    if (!bodyValidation.success) return handleValidationError(bodyValidation.errors, correlationId);

    const { name, rating, comment } = bodyValidation.data;

    try {
        const { error } = await supabase.from('reviews').insert({ name: name.trim(), rating, comment: comment?.trim() || '' });
        if (error) throw error;
        logger.info('Review submitted successfully', { clientIp });
        return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createSuccessResponse({ message: 'Review submitted successfully' }, correlationId)) };
    } catch (err) { logError('Failed to submit review', { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : undefined); return handleError(err, correlationId); }
};

export { handler };
