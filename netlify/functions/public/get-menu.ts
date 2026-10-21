// Netlify Function: Public Menu Endpoint
// GET /.netlify/functions/get-menu

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { getSupabaseAdmin } from '../_shared/supabase';
import { GetMenuQuerySchema, validate } from '../_shared/validation';
import { handleError, handleValidationError, createSuccessResponse, createErrorResponse, ErrorCodes } from '../_shared/errors';
import { logInfo, logError, createChildLogger } from '../_shared/logging';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const logger = createChildLogger({ correlationId, functionName: 'get-menu' });

    if (event.httpMethod !== 'GET') {
        return createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Method not allowed', statusCode: 405 }, correlationId);
    }

    const queryValidation = validate(GetMenuQuerySchema, event.queryStringParameters || {});
    if (!queryValidation.success) return handleValidationError(queryValidation.errors, correlationId);

    const { category, type, active_only, limit, offset } = queryValidation.data;

    try {
        const supabase = getSupabaseAdmin();

        let menuQuery = supabase.from('menu_items').select('id, source_id, name, item_type, dine_price_paise, delivery_price_paise, availability, deliverable, image, description, is_active, menu_categories!inner(name, display_order)', { count: 'exact' }).order('display_order', { referencedTable: 'menu_categories', ascending: true }).order('name', { ascending: true }).range(offset, offset + limit - 1);
        if (active_only) menuQuery = menuQuery.eq('is_active', true).eq('availability', true);
        if (category) menuQuery = menuQuery.eq('menu_categories.name', category);
        if (type) menuQuery = menuQuery.eq('item_type', type);
        const { data: menuItems, error: menuError, count } = await menuQuery;
        if (menuError) throw menuError;

        let comboQuery = supabase.from('combos').select('id, source_id, name, description, regular_price_paise, combo_price_paise, savings_paise, image, is_active, combo_items!inner(menu_item_id, quantity, menu_items!inner(name, dine_price_paise, delivery_price_paise))', { count: 'exact' }).order('name', { ascending: true });
        if (active_only) comboQuery = comboQuery.eq('is_active', true);
        const { data: combos, error: comboError } = await comboQuery;
        if (comboError) throw comboError;

        const now = new Date().toISOString();
        let promoQuery = supabase.from('promotions').select('id, source_id, code, title, description, discount_type, discount_value, min_order_paise, valid_from, valid_to, max_uses, used_count, is_active', { count: 'exact' }).eq('is_active', true).lte('valid_from', now).gte('valid_to', now).order('valid_from', { ascending: true });
        const { data: promotions, error: promoError } = await promoQuery;
        if (promoError) throw promoError;

        const { data: settings, error: settingsError } = await supabase.from('cafe_settings').select('is_open, open_time, close_time, timezone, latitude, longitude, delivery_radius_km, whatsapp_number').single();
        if (settingsError) throw settingsError;

        const response = { menu: menuItems?.map(item => ({ id: item.id, source_id: item.source_id, category: item.menu_categories?.name, name: item.name, type: item.item_type, dine_price_paise: item.dine_price_paise, delivery_price_paise: item.delivery_price_paise, availability: item.availability, deliverable: item.deliverable, image: item.image, description: item.description })) || [], combos: combos?.map(combo => ({ id: combo.id, source_id: combo.source_id, name: combo.name, description: combo.description, regular_price_paise: combo.regular_price_paise, combo_price_paise: combo.combo_price_paise, savings_paise: combo.savings_paise, image: combo.image, items: combo.combo_items?.map(ci => ({ menu_item_id: ci.menu_item_id, quantity: ci.quantity, name: ci.menu_items?.name, dine_price_paise: ci.menu_items?.dine_price_paise, delivery_price_paise: ci.menu_items?.delivery_price_paise })) || [] })) || [], promotions: promotions?.map(promo => ({ id: promo.id, source_id: promo.source_id, code: promo.code, title: promo.title, description: promo.description, discount_type: promo.discount_type, discount_value: promo.discount_value, min_order_paise: promo.min_order_paise, valid_from: promo.valid_from, valid_to: promo.valid_to, max_uses: promo.max_uses, used_count: promo.used_count })) || [], settings: settings ? { is_open: settings.is_open, open_time: settings.open_time, close_time: settings.close_time, timezone: settings.timezone, latitude: settings.latitude, longitude: settings.longitude, delivery_radius_km: settings.delivery_radius_km, whatsapp_number: settings.whatsapp_number } : null, meta: { total_menu_items: count || 0, limit, offset } };

        logger.info('Menu fetched successfully', { itemCount: response.menu.length, comboCount: response.combos.length });
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }, body: JSON.stringify(createSuccessResponse(response, correlationId)) };
    } catch (err) { logError('Failed to fetch menu', { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : undefined); return handleError(err, correlationId); }
};

export { handler };