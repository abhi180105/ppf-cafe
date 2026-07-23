// src/components/Navbar.jsx
import { memo, useState, useEffect } from "react";
import { useBowl } from "../context/CafeContext";
import styles from "../styles/components/Navbar.module.css";

function Navbar({ onBowlClick }) {
  const { bowl = [] } = useBowl();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 10) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const safeBowl = Array.isArray(bowl) ? bowl : [];
  const itemCount = safeBowl.reduce((sum, b) => sum + (b?.quantity || 0), 0);

  return (
    <nav className={`${styles.navbar} ${!isVisible ? styles.hidden : ''}`}>
      <div className={styles.logo} onClick={() => scrollToSection('home')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && scrollToSection('home')}>
        <img src="/ppflogo.png" alt="Prime Patties & Foods Logo" className={styles.logoImage} />
        <span className={styles.logoText}>Prime Patties & Foods</span>
      </div>
      
      <div className={styles.navLinks}>
        <button onClick={() => scrollToSection('menu')} className={styles.navLink}>
          Menu
        </button>
        <button onClick={() => scrollToSection('reviews')} className={styles.navLink}>
          Reviews
        </button>
        <button 
          onClick={onBowlClick} 
          className={styles.bowlButton}
          aria-label={`View bowl with ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
        >
          🛒 Bowl
          {itemCount > 0 && (
            <span className={styles.badge} aria-label={`${itemCount} items`}>
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}

// Memoize to prevent re-renders when menu data changes
export default memo(Navbar);