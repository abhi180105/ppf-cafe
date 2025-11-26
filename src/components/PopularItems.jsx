// src/components/PopularItems.jsx
import { useMemo, memo } from "react";
import { useMenuData } from "../context/CafeContext";
import MenuItemCard from "./MenuItemCard";
import styles from "../styles/components/PopularItems.module.css";

function PopularItems() {
  const { menu } = useMenuData();

  // Get first 3 menu items as popular items
  const popularItems = useMemo(() => {
    if (!Array.isArray(menu) || menu.length === 0) return [];
    return menu.slice(0, 3);
  }, [menu]);

  if (popularItems.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>🔥 Trending Now</h2>
        <p className={styles.subtitle}>Most loved by our customers</p>
      </div>
      
      <div className={styles.grid}>
        {popularItems.map((item, idx) => (
          <div key={item.id} className={styles.item}>
            {idx === 0 && <span className={styles.badge}>🏆 #1</span>}
            {idx === 1 && <span className={styles.badge}>🥈 #2</span>}
            {idx === 2 && <span className={styles.badge}>🥉 #3</span>}
            <MenuItemCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Memoize to prevent re-renders when bowl changes
export default memo(PopularItems);