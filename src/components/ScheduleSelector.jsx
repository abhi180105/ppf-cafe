import React, { useState, useEffect } from "react";
import styles from "../styles/components/BowlSidebar.module.css";

export default function ScheduleSelector({ 
  orderMode, 
  setOrderMode, 
  scheduleDate, 
  setScheduleDate, 
  scheduleTime, 
  setScheduleTime,
  status
}) {
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (orderMode !== "Scheduled" || !scheduleDate || !scheduleTime) {
      setLocalError("");
      return;
    }
    
    const [year, month, day] = scheduleDate.split("-").map(Number);
    const [hour, minute] = scheduleTime.split(":").map(Number);
    const selectedDateObj = new Date(year, month - 1, day, hour, minute);
    const now = new Date();
    
    if (selectedDateObj.getTime() < now.getTime()) {
      setLocalError("Time cannot be in the past.");
      return;
    }
    
    if (selectedDateObj.getTime() - now.getTime() < 29 * 60000) { // 29 mins to prevent jitter
      setLocalError("Must be at least 30 minutes from now.");
      return;
    }
    
    const openTimeParts = (status?.openTime || "10:00").split(":");
    const closeTimeParts = (status?.closeTime || "23:00").split(":");
    const selectedMins = hour * 60 + minute;
    const openMins = parseInt(openTimeParts[0]) * 60 + parseInt(openTimeParts[1]);
    const closeMins = parseInt(closeTimeParts[0]) * 60 + parseInt(closeTimeParts[1]);
    
    if (selectedMins < openMins || selectedMins > closeMins) {
      // Format open and close time
      const formatTime = (timeStr) => {
        const [h, m] = timeStr.split(":");
        const hr = parseInt(h);
        return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
      };
      setLocalError(`Must be between ${formatTime(status?.openTime || "10:00")} and ${formatTime(status?.closeTime || "23:00")}.`);
      return;
    }
    
    setLocalError("");
  }, [scheduleDate, scheduleTime, orderMode, status]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const parseTime = (time24) => {
    if (!time24) return { h: "", m: "", ampm: "AM" };
    const [hrStr, minStr] = time24.split(":");
    let h = parseInt(hrStr);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { h: String(h).padStart(2, '0'), m: minStr, ampm };
  };

  const { h: currentH, m: currentM, ampm: currentAmPm } = parseTime(scheduleTime);

  const handleTimeChange = (type, val) => {
    let newH = type === 'h' ? val : (currentH || "10");
    let newM = type === 'm' ? val : (currentM || "00");
    let newAmPm = type === 'ampm' ? val : currentAmPm;

    let hr24 = parseInt(newH);
    if (newAmPm === "PM" && hr24 < 12) hr24 += 12;
    if (newAmPm === "AM" && hr24 === 12) hr24 = 0;

    setScheduleTime(`${String(hr24).padStart(2, '0')}:${newM}`);
  };

  return (
    <div className={styles.scheduleCard}>
      <h3 className={styles.locationTitle}>⏳ Order Timing</h3>
      
      <div className={styles.orderModeToggle}>
        <label className={styles.radioLabel}>
          <input 
            type="radio" 
            name="orderMode" 
            value="ASAP" 
            checked={orderMode === "ASAP"} 
            onChange={() => setOrderMode("ASAP")}
          /> 
          ASAP
        </label>
        <label className={styles.radioLabel}>
          <input 
            type="radio" 
            name="orderMode" 
            value="Scheduled" 
            checked={orderMode === "Scheduled"} 
            onChange={() => setOrderMode("Scheduled")}
          /> 
          Schedule Order
        </label>
      </div>

      {orderMode === "Scheduled" && (
        <div className={styles.scheduleSelectors}>
          <div className={styles.dateChips}>
            {[
              { id: todayStr, label: "Today", dateObj: now },
              { id: tomorrowStr, label: "Tomorrow", dateObj: tomorrow }
            ].map(d => (
              <button
                key={d.id}
                type="button"
                className={`${styles.dateChip} ${scheduleDate === d.id ? styles.activeChip : ''}`}
                onClick={() => setScheduleDate(d.id)}
              >
                <span className={styles.chipTitle}>{d.label}</span>
                <span className={styles.chipSub}>
                  {d.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.customTimePicker}>
            <select 
              value={currentH} 
              onChange={(e) => handleTimeChange('h', e.target.value)}
              className={styles.timeSelect}
            >
              <option value="" disabled>HH</option>
              {Array.from({length: 12}, (_, i) => {
                const val = String(i + 1).padStart(2, '0');
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <span className={styles.timeColon}>:</span>
            <select 
              value={currentM} 
              onChange={(e) => handleTimeChange('m', e.target.value)}
              className={styles.timeSelect}
            >
              <option value="" disabled>MM</option>
              {Array.from({length: 60}, (_, i) => {
                const val = String(i).padStart(2, '0');
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <select 
              value={currentAmPm} 
              onChange={(e) => handleTimeChange('ampm', e.target.value)}
              className={styles.timeSelect}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {localError && (
             <p className={styles.errorText} style={{ marginTop: '0.5rem', color: 'var(--error)', fontSize: '0.85rem' }}>
               {localError}
             </p>
          )}
        </div>
      )}
    </div>
  );
}
