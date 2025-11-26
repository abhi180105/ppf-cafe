// src/components/FloatingWhatsAppButton.jsx
import { useCallback, useMemo, memo } from "react";
import { useBowl } from "../context/CafeContext";

function FloatingWhatsAppButton() {
  const { buildWhatsAppMessage, bowl = [], orderType } = useBowl();

  const safeBowl = Array.isArray(bowl) ? bowl : [];
  
  // Memoize link generation to prevent calling on every render
  const link = useMemo(() => buildWhatsAppMessage(), [buildWhatsAppMessage]);
  
  const handleClick = useCallback(() => {
    if (!orderType) {
      alert("Please select an order type (Dine-in, Takeaway, or Delivery)");
      return;
    }
    // Get WhatsApp link
    const whatsappLink = buildWhatsAppMessage();
    if (whatsappLink) {
      window.open(whatsappLink, "_blank", "noopener,noreferrer");
    }
  }, [orderType, buildWhatsAppMessage]);
  
  if (!link || safeBowl.length === 0 || !orderType) return null;

  return (
    <button style={btn} onClick={handleClick} title="Order via WhatsApp" aria-label="Order via WhatsApp">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
        alt="WhatsApp"
        style={icon}
      />
    </button>
  );
}

// Memoize to prevent re-renders
export default memo(FloatingWhatsAppButton);

const btn = {
  position: "fixed",
  bottom: "100px",
  right: "25px",
  width: "70px",
  height: "70px",
  borderRadius: "50%",
  background: "#25D366",
  border: "none",
  boxShadow: "var(--shadow-lg)",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 998,
  transition: "all 0.3s ease",
};

const icon = {
  width: "36px",
  height: "36px",
  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
};
