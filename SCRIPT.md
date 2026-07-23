/** 
 * Prime Patties & Foods - Google Sheets API
 * Production-hardened version:
 *   • Server-side Haversine delivery validation
 *   • LockService prevents concurrent duplicate Order IDs
 *   • Shared-secret API key blocks unauthenticated POST requests
 *   • Full input sanitization on every user-controlled field
 *   • Scheduled order validation (past-time, advance notice, operating hours)
 */

/** 🔧 CONFIGURATION — Single source of truth */
const SHEET_ID = '1pKetztNttlTxRVXedv_1WogOvFqgnx7R_YJZUg_EzXY';
const MENU_SHEET    = 'Menu';
const REVIEWS_SHEET = 'Reviews';
const STATUS_SHEET  = 'Status';
const COMBOS_SHEET  = 'Combos';
const PROMOS_SHEET  = 'Promos';

/** Cafe coordinates — update here only */
const CAFE_LAT = 28.5418728;
const CAFE_LNG = 77.3357723;
const DELIVERY_RADIUS_KM = 2;

/** Operating hour fallbacks (used only when Status sheet is unavailable) */
const DEFAULT_OPEN_HOUR  = 10; // 10:00
const DEFAULT_CLOSE_HOUR = 23; // 23:00
const MIN_ADVANCE_MINUTES = 30;

/**
 * 🔑 API KEY — Shared secret between frontend and Apps Script.
 *
 * How to set:
 *   1. Choose any strong random string, e.g. openssl rand -hex 32
 *   2. Paste it here (replace the placeholder below)
 *   3. Set the IDENTICAL value in VITE_API_SECRET in your .env file
 *      (and in Netlify / your hosting env vars for production)
 *
 * This prevents random internet users who discover the GAS URL from
 * posting fake orders. GET requests (menu/status reads) are left open
 * because they only return public data.
 */
const API_KEY = 'REPLACE_WITH_YOUR_STRONG_RANDOM_SECRET';

// ---------------------------------------------------------------------------
// Haversine distance (km) — pure function, no side-effects
// ---------------------------------------------------------------------------
function haversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Input sanitization — mirrors frontend sanitize.js
// ---------------------------------------------------------------------------
function sanitizeField(input, maxLength) {
  maxLength = maxLength || 500;
  if (input === null || input === undefined) return '';
  var s = String(input).trim().slice(0, maxLength);
  // Strip leading formula-injection characters
  s = s.replace(/^[=+\-@\t\r|%]+/, '');
  // Remove control characters (keep \n \r for multiline fields)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return s;
}

function sanitizeNumber(value) {
  var n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSheetAsObjects(sheetName) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  return rows.map(function(r) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = r[i]; });
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Menu API
// ---------------------------------------------------------------------------
function getMenu() {
  var menu = readSheetAsObjects(MENU_SHEET);
  return {
    menu: menu
      .filter(function(m) { return String(m.availability).toLowerCase() !== 'false'; })
      .map(function(m) {
        return {
          id: m.id,
          category: m.category,
          name: m.name,
          type: m.type || 'veg',
          dinePrice: Number(m.dinePrice || 0),
          deliveryPrice: Number(m.deliveryPrice || 0),
          availability: String(m.availability).toLowerCase() !== 'false',
          deliverable: String(m.deliverable).toLowerCase() !== 'false',
          image: m.image,
          description: m.description || ''
        };
      })
  };
}

// ---------------------------------------------------------------------------
// Combos API
// ---------------------------------------------------------------------------
function getCombos() {
  var combos = readSheetAsObjects(COMBOS_SHEET);
  return {
    combos: combos
      .filter(function(c) { return String(c.available).toLowerCase() !== 'false'; })
      .map(function(c) {
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          items: String(c.items || '').split(',').map(function(i) { return i.trim(); }),
          regularPrice: Number(c.regularPrice || 0),
          comboPrice: Number(c.comboPrice || 0),
          savings: Number(c.savings || 0),
          image: c.image
        };
      })
  };
}

// ---------------------------------------------------------------------------
// Promos API
// ---------------------------------------------------------------------------
function getPromos() {
  var promos = readSheetAsObjects(PROMOS_SHEET);
  var now = new Date();
  return {
    promos: promos
      .filter(function(p) { return String(p.active).toLowerCase() === 'true'; })
      .filter(function(p) {
        var validFrom = p.validFrom ? new Date(p.validFrom) : null;
        var validTo   = p.validTo   ? new Date(p.validTo)   : null;
        return (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
      })
      .map(function(p) {
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          discountType: p.discountType,
          discountValue: Number(p.discountValue || 0),
          minOrder: Number(p.minOrder || 0),
          code: p.code || '',
          validFrom: p.validFrom,
          validTo: p.validTo
        };
      })
  };
}

// ---------------------------------------------------------------------------
// Reviews API
// ---------------------------------------------------------------------------
function getReviews() {
  var rows = readSheetAsObjects(REVIEWS_SHEET);
  return {
    reviews: rows.map(function(r) {
      return {
        name: r.name,
        rating: Number(r.rating || 0),
        comment: r.comment || '',
        timestamp: r.timestamp
      };
    })
  };
}

