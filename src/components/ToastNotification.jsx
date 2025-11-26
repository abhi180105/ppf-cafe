// src/components/ToastNotification.jsx
import { useEffect, memo } from "react";
import styles from "../styles/components/ToastNotification.module.css";

function ToastNotification({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success": return "✅";
      case "error": return "❌";
      case "warning": return "⚠️";
      case "info": return "ℹ️";
      default: return "✅";
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.message}>{message}</span>
      <button 
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(ToastNotification);