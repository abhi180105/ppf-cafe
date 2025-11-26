// src/components/MenuSearch.jsx
import { useState, useEffect, useCallback, memo } from "react";
import { sanitizeString } from "../utils/sanitize";
import styles from "../styles/components/MenuSearch.module.css";

function MenuSearch({ onSearchChange, onFilterChange, onSortChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("original");

  // Debounced search to reduce re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange?.(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearchChange]);

  useEffect(() => {
    const filters = {
      veg: selectedFilter === "veg",
      egg: selectedFilter === "egg", 
      drinks: selectedFilter === "drinks"
    };
    onFilterChange?.(filters);
  }, [selectedFilter, onFilterChange]);

  useEffect(() => {
    onSortChange?.(sortBy);
  }, [sortBy, onSortChange]);

  const handleFilterChange = useCallback((filterName) => {
    setSelectedFilter(filterName);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchTerm("");
    setSelectedFilter("all");
    setSortBy("original");
  }, []);

  const hasActiveFilters = searchTerm || selectedFilter !== "all" || sortBy !== "original";

  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(sanitizeString(e.target.value, 100))}
          aria-label="Search menu items"
          maxLength={100}
        />
        {searchTerm && (
          <button
            className={styles.clearBtn}
            onClick={() => setSearchTerm("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters and Sort */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          <span className={styles.label}>Category:</span>
          <label className={`${styles.filterBtn} ${selectedFilter === 'all' ? styles.active : ''}`}>
            <input
              type="radio"
              name="filter"
              value="all"
              checked={selectedFilter === 'all'}
              onChange={() => handleFilterChange('all')}
              className={styles.radioInput}
            />
            🍽️ All
          </label>
          <label className={`${styles.filterBtn} ${selectedFilter === 'veg' ? styles.active : ''}`}>
            <input
              type="radio"
              name="filter"
              value="veg"
              checked={selectedFilter === 'veg'}
              onChange={() => handleFilterChange('veg')}
              className={styles.radioInput}
            />
            🥗 Veg
          </label>
          <label className={`${styles.filterBtn} ${selectedFilter === 'egg' ? styles.active : ''}`}>
            <input
              type="radio"
              name="filter"
              value="egg"
              checked={selectedFilter === 'egg'}
              onChange={() => handleFilterChange('egg')}
              className={styles.radioInput}
            />
            🥚 Egg
          </label>
          <label className={`${styles.filterBtn} ${selectedFilter === 'drinks' ? styles.active : ''}`}>
            <input
              type="radio"
              name="filter"
              value="drinks"
              checked={selectedFilter === 'drinks'}
              onChange={() => handleFilterChange('drinks')}
              className={styles.radioInput}
            />
            🥤 Drinks
          </label>
        </div>

        <div className={styles.sort}>
          <label htmlFor="sort-select" className={styles.label}>Sort:</label>
          <select
            id="sort-select"
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="original">Original Order</option>
            <option value="name">Name (A-Z)</option>
            <option value="price-low">Price (Low to High)</option>
            <option value="price-high">Price (High to Low)</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            className={styles.clearAllBtn}
            onClick={handleClearAll}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent re-renders
export default memo(MenuSearch);