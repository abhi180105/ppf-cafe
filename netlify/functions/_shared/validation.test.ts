// Tests for Validation Schemas
import { describe, it, expect } from 'vitest';
import { GetMenuQuerySchema, SubmitReviewBodySchema, PlaceOrderBodySchema, StaffOrdersQuerySchema, CreateBillBodySchema, validate } from '../_shared/validation';

describe('Validation Schemas', () => {
    describe('GetMenuQuerySchema', () => {
        it('should parse valid query with defaults', () => {
            const result = GetMenuQuerySchema.parse({});
            expect(result.active_only).toBe(true);
            expect(result.limit).toBe(50);
            expect(result.offset).toBe(0);
        });
        it('should parse valid query with all params', () => {
            const result = GetMenuQuerySchema.parse({ category: 'Burgers', type: 'veg', active_only: false, limit: '25', offset: '10' });
            expect(result.category).toBe('Burgers');
            expect(result.type).toBe('veg');
            expect(result.active_only).toBe(false);
            expect(result.limit).toBe(25);
            expect(result.offset).toBe(10);
        });
        it('should reject invalid type', () => { expect(() => GetMenuQuerySchema.parse({ type: 'invalid' })).toThrow(); });
        it('should reject limit > 100', () => { expect(() => GetMenuQuerySchema.parse({ limit: '101' })).toThrow(); });
    });
    describe('SubmitReviewBodySchema', () => {
        it('should parse valid review', () => {
            const result = SubmitReviewBodySchema.parse({ name: 'John Doe', rating: 5, comment: 'Great food!' });
            expect(result.name).toBe('John Doe');
            expect(result.rating).toBe(5);
        });
        it('should default comment to empty string', () => { const result = SubmitReviewBodySchema.parse({ name: 'John', rating: 4 }); expect(result.comment).toBe(''); });
        it('should reject empty name', () => { expect(() => SubmitReviewBodySchema.parse({ name: '', rating: 5 })).toThrow(); });
        it('should reject name > 100 chars', () => { expect(() => SubmitReviewBodySchema.parse({ name: 'a'.repeat(101), rating: 5 })).toThrow(); });
        it('should reject rating < 1', () => { expect(() => SubmitReviewBodySchema.parse({ name: 'John', rating: 0 })).toThrow(); });
        it('should reject rating > 5', () => { expect(() => SubmitReviewBodySchema.parse({ name: 'John', rating: 6 })).toThrow(); });
        it('should reject comment > 500 chars', () => { expect(() => SubmitReviewBodySchema.parse({ name: 'John', rating: 5, comment: 'a'.repeat(501) })).toThrow(); });
    });
    describe('PlaceOrderBodySchema', () => {
        const validOrder = { customer_name: 'John Doe', phone: '917409945954', address: '123 Main St', order_type: 'delivery', order_mode: 'ASAP', items: [{ item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2, is_combo: false }], idempotency_key: '550e8400-e29b-41d4-a716-446655440001' };
        it('should parse valid order', () => { const result = PlaceOrderBodySchema.parse(validOrder); expect(result.customer_name).toBe('John Doe'); });
        it('should default address', () => { const { address, ...rest } = validOrder; const result = PlaceOrderBodySchema.parse(rest); expect(result.address).toBe(''); });
        it('should default order_mode to ASAP', () => { const { order_mode, ...rest } = validOrder; const result = PlaceOrderBodySchema.parse(rest); expect(result.order_mode).toBe('ASAP'); });
        it('should reject invalid order_type', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, order_type: 'invalid' })).toThrow(); });
        it('should reject invalid order_mode', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, order_mode: 'invalid' })).toThrow(); });
        it('should reject phone with non-digits', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, phone: 'abc123' })).toThrow(); });
        it('should reject phone too short', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, phone: '123' })).toThrow(); });
        it('should reject empty items', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, items: [] })).toThrow(); });
        it('should reject items > 50', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, items: new Array(51).fill(validOrder.items[0]) })).toThrow(); });
        it('should reject invalid item_id UUID', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, items: [{ item_id: 'invalid', quantity: 1 }] })).toThrow(); });
        it('should reject quantity < 1', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, items: [{ item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 0 }] })).toThrow(); });
        it('should reject quantity > 50', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, items: [{ item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 51 }] })).toThrow(); });
        it('should require idempotency_key as UUID', () => { expect(() => PlaceOrderBodySchema.parse({ ...validOrder, idempotency_key: 'invalid' })).toThrow(); });
    });
    describe('StaffOrdersQuerySchema', () => {
        it('should parse valid query with defaults', () => { const result = StaffOrdersQuerySchema.parse({}); expect(result.limit).toBe(50); });
        it('should parse valid status', () => { const result = StaffOrdersQuerySchema.parse({ status: 'completed' }); expect(result.status).toBe('completed'); });
        it('should reject invalid status', () => { expect(() => StaffOrdersQuerySchema.parse({ status: 'invalid' })).toThrow(); });
    });
    describe('CreateBillBodySchema', () => {
        it('should parse valid bill', () => { const result = CreateBillBodySchema.parse({ order_id: '550e8400-e29b-41d4-a716-446655440000', payment_method: 'upi', discount_paise: 1000, tax_paise: 500 }); expect(result.payment_method).toBe('upi'); });
        it('should default discount_paise and tax_paise to 0', () => { const result = CreateBillBodySchema.parse({ order_id: '550e8400-e29b-41d4-a716-446655440000', payment_method: 'cash' }); expect(result.discount_paise).toBe(0); });
        it('should reject invalid payment_method', () => { expect(() => CreateBillBodySchema.parse({ order_id: '550e8400-e29b-41d4-a716-446655440000', payment_method: 'bitcoin' })).toThrow(); });
    });
    describe('validate helper', () => {
        it('returns success with data for valid input', () => { const result = validate(SubmitReviewBodySchema, { name: 'John', rating: 5 }); expect(result.success).toBe(true); });
        it('returns failure with errors for invalid input', () => { const result = validate(SubmitReviewBodySchema, { name: '', rating: 5 }); expect(result.success).toBe(false); });
    });
});
