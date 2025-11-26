// src/components/PerformanceDebug.jsx
// Temporary debug component to identify performance issues
import { useEffect, useRef } from 'react';

export default function PerformanceDebug() {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (import.meta.env.DEV) {
      console.log(`[PERF DEBUG] App rendered ${renderCount.current} times. Time since last: ${timeSinceLastRender}ms`);
      
      // Alert if rendering too frequently
      if (timeSinceLastRender < 100 && renderCount.current > 5) {
        console.warn('⚠️ WARNING: App is re-rendering very frequently! Possible infinite loop.');
      }
    }
    
    lastRenderTime.current = now;
  });
  
  return null;
}