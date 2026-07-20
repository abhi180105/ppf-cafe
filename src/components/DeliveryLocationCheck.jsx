import React, { useEffect } from "react";
import { useLocation } from "../hooks/useLocation";
import styles from "../styles/components/BowlSidebar.module.css";

export default function DeliveryLocationCheck({ onLocationValid, setOrderType }) {
  const { locationStatus, locationData, locationError, requestLocation } = useLocation();

  useEffect(() => {
    if (locationStatus === "success") {
      onLocationValid(locationData);
    } else if (locationStatus === "denied" || (locationStatus === "success" && !locationData.withinRadius)) {
      onLocationValid(null);
    }
  }, [locationStatus, locationData, onLocationValid]);

  return (
    <div className={styles.locationCard}>
      <h3 className={styles.locationTitle}>📍 Delivery Availability</h3>
      
      {locationStatus === "idle" && (
        <div className={styles.locationContent}>
          <p>Enable your location to check whether delivery is available at your address.</p>
          <button className={styles.locationBtn} onClick={requestLocation}>
            Allow Location
          </button>
        </div>
      )}

      {locationStatus === "requesting" && (
        <div className={styles.locationContent}>
          <p>Getting your location...</p>
        </div>
      )}

      {locationStatus === "success" && locationData?.withinRadius && (
        <div className={styles.locationSuccess}>
          <p>✅ Delivery Available</p>
          <p className={styles.locationSmallText}>You are {locationData.distance.toFixed(1)} km away.</p>
        </div>
      )}

      {locationStatus === "success" && !locationData?.withinRadius && (
        <div className={styles.locationError}>
          <p>❌ Delivery is currently available only within 2 km of PPF Cafe.</p>
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
          <p>Location access is required to verify delivery availability. You can still place a Pickup order.</p>
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={styles.locationBtn} onClick={requestLocation}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
