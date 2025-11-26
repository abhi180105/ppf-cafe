// src/components/DebugButtons.jsx
import { useBowl } from "../context/CafeContext";

export default function DebugButtons() {
  const { 
    bowl, 
    addToBowl, 
    removeFromBowl, 
    clearBowl, 
    orderType, 
    setOrderType,
    calculateTotal 
  } = useBowl();

  const testItem = {
    id: "test-1",
    name: "Test Burger",
    dinePrice: 100,
    deliveryPrice: 120,
    category: "Test"
  };

  const handleTest = () => {
    console.log("Current bowl:", bowl);
    console.log("Order type:", orderType);
    console.log("Functions available:", {
      addToBowl: typeof addToBowl,
      removeFromBowl: typeof removeFromBowl,
      clearBowl: typeof clearBowl,
      setOrderType: typeof setOrderType,
      calculateTotal: typeof calculateTotal
    });
  };

  return (
    <div style={{ position: "fixed", top: "10px", right: "10px", background: "white", padding: "10px", border: "1px solid #ccc", zIndex: 9999 }}>
      <h4>Debug Panel</h4>
      <p>Bowl items: {bowl.length}</p>
      <p>Order type: {orderType}</p>
      <p>Total: ₹{calculateTotal()}</p>
      <button onClick={handleTest}>Log Debug Info</button>
      <button onClick={() => addToBowl(testItem)}>Add Test Item</button>
      <button onClick={() => removeFromBowl("test-1")}>Remove Test Item</button>
      <button onClick={clearBowl}>Clear Bowl</button>
      <button onClick={() => setOrderType("delivery")}>Set Delivery</button>
    </div>
  );
}