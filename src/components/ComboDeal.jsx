// src/components/ComboDeal.jsx
import { useCallback, memo, useContext } from "react";
import { useMenuData, useBowl, CafeContext } from "../context/CafeContext";
import styles from "../styles/components/ComboDeal.module.css";

function ComboDeal() {
  const { combos, loading, status } = useMenuData();
  const { addComboToBowl, bowl } = useBowl();

  // Get combo quantity from bowl
  const getComboQuantity = useCallback((comboId) => {
    const safeBowl = Array.isArray(bowl) ? bowl : [];
    const comboItem = safeBowl.find(item => item.id === comboId && item.isCombo === true);
    return comboItem ? comboItem.quantity : 0;
  }, [bowl]);

  const handleAddCombo = useCallback((combo) => {
    if (addComboToBowl) {
      addComboToBowl(combo);
    }
  }, [addComboToBowl]);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>🎁 Combo Deals</h2>
          <p className={styles.subtitle}>Loading combos...</p>
        </div>
      </section>
    );
  }

  if (!combos || combos.length === 0) {
    return null; // Don't show section if no combos available
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>🎁 Combo Deals</h2>
        <p className={styles.subtitle}>Save more with our special combos!</p>
      </div>

      <div className={styles.grid}>
        {combos.map((combo) => (
          <div key={combo.id} className={styles.card}>
            <div className={styles.savingsBadge}>
              Save ₹{combo.savings}
            </div>
            
            <div className={styles.imageWrapper}>
              <img 
                src={combo.image} 
                alt={combo.name}
                className={styles.image}
                loading="lazy"
                width="300"
                height="200"
                decoding="async"
              />
            </div>

            <div className={styles.content}>
              <h3 className={styles.comboName}>{combo.name}</h3>
              <p className={styles.description}>{combo.description}</p>

              <div className={styles.pricing}>
                <div className={styles.priceRow}>
                  <span className={styles.label}>Regular:</span>
                  <span className={styles.regularPrice}>₹{combo.regularPrice}</span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.label}>Combo:</span>
                  <span className={styles.comboPrice}>₹{combo.comboPrice}</span>
                </div>
              </div>

              {getComboQuantity(combo.id) === 0 ? (
                <button 
                  className={styles.addBtn}
                  onClick={() => handleAddCombo(combo)}
                  disabled={!status?.isOpen}
                  aria-label={`Add ${combo.name} combo to bowl`}
                >
                  Add Combo +
                </button>
              ) : (
                <div className={styles.quantityControl}>
                  <span className={styles.quantityText}>
                    Added {getComboQuantity(combo.id)} combo{getComboQuantity(combo.id) > 1 ? 's' : ''}
                  </span>
                  <button 
                    className={styles.addMoreBtn}
                    onClick={() => handleAddCombo(combo)}
                    disabled={!status?.isOpen}
                    aria-label={`Add another ${combo.name} combo`}
                  >
                    Add More +
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Memoize to prevent re-renders when bowl changes
export default memo(ComboDeal);