// src/components/DeliveryLocationCheck.jsx
import React, { useEffect } from "react";
import { useLocation } from "../hooks/useLocation";
import styles from "../styles/components/BowlSidebar.module.css";

export default function DeliveryLocationCheck({ onLocationValid, setOrderType }) {
  const { locationStatus, locationData, locationError, requestLocation } = useLocation();

  useEffect(() => {
    if (locationStatus === "success") {
      if (locationData?.withinRadius) {
        onLocationValid(locationData);
      } else {
        onLocationValid(null);
      }
    } else if (locationStatus === "denied" || locationStatus === "error") {
      onLocationValid(null);
    }
  }, [locationStatus, locationData, onLocationValid]);

  return (
    <div className={styles.locationCard}>
      <h3 className={styles.locationTitle}>📍 Delivery Availability</h3>

      {locationStatus === "idle" && (
        <div className={styles.locationContent}>
          <p>Enable your location to check whether delivery is available at your address.</p>
          <button
            id="allow-location-btn"
            className={styles.locationBtn}
            onClick={requestLocation}
            aria-label="Allow location access"
          >
            Allow Location
          </button>
        </div>
      )}

      {locationStatus === "requesting" && (
        <div className={styles.locationContent}>
          <div className={styles.locationLoading}>
            <span className={styles.locationSpinner} aria-hidden="true" />
            <p>Getting your location…</p>
          </div>
        </div>
      )}

      {locationStatus === "success" && locationData?.withinRadius && (
        <div className={styles.locationSuccess}>
          <p>✅ Delivery Available</p>
          <p className={styles.locationSmallText}>
            You are {locationData.distance.toFixed(1)} km from PPF Cafe.
          </p>
        </div>
      )}

      {locationStatus === "success" && !locationData?.withinRadius && (
        <div className={styles.locationError}>
          <p>
            ❌ Delivery is only available within 2 km of PPF Cafe.
            You are {locationData?.distance?.toFixed(1)} km away.
          </p>
          <button
            className={styles.locationSwitchBtn}
            onClick={() => setOrderType("takeaway")}
          >
            Switch to Pickup
          </button>
        </div>
      )}

      {locationStatus === "denied" && (
        <div className={styles.locationError}>
          <p>
            🔒 Location access denied. Enable it in your browser settings to order delivery.
          </p>
          <button
            className={styles.locationSwitchBtn}
            onClick={() => setOrderType("takeaway")}
          >
            Switch to Pickup
          </button>
        </div>
      )}

      {locationStatus === "error" && locationError && (
        <div className={styles.locationError}>
          <p>⚠️ {locationError}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <button className={styles.locationBtn} onClick={requestLocation}>
              Try Again
            </button>
            <button
              className={styles.locationSwitchBtn}
              onClick={() => setOrderType("takeaway")}
            >
              Switch to Pickup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
