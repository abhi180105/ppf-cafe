# Security Audit — PPF Cafe (Phase 1 Baseline)

**Date:** 2026-10-21
**Auditor:** Senior Full-Stack / AppSec / DevOps Engineer
**Scope:** Repository `https://github.com/abhi180105/ppf-cafe`, branch `main`, commit `b1f2767`

---

## Executive Summary

The PPF Cafe application is a React + Vite frontend backed by Google Apps Script (GAS) reading/writing Google Sheets. The architecture is functional but has **critical credential hygiene issues** and **fundamental client-side security limitations** that must be addressed before migrating to Supabase/PostgreSQL (Phase 2).

**Overall Risk:** **HIGH** — Real credentials committed to Git, no server-side authorization, client-trusted order totals.

---

## Findings Classification

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 4 | Credentials in Git, build artifacts tracked, API secret placeholder bypasses auth |
| **High** | 3 | Client-side secret provides no real auth, order totals trusted from browser, no quality gates |
| **Medium** | 4 | Broad CSP, missing `.env.example`, large images, no Node version pin |
| **Low** | 4 | Excel file tracked, no lint config, no type-check, no tests |
| **Informational** | 4 | Good sanitization, LockService, Haversine server-side, mock mode |

---

## Detailed Findings

### 🔴 Critical

#### C1: `.env` tracked in Git
- **Path:** `.env` (tracked since initial commit)
- **Exposed:** `VITE_SHEET_API_URL` (real GAS deployment URL), `VITE_WHATSAPP_NUMBER`, `VITE_DEV_EMAIL`
- **Impact:** GAS endpoint publicly discoverable; combined with C3, write endpoints open
- **Remediation:** ✅ `git rm --cached .env` (done), **rotate GAS deployment URL**, **rotate `VITE_API_SECRET`**

#### C2: `dist/` build artifacts tracked
- **Path:** `dist/` (40+ files tracked)
- **Impact:** Repo bloat, inlined env vars in built JS, potential secret leakage
- **Remediation:** ✅ `git rm -r --cached dist/` (done), verify `.gitignore` excludes `dist/`

#### C3: `VITE_API_SECRET` placeholder bypasses GAS auth
- **Location:** `.env:31` = `REPLACE_WITH_YOUR_STRONG_RANDOM_SECRET`, `SCRIPT.md:42,500`
- **Mechanism:** GAS `keyCheckRequired = (API_KEY !== placeholder)` — **if placeholder, auth skipped entirely**
- **Impact:** **All write endpoints (orders, reviews) open to unauthenticated POST**
- **Remediation:** Generate real secret (`openssl rand -hex 32`), update `.env` (local), Netlify env vars, GAS `API_KEY`

#### C4: GAS deployment URL in Git history
- **URL:** `https://script.google.com/macros/s/AKfycbxKmqpgJ5wiavzt-ogwaUnTWWc9wnphhnQS2GmB5ee0Jy2_maa4N3ON-oNLDppvgvFNnw/exec`
- **Impact:** Permanent exposure; anyone can call GET endpoints (menu, status) and, with C3, POST endpoints
- **Remediation:** **Redeploy GAS as new Web App** to get new URL; update Netlify `VITE_SHEET_API_URL`

---

### 🟠 High

#### H1: `VITE_API_SECRET` provides no genuine authorization
- **Location:** `src/services/sheetAPI.js:5,111,164`
- **Root Cause:** Vite inlines `VITE_*` variables into client bundle at build time
- **Evidence:** Secret visible in `dist/assets/index-*.js` → DevTools → Sources
- **Mitigation:** Document limitation clearly; **Phase 2 must implement Netlify Functions for server-side auth**

#### H2: Client-calculated order totals trusted by backend
- **Location:** `src/context/CafeContext.jsx:226-240` (`calculateTotal`), `sheetAPI.js:136-181` (`placeOrder`)
- **Impact:** Malicious user can modify `total` before WhatsApp submit; GAS accepts client-provided pricing
- **Remediation:** **Phase 2: Server-side price calculation from DB; never trust client totals**

#### H3: No automated quality gates
- **Missing:** `lint`, `typecheck`, `test` scripts in `package.json`
- **Impact:** Security regressions, syntax errors, unused code not caught
- **Remediation:** ✅ Added `lint` script + `eslint.config.js` (baseline passing with warnings for pre-existing issues)