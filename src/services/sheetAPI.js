// src/services/sheetAPI.js
import { sanitizeForSheet } from '../utils/sanitize';

const BASE_URL   = import.meta.env.VITE_SHEET_API_URL;
const API_SECRET = import.meta.env.VITE_API_SECRET || '';

if (!BASE_URL) {
  // Warn only — missing URL just activates mock mode, not a crash
  console.warn('[PPF] VITE_SHEET_API_URL is not set — using mock data');
}

const IS_MOCK =
  !BASE_URL || BASE_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

// ---------------------------------------------------------------------------
// Internal counter for mock order IDs — persisted to sessionStorage so that
// multiple orders in the same browser session get different IDs.
// ---------------------------------------------------------------------------
function nextMockOrderId() {
  try {
    const key = 'ppf_mock_order_counter';
    const prev = parseInt(sessionStorage.getItem(key) || '0', 10);
    const next = prev + 1;
    sessionStorage.setItem(key, String(next));
    return 'PPF-' + String(next).padStart(6, '0');
  } catch {
    return 'PPF-' + String(Date.now()).slice(-6);
  }
}

async function fetchJSON(url) {
  if (IS_MOCK) {
    console.warn('[PPF] Mock mode — Google Sheets not configured');
    return getMockData(url);
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      // redirect:'follow' is the default but we make it explicit because
      // GAS GET requests return a 302 → script.googleusercontent.com.
      // Browsers follow it automatically; the CSP connect-src must allow
      // the destination domain (script.googleusercontent.com) as well.
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    // Use warn, not error — a temporarily unavailable GAS endpoint is not
    // a JavaScript exception worth alarming Lighthouse with.
    console.warn('[PPF] API fetch failed:', err.message);
    throw err;
  }
}

function getMockData(url) {
  if (url.includes('getmenu')) {
    return {
      menu: [
        { id: '1', category: 'Burgers', name: 'Classic Burger', type: 'veg', dinePrice: 150, deliveryPrice: 180, availability: true, deliverable: true, image: '/items/burger.jpg', description: 'Delicious veg burger' },
        { id: '2', category: 'Fries', name: 'Regular Fries', type: 'veg', dinePrice: 80, deliveryPrice: 100, availability: true, deliverable: true, image: '/items/fries.jpg', description: 'Crispy golden fries' },
        { id: '3', category: 'Drinks', name: 'Coke', type: 'drinks', dinePrice: 40, deliveryPrice: 50, availability: true, deliverable: false, image: '/items/chai.jpg', description: 'Chilled Coca-Cola' },
        { id: '4', category: 'Burgers', name: 'Egg Burger', type: 'egg', dinePrice: 120, deliveryPrice: 150, availability: true, deliverable: true, image: '/items/burger.jpg', description: 'Tasty egg burger' },
      ],
    };
  }
  if (url.includes('getcombos')) return { combos: [] };
  if (url.includes('getpromos')) return { promos: [] };
  if (url.includes('getreviews')) return { reviews: [] };
  if (url.includes('getstatus')) {
    return { isOpen: true, openTime: '10:00', closeTime: '23:00', timezone: 'Asia/Kolkata' };
  }
  return {};
}

export async function getMenu() {
  return fetchJSON(`${BASE_URL}?action=getmenu`);
}

export async function getCombos() {
  return fetchJSON(`${BASE_URL}?action=getcombos`);
}

export async function getPromos() {
  return fetchJSON(`${BASE_URL}?action=getpromos`);
}

export async function getReviews() {
  return fetchJSON(`${BASE_URL}?action=getreviews`);
}

export async function getStatus() {
  return fetchJSON(`${BASE_URL}?action=getstatus`);
}

export async function addReview({ name, rating, comment }) {
  if (!name || !rating) throw new Error('Name and rating are required');

  if (IS_MOCK) {
    console.warn('Mock mode — review not saved');
    return { success: true, message: 'Review added successfully!' };
  }

  const payload = {
    action: 'addreview',
    apiKey: API_SECRET,
    name: sanitizeForSheet(String(name).trim(), 100),
    rating: Math.max(1, Math.min(5, Number(rating))),
    comment: sanitizeForSheet(String(comment || '').trim(), 500),
  };

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
  } catch (err) {
    console.warn('[PPF] Add Review failed:', err.message);
    throw err;
  }
}

export async function placeOrder(orderData) {
  // ── Mock mode ──────────────────────────────────────────────────────────
  if (IS_MOCK) {
    console.warn('Mock mode — order not saved to sheet');
    return {
      success: true,
      orderId: nextMockOrderId(),
      message: 'Order placed successfully!',
    };
  }

  // ── Sanitize all user-controlled string fields before sending ──────────
  const sanitized = {
    ...orderData,
    customerName:        sanitizeForSheet(orderData.customerName,        100),
    phone:               sanitizeForSheet(orderData.phone,                20),
    address:             sanitizeForSheet(orderData.address,             300),
    items:               sanitizeForSheet(orderData.items,              1000),
    specialInstructions: sanitizeForSheet(orderData.specialInstructions || '', 200),
    scheduledDate:       sanitizeForSheet(orderData.scheduledDate || '',  20),
    scheduledTime:       sanitizeForSheet(orderData.scheduledTime || '',  10),
    orderMode:           sanitizeForSheet(orderData.orderMode || 'ASAP',  20),
  };

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'placeorder', apiKey: API_SECRET, data: sanitized }),
      credentials: 'omit',
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const result = await res.json();

    // Server-side validation errors surface here (delivery radius, schedule, etc.)
    if (result.error) throw new Error(result.error);

    return result;
  } catch (err) {
    // warn-level: the error is already surfaced to the user via the UI toast
    console.warn('[PPF] Place Order failed:', err.message);
    throw err;
  }
}

export default { getMenu, getCombos, getPromos, getReviews, getStatus, addReview, placeOrder };
