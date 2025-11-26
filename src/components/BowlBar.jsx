// src/components/BowlBar.jsx
import { useMemo, useCallback } from "react";
import { useBowl } from "../context/CafeContext";
import styles from "../styles/components/BowlBar.module.css";

export default function BowlBar({ onOpen }) {
  const { bowl = [], calculateTotal } = useBowl();

  const safeBowl = Array.isArray(bowl) ? bowl : [];
  const itemCount = safeBowl.reduce((sum, b) => sum + (b?.quantity || 0), 0);
  if (itemCount === 0) return null;

  // Memoize total calculation to prevent recalculating on every render
  const total = useMemo(() => calculateTotal(), [calculateTotal]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  }, [onOpen]);

  return (
    <div 
      className={styles.bar} 
      onClick={onOpen} 
      role="button" 
      tabIndex={0} 
      onKeyDown={handleKeyDown}
      aria-label={`View bowl with ${itemCount} item${itemCount > 1 ? "s" : ""}, total ${total} rupees`}
    >
      <div className={styles.barContent}>
        <p className={styles.barText} aria-hidden="true">🛒 {itemCount} item{itemCount > 1 ? "s" : ""} in Bowl</p>
        <p className={styles.barPrice} aria-hidden="true">₹{total}</p>
      </div>
      <button className={styles.barButton} aria-label="View bowl details">View Bowl ☕</button>
    </div>
  );
}