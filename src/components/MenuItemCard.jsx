// src/components/MenuItemCard.jsx
import { memo, useCallback, useContext } from "react";
import { useBowl, CafeContext } from "../context/CafeContext";
import styles from "../styles/components/MenuItemCard.module.css";

function MenuItemCard({ item }) {
  // Use selective hook to only re-render when bowl or orderType changes
  const { addToBowl, removeFromBowl, bowlMap, orderType } = useBowl();
  const { status } = useContext(CafeContext);

  // Use Map for O(1) lookup instead of O(n) filter
  const countInBowl = bowlMap?.get(item?.id) || 0;

  // Get price based on order type
  const getPrice = () => {
    if (orderType === "delivery") {
      return item.deliveryPrice || item.dinePrice || 0;
    }
    // For dine-in and takeaway, use dinePrice
    return item.dinePrice || item.deliveryPrice || 0;
  };

  const displayPrice = getPrice();
  const isDeliverable = item.deliverable !== false;
  const isAvailable = item.availability !== false;
  const isDisabled = !status?.isOpen || !isAvailable || (orderType === "delivery" && !isDeliverable);

  const handleAddClick = useCallback(() => {
    if (!item) return;
    addToBowl(item);
  }, [item, addToBowl]);

  const handleRemoveClick = useCallback(() => {
    if (!item?.id) return;
    removeFromBowl(item.id);
  }, [item, removeFromBowl]);

  return (
    <article className={styles.card}>
        <div className={styles.imageWrapper}>
          <img 
            src={item.image || "/ppf.png"} 
            alt={`${item.name} - ${item.description || 'Menu item'}`}
            className={styles.image}
            loading="lazy"
            width="300"
            height="200"
            decoding="async"
          />
          {item.isNew && <span className={styles.badge} aria-label="New item">New</span>}
          {!isAvailable && <span className={styles.notAvailableBadge}>Not Available</span>}
          {isAvailable && orderType === "delivery" && !isDeliverable && <span className={styles.notDeliverableBadge}>Not deliverable</span>}
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.title}>{item.name}</h3>
          {item.description && <p className={styles.desc}>{item.description}</p>}
          
          <div className={styles.footer}>
            <div className={styles.priceSection}>
              <span className={styles.price} aria-label={`Price: ${displayPrice} rupees`}>₹{displayPrice}</span>
            </div>
            
            {countInBowl === 0 ? (
              <button 
                className={styles.addBtn} 
                onClick={handleAddClick}
                disabled={isDisabled}
                aria-label={`Add ${item.name} to bowl`}
              >
                <span>Add +</span>
              </button>
            ) : (
              <div className={styles.quantityControl} role="group" aria-label={`Quantity controls for ${item.name}`}>
                <button 
                  className={styles.qtyBtn} 
                  onClick={handleRemoveClick}
                  disabled={isDisabled}
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  −
                </button>
                <span className={styles.qtyText} aria-label={`Current quantity: ${countInBowl}`}>{countInBowl}</span>
                <button 
                  className={styles.qtyBtn} 
                  onClick={handleAddClick}
                  disabled={isDisabled}
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(MenuItemCard, (prevProps, nextProps) => {
  // Only re-render if item changes
  return prevProps.item?.id === nextProps.item?.id &&
         prevProps.item?.name === nextProps.item?.name &&
         prevProps.item?.dinePrice === nextProps.item?.dinePrice &&
         prevProps.item?.deliveryPrice === nextProps.item?.deliveryPrice;
});