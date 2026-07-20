// src/services/sheetAPI.js
// Bridge between frontend and Google Apps Script backend for Prime Patties & Foods

const BASE_URL = import.meta.env.VITE_SHEET_API_URL;

if (!BASE_URL) {
  console.error("VITE_SHEET_API_URL is not configured");
}

async function fetchJSON(url) {
  if (!url || !BASE_URL || BASE_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
    console.warn("Using mock data - Google Sheets not configured");
    return getMockData(url);
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "omit"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Fetch Error:", err.message);
    throw err;
  }
}

function getMockData(url) {
  if (url.includes('getmenu')) {
    return {
      menu: [
        { id: "1", category: "Burgers", name: "Classic Burger", type: "veg", dinePrice: 150, deliveryPrice: 180, availability: true, deliverable: true, image: "/burger.jpg", description: "Delicious veg burger" },
        { id: "2", category: "Fries", name: "Regular Fries", type: "veg", dinePrice: 80, deliveryPrice: 100, availability: true, deliverable: true, image: "/fries.jpg", description: "Crispy golden fries" },
        { id: "3", category: "Drinks", name: "Coke", type: "drinks", dinePrice: 40, deliveryPrice: 50, availability: true, deliverable: false, image: "/coke.jpg", description: "Chilled Coca-Cola" },
        { id: "4", category: "Burgers", name: "Egg Burger", type: "egg", dinePrice: 120, deliveryPrice: 150, availability: true, deliverable: true, image: "/burger.jpg", description: "Tasty egg burger" }
      ]
    };
  }
  if (url.includes('getcombos')) {
    return { combos: [] };
  }
  if (url.includes('getpromos')) {
    return { promos: [] };
  }
  if (url.includes('getreviews')) {
    return { reviews: [] };
  }
  if (url.includes('getstatus')) {
    return { isOpen: true, openTime: "10:00", closeTime: "23:00", timezone: "Asia/Kolkata" };
  }
  return {};
}

/** 🍔 MENU */
export async function getMenu() {
  return await fetchJSON(`${BASE_URL}?action=getmenu`);
}

/** 🎁 COMBOS */
export async function getCombos() {
  return await fetchJSON(`${BASE_URL}?action=getcombos`);
}

/** 🏷️ PROMOS */
export async function getPromos() {
  return await fetchJSON(`${BASE_URL}?action=getpromos`);
}

/** ⭐ REVIEWS */
export async function getReviews() {
  return await fetchJSON(`${BASE_URL}?action=getreviews`);
}

/** 🕒 STATUS */
export async function getStatus() {
  return await fetchJSON(`${BASE_URL}?action=getstatus`);
}

export async function addReview({ name, rating, comment }) {
  if (!name || !rating) {
    throw new Error("Name and rating are required");
  }

  if (!BASE_URL || BASE_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
    console.warn("Mock mode - review not actually saved");
    return { success: true, message: "Review added successfully!" };
  }

  const sanitizedName = String(name).trim().slice(0, 100);
  const sanitizedComment = String(comment || "").trim().slice(0, 500);
  const validRating = Math.max(1, Math.min(5, Number(rating)));

  const params = new URLSearchParams({
    action: "addreview",
    name: sanitizedName,
    rating: validRating,
    comment: sanitizedComment
  });
  
  const url = `${BASE_URL}?${params.toString()}`;
  console.log("Sending review to:", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "omit"
    });

    console.log("Response status:", res.status, res.statusText);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const result = await res.json();
    console.log("Response data:", result);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (err) {
    console.error("Add Review Error:", err);
    throw err;
  }
}

export async function placeOrder(orderData) {
  if (!BASE_URL || BASE_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
    console.warn("Mock mode - order not actually saved to sheet");
    return { success: true, orderId: `PPF-${Date.now().toString().slice(-6)}`, message: "Order placed successfully!" };
  }

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain to avoid CORS preflight if needed
      body: JSON.stringify({ action: "placeorder", data: orderData }),
      credentials: "omit"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const result = await res.json();
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (err) {
    console.error("Place Order Error:", err);
    throw err;
  }
}

export default {
  getMenu,
  getCombos,
  getPromos,
  getReviews,
  getStatus,
  addReview,
  placeOrder,
};

