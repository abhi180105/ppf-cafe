// Netlify Functions - Error Handling and Standardized Responses

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode: number;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    correlationId: string;
}

// Error codes
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
} as const;

// Create standardized error
export function createApiError(code: keyof typeof ErrorCodes, message: string, details?: Record<string, unknown>, statusCode: number = 400): ApiError {
    return {
        code: ErrorCodes[code],
        message,
        details,
        statusCode,
    };
}

// Create success response
export function createSuccessResponse<T>(data: T, correlationId: string): ApiResponse<T> {
    return { success: true, data, correlationId };
}

// Create error response
export function createErrorResponse(error: ApiError, correlationId: string): ApiResponse<never> {
    return { success: false, error, correlationId };
}

// Handle unexpected errors
export function handleError(err: unknown, correlationId: string): ApiResponse<never> {
    console.error(`[${correlationId}] Unhandled error:`, err);
    
    if (err instanceof Error) {
        return createErrorResponse(createApiError('INTERNAL_ERROR', 'An unexpected error occurred', { message: err.message }, 500), correlationId);
    }
    
    return createErrorResponse(createApiError('INTERNAL_ERROR', 'An unexpected error occurred', {}, 500), correlationId);
}

// Handle Zod validation errors
export function handleValidationError(err: import('zod').ZodError, correlationId: string): ApiResponse<never> {
    const details = err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
    }));
    
    return createErrorResponse(createApiError('VALIDATION_ERROR', 'Request validation failed', { fields: details }, 400), correlationId);
}