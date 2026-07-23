// src/components/ScheduleSelector.jsx
import React, { useState, useEffect, useMemo } from "react";
import styles from "../styles/components/BowlSidebar.module.css";

/**
 * Formats a 24-hour time string "HH:MM" to human-readable "h:MM AM/PM".
 */
function formatTime12(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

/**
 * Full client-side scheduled order validation.
 * Returns an error string or null if valid.
 */
function validateSchedule(date, time, status) {
  if (!date || !time) return null; // incomplete — don't error yet

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return "Invalid date or time.";
  }

  const selectedDt = new Date(year, month - 1, day, hour, minute);
  const now = new Date();

  // Reject past datetime
  if (selectedDt.getTime() <= now.getTime()) {
    return "Scheduled time cannot be in the past.";
  }

  // Minimum 30-minute advance notice
  if (selectedDt.getTime() - now.getTime() < 30 * 60 * 1000) {
    return "Please schedule at least 30 minutes in advance.";
  }

  // Operating hours check
  const openStr  = status?.openTime  || "10:00";
  const closeStr = status?.closeTime || "23:00";
  const [openH, openM]   = openStr.split(":").map(Number);
  const [closeH, closeM] = closeStr.split(":").map(Number);
  const openMins   = openH  * 60 + openM;
  const closeMins  = closeH * 60 + closeM;
  const selectedMins = hour * 60 + minute;

  if (selectedMins < openMins) {
    return `We open at ${formatTime12(openStr)}. Please pick a later time.`;
  }
  if (selectedMins > closeMins) {
    return `We close at ${formatTime12(closeStr)}. Please pick an earlier time.`;
  }

  return null; // ✅ valid
}

export default function ScheduleSelector({
  orderMode,
  setOrderMode,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  status,
}) {
  const [localError, setLocalError] = useState("");

  // Revalidate whenever inputs change
  useEffect(() => {
    if (orderMode !== "Scheduled") {
      setLocalError("");
      return;
    }
    const err = validateSchedule(scheduleDate, scheduleTime, status);
    setLocalError(err || "");
  }, [scheduleDate, scheduleTime, orderMode, status]);

  // Today / Tomorrow strings (computed once)
  const { todayStr, tomorrowStr, tomorrow } = useMemo(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const tmrw = new Date(now);
    tmrw.setDate(now.getDate() + 1);
    return { todayStr: fmt(now), tomorrowStr: fmt(tmrw), tomorrow: tmrw };
  }, []);

  // 12-hour picker state
  const parseTime = (time24) => {
    if (!time24) return { h: "", m: "", ampm: "AM" };
    const [hrStr, minStr] = time24.split(":");
    let h = parseInt(hrStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { h: String(h).padStart(2, "0"), m: minStr, ampm };
  };

  const { h: currentH, m: currentM, ampm: currentAmPm } = parseTime(scheduleTime);

  const handleTimeChange = (type, val) => {
    let newH    = type === "h"    ? val : (currentH    || "12");
    let newM    = type === "m"    ? val : (currentM    || "00");
    let newAmPm = type === "ampm" ? val : currentAmPm;

    let hr24 = parseInt(newH, 10);
    if (newAmPm === "PM" && hr24 < 12) hr24 += 12;
    if (newAmPm === "AM" && hr24 === 12) hr24 = 0;

    setScheduleTime(`${String(hr24).padStart(2, "0")}:${newM}`);
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
            onChange={() => {
              setOrderMode("ASAP");
              setLocalError("");
            }}
          />{" "}
          ASAP
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="orderMode"
            value="Scheduled"
            checked={orderMode === "Scheduled"}
            onChange={() => setOrderMode("Scheduled")}
          />{" "}
          Schedule Order
        </label>
      </div>

      {orderMode === "Scheduled" && (
        <div className={styles.scheduleSelectors}>
          {/* Date chips */}
          <div className={styles.dateChips}>
            {[
              { id: todayStr,    label: "Today",    dateObj: new Date() },
              { id: tomorrowStr, label: "Tomorrow", dateObj: tomorrow  },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                className={`${styles.dateChip} ${scheduleDate === d.id ? styles.activeChip : ""}`}
                onClick={() => setScheduleDate(d.id)}
                aria-pressed={scheduleDate === d.id}
              >
                <span className={styles.chipTitle}>{d.label}</span>
                <span className={styles.chipSub}>
                  {d.dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
          </div>

          {/* 12-hour time picker */}
          <div className={styles.customTimePicker}>
            <select
              value={currentH}
              onChange={(e) => handleTimeChange("h", e.target.value)}
              className={styles.timeSelect}
              aria-label="Hour"
            >
              <option value="" disabled>HH</option>
              {Array.from({ length: 12 }, (_, i) => {
                const val = String(i + 1).padStart(2, "0");
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <span className={styles.timeColon}>:</span>
            <select
              value={currentM}
              onChange={(e) => handleTimeChange("m", e.target.value)}
              className={styles.timeSelect}
              aria-label="Minute"
            >
              <option value="" disabled>MM</option>
              {Array.from({ length: 60 }, (_, i) => {
                const val = String(i).padStart(2, "0");
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <select
              value={currentAmPm}
              onChange={(e) => handleTimeChange("ampm", e.target.value)}
              className={styles.timeSelect}
              aria-label="AM or PM"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {/* Operating hours hint */}
          <p className={styles.scheduleHint}>
            Open: {formatTime12(status?.openTime || "10:00")} – {formatTime12(status?.closeTime || "23:00")} &nbsp;·&nbsp; Min. 30 min advance
          </p>

          {localError && (
            <p
              className={styles.errorText}
              role="alert"
              style={{ marginTop: "0.5rem", color: "var(--error)", fontSize: "0.85rem" }}
            >
              ⚠️ {localError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
