// src/components/CustomerForm.jsx
import { useContext, useState, useEffect, useCallback, memo } from "react";
import { CafeContext } from "../context/CafeContext";
import { sanitizeString } from "../utils/sanitize";
import styles from "../styles/components/CustomerForm.module.css";

function CustomerForm() {
  const { orderType, customerInfo, setCustomerInfo } = useContext(CafeContext);
  const [name, setName] = useState(customerInfo?.name || "");
  const [address, setAddress] = useState(customerInfo?.address || "");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setName(customerInfo?.name || "");
    setAddress(customerInfo?.address || "");
  }, [customerInfo]);

  // Debounce context updates to prevent re-rendering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomerInfo({ name, address });
    }, 500); // Update context only after user stops typing for 500ms
    
    return () => clearTimeout(timer);
  }, [name, address, setCustomerInfo]);

  const handleNameChange = useCallback((e) => {
    const value = sanitizeString(e.target.value, 100);
    setName(value);
    if (errors.name && value.trim()) {
      setErrors(prev => ({ ...prev, name: null }));
    }
  }, [errors.name]);

  const handleAddressChange = useCallback((e) => {
    const value = sanitizeString(e.target.value, 300);
    setAddress(value);
    if (errors.address && value.trim()) {
      setErrors(prev => ({ ...prev, address: null }));
    }
  }, [errors.address]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    if (orderType === "delivery" && !address.trim()) {
      newErrors.address = "Address is required for delivery";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, address, orderType]);

  const needsAddress = orderType === "delivery";

  return (
    <div className={styles.formContainer}>
      <h3 className={styles.formTitle}>👤 Your Details</h3>
      
      <div className={styles.formGroup}>
        <label htmlFor="customerName" className={styles.label}>
          Name <span className={styles.required}>*</span>
        </label>
        <input
          id="customerName"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter your name"
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className={styles.errorText} role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {needsAddress && (
        <div className={styles.formGroup}>
          <label htmlFor="customerAddress" className={styles.label}>
            Delivery Address <span className={styles.required}>*</span>
          </label>
          <textarea
            id="customerAddress"
            value={address}
            onChange={handleAddressChange}
            placeholder="Enter your complete delivery address"
            className={`${styles.textarea} ${errors.address ? styles.inputError : ''}`}
            rows={3}
            aria-invalid={!!errors.address}
            aria-describedby={errors.address ? "address-error" : undefined}
          />
          {errors.address && (
            <p id="address-error" className={styles.errorText} role="alert">
              {errors.address}
            </p>
          )}
        </div>
      )}

      <p className={styles.helperText}>
        {needsAddress 
          ? "📍 We'll deliver to this address" 
          : orderType === "takeaway"
          ? "🥡 We'll prepare your order for pickup"
          : "🍽️ See you at our cafe!"}
      </p>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(CustomerForm);