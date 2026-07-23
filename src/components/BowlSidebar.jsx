// src/components/BowlSidebar.jsx
import { useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { CafeContext } from "../context/CafeContext";
import { sanitizeString } from "../utils/sanitize";
import CustomerForm from "./CustomerForm";
import DeliveryLocationCheck from "./DeliveryLocationCheck";
import ScheduleSelector from "./ScheduleSelector";
import ToastNotification from "./ToastNotification";
import { placeOrder } from "../services/sheetAPI";
import { CHECKOUT_STORAGE_KEY } from "../services/constants";
import styles from "../styles/components/BowlSidebar.module.css";

// --------------------------------------------------------------------------
// Checkout persistence helpers
// --------------------------------------------------------------------------
function loadCheckoutState() {
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCheckoutState(state) {
  try {
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — non-fatal
  }
}

// --------------------------------------------------------------------------
// WhatsApp open helper — detects blocked popups and provides fallback
// --------------------------------------------------------------------------
function openWhatsApp(url) {
  // Try window.open() first; most mobile browsers open WA directly
  const newWin = window.open(url, "_blank", "noopener,noreferrer");
  if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
    // Popup was blocked — fall back to location.href (same-tab navigation)
    return { opened: false, url };
  }
  return { opened: true };
}

export default function BowlSidebar({ isOpen, onClose }) {
  const sidebarRef = useRef(null);
  const [formErrors, setFormErrors] = useState(false);

  // Submission state — drives button lock & loading UI
  const [submitState, setSubmitState] = useState("idle"); // idle | loading | success | error
  const [whatsappFallback, setWhatsappFallback] = useState(null); // URL when popup blocked

  const [toast, setToast] = useState(null);

  // Persist schedule state
  const savedCheckout = useMemo(() => loadCheckoutState(), []);
  const [orderMode, setOrderMode] = useState(savedCheckout?.orderMode || "ASAP");
  const [scheduleDate, setScheduleDate] = useState(savedCheckout?.scheduleDate || "");
  const [scheduleTime, setScheduleTime] = useState(savedCheckout?.scheduleTime || "");

  // Location state
  const [locationData, setLocationData] = useState(null);

  const {
    bowl = [],
    addToBowl,
    removeFromBowl,
    clearBowl,
    addComboToBowl,
    calculateTotal,
    buildWhatsAppMessage,
    orderType,
    customerInfo,
    specialInstructions,
    setSpecialInstructions,
    setOrderType,
    status,
  } = useContext(CafeContext);

  const total = useMemo(() => calculateTotal(), [calculateTotal]);

  // ----------------------------------------------------------------------
  // Persist checkout state to localStorage (debounced)
  // ----------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCheckoutState({ orderMode, scheduleDate, scheduleTime });
    }, 400);
    return () => clearTimeout(timer);
  }, [orderMode, scheduleDate, scheduleTime]);

  // Helper: item price by order type
  const getItemPrice = useCallback(
    (item) => {
      if (orderType === "delivery") return item.deliveryPrice ?? item.dinePrice ?? 0;
      return item.dinePrice ?? item.deliveryPrice ?? 0;
    },
    [orderType]
  );

  // ----------------------------------------------------------------------
  // Scheduled order validation (client-side — mirrors server-side)
  // ----------------------------------------------------------------------
  const validateSchedule = useCallback(() => {
    if (orderMode !== "Scheduled") return null;

    if (!scheduleDate || !scheduleTime) {
      return "Please select a date and time for your scheduled order.";
    }

    const [year, month, day] = scheduleDate.split("-").map(Number);
    const [hour, minute] = scheduleTime.split(":").map(Number);
    const selectedDateObj = new Date(year, month - 1, day, hour, minute);
    const now = new Date();

    if (selectedDateObj.getTime() <= now.getTime()) {
      return "Scheduled time cannot be in the past.";
    }

    const minNoticeMs = 30 * 60 * 1000;
    if (selectedDateObj.getTime() - now.getTime() < minNoticeMs) {
      return "Please schedule at least 30 minutes in advance.";
    }

    const openTimeParts = (status?.openTime || "10:00").split(":");
    const closeTimeParts = (status?.closeTime || "23:00").split(":");
    const selectedMins = hour * 60 + minute;
    const openMins = parseInt(openTimeParts[0]) * 60 + parseInt(openTimeParts[1]);
    const closeMins = parseInt(closeTimeParts[0]) * 60 + parseInt(closeTimeParts[1]);

    if (selectedMins < openMins || selectedMins > closeMins) {
      return `Please select a time within our operating hours (${status?.openTime || "10:00"} – ${status?.closeTime || "23:00"}).`;
    }

    return null;
  }, [orderMode, scheduleDate, scheduleTime, status]);

  // ----------------------------------------------------------------------
  // Main order handler
  // ----------------------------------------------------------------------
  const handleOrderClick = useCallback(
    async (e) => {
      e.preventDefault();

      // Guard: prevent re-entry while loading
      if (submitState === "loading") return;

      // Dismiss any stale WhatsApp fallback UI
      setWhatsappFallback(null);

      if (!orderType) {
        setToast({
          message: "Please select an order type (Dine-in, Takeaway, or Delivery) from the menu section",
          type: "warning",
        });
        return;
      }

      if (orderType === "delivery" && total < 200) {
        setToast({
          message: `Minimum order for delivery is ₹200. Current total: ₹${total}`,
          type: "warning",
        });
        return;
      }

      // Customer info validation
      const nameValid = customerInfo?.name?.trim();
      const phoneValid = customerInfo?.phone?.trim() && customerInfo.phone.length >= 10;
      const addressValid = orderType !== "delivery" || customerInfo?.address?.trim();

      if (!nameValid || !phoneValid || !addressValid) {
        setFormErrors(true);
        setToast({
          message:
            orderType === "delivery"
              ? "Please provide your valid name, phone, and delivery address"
              : "Please provide your valid name and phone number",
          type: "error",
        });
        return;
      }

      // Delivery location validation
      if (orderType === "delivery") {
        if (!locationData || !locationData.withinRadius) {
          setToast({
            message: "Please enable location and ensure you are within the 2 km delivery radius.",
            type: "error",
          });
          return;
        }
      }

      // Scheduled order validation
      const scheduleError = validateSchedule();
      if (scheduleError) {
        setToast({ message: scheduleError, type: "error" });
        return;
      }

      // ── Lock button immediately ────────────────────────────────────────
      setSubmitState("loading");
      setFormErrors(false);

      try {
        const orderPayload = {
          customerName: customerInfo?.name || "",
          phone: customerInfo?.phone || "",
          address: customerInfo?.address || "",
          items: bowl.map((b) => `${b.quantity}x ${b.name}`).join(", "),
          total: total,
          orderType: orderType,
          specialInstructions: specialInstructions || "",
          orderMode: orderMode,
          scheduledDate: orderMode === "Scheduled" ? scheduleDate : "",
          scheduledTime: orderMode === "Scheduled" ? scheduleTime : "",
          scheduledDateTime:
            orderMode === "Scheduled" && scheduleDate && scheduleTime
              ? `${scheduleDate} ${scheduleTime}`
              : "",
          latitude: locationData?.lat || "",
          longitude: locationData?.lng || "",
          distance: locationData?.distance || "",
        };

        // ── Save to Google Sheets ──────────────────────────────────────
        const result = await placeOrder(orderPayload);

        let formattedTime = scheduleTime;
        if (scheduleTime) {
          const [h, m] = scheduleTime.split(":");
          const hr = parseInt(h);
          formattedTime = `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
        }

        const extraData = {
          schedule:
            orderMode === "Scheduled"
              ? { mode: "Scheduled", date: scheduleDate, time: formattedTime }
              : null,
          location: locationData
            ? { lat: locationData.lat, lng: locationData.lng }
            : null,
        };

        const finalLink = buildWhatsAppMessage(result.orderId, extraData);

        if (!finalLink) {
          setToast({
            message: "Unable to generate order link. Please try again.",
            type: "error",
          });
          setSubmitState("error");
          return;
        }

        // ── Open WhatsApp ──────────────────────────────────────────────
        const { opened, url } = openWhatsApp(finalLink);
        setSubmitState("success");

        if (opened) {
          setToast({
            message: "Order placed! Opening WhatsApp... 💬",
            type: "success",
          });
        } else {
          // Popup blocked or unsupported — show fallback UI
          setWhatsappFallback(url);
          setToast({
            message:
              "WhatsApp could not be opened automatically. Please tap the button below to open it.",
            type: "warning",
          });
        }
      } catch (err) {
        console.error("Place order error:", err.message);
        setToast({
          message: "Failed to place order. Please check your connection and try again.",
          type: "error",
        });
        // ── Re-enable button on error ──────────────────────────────────
        setSubmitState("error");
      }
    },
    [
      submitState,
      orderType,
      customerInfo,
      buildWhatsAppMessage,
      total,
      locationData,
      orderMode,
      scheduleDate,
      scheduleTime,
      bowl,
      specialInstructions,
      validateSchedule,
    ]
  );

  // Visual disabled state for the order button
  const hasValidationErrors =
    !orderType ||
    (orderType === "delivery" && total < 200) ||
    (orderType === "delivery" && (!locationData || !locationData.withinRadius));

  // Order button copy & state
  const orderBtnLabel = useMemo(() => {
    if (submitState === "loading") return "⏳ Processing…";
    if (submitState === "success") return "✅ Order Sent!";
    return "Order via WhatsApp 💬";
  }, [submitState]);

  const orderBtnDisabled = submitState === "loading" || submitState === "success";

  // Escape key / focus management
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      sidebarRef.current?.focus();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bowl-title"
    >
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div
        className={styles.sidebar}
        onClick={(e) => e.stopPropagation()}
        ref={sidebarRef}
        tabIndex={-1}
      >
        <h2 className={styles.title} id="bowl-title">
          Your Bowl 🛒
        </h2>

        {bowl.length === 0 ? (
          <p className={styles.empty}>No items yet. Add something tasty! 😋</p>
        ) : (
          <>
            <div className={styles.scrollContent}>
              <div className={styles.items}>
                {bowl.map((b) => (
                  <div
                    key={`${b.id}-${b.isCombo ? "combo" : "item"}`}
                    className={styles.itemRow}
                  >
                    <div>
                      <p className={styles.itemName}>{b.name}</p>
                      <p className={styles.itemPrice}>₹{getItemPrice(b)}</p>
                    </div>
                    <div className={styles.qtyBox}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => removeFromBowl(b.id)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{b.quantity}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() =>
                          b.isCombo ? addComboToBowl(b) : addToBowl(b)
                        }
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {orderType === "delivery" && (
                <DeliveryLocationCheck
                  onLocationValid={setLocationData}
                  setOrderType={setOrderType}
                />
              )}

              <CustomerForm showErrors={formErrors} />

              <ScheduleSelector
                orderMode={orderMode}
                setOrderMode={setOrderMode}
                scheduleDate={scheduleDate}
                setScheduleDate={setScheduleDate}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                status={status}
              />

              {/* Special Instructions */}
              <div className={styles.instructionsWrapper}>
                <label
                  htmlFor="special-instructions"
                  className={styles.instructionsLabel}
                >
                  Special Instructions
                </label>
                <input
                  id="special-instructions"
                  type="text"
                  className={styles.instructionsInput}
                  placeholder="e.g., No onions, extra spicy…"
                  value={specialInstructions}
                  onChange={(e) =>
                    setSpecialInstructions(sanitizeString(e.target.value, 100))
                  }
                  maxLength={100}
                />
              </div>

              {/* WhatsApp Fallback UI — shown when popup is blocked */}
              {whatsappFallback && (
                <div className={styles.whatsappFallback}>
                  <p>📱 Tap below to open WhatsApp and confirm your order:</p>
                  <a
                    href={whatsappFallback}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.whatsappFallbackBtn}
                    onClick={() => setWhatsappFallback(null)}
                  >
                    Open WhatsApp 💬
                  </a>
                </div>
              )}
            </div>

            <div className={styles.summary}>
              <p className={styles.totalText}>Total: ₹{total}</p>
              {orderType === "delivery" && total < 200 && (
                <p className={styles.minOrderWarning}>
                  Minimum order: ₹200 for delivery
                </p>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.clearBtn}
                  onClick={clearBowl}
                  disabled={orderBtnDisabled}
                >
                  Clear Bowl
                </button>
                <button
                  id="order-whatsapp-btn"
                  className={`${styles.orderBtn} ${
                    hasValidationErrors || orderBtnDisabled ? styles.disabled : ""
                  } ${submitState === "loading" ? styles.loading : ""}`}
                  onClick={handleOrderClick}
                  disabled={orderBtnDisabled}
                  aria-busy={submitState === "loading"}
                  aria-label="Place order via WhatsApp"
                >
                  {submitState === "loading" && (
                    <span className={styles.spinner} aria-hidden="true" />
                  )}
                  {orderBtnLabel}
                </button>
              </div>
            </div>
          </>
        )}
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close bowl sidebar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}