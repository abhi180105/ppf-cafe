-- Development Seed Data
-- Created: 2026-10-21
-- Description: Sample data for local development and testing

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
INSERT INTO menu_categories (name, display_order) VALUES
    ('Burgers', 1),
    ('Fries & Sides', 2),
    ('Drinks', 3),
    ('Combos', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- MENU ITEMS (matching Google Sheets mock data)
-- ============================================================
INSERT INTO menu_items (source_id, category_id, name, item_type, dine_price_paise, delivery_price_paise, availability, deliverable, image, description, is_active) VALUES
    ('1', (SELECT id FROM menu_categories WHERE name = 'Burgers'), 'Classic Burger', 'veg', 15000, 18000, true, true, '/items/burger.jpg', 'Delicious veg burger', true),
    ('2', (SELECT id FROM menu_categories WHERE name = 'Fries & Sides'), 'Regular Fries', 'veg', 8000, 10000, true, true, '/items/fries.jpg', 'Crispy golden fries', true),
    ('3', (SELECT id FROM menu_categories WHERE name = 'Drinks'), 'Coke', 'drinks', 4000, 5000, true, false, '/items/chai.jpg', 'Chilled Coca-Cola', true),
    ('4', (SELECT id FROM menu_categories WHERE name = 'Burgers'), 'Egg Burger', 'egg', 12000, 15000, true, true, '/items/burger.jpg', 'Tasty egg burger', true)
ON CONFLICT (source_id) DO NOTHING;

-- ============================================================
-- CAFE SETTINGS
-- ============================================================
INSERT INTO cafe_settings (id, is_open, open_time, close_time, timezone, latitude, longitude, delivery_radius_km, whatsapp_number)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    '10:00',
    '23:00',
    'Asia/Kolkata',
    28.5418728,
    77.3357723,
    2,
    '917409945954'
)
ON CONFLICT (id) DO UPDATE SET
    whatsapp_number = EXCLUDED.whatsapp_number;

-- ============================================================
-- SAMPLE REVIEWS
-- ==================================----------------
INSERT INTO reviews (name, rating, comment) VALUES
    ('John Doe', 5, 'Best burgers in town!'),
    ('Jane Smith', 4, 'Great service, tasty food'),
    ('Mike Johnson', 5, 'Love the egg burger combo')
ON CONFLICT DO NOTHING;