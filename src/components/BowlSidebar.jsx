// src/components/BowlSidebar.jsx
import { useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { CafeContext } from "../context/CafeContext";
import { sanitizeString } from "../utils/sanitize";
import CustomerForm from "./CustomerForm";
import DeliveryLocationCheck from "./DeliveryLocationCheck";
import ScheduleSelector from "./ScheduleSelector";
import ToastNotification from "./ToastNotification";
import { placeOrder } from "../services/sheetAPI";
import styles from "../styles/components/BowlSidebar.module.css";

export default function BowlSidebar({ isOpen, onClose }) {
  const sidebarRef = useRef(null);
  const [formErrors, setFormErrors] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [toast, setToast] = useState(null);

  // Schedule state
  const [orderMode, setOrderMode] = useState("ASAP");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

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
    status
  } = useContext(CafeContext);

  // Memoize expensive calculations
  const total = useMemo(() => calculateTotal(), [calculateTotal]);
  // removed whatsappLink as it is no longer needed for the disabled check

  // Helper function to get item price based on order type
  const getItemPrice = useCallback((item) => {
    if (orderType === "delivery") {
      return item.deliveryPrice ?? item.dinePrice ?? 0;
    }
    return item.dinePrice ?? item.deliveryPrice ?? 0;
  }, [orderType]);

  const handleOrderClick = useCallback(async (e) => {
    e.preventDefault();
    if (!orderType) {
      setToast({ message: "Please select an order type (Dine-in, Takeaway, or Delivery) from the menu section", type: "warning" });
      return;
    }

    // Check minimum order for delivery
    if (orderType === "delivery" && total < 200) {
      setToast({ message: `Minimum order value for delivery is ₹200. Current total: ₹${total}`, type: "warning" });
      return;
    }

    // Validate customer information
    const nameValid = customerInfo?.name?.trim();
    const phoneValid = customerInfo?.phone?.trim() && customerInfo.phone.length >= 10;
    const addressValid = orderType !== "delivery" || customerInfo?.address?.trim();

    if (!nameValid || !phoneValid || !addressValid) {
      setFormErrors(true);
      setToast({
        message: orderType === "delivery"
          ? "Please provide your valid name, phone, and delivery address"
          : "Please provide your valid name and phone number",
        type: "error"
      });
      return;
    }

    if (orderType === "delivery") {
      if (!locationData || !locationData.withinRadius) {
        setToast({ message: "Please enable location and ensure you are within the delivery radius.", type: "error" });
        return;
      }
    }

    if (orderMode === "Scheduled") {
      if (!scheduleDate || !scheduleTime) {
        setToast({ message: "Please select a date and time for your scheduled order.", type: "warning" });
        return;
      }

      const [year, month, day] = scheduleDate.split("-").map(Number);
      const [hour, minute] = scheduleTime.split(":").map(Number);
      const selectedDateObj = new Date(year, month - 1, day, hour, minute);
      const now = new Date();

      if (selectedDateObj.getTime() < now.getTime()) {
        setToast({ message: "Scheduled time cannot be in the past.", type: "error" });
        return;
      }

      if (selectedDateObj.getTime() - now.getTime() < 29 * 60000) {
        setToast({ message: "Scheduled time must be at least 30 minutes from now.", type: "error" });
        return;
      }

      const openTimeParts = (status?.openTime || "10:00").split(":");
      const closeTimeParts = (status?.closeTime || "23:00").split(":");
      const selectedMins = hour * 60 + minute;
      const openMins = parseInt(openTimeParts[0]) * 60 + parseInt(openTimeParts[1]);
      const closeMins = parseInt(closeTimeParts[0]) * 60 + parseInt(closeTimeParts[1]);

      if (selectedMins < openMins || selectedMins > closeMins) {
        setToast({ message: `Please select a time within our operating hours (${status?.openTime || "10:00"} - ${status?.closeTime || "23:00"}).`, type: "error" });
        return;
      }
    }

    setIsPlacingOrder(true);
    setFormErrors(false);

    try {
      const orderPayload = {
        customerName: customerInfo?.name || "",
        phone: customerInfo?.phone || "",
        address: customerInfo?.address || "",
        items: bowl.map(b => `${b.quantity}x ${b.name}`).join(", "),
        total: total,
        orderType: orderType,
        orderMode: orderMode,
        scheduledDate: orderMode === "Scheduled" ? scheduleDate : "",
        scheduledTime: orderMode === "Scheduled" ? scheduleTime : "",
        scheduledDateTime: orderMode === "Scheduled" && scheduleDate && scheduleTime ? `${scheduleDate} ${scheduleTime}` : "",
        latitude: locationData?.lat || "",
        longitude: locationData?.lng || "",
        distance: locationData?.distance || ""
      };

      const result = await placeOrder(orderPayload);

      let formattedTime = scheduleTime;
      if (scheduleTime) {
        const [h, m] = scheduleTime.split(':');
        const hr = parseInt(h);
        formattedTime = `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
      }

      const extraData = {
        schedule: orderMode === "Scheduled" ? { mode: "Scheduled", date: scheduleDate, time: formattedTime } : null,
        location: locationData ? { lat: locationData.lat, lng: locationData.lng } : null
      };

      const finalLink = buildWhatsAppMessage(result.orderId, extraData);

      if (!finalLink) {
        setToast({ message: "Unable to generate order link. Please try again.", type: "error" });
      } else {
        window.open(finalLink, '_blank');
        setToast({ message: "Order placed successfully! Redirecting to WhatsApp...", type: "success" });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to place order. Please check your connection and try again.", type: "error" });
    } finally {
      setIsPlacingOrder(false);
    }
  }, [orderType, customerInfo, buildWhatsAppMessage, total, locationData, orderMode, scheduleDate, scheduleTime, bowl]);

  // We visually disable the button, but keep it clickable so we can show toasts for errors
  const hasValidationErrors = !orderType || (orderType === "delivery" && total < 200) || (orderType === "delivery" && (!locationData || !locationData.withinRadius));

  // Handle escape key and focus management
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      sidebarRef.current?.focus();
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bowl-title">
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
        <h2 className={styles.title} id="bowl-title">Your Bowl 🛒</h2>

        {bowl.length === 0 ? (
          <p className={styles.empty}>No items yet. Add something tasty! 😋</p>
        ) : (
          <>
            <div className={styles.scrollContent}>
              <div className={styles.items}>
                {bowl.map((b, i) => (
                  <div key={i} className={styles.itemRow}>
                    <div>
                      <p className={styles.itemName}>{b.name}</p>
                      <p className={styles.itemPrice}>₹{getItemPrice(b)}</p>
                    </div>
                    <div className={styles.qtyBox}>
                      <button className={styles.qtyBtn} onClick={() => removeFromBowl(b.id)} aria-label="Decrease quantity">
                        −
                      </button>
                      <span>{b.quantity}</span>
                      <button className={styles.qtyBtn} onClick={() => b.isCombo ? addComboToBowl(b) : addToBowl(b)} aria-label="Increase quantity">
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
                <label htmlFor="special-instructions" className={styles.instructionsLabel}>
                  Special Instructions
                </label>
                <input
                  id="special-instructions"
                  type="text"
                  className={styles.instructionsInput}
                  placeholder="e.g., No onions, extra spicy..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(sanitizeString(e.target.value, 100))}
                  maxLength={100}
                />
              </div>
            </div>

            <div className={styles.summary}>
              <p className={styles.totalText}>Total: ₹{total}</p>
              {orderType === "delivery" && total < 200 && (
                <p className={styles.minOrderWarning}>Minimum order: ₹200 for delivery</p>
              )}
              <div className={styles.actions}>
                <button className={styles.clearBtn} onClick={clearBowl}>
                  Clear Bowl
                </button>
                <button
                  className={`${styles.orderBtn} ${hasValidationErrors ? styles.disabled : ''}`}
                  onClick={handleOrderClick}
                  disabled={isPlacingOrder}
                >
                  {isPlacingOrder ? "Processing..." : "Order via WhatsApp 💬"}
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