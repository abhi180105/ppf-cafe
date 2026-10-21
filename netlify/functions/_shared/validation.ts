// Netlify Functions - Request Validation Schemas
// Uses Zod for runtime validation

import { z } from 'zod';

// ============================================================
// Public Menu/Status - Query Parameters
// ============================================================
export const GetMenuQuerySchema = z.object({
    category: z.string().optional(),
    type: z.enum(['veg', 'egg', 'drinks']).optional(),
    active_only: z.coerce.boolean().default(true),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export type GetMenuQuery = z.infer<typeof GetMenuQuerySchema>;

// ============================================================
// Public Review Submission
// ============================================================
export const SubmitReviewBodySchema = z.object({
    name: z.string().min(1).max(100),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional().default(''),
});

export type SubmitReviewBody = z.infer<typeof SubmitReviewBodySchema>;

// ============================================================
// Customer Order Creation
// ============================================================
export const OrderItemSchema = z.object({
    item_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(50),
    is_combo: z.boolean().default(false),
});

export const PlaceOrderBodySchema = z.object({
    customer_name: z.string().min(1).max(100),
    phone: z.string().min(10).max(15).regex(/^\d+$/),
    address: z.string().max(500).optional().default(''),
    order_type: z.enum(['dine_in', 'takeaway', 'delivery']),
    order_mode: z.enum(['ASAP', 'Scheduled']).default('ASAP'),
    scheduled_for: z.string().datetime().optional(), // ISO 8601
    special_instructions: z.string().max(500).optional().default(''),
    delivery_latitude: z.number().min(-90).max(90).optional(),
    delivery_longitude: z.number().min(-180).max(180).optional(),
    items: z.array(OrderItemSchema).min(1).max(50),
    idempotency_key: z.string().uuid(), // Client-generated UUID v4
});

export type PlaceOrderBody = z.infer<typeof PlaceOrderBodySchema>;

// ============================================================
// Staff Verification
// ============================================================
export const StaffVerifyBodySchema = z.object({
    // Token is passed in Authorization header, not body
});

export type StaffVerifyBody = z.infer<typeof StaffVerifyBodySchema>;

// ============================================================
// Staff Orders Query
// ============================================================
export const StaffOrdersQuerySchema = z.object({
    status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export type StaffOrdersQuery = z.infer<typeof StaffOrdersQuerySchema>;

// ============================================================
// Staff Create Bill
// ============================================================
export const CreateBillBodySchema = z.object({
    order_id: z.string().uuid(),
    payment_method: z.enum(['cash', 'upi', 'card', 'split']),
    discount_paise: z.number().int().min(0).default(0),
    tax_paise: z.number().int().min(0).default(0),
});

export type CreateBillBody = z.infer<typeof CreateBillBodySchema>;

// ============================================================
// Validation Helper
// ============================================================
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}