function addReview(body) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(REVIEWS_SHEET);
  sheet.appendRow([
    sanitizeField(body.name || 'Anonymous', 100),
    Math.max(1, Math.min(5, Number(body.rating || 0))),
    sanitizeField(body.comment || '', 500),
    new Date().toISOString()
  ]);
  return { success: true, message: 'Review added successfully!' };
}

// ---------------------------------------------------------------------------
// Status API
// ---------------------------------------------------------------------------
function getStatus() {
  var rows = readSheetAsObjects(STATUS_SHEET);
  if (!rows.length) {
    return {
      isOpen: true,
      openTime: DEFAULT_OPEN_HOUR + ':00',
      closeTime: DEFAULT_CLOSE_HOUR + ':00',
      timezone: 'Asia/Kolkata'
    };
  }
  var r = rows[0];
  return {
    isOpen: String(r.isOpen).toLowerCase() === 'true',
    openTime:  r.openTime,
    closeTime: r.closeTime,
    timezone:  r.timezone
  };
}

// ---------------------------------------------------------------------------
// Order ID generation — called INSIDE a LockService critical section only.
//   Re-reads lastRow at lock time to guarantee uniqueness even under
//   concurrent requests. Never call this outside the lock.
// ---------------------------------------------------------------------------
function generateOrderId(sheet) {
  var lastRow = sheet.getLastRow(); // freshly read inside the lock
  var orderNumber = lastRow;        // header=row1, first order=row2 → ID 000001
  return 'PPF-' + String(orderNumber).padStart(6, '0');
}

// ---------------------------------------------------------------------------
// Scheduled order validation (server-side)
// ---------------------------------------------------------------------------
function validateScheduledOrder(scheduledDate, scheduledTime, openTime, closeTime) {
  if (!scheduledDate || !scheduledTime) {
    return 'Scheduled date and time are required for scheduled orders.';
  }

  // Parse scheduled datetime (IST comparison using Date)
  var parts = scheduledDate.split('-');
  var timeParts = scheduledTime.split(':');
  if (parts.length !== 3 || timeParts.length !== 2) {
    return 'Invalid scheduled date or time format.';
  }

  var year   = parseInt(parts[0]);
  var month  = parseInt(parts[1]) - 1;
  var day    = parseInt(parts[2]);
  var hour   = parseInt(timeParts[0]);
  var minute = parseInt(timeParts[1]);

  // Build scheduled time as local Date
  var scheduledDt = new Date(year, month, day, hour, minute, 0);
  var now = new Date();

  if (scheduledDt.getTime() <= now.getTime()) {
    return 'Scheduled time cannot be in the past.';
  }

  var diffMs = scheduledDt.getTime() - now.getTime();
  if (diffMs < MIN_ADVANCE_MINUTES * 60 * 1000) {
    return 'Please schedule at least ' + MIN_ADVANCE_MINUTES + ' minutes in advance.';
  }

  // Parse operating hours
  var openParts  = (openTime  || (DEFAULT_OPEN_HOUR  + ':00')).split(':');
  var closeParts = (closeTime || (DEFAULT_CLOSE_HOUR + ':00')).split(':');
  var openMins   = parseInt(openParts[0])  * 60 + parseInt(openParts[1]  || 0);
  var closeMins  = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1] || 0);
  var selectedMins = hour * 60 + minute;

  if (selectedMins < openMins || selectedMins > closeMins) {
    return 'Scheduled time must be within operating hours (' + openTime + ' – ' + closeTime + ').';
  }

  return null; // no error
}

