// src/context/CafeContext.jsx
import { createContext, useEffect, useState, useCallback, useMemo, useContext } from "react";
import {
  getMenu,
  getCombos,
  getPromos,
  getReviews,
  getStatus,
  addReview,
} from "../services/sheetAPI";
import { DEFAULT_TIMES, STORAGE_KEYS } from "../services/constants";
import { sanitizeForWhatsApp } from "../utils/sanitize";

// Split contexts for better performance
// DataContext: Static/rarely changing data (menu, combos, promos, reviews, status)
// BowlContext: Frequently changing data (bowl, orderType, customerInfo)
export const DataContext = createContext();
export const BowlContext = createContext();
export const CafeContext = createContext(); // Keep for backward compatibility

// Helper for safe JSON parsing
const safeJSON = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

// Provider Component
export const CafeProvider = ({ children }) => {
  const [menu, setMenu] = useState([]);
  const [combos, setCombos] = useState([]);
  const [promos, setPromos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bowl, setBowl] = useState(() => safeJSON(localStorage.getItem(STORAGE_KEYS.BOWL), []));
  const [orderType, setOrderType] = useState(() => localStorage.getItem(STORAGE_KEYS.ORDER_TYPE) || "dine-in");
  const [customerInfo, setCustomerInfoState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMER_INFO);
      return saved ? JSON.parse(saved) : { name: "", phone: "", address: "" };
    } catch {
      return { name: "", phone: "", address: "" };
    }
  });

  const [specialInstructions, setSpecialInstructions] = useState(() => localStorage.getItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS) || "");
  const [status, setStatus] = useState({
    isOpen: true,
    openTime: import.meta.env.VITE_DEFAULT_OPEN_TIME || DEFAULT_TIMES.OPEN,
    closeTime: import.meta.env.VITE_DEFAULT_CLOSE_TIME || DEFAULT_TIMES.CLOSE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMenu();
      
      let menuData = [];
      if (data && Array.isArray(data.menu)) {
        menuData = data.menu;
      } else if (Array.isArray(data)) {
        menuData = data;
      } else {
        throw new Error("Invalid menu data format");
      }
      
      menuData = menuData
        .map((item, index) => ({
          ...item,
          id: String(item.id || `item-${index}`),
          dinePrice: Number(item.dinePrice || 0),
          deliveryPrice: Number(item.deliveryPrice || 0)
        }))
        .filter(item => item.name && item.name.trim() && (item.dinePrice > 0 || item.deliveryPrice > 0));
      
      setMenu(menuData);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Menu Fetch Error:", err.message);
      setError(`Unable to fetch menu: ${err.message}`);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCombos = useCallback(async () => {
    try {
      const data = await getCombos();
      if (!data || !Array.isArray(data.combos)) {
        throw new Error("Invalid combos data");
      }
      setCombos(data.combos);
    } catch (err) {
      console.error("Combos Fetch Error:", err.message);
      setCombos([]);
    }
  }, []);

  const loadPromos = useCallback(async () => {
    try {
      const data = await getPromos();
      if (!data || !Array.isArray(data.promos)) {
        throw new Error("Invalid promos data");
      }
      setPromos(data.promos);
    } catch (err) {
      console.error("Promos Fetch Error:", err.message);
      setPromos([]);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const data = await getReviews();
      if (!data || !Array.isArray(data.reviews)) {
        throw new Error("Invalid reviews data");
      }
      setReviews(data.reviews);
    } catch (err) {
      console.error("Reviews Fetch Error:", err.message);
      setReviews([]);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getStatus();
      if (!data || typeof data.isOpen !== 'boolean') {
        throw new Error("Invalid status data");
      }
      
      const parseSheetTime = (timeStr, defaultTime) => {
        if (!timeStr) return defaultTime;
        if (String(timeStr).includes("T")) {
           const d = new Date(timeStr);
           if (!isNaN(d.getTime())) {
             return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
           }
        }
        return timeStr;
      };

      setStatus({
        ...data,
        openTime: parseSheetTime(data.openTime, import.meta.env.VITE_DEFAULT_OPEN_TIME || DEFAULT_TIMES.OPEN),
        closeTime: parseSheetTime(data.closeTime, import.meta.env.VITE_DEFAULT_CLOSE_TIME || DEFAULT_TIMES.CLOSE)
      });
    } catch (err) {
      console.error("Status Fetch Error:", err.message);
      setStatus({
        isOpen: true,
        openTime: import.meta.env.VITE_DEFAULT_OPEN_TIME || DEFAULT_TIMES.OPEN,
        closeTime: import.meta.env.VITE_DEFAULT_CLOSE_TIME || DEFAULT_TIMES.CLOSE,
      });
    }
  }, []);

  /** 🧺 Save bowl to localStorage (debounced) */
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.BOWL, JSON.stringify(bowl));
    }, 500);
    return () => clearTimeout(timer);
  }, [bowl]);

  /** 💾 Save order type to localStorage */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDER_TYPE, orderType);
  }, [orderType]);



  /** 💾 Save special instructions to localStorage (debounced) */
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.SPECIAL_INSTRUCTIONS, specialInstructions);
    }, 500);
    return () => clearTimeout(timer);
  }, [specialInstructions]);

  const setCustomerInfo = useCallback((info) => {
    setCustomerInfoState(info);
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify(info));
  }, []);

  useEffect(() => {
    Promise.all([loadMenu(), loadStatus(), loadReviews(), loadCombos(), loadPromos()]).catch((err) => {
      console.error("Initial load error:", err.message);
    });
  }, [loadMenu, loadStatus, loadReviews, loadCombos, loadPromos]);

  // 🧮 Add item to bowl
  const addToBowl = useCallback((item) => {
    setBowl((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existingIndex = safePrev.findIndex((b) => b.id === item.id && !b.isCombo);
      if (existingIndex >= 0) {
        const updated = [...safePrev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }
      return [...safePrev, { ...item, quantity: 1, isCombo: false }];
    });
  }, []);

  // ➖ Remove item from bowl
  const removeFromBowl = useCallback((itemId) => {
    setBowl((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev
        .map((b) => b.id === itemId ? { ...b, quantity: Math.max(0, b.quantity - 1) } : b)
        .filter((b) => b.quantity > 0);
    });
  }, []);

  // ❌ Clear bowl
  const clearBowl = useCallback(() => {
    setBowl([]);
    localStorage.removeItem(STORAGE_KEYS.BOWL);
  }, []);

  // 💰 Calculate total based on order type
  const calculateTotal = useCallback(() => {
    const safeBowl = Array.isArray(bowl) ? bowl : [];
    return safeBowl.reduce((total, item) => {
      const dine = Number(item.dinePrice || 0);
      const delivery = Number(item.deliveryPrice || 0);
      const price = orderType === "delivery" ? delivery : dine;
      const qty = Number(item.quantity || 0);
      return total + price * qty;
    }, 0);
  }, [bowl, orderType]);

  // 🎁 Add combo to bowl
  const addComboToBowl = useCallback((combo) => {
    if (!combo || !combo.id) return;
    setBowl((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existingIndex = safePrev.findIndex((b) => b.id === combo.id && b.isCombo === true);
      if (existingIndex >= 0) {
        const updated = [...safePrev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }
      return [...safePrev, {
        id: combo.id,
        name: combo.name,
        description: combo.description,
        dinePrice: combo.comboPrice,
        deliveryPrice: combo.comboPrice,
        quantity: 1,
        isCombo: true,
        comboItems: combo.items,
      }];
    });
  }, []);



  const submitReview = useCallback(async (name, rating, comment) => {
    try {
      if (!name || !rating) {
        throw new Error("Name and rating are required");
      }
      await addReview({ name, rating, comment });
      await loadReviews();
      return true;
    } catch (err) {
      console.error("Submit review error:", err.message);
      return false;
    }
  }, [loadReviews]);

  const buildWhatsAppMessage = useCallback((orderId = null, extraData = {}) => {
    const phone = import.meta.env.VITE_WHATSAPP_NUMBER;
    const safeBowl = Array.isArray(bowl) ? bowl : [];

    if (!phone || safeBowl.length === 0 || !orderType) return null;

    const sanitizedName = sanitizeForWhatsApp(customerInfo?.name || "Not provided");
    const sanitizedPhone = sanitizeForWhatsApp(customerInfo?.phone || "Not provided");
    const sanitizedAddress = sanitizeForWhatsApp(customerInfo?.address || "Not provided");
    const sanitizedInstructions = sanitizeForWhatsApp(specialInstructions);

    const { schedule, location } = extraData;

    let headerSection = `🍔 *New Order*\n\n`;
    if (orderId) headerSection += `*Order ID:* ${orderId}\n`;

    let customerSection = `👤 *Customer*\n`;
    customerSection += `Name: ${sanitizedName}\n`;
    customerSection += `Phone: ${sanitizedPhone}\n`;
    
    if (orderType === "delivery") {
      customerSection += `📍 Address: ${sanitizedAddress}\n`;
    }

    let orderInfoSection = `🛒 *ORDER DETAILS*\n`;
    if (extraData?.schedule && extraData.schedule.mode === "Scheduled") {
      orderInfoSection += `Order Timing: Scheduled\nDate: ${extraData.schedule.date}\nTime: ${extraData.schedule.time}\n`;
    } else {
      orderInfoSection += `Order Timing: ASAP\n`;
    }
    orderInfoSection += `Type: ${orderType === "takeaway" ? "Pickup" : orderType === "dine-in" ? "Dine-in" : "Delivery"}\n`;

    // Build items list
    const items = safeBowl
      .map((b) => `• ${b.quantity} ${b.name}`)
      .join("\n");

    const total = calculateTotal();

    let locationSection = '';
    if (location && location.lat && location.lng) {
      locationSection = `\n🗺️ *Location:*\nhttps://maps.google.com/?q=${location.lat},${location.lng}\n`;
    }

    const instructionsSection = sanitizedInstructions 
      ? `\n📝 *Special Instructions:*\n${sanitizedInstructions}\n` 
      : '';

    // Build complete message with improved formatting
    const message = `${headerSection}${customerSection}\n${orderInfoSection}
🛒 *Items*
━━━━━━━━━━━━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━━━━━━━━━━━━
${instructionsSection}${locationSection}
💰 *Payment:* Cash
*Total: ₹${total}*

✅ Ready to confirm this order!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [bowl, orderType, customerInfo, specialInstructions, calculateTotal]);

  /** 🏷️ Apply promo code */
  const applyPromo = useCallback((subtotal, promoCode) => {
    if (!promoCode || !promoCode.trim()) {
      return { discount: 0, error: "Please enter a promo code" };
    }

    const promo = promos.find(p => 
      p.code.toLowerCase() === promoCode.toLowerCase().trim() &&
      subtotal >= p.minOrder
    );
    
    if (!promo) {
      if (promos.find(p => p.code.toLowerCase() === promoCode.toLowerCase().trim())) {
        return { discount: 0, error: `Minimum order of ₹${promos.find(p => p.code.toLowerCase() === promoCode.toLowerCase().trim()).minOrder} required` };
      }
      return { discount: 0, error: "Invalid promo code" };
    }
    
    let discount = 0;
    switch (promo.discountType) {
      case 'percentage':
        discount = Math.round((subtotal * promo.discountValue) / 100);
        break;
      case 'fixed':
        discount = promo.discountValue;
        break;
      case 'bogo': {
        const safeBowl = Array.isArray(bowl) ? bowl : [];
        if (safeBowl.length >= 2) {
          const prices = safeBowl.map(item => {
            const price = orderType === "dine-in" ? item.dinePrice : item.deliveryPrice;
            return price * item.quantity;
          }).sort((a, b) => a - b);
          discount = prices[0];
        }
        break;
      }
      default:
        discount = 0;
    }
    
    return { discount, promo, success: true };
  }, [promos, bowl, orderType]);

  /** ♻️ Reload all */
  const reloadAll = useCallback(() => {
    setError(null);
    loadMenu();
    loadStatus();
    loadReviews();
    loadCombos();
    loadPromos();
  }, [loadMenu, loadStatus, loadReviews, loadCombos, loadPromos]);

  // 🗺️ Create bowl map for O(1) lookups (performance optimization)
  const bowlMap = useMemo(() => {
    const map = new Map();
    const safeBowl = Array.isArray(bowl) ? bowl : [];
    safeBowl.forEach(item => {
      if (item && item.id && !item.isCombo) {
        map.set(item.id, item.quantity || 0);
      }
    });
    return map;
  }, [bowl]);

  // Separate state and actions to prevent unnecessary re-renders
  // Actions never change, so they don't trigger context updates
  const actions = useMemo(() => ({
    addToBowl,
    removeFromBowl,
    clearBowl,
    addComboToBowl,
    setOrderType,
    setCustomerInfo,
    setSpecialInstructions,
    submitReview,
    calculateTotal,
    buildWhatsAppMessage,
    applyPromo,
    reloadAll,
  }), [
    addToBowl,
    removeFromBowl,
    clearBowl,
    addComboToBowl,
    setOrderType,
    setCustomerInfo,
    setSpecialInstructions,
    submitReview,
    calculateTotal,
    buildWhatsAppMessage,
    applyPromo,
    reloadAll,
  ]);

  // State values that can change
  const state = useMemo(() => ({
    menu,
    combos,
    promos,
    reviews,
    status,
    bowl: Array.isArray(bowl) ? bowl : [],
    bowlMap, // Add map for fast lookups
    orderType,
    customerInfo,
    loading,
    error,
    lastUpdated,
    specialInstructions,
  }), [
    menu,
    combos,
    promos,
    reviews,
    status,
    bowl,
    bowlMap,
    orderType,
    customerInfo,
    loading,
    error,
    lastUpdated,
    specialInstructions,
  ]);

  // Combine state and actions
  const contextValue = useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);

  return (
    <DataContext.Provider value={state}>
      <BowlContext.Provider value={{ ...state, ...actions }}>
        <CafeContext.Provider value={contextValue}>
          {children}
        </CafeContext.Provider>
      </BowlContext.Provider>
    </DataContext.Provider>
  );
};

// Custom hooks for selective context consumption
// These prevent unnecessary re-renders by only subscribing to needed data

/** Hook to access only menu data (won't re-render on bowl changes) */
export const useMenuData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useMenuData must be used within CafeProvider");
  return {
    menu: context.menu,
    combos: context.combos,
    promos: context.promos,
    reviews: context.reviews,
    status: context.status,
    loading: context.loading,
    error: context.error,
    lastUpdated: context.lastUpdated,
  };
};

/** Hook to access only bowl data and actions */
export const useBowl = () => {
  const context = useContext(BowlContext);
  if (!context) throw new Error("useBowl must be used within CafeProvider");
  return {
    bowl: context.bowl,
    bowlMap: context.bowlMap,
    orderType: context.orderType,
    customerInfo: context.customerInfo,
    specialInstructions: context.specialInstructions,
    addToBowl: context.addToBowl,
    removeFromBowl: context.removeFromBowl,
    clearBowl: context.clearBowl,
    addComboToBowl: context.addComboToBowl,
    calculateTotal: context.calculateTotal,
    buildWhatsAppMessage: context.buildWhatsAppMessage,
    setOrderType: context.setOrderType,
    setCustomerInfo: context.setCustomerInfo,
    setSpecialInstructions: context.setSpecialInstructions,
  };
};


