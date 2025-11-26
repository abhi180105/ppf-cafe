// src/utils/performanceMonitor.js
// Performance monitoring utility for debugging

let renderCount = 0;
let lastRenderTime = Date.now();

export const logRender = (componentName) => {
  if (!import.meta.env.DEV) return;
  
  renderCount++;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTime;
  
  console.log(`[PERF] ${componentName} rendered (${renderCount} total, ${timeSinceLastRender}ms since last)`);
  lastRenderTime = now;
};

export const resetRenderCount = () => {
  renderCount = 0;
  lastRenderTime = Date.now();
};

export const getRenderCount = () => renderCount;

// Track component mount/unmount
export const useRenderTracking = (componentName) => {
  if (!import.meta.env.DEV) return;
  
  const renderCountRef = { current: 0 };
  
  renderCountRef.current++;
  console.log(`[RENDER] ${componentName} #${renderCountRef.current}`);
  
  return renderCountRef.current;
};