import { useState, useCallback } from "react";
import { CAFE_LOCATION, DELIVERY_RADIUS_KM } from "../services/constants";

// Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
};

export const useLocation = () => {
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, requesting, success, error, denied
  const [locationData, setLocationData] = useState(null); // { lat, lng, distance, withinRadius }
  const [locationError, setLocationError] = useState(null);

  const requestLocation = useCallback(() => {
    console.log("[Geolocation Debug] requestLocation triggered (Button Clicked)");

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn(`[Geolocation Debug] Not on HTTPS. Current protocol: ${window.location.protocol}. Geolocation will likely fail.`);
    }

    if (!navigator.geolocation) {
      console.error("[Geolocation Debug] navigator.geolocation is undefined");
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    // Fire & forget permission logging (avoids async/await which strips transient user activation)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(res => console.log("[Geolocation Debug] Initial permission state:", res.state))
        .catch(err => console.log("[Geolocation Debug] Permissions query failed:", err));
    }

    setLocationStatus("requesting");
    setLocationError(null);

    console.log("[Geolocation Debug] Calling navigator.geolocation.getCurrentPosition...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[Geolocation Debug] Success! Coordinates received:", position.coords.latitude, position.coords.longitude);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const distance = calculateDistance(lat, lng, CAFE_LOCATION.lat, CAFE_LOCATION.lng);
        console.log("[Geolocation Debug] Distance calculated:", distance, "km");
        
        setLocationData({
          lat,
          lng,
          distance,
          withinRadius: distance <= DELIVERY_RADIUS_KM
        });
        setLocationStatus("success");
      },
      (error) => {
        console.error("[Geolocation Debug] Error received! Code:", error.code, "Message:", error.message);
        setLocationData(null);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          setLocationError("Location permission denied. Please enable it in your browser settings.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus("error");
          setLocationError(`Position unavailable (${error.message}). Your device's GPS may be turned off or unable to get a signal.`);
        } else if (error.code === error.TIMEOUT) {
          setLocationStatus("error");
          setLocationError("Location request timed out. Please try again or check your connection.");
        } else {
          setLocationStatus("error");
          setLocationError(`Unable to retrieve your location. (Error: ${error.message})`);
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  return { locationStatus, locationData, locationError, requestLocation };
};
