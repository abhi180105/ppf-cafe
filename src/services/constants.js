// src/services/constants.js
export const DEFAULT_TIMES = {
  OPEN: "10:00",
  CLOSE: "23:00"
};

export const CAFE_LOCATION = {
  lat: 28.5418728, // PPF Cafe actual latitude
  lng: 77.3357723  // PPF Cafe actual longitude
};

export const DELIVERY_RADIUS_KM = 2;

export const ORDER_TYPES = {
  DINE_IN: "dine-in",
  TAKEAWAY: "takeaway", 
  DELIVERY: "delivery"
};

export const STORAGE_KEYS = {
  BOWL: "bowl",
  ORDER_TYPE: "orderType",
  CUSTOMER_INFO: "customerInfo",
  ORDER_HISTORY: "orderHistory",
  ORDER_COUNT: "orderCount",
  SPECIAL_INSTRUCTIONS: "specialInstructions"
};