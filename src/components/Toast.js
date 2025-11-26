import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.autoClose) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 text-gray-900 shadow-xl';
      case 'error':
        return 'bg-white border-l-4 border-red-500 text-gray-900 shadow-xl';
      case 'warning':
        return 'bg-white border-l-4 border-yellow-500 text-gray-900 shadow-xl';
      case 'info':
      default:
        return 'bg-white border-l-4 border-blue-500 text-gray-900 shadow-xl';
    }
  };

  // Handle confirm dialogs
  if (toast.onConfirm && toast.onCancel) {
    return (
      <div
        className={`${getStyles()} rounded-lg p-3 sm:p-5 mb-2 sm:mb-3 w-full sm:min-w-[320px] sm:max-w-md transform transition-all duration-300 ease-out animate-slide-in-right`}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 id="confirm-title" className="font-semibold text-sm sm:text-base mb-1 break-words">
              {toast.title || 'Confirm Action'}
            </h4>
            <p id="confirm-message" className="text-xs sm:text-sm text-gray-600 break-words">
              {toast.message}
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 justify-end">
          <button
            onClick={() => {
              toast.onCancel();
              onClose(toast.id);
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.onConfirm();
              onClose(toast.id);
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${getStyles()} rounded-lg p-3 sm:p-4 mb-2 sm:mb-3 flex items-start gap-2 sm:gap-3 w-full sm:min-w-[280px] sm:max-w-md transform transition-all duration-300 ease-out animate-slide-in-right`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="font-semibold text-xs sm:text-sm mb-1 break-words">{toast.title}</h4>
        )}
        <p className="text-xs sm:text-sm text-gray-700 break-words">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;

