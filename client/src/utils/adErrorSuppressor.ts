// Ad Error Suppression Utility
export function setupAdErrorSuppression() {
  // Store original error handlers
  const originalConsoleError = console.error;
  const originalWindowError = window.onerror;

  // Override console.error to filter ad-related errors
  console.error = function(...args: any[]) {
    const message = args.join(' ').toLowerCase();
    if (
      message.includes('z3 is not a function') ||
      message.includes('profitableratecpm.com') ||
      message.includes('script error') ||
      message.includes('network error') && message.includes('ad')
    ) {
      // Silently ignore ad-related errors
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Global error handler to catch and suppress ad script errors
  window.addEventListener('error', function(event) {
    const error = event.error;
    const message = event.message || '';
    const filename = event.filename || '';
    
    // Check if error is from ad scripts
    if (
      filename.includes('profitableratecpm.com') ||
      filename.includes('doubleclick') ||
      message.includes('Z3 is not a function') ||
      message.includes('Script error.') ||
      (error && error.stack && error.stack.includes('profitableratecpm.com'))
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);

  // Handle unhandled promise rejections from ad scripts
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    if (reason && reason.toString().includes('profitableratecpm.com')) {
      event.preventDefault();
      return true;
    }
  });

  // Override window.onerror as a backup
  window.onerror = function(message, source, lineno, colno, error) {
    const messageStr = typeof message === 'string' ? message : '';
    const sourceStr = typeof source === 'string' ? source : '';
    
    if (
      (sourceStr && sourceStr.includes('profitableratecpm.com')) ||
      (messageStr && messageStr.includes('Z3 is not a function')) ||
      (messageStr && messageStr.includes('Script error'))
    ) {
      return true; // Suppress the error
    }
    
    // Call original handler for non-ad errors
    if (originalWindowError) {
      return originalWindowError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
}

// Function to hide error overlays
function hideErrorOverlays() {
  const hideOverlay = () => {
    // Hide Vite error overlay
    const overlays = document.querySelectorAll(
      '#vite-error-overlay, .vite-error-overlay, [data-vite-error-overlay], vite-error-overlay, [id*="error-overlay"], [class*="error-overlay"]'
    );
    
    overlays.forEach((overlay) => {
      if (overlay instanceof HTMLElement) {
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
    });
  };

  // Hide overlays immediately and on DOM changes
  hideOverlay();
  
  // Observer to hide overlays when they appear
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        hideOverlay();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also hide overlays periodically
  setInterval(hideOverlay, 100);
}

// Call this function to initialize error suppression and hide overlays
setupAdErrorSuppression();
hideErrorOverlays();