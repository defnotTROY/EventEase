/**
 * Toast Helper Utility
 * Provides a simple way to replace alert() calls with styled toast notifications
 * 
 * Usage:
 * import { showToast } from '../utils/toastHelper';
 * showToast.success('Operation completed successfully!');
 */

let toastContext = null;

export const setToastContext = (context) => {
  toastContext = context;
};

export const showToast = {
  success: (message, options = {}) => {
    if (toastContext) {
      return toastContext.success(message, options);
    }
    // Fallback to native alert if context not available
    alert(message);
  },
  
  error: (message, options = {}) => {
    if (toastContext) {
      return toastContext.error(message, options);
    }
    alert(message);
  },
  
  warning: (message, options = {}) => {
    if (toastContext) {
      return toastContext.warning(message, options);
    }
    alert(message);
  },
  
  info: (message, options = {}) => {
    if (toastContext) {
      return toastContext.info(message, options);
    }
    alert(message);
  },
};

