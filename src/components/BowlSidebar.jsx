// src/components/BowlSidebar.jsx
import { useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { CafeContext } from "../context/CafeContext";
import { sanitizeString } from "../utils/sanitize";
import CustomerForm from "./CustomerForm";
import styles from "../styles/components/BowlSidebar.module.css";

export default function BowlSidebar({ isOpen, onClose }) {
  const sidebarRef = useRef(null);
  const [formErrors, setFormErrors] = useState(false);
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
  } = useContext(CafeContext);

  // Memoize expensive calculations
  const total = useMemo(() => calculateTotal(), [calculateTotal]);
  // Don't save order to history when just generating preview link
  const whatsappLink = useMemo(() => buildWhatsAppMessage(false), [buildWhatsAppMessage]);

  // Helper function to get item price based on order type
  const getItemPrice = useCallback((item) => {
    if (orderType === "delivery") {
      return item.deliveryPrice ?? item.dinePrice ?? 0;
    }
    return item.dinePrice ?? item.deliveryPrice ?? 0;
  }, [orderType]);

  const handleOrderClick = useCallback((e) => {
    if (!orderType) {
      e.preventDefault();
      alert("Please select an order type (Dine-in, Takeaway, or Delivery) from the menu section");
      return;
    }

    // Check minimum order for delivery
    if (orderType === "delivery" && total < 200) {
      e.preventDefault();
      alert(`Minimum order value for delivery is ₹200. Current total: ₹${total}`);
      return;
    }

    // Validate customer information
    const nameValid = customerInfo?.name?.trim();
    const addressValid = orderType !== "delivery" || customerInfo?.address?.trim();

    if (!nameValid || !addressValid) {
      e.preventDefault();
      setFormErrors(true);
      alert(
        orderType === "delivery" 
          ? "Please provide your name and delivery address" 
          : "Please provide your name"
      );
      return;
    }

    // Generate link with order save when user actually clicks
    const finalLink = buildWhatsAppMessage(true);
    if (!finalLink) {
      e.preventDefault();
      alert("Unable to generate order link. Please try again.");
      return;
    }

    // Update the link and navigate
    window.open(finalLink, '_blank');
    e.preventDefault();

    // Clear form errors on successful order
    setFormErrors(false);
  }, [orderType, customerInfo, buildWhatsAppMessage]);

  const isOrderDisabled = !orderType || !whatsappLink || (orderType === "delivery" && total < 200);

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

            <CustomerForm />

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
                  className={`${styles.orderBtn} ${isOrderDisabled ? styles.disabled : ''}`}
                  onClick={handleOrderClick}
                  disabled={isOrderDisabled}
                >
                  Order via WhatsApp 💬
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