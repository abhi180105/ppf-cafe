// src/pages/Home.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useMenuData, CafeContext } from "../context/CafeContext";
import { useContext } from "react";
import MenuItemCard from "../components/MenuItemCard";
import SkeletonCard from "../components/SkeletonCard";
import MenuSearch from "../components/MenuSearch";

import ComboDeal from "../components/ComboDeal";

import ReviewSystem from "../components/ReviewSystem";
import FeedbackSystem from "../components/FeedbackSystem";
import OrderTypeTabs from "../components/OrderTypeTabs";
import BowlBar from "../components/BowlBar";
import FloatingWhatsAppButton from "../components/FloatingWhatsAppButton";
import Footer from "../components/Footer";
import styles from "../styles/pages/Home.module.css";

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  if (typeof timeStr === 'string' && timeStr.includes('T')) {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return timeStr;
};

export default function Home({ showBowl, setShowBowl }) {
  // Use selective hook - only re-renders when menu/status changes, not bowl
  const { menu, loading, error, status } = useMenuData();
  const { reloadAll } = useContext(CafeContext);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ veg: false, egg: false, drinks: false });
  const [sortBy, setSortBy] = useState("original");

  // Filter menu items (preserve Excel sheet order)
  const filteredMenu = useMemo(() => {
    if (!Array.isArray(menu)) return [];

    let filtered = menu.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filters
      if (filters.veg && item.type !== 'veg') return false;
      if (filters.egg && item.type !== 'egg') return false;
      if (filters.drinks && item.type !== 'drinks') return false;

      return true;
    });

    // Sort only if not default (preserve Excel order for default)
    if (sortBy === "price-low") {
      filtered.sort((a, b) => (a.dinePrice || 0) - (b.dinePrice || 0));
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => (b.dinePrice || 0) - (a.dinePrice || 0));
    } else if (sortBy === "name") {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    // For sortBy === "popular" or default, maintain original Excel order

    return filtered;
  }, [menu, searchTerm, filters, sortBy]);

  const byCategory = useMemo(() => {
    if (!Array.isArray(filteredMenu)) {
      return {};
    }
    const categories = filteredMenu.reduce((acc, item) => {
      if (!item) return acc;
      const cat = (item.category || "Uncategorized").trim();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
    return categories;
  }, [filteredMenu]);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSort) => {
    setSortBy(newSort);
  }, []);

  const toggleCategory = useCallback((cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // Auto-expand first category on mount
  useEffect(() => {
    if (Object.keys(byCategory).length > 0 && Object.keys(expandedCategories).length === 0) {
      const firstCategory = Object.keys(byCategory)[0];
      setExpandedCategories({ [firstCategory]: true });
    }
  }, [byCategory, expandedCategories]);

  return (
    <div className={styles.container}>
      {/* 🏞 Hero Section */}
      <section className={styles.hero} id="home">
        <div className={styles.overlayHero}></div>
        <div className={styles.heroContent}>
          <img
            src="/ppflogo.png"
            alt="Prime Patties & Foods Logo"
            className={styles.heroLogo}
            loading="eager"
            width="200"
            height="200"
            decoding="async"
          />
          <h1 className={styles.heroTitle}>Prime Patties & Foods</h1>
          <p className={styles.heroSubtitle}>Good Vibes, Great Bites! ☕</p>
        </div>
      </section>

      {/* 🕒 Cafe Status */}
      <section className={styles.statusSection}>
        {status?.isOpen ? (
          <div className={styles.openBox}>
            <div className={styles.indicator}></div>
            <div>
              <h2 className={styles.statusHeading}>We’re Open! ☕</h2>
              <p className={styles.statusText}>{formatTime(status?.openTime)} - {formatTime(status?.closeTime)}</p>
            </div>
          </div>
        ) : (
          <div className={styles.closedBox}>
            <div className={styles.indicatorClosed}></div>
            <div>
              <h2 className={styles.statusHeading}>We’re Closed 😴</h2>
              <p className={styles.statusText}>Opens at {formatTime(status?.openTime)}</p>
            </div>
          </div>
        )}
      </section>

      {/* 🍔 Menu Section */}
      <section className={styles.menuSection} id="menu">
        {!status?.isOpen && (
          <div className={styles.closedNotice}>
            ⚠️ We're currently closed. You can browse the menu but ordering is disabled.
          </div>
        )}
          <h2 className={styles.menuTitle}>Our Menu 🍽️</h2>
          <OrderTypeTabs />

          {/* Search and Filter */}
          <MenuSearch 
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />



          {/* Combo Deals */}
          <ComboDeal />

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.grid}>
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className={styles.errorBox}>
              <span className={styles.errorIcon}>⚠️</span>
              <h3 className={styles.errorTitle}>Oops! Something went wrong</h3>
              <p className={styles.errorMessage}>{error}</p>
              <button onClick={reloadAll} className={styles.retryBtn}>
                🔄 Try Again
              </button>
            </div>
          ) : Object.keys(byCategory).length === 0 ? (
            <div className={styles.emptyBox}>
              <span className={styles.emptyIcon}>🍽️</span>
              <h3 className={styles.emptyTitle}>No menu items available</h3>
              <p className={styles.emptyMessage}>We're updating our menu. Please check back soon!</p>
              <button onClick={reloadAll} className={styles.retryBtn}>
                🔄 Refresh Menu
              </button>
            </div>
          ) : (
            Object.keys(byCategory).map((cat) => (
              <div key={cat} className={styles.categoryBlock}>
                <div className={styles.categoryHeader} onClick={() => toggleCategory(cat)}>
                  <h3 className={styles.categoryTitle}>{cat}</h3>
                  <button className={styles.expandBtn}>
                    {expandedCategories[cat] ? "−" : "+"}
                  </button>
                </div>

                {expandedCategories[cat] && (
                  <div className={styles.grid}>
                    {byCategory[cat].map((item, idx) => (
                      <MenuItemCard key={idx} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>



      {/* ⭐ Review Section */}
      <div id="reviews">
        <ReviewSystem />
      </div>

      {/* 💬 Feedback Section */}
      <div id="feedback">
        <FeedbackSystem />
      </div>

      {/* 🛒 Bowl Bar (bottom) */}
      <BowlBar onOpen={() => setShowBowl(true)} />

      {/* 💬 Floating WhatsApp Button */}
      <FloatingWhatsAppButton />

      {/* 🪶 Footer */}
      <Footer />
    </div>
  );
}
