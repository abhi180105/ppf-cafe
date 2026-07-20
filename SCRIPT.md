/** 
 * Prime Patties & Foods - Google Sheets API (Updated Version)
 */

/** 🔧 CONFIGURATION */
const SHEET_ID = '1pKetztNttlTxRVXedv_1WogOvFqgnx7R_YJZUg_EzXY';
const MENU_SHEET = 'Menu';
const REVIEWS_SHEET = 'Reviews';
const STATUS_SHEET = 'Status';
const COMBOS_SHEET = 'Combos';
const PROMOS_SHEET = 'Promos';

function readSheetAsObjects(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i]));
    return obj;
  });
}

/** Menu API */
function getMenu() {
  const menu = readSheetAsObjects(MENU_SHEET);

  return {
    menu: menu
      .filter(m => String(m.availability).toLowerCase() !== "false")
      .map(m => ({
        id: m.id,
        category: m.category,
        name: m.name,
        type: m.type || "veg",
        dinePrice: Number(m.dinePrice || 0),
        deliveryPrice: Number(m.deliveryPrice || 0),
        availability: String(m.availability).toLowerCase() !== "false",
        deliverable: String(m.deliverable).toLowerCase() !== "false",
        image: m.image,
        description: m.description || ""
      }))
  };
}

/** Combos API */
function getCombos() {
  const combos = readSheetAsObjects(COMBOS_SHEET);
  
  return {
    combos: combos
      .filter(c => String(c.available).toLowerCase() !== "false")
      .map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        items: String(c.items || "").split(",").map(i => i.trim()),
        regularPrice: Number(c.regularPrice || 0),
        comboPrice: Number(c.comboPrice || 0),
        savings: Number(c.savings || 0),
        image: c.image
      }))
  };
}

/** Promos API */
function getPromos() {
  const promos = readSheetAsObjects(PROMOS_SHEET);
  const now = new Date();
  
  return {
    promos: promos
      .filter(p => String(p.active).toLowerCase() === "true")
      .filter(p => {
        const validFrom = p.validFrom ? new Date(p.validFrom) : null;
        const validTo = p.validTo ? new Date(p.validTo) : null;
        return (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
      })
      .map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        discountType: p.discountType,
        discountValue: Number(p.discountValue || 0),
        minOrder: Number(p.minOrder || 0),
        code: p.code || "",
        validFrom: p.validFrom,
        validTo: p.validTo
      }))
  };
}

/** Reviews API */
function getReviews() {
  const rows = readSheetAsObjects(REVIEWS_SHEET);
  return { reviews: rows.map(r => ({
    name: r.name,
    rating: Number(r.rating || 0),
    comment: r.comment || "",
    timestamp: r.timestamp
  })) };
}

/** Add Review */
function addReview(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REVIEWS_SHEET);

  sheet.appendRow([
    body.name || "Anonymous",
    Number(body.rating || 0),
    body.comment || "",
    new Date().toISOString()
  ]);

  return { success: true, message: "Review added successfully!" };
}

/** Place Order */
function placeOrder(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Orders');
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    sheet.appendRow([
      'Order ID', 'Created Time', 'Customer Name', 'Phone', 'Address', 'Items', 'Total',
      'Delivery/Pickup', 'Order Mode', 'Scheduled Date', 'Scheduled Time',
      'Scheduled DateTime', 'Latitude', 'Longitude', 'Distance', 'Status'
    ]);
  }

  // Generate Order ID
  const lastRow = sheet.getLastRow();
  const orderNumber = lastRow > 1 ? lastRow : 1;
  const orderId = 'PPF-' + String(orderNumber).padStart(6, '0');

  // Verify distance for delivery
  if (String(data.orderType).toLowerCase() === 'delivery') {
    if (data.distance > 2) {
      return { error: "Delivery not available outside 2 km radius." };
    }
  }

  sheet.appendRow([
    orderId,
    new Date().toISOString(),
    data.customerName || '',
    data.phone || '',
    data.address || '',
    data.items || '',
    data.total || 0,
    data.orderType || '',
    data.orderMode || 'ASAP',
    data.scheduledDate || '',
    data.scheduledTime || '',
    data.scheduledDateTime || '',
    data.latitude || '',
    data.longitude || '',
    data.distance || '',
    'Pending'
  ]);

  return { success: true, orderId: orderId, message: "Order placed successfully!" };
}

/** Status API */
function getStatus() {
  const rows = readSheetAsObjects(STATUS_SHEET);
  if (!rows.length) {
    return {
      isOpen: true,
      openTime: "10:00",
      closeTime: "23:00",
      timezone: "Asia/Kolkata"
    };
  }
  const r = rows[0];
  return {
    isOpen: String(r.isOpen).toLowerCase() === "true",
    openTime: r.openTime,
    closeTime: r.closeTime,
    timezone: r.timezone
  };
}

/** GET Router */
function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();
  let result = {};

  switch (action) {
    case "getmenu":
      result = getMenu();
      break;
    case "getcombos":
      result = getCombos();
      break;
    case "getpromos":
      result = getPromos();
      break;
    case "getreviews":
      result = getReviews();
      break;
    case "getstatus":
      result = getStatus();
      break;
    case "addreview":
      result = addReview({
        name: e.parameter.name,
        rating: e.parameter.rating,
        comment: e.parameter.comment
      });
      break;
    default:
      result = { error: "Unknown action" };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/** POST Router */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").toLowerCase();
    let result = {};

    if (action === "addreview") {
      result = addReview(body);
    } else if (action === "placeorder") {
      result = placeOrder(body.data);
    } else {
      result = { error: "Unknown action: " + body.action };
    }

    const output = ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
    return output;

  } catch (err) {
    const output = ContentService.createTextOutput(JSON.stringify({ error: "Server error: " + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
    
    return output;
  }
}