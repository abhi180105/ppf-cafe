# Environment Variable Inventory

| Variable | Purpose | Public/Private | Configured In | Required | Notes |
|----------|---------|----------------|---------------|----------|-------|
| `VITE_SHEET_API_URL` | Google Apps Script Web App URL for menu/combos/promos/reviews/status API | **Public** (exposed in client bundle) | `.env` (local), Netlify Environment Variables (prod) | Yes | Must be a valid GAS deployment URL. **Rotate if exposed in Git history.** |
| `VITE_WHATSAPP_NUMBER` | Business WhatsApp number for order submission (digits only, no `+`) | **Public** (exposed in client bundle) | `.env` (local), Netlify Environment Variables (prod) | Yes | Customer-facing contact info. Not secret. |
| `VITE_APP_NAME` | Display name for the cafe (used in UI, SEO, WhatsApp messages) | **Public** | `.env` (local), Netlify Environment Variables (prod) | Yes | e.g., "Prime Patties & Foods" |
| `VITE_DEFAULT_OPEN_TIME` | Fallback cafe opening time (24-hour format) if Status sheet unavailable | **Public** | `.env` (local), Netlify Environment Variables (prod) | No (default: `10:00`) | Used only when Google Sheets fails |
| `VITE_DEFAULT_CLOSE_TIME` | Fallback cafe closing time (24-hour format) if Status sheet unavailable | **Public** | `.env` (local), Netlify Environment Variables (prod) | No (default: `23:00`) | Used only when Google Sheets fails |
| `VITE_THEME` | Default UI theme (`light` \| `dark` \| `system`) | **Public** | `.env` (local), Netlify Environment Variables (prod) | No (default: `system`) | CSS variable driven |
| `VITE_DEV_NAME` | Developer/owner credit displayed in footer | **Public** | `.env` (local), Netlify Environment Variables (prod) | No | Attribution only |
| `VITE_DEV_EMAIL` | Contact email for feedback form (mailto: links) | **Public** | `.env` (local), Netlify Environment Variables (prod) | Yes | **Spam risk** — consider a dedicated address |
| `VITE_API_SECRET` | Shared secret for GAS write operations (reviews, orders) | **Private in intent, Public in practice** | `.env` (local), Netlify Environment Variables (prod), GAS `API_KEY` | Yes | **CRITICAL**: Vite inlines `VITE_*` into client bundle. Anyone can extract it. Provides only weak protection against automated spam. **Must match GAS `API_KEY` exactly.** Generate with `openssl rand -hex 32`. **Rotate if exposed.** |

## ⚠️ Critical Security Notes

### `VITE_API_SECRET` is NOT a real secret
- Vite replaces `import.meta.env.VITE_API_SECRET` with the actual string at build time.
- The secret appears in the production JavaScript bundle (`dist/assets/index-*.js`).
- **Anyone with the deployed site can view it in DevTools.**
- It only raises the bar for drive-by automated attacks.
- **True authorization requires server-side validation (Netlify Functions, Phase 2).**

### Exposed Credentials Requiring Rotation
| Credential | Exposure Location | Rotation Required? |
|------------|-------------------|-------------------|
| Google Apps Script URL (`AKfycbxKmqpgJ5wiavzt-ogwaUnTWWc9wnphhnQS2GmB5ee0Jy2_maa4N3ON-oNLDppvgvFNnw/exec`) | `.env` (tracked in Git history), built assets | **YES** — Redeploy GAS to get new URL |
| `VITE_API_SECRET` placeholder | `.env`, `SCRIPT.md`, built assets | **YES** — Generate real secret, update GAS + Netlify |
| `PPF Menu(2).xlsx` | Tracked in Git | **CHECK** — Verify no cost/margin data before deciding |

## Setup Instructions

```bash
# 1. Copy example to local config
cp .env.example .env

# 2. Edit .env with your values
#    - VITE_SHEET_API_URL: Deploy SCRIPT.md to Google Apps Script first
#    - VITE_API_SECRET: Generate with: openssl rand -hex 32
#    - Set SAME value in GAS API_KEY and Netlify env vars

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
```

## Production (Netlify)
Set all `VITE_*` variables in **Netlify Dashboard → Site Configuration → Environment Variables**.
The `VITE_API_SECRET` **must** match the `API_KEY` in your deployed Google Apps Script.