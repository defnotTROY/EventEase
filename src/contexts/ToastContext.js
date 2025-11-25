import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/ToastContainer';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      title: options.title,
      duration: options.duration || 5000,
      autoClose: options.autoClose !== false,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return showToast(message, 'success', { title: 'Success', ...options });
  }, [showToast]);

  const error = useCallback((message, options = {}) => {
    return showToast(message, 'error', { title: 'Error', ...options });
  }, [showToast]);

  const warning = useCallback((message, options = {}) => {
    return showToast(message, 'warning', { title: 'Warning', ...options });
  }, [showToast]);

  const info = useCallback((message, options = {}) => {
    return showToast(message, 'info', { title: 'Information', ...options });
  }, [showToast]);

  // Custom confirm dialog (simpler version that uses window.confirm for now)
  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      const result = window.confirm(message);
      resolve(result);
    });
  }, []);

  const value = {
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    confirm,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