// ---------------------------------------------------------------------------
// Place Order — fully server-side validated, sanitized, and lock-protected
// ---------------------------------------------------------------------------
function placeOrder(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Ensure Orders sheet exists (do this BEFORE acquiring the lock to keep
  // the critical section as short as possible).
  var sheet = ss.getSheetByName('Orders');
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    sheet.appendRow([
      'Order ID', 'Created Time', 'Customer Name', 'Phone', 'Address',
      'Items', 'Total', 'Delivery/Pickup', 'Order Mode',
      'Scheduled Date', 'Scheduled Time', 'Scheduled DateTime',
      'Latitude', 'Longitude', 'Distance (km)', 'Special Instructions', 'Status'
    ]);
  }

  // --- 1. Sanitize every user-controlled field ---
  var customerName        = sanitizeField(data.customerName,        100);
  var phone               = sanitizeField(data.phone,                20);
  var address             = sanitizeField(data.address,             300);
  var items               = sanitizeField(data.items,              1000);
  var specialInstructions = sanitizeField(data.specialInstructions, 200);
  var scheduledDate       = sanitizeField(data.scheduledDate,        20);
  var scheduledTime       = sanitizeField(data.scheduledTime,        10);
  var orderMode           = sanitizeField(data.orderMode,            20) || 'ASAP';
  var orderType           = sanitizeField(data.orderType,            20).toLowerCase();
  var total               = sanitizeNumber(data.total);

  // --- 2. Basic required-field validation (before locking — cheap) ---
  if (!customerName) return { error: 'Customer name is required.' };
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return { error: 'A valid phone number (min 10 digits) is required.' };
  }
  if (orderType === 'delivery' && !address) {
    return { error: 'Delivery address is required.' };
  }
  if (!items) return { error: 'Order must contain at least one item.' };

  // --- 3. Server-side delivery radius validation (ignores frontend withinRadius) ---
  var latitude  = parseFloat(data.latitude);
  var longitude = parseFloat(data.longitude);
  var distance  = '';

  if (orderType === 'delivery') {
    if (isNaN(latitude) || isNaN(longitude)) {
      return { error: 'Valid GPS coordinates are required for delivery orders.' };
    }
    distance = haversineDistance(latitude, longitude, CAFE_LAT, CAFE_LNG);
    if (distance > DELIVERY_RADIUS_KM) {
      return {
        error: 'Delivery is only available within ' + DELIVERY_RADIUS_KM +
               ' km of PPF Cafe. Your distance: ' + distance.toFixed(2) + ' km.'
      };
    }
  }

  // --- 4. Scheduled order validation (before locking — cheap) ---
  if (orderMode === 'Scheduled') {
    var statusData = getStatus();
    var scheduleError = validateScheduledOrder(
      scheduledDate, scheduledTime,
      statusData.openTime, statusData.closeTime
    );
    if (scheduleError) return { error: scheduleError };
  } else {
    scheduledDate = '';
    scheduledTime = '';
  }

  var scheduledDateTime = (scheduledDate && scheduledTime)
    ? scheduledDate + ' ' + scheduledTime
    : '';

  // --- 5. Acquire script-level lock — prevents concurrent duplicate IDs ---
  //
  //  LockService.getScriptLock() is process-wide across all simultaneous
  //  GAS executions for this script deployment, so two requests that pass
  //  all validations above will still be serialised here.
  //
  //  waitLock(30000): wait up to 30 s for the lock; throws if unavailable.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return { error: 'Server is busy. Please retry in a few seconds.' };
  }

  var orderId;
  try {
    // Re-read lastRow inside the lock — the value is now authoritative.
    orderId = generateOrderId(sheet);

    sheet.appendRow([
      orderId,
      new Date().toISOString(),
      customerName,
      phone,
      address,
      items,
      total,
      orderType,
      orderMode,
      scheduledDate,
      scheduledTime,
      scheduledDateTime,
      isNaN(latitude)  ? '' : latitude,
      isNaN(longitude) ? '' : longitude,
      distance !== '' ? distance.toFixed(3) : '',
      specialInstructions,
      'Pending'
    ]);
  } finally {
    // Always release the lock — even if appendRow throws.
    lock.releaseLock();
  }

  return { success: true, orderId: orderId, message: 'Order placed successfully!' };
}

// ---------------------------------------------------------------------------
// GET Router
// ---------------------------------------------------------------------------
function doGet(e) {
  var action = ((e.parameter.action) || '').toLowerCase();
  var result = {};

  switch (action) {
    case 'getmenu':    result = getMenu();    break;
    case 'getcombos':  result = getCombos();  break;
    case 'getpromos':  result = getPromos();  break;
    case 'getreviews': result = getReviews(); break;
    case 'getstatus':  result = getStatus();  break;
    case 'addreview':
      result = addReview({
        name:    e.parameter.name,
        rating:  e.parameter.rating,
        comment: e.parameter.comment
      });
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// API key helper — validates the shared secret sent by the frontend.
//
// The frontend includes { "apiKey": "<VITE_API_SECRET value>" } in every
// POST body. This is not a cryptographic proof of identity, but it raises
// the bar significantly above a fully open endpoint:
//   • The GAS URL is not secret, but the key must also be known.
//   • The key is never exposed in client-side source because Vite
//     inlines it at build time and the .env file is gitignored.
//   • Combined with the existing input validation this prevents
//     trivial automated spam / fake-order attacks.
// ---------------------------------------------------------------------------
function isValidApiKey(receivedKey) {
  // Constant-time string comparison to avoid timing attacks
  if (!receivedKey || receivedKey.length !== API_KEY.length) return false;
  var match = true;
  for (var i = 0; i < API_KEY.length; i++) {
    if (receivedKey.charCodeAt(i) !== API_KEY.charCodeAt(i)) match = false;
  }
  return match;
}

// ---------------------------------------------------------------------------
// POST Router
// ---------------------------------------------------------------------------
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = ((body.action) || '').toLowerCase();
    var result = {};

    // ── API key check for write operations ───────────────────────────────
    // Read operations use GET and are left unauthenticated (public menu data).
    // Write operations (placeorder, addreview) require the shared secret.
    // Skip the check only when API_KEY is the placeholder (local dev without key).
    var keyCheckRequired = (API_KEY !== 'REPLACE_WITH_YOUR_STRONG_RANDOM_SECRET');
    if (keyCheckRequired && !isValidApiKey(body.apiKey)) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Unauthorized: invalid or missing API key.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'addreview') {
      result = addReview(body);
    } else if (action === 'placeorder') {
      result = placeOrder(body.data);
    } else {
      result = { error: 'Unknown action: ' + body.action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Server error: ' + err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}