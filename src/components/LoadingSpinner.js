import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Consistent Loading Spinner Component
 * Use this across all pages for consistent loading experience
 */
const LoadingSpinner = ({ 
  size = 'md', 
  text = null, 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const containerClass = fullScreen 
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-8';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="text-center">
        <Loader2 
          className={`${sizeClasses[size]} animate-spin text-primary-600 mx-auto ${text ? 'mb-4' : ''}`} 
        />
        {text && (
          <p className="text-gray-600 text-sm">{text}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;

