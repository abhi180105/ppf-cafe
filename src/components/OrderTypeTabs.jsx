// src/components/OrderTypeTabs.jsx
import { memo } from "react";
import { useBowl } from "../context/CafeContext";
import styles from "../styles/components/OrderTypeTabs.module.css";

const tabs = [
  { id: "dine-in", label: "Dine-In", icon: "🍽️" },
  { id: "takeaway", label: "Takeaway", icon: "🥡" },
  { id: "delivery", label: "Delivery", icon: "🚚" },
];

function OrderTypeTabs() {
  const { orderType, setOrderType } = useBowl();

  return (
    <div className={styles.tabsContainer} role="tablist" aria-label="Order type selection">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setOrderType(tab.id)}
          className={`${styles.tabButton} ${orderType === tab.id ? styles.active : ''}`}
          role="tab"
          aria-selected={orderType === tab.id}
        >
          <span className={styles.icon} aria-hidden="true">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(OrderTypeTabs);