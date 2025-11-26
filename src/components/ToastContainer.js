import React from 'react';
import Toast from './Toast';

const ToastContainer = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 sm:top-20 left-2 right-2 sm:left-auto sm:right-4 z-[9999] flex flex-col items-stretch sm:items-end pointer-events-none sm:max-w-sm sm:w-full">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full">
          <Toast toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

