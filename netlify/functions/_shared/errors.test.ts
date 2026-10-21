// Tests for Error Handling Utilities
import { describe, it, expect } from 'vitest';
import { createApiError, createSuccessResponse, createErrorResponse, ErrorCodes, handleValidationError } from './errors';
import { ZodError } from 'zod';

describe('Error Handling Utilities', () => {
    const correlationId = 'test-correlation-id';

    describe('ErrorCodes', () => {
        it('should have all required error codes', () => {
            expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
            expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
            expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
            expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
            expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
            expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
            expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
            expect(ErrorCodes.IDEMPOTENCY_CONFLICT).toBe('IDEMPOTENCY_CONFLICT');
        });
    });

    describe('createApiError', () => {
        it('should create error with all fields', () => {
            const error = createApiError('VALIDATION_ERROR', 'Invalid input', { field: 'name' }, 400);
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.message).toBe('Invalid input');
            expect(error.details).toEqual({ field: 'name' });
            expect(error.statusCode).toBe(400);
        });

        it('should default statusCode to 400', () => {
            const error = createApiError('INTERNAL_ERROR', 'Server error');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('createSuccessResponse', () => {
        it('should create success response with data and correlationId', () => {
            const response = createSuccessResponse({ order_id: '123' }, 'corr-123');
            expect(response.success).toBe(true);
            expect(response.data).toEqual({ order_id: '123' });
            expect(response.correlationId).toBe('corr-123');
            expect(response.error).toBeUndefined();
        });

        it('should handle null data', () => {
            const response = createSuccessResponse(null, 'corr-123');
            expect(response.success).toBe(true);
            expect(response.data).toBeNull();
        });
    });

    describe('createErrorResponse', () => {
        it('should create error response with error and correlationId', () => {
            const error = createApiError('VALIDATION_ERROR', 'Invalid input');
            const response = createErrorResponse(error, 'corr-123');
            expect(response.success).toBe(false);
            expect(response.error).toEqual(error);
            expect(response.correlationId).toBe('corr-123');
            expect(response.data).toBeUndefined();
        });
    });

    describe('handleValidationError', () => {
        it('should format ZodError into ApiErrorResponse', () => {
            // Create a ZodError manually
            const zodError = new ZodError([
                { code: 'too_small', minimum: 1, type: 'number', inclusive: true, exact: false, message: 'Rating must be at least 1', path: ['rating'] },
                { code: 'too_big', maximum: 100, type: 'string', inclusive: true, exact: false, message: 'Name too long', path: ['name'] },
            ]);

            const response = handleValidationError(zodError, 'corr-123');
            expect(response.success).toBe(false);
            expect(response.error?.code).toBe('VALIDATION_ERROR');
            expect(response.correlationId).toBe('corr-123');
            expect(response.error?.details?.fields).toHaveLength(2);
            expect(response.error?.details?.fields[0].path).toBe('rating');
            expect(response.error?.details?.fields[1].path).toBe('name');
        });
    });
});