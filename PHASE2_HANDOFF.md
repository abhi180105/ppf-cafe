# Phase 2 Handoff — Prerequisites & Dependencies

**Status:** Phase 1 complete — ready for Phase 2 after credential rotation

---

## Phase 2 Scope (Not Implemented in Phase 1)

- Supabase project creation and PostgreSQL schema
- Row Level Security (RLS) policies
- Supabase Auth for single staff account
- Netlify Functions for server-side financial operations
- POS screens, bill printing, expenses, payments, refunds
- Data migration from Google Sheets to Supabase
- Reporting & analytics

---

## Prerequisites (Must Complete Before Phase 2)

### 1. Credential Rotation (Owner Action Required)
- [ ] **Redeploy Google Apps Script** as new Web App → get new URL
- [ ] **Generate strong secret:** `openssl rand -hex 32`
- [ ] **Update GAS `API_KEY`** constant in deployed script
- [ ] **Update Netlify env vars:** `VITE_SHEET_API_URL`, `VITE_API_SECRET`
- [ ] **Update local `.env`** with new values
- [ ] **Tighten CSP** `connect-src` in `public/_headers` to new GAS URL pattern

### 2. Supabase Project Setup
- [ ] Create Supabase project (free tier)
- [ ] Note: Project URL, anon key, service role key
- [ ] Enable **Email** auth provider (magic link)
- [ ] Configure **Redirect URLs** for Netlify deployment

### 3. Database Schema Design
- [ ] `menu_items` — id, category, name, type, dine_price, delivery_price, availability, deliverable, image, description, created_at, updated_at
- [ ] `combos` — id, name, description, regular_price, combo_price, savings, image, items (jsonb), is_active, created_at
- [ ] `promos` — id, code, type (percent/fixed/free_delivery), value, min_order, start_date, end_date, max_uses, used_count, is_active
- [ ] `orders` — id, customer_name, phone, address, items (jsonb), subtotal, total, order_type, status, scheduled_for, created_at
- [ ] `order_items` — id, order_id, menu_item_id, quantity, unit_price, line_total
- [ ] `reviews` — id, name, rating, comment, created_at
- [ ] `cafe_status` — id (single row), is_open, open_time, close_time, timezone, updated_at
- [ ] `expenses` — id, category, amount, description, date, created_by
- [ ] `payments` — id, order_id, method, amount, reference, status, created_at
- [ ] `audit_log` — id, table_name, record_id, action, old_data, new_data, user_id, created_at

### 4. Row Level Security Policies
- [ ] `menu_items`, `combos`, `promos`, `cafe_status`: **Public read**, staff write
- [ ] `reviews`: Public read, public insert (with validation), staff moderation
- [ ] `orders`: Staff read/write, customer insert (via edge function)
- [ ] `expenses`, `payments`, `audit_log`: Staff only

### 5. Netlify Functions (Server-Side Operations)
- [ ] `place-order` — validate prices from DB, compute total, insert order, return WhatsApp link
- [ ] `add-review` — validate, insert review
- [ ] `get-menu` — public, cached
- [ ] `get-status` — public, cached
- [ ] `staff-login` — Supabase magic link
- [ ] `staff-orders` — authenticated staff only
- [ ] `staff-expenses` — CRUD for expenses
- [ ] `staff-reports` — aggregated queries

### 6. Data Migration Strategy
- [ ] **Backup Google Sheets** (File → Download → CSV for each tab)
- [ ] Write migration scripts (Node.js + Supabase client)
- [ ] **Preserve historical data** — do not delete Sheets until verified
- [ ] Reconcile order IDs, review IDs, menu item IDs
- [ ] Test migration on staging Supabase project first
- [ ] Cutover plan: DNS switch, env var updates, GAS deprecation

### 7. Frontend Integration Changes
- [ ] Replace `sheetAPI.js` calls with Supabase client / Netlify Functions
- [ ] Add Supabase Auth context (staff only)
- [ ] Remove `VITE_API_SECRET` from frontend (no longer needed)
- [ ] Update `CafeContext` to use new data sources
- [ ] Add optimistic UI for mutations
- [ ] Error boundaries for failed mutations

---

## File Inventory for Phase 2

| Current File | Phase 2 Disposition |
|--------------|---------------------|
| `src/services/sheetAPI.js` | **Replace** → `supabaseClient.js` + `netlify/functions/*.js` |
| `src/context/CafeContext.jsx` | **Refactor** — split data fetching from bowl logic |
| `src/components/BowlSidebar.jsx` | **Refactor** — use server-validated totals |
| `SCRIPT.md` | **Archive** — reference only |
| `SHEETS_SETUP_GUIDE.md` | **Archive** — reference only |
| `.env` | **Update** — Supabase URL/keys, remove GAS vars |
| `public/_headers` | **Update** — tighten CSP, add Supabase domains |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GAS URL rotation breaks production | Medium | High | Test new URL in staging Netlify deploy first |
| Data migration loses historical orders | Low | Critical | Full CSV backup before migration; verify row counts |
| Supabase free tier limits exceeded | Low | Medium | Monitor usage; plan for paid tier if needed |
| RLS policies too restrictive | Medium | Medium | Test thoroughly with staff and public roles |
| WhatsApp integration breaks | Low | High | Keep WhatsApp URL generation in Netlify Function |

---

## Success Criteria for Phase 2

- [ ] All write operations go through Netlify Functions (no client secrets)
- [ ] Order totals calculated server-side from DB prices
- [ ] Staff can log in via Supabase Auth
- [ ] Google Sheets no longer used for operational data
- [ ] Historical data preserved and queryable in Supabase
- [ ] Build + lint + tests pass in CI
- [ ] Zero critical/high findings in security review