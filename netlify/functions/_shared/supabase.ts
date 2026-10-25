// Netlify Functions - Server-only Supabase Client
// This file must NEVER be imported in frontend code
// Uses service role key for elevated privileges

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (supabaseAdmin) return supabaseAdmin;

    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Netlify environment variables');
    }

    supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return supabaseAdmin;
}

// Helper to get user from JWT (for staff verification)
export async function getUserFromToken(token: string) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return { user: null, error };
    return { user: data.user, error: null };
}

// Check if user has staff role via staff_users table (authoritative source)
// This replaces the JWT-based check to align with DB RLS policies
export async function isStaff(userId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('is_staff_v2_safe', { p_user_id: userId });
    if (error) {
        // Fail closed - deny access on error
        return false;
    }
    return data === true;
}

// Legacy JWT-based check (deprecated - kept for reference)
export function isStaffLegacy(user: { app_metadata?: Record<string, unknown> } | null): boolean {
    if (!user) return false;
    return user.app_metadata?.role === 'staff';
}

// Correlation ID for request tracing
export function generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
