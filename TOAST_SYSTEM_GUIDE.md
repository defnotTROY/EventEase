# Toast Notification System Guide

## Overview

EventEase now uses a custom styled toast notification system instead of browser alerts. This provides a much better user experience with professional, animated notifications.

## Features

- ✅ **Styled Notifications**: Beautiful, modern design with icons
- ✅ **Multiple Types**: Success, Error, Warning, Info
- ✅ **Auto-dismiss**: Notifications automatically disappear after 5 seconds
- ✅ **Manual Close**: Users can close notifications manually
- ✅ **Animations**: Smooth slide-in animations
- ✅ **Mobile Responsive**: Works perfectly on all screen sizes
- ✅ **Accessible**: Proper ARIA labels and roles

## Usage

### Basic Usage

```javascript
import { useToast } from '../contexts/ToastContext';

const MyComponent = () => {
  const toast = useToast();

  // Success message
  toast.success('Operation completed successfully!');

  // Error message
  toast.error('Something went wrong. Please try again.');

  // Warning message
  toast.warning('Please check your input before proceeding.');

  // Info message
  toast.info('Your changes have been saved.');
};
```

### With Options

```javascript
// Custom duration (in milliseconds)
toast.success('Saved!', { duration: 3000 });

// Custom title
toast.success('Profile updated', { title: 'Success' });

// Don't auto-close
toast.info('Important information', { autoClose: false });
```

### Replacing alert() Calls

**Before:**
```javascript
alert('You have been successfully registered for this event!');
```

**After:**
```javascript
const toast = useToast();
toast.success('You have been successfully registered for this event!');
```

### Replacing window.confirm()

For confirm dialogs, you can still use `window.confirm()` or implement a custom modal. The toast system is primarily for notifications.

## Toast Types

### Success (Green)
- Use for: Successful operations, confirmations
- Icon: CheckCircle
- Color: Green border

### Error (Red)
- Use for: Errors, failures, problems
- Icon: AlertCircle
- Color: Red border

### Warning (Yellow)
- Use for: Warnings, cautions, important notices
- Icon: AlertTriangle
- Color: Yellow border

### Info (Blue)
- Use for: General information, tips
- Icon: Info
- Color: Blue border

## Migration Status

### ✅ Already Migrated
- `EventView.js` - All alerts converted to toasts
- `Events.js` - All alerts converted to toasts
- `AdminQRCheckIn.js` - All alerts converted to toasts

### 🔄 Remaining Files (Still using alert())
- `EventCreation.js`
- `AdminVerificationReview.js`
- `Settings.js`

## Styling

The toast notifications use:
- White background with colored left border
- Shadow for depth
- Smooth animations
- Responsive design
- Professional typography

## Positioning

Toasts appear in the top-right corner:
- Desktop: Fixed position, right side
- Mobile: Responsive, adjusts for smaller screens
- Z-index: 9999 (appears above all content)

## Best Practices

1. **Use appropriate types**: Match the toast type to the message
2. **Keep messages concise**: Short, clear messages work best
3. **Don't overuse**: Too many toasts can be overwhelming
4. **Use success for confirmations**: Let users know actions completed
5. **Use error for failures**: Clearly indicate when something went wrong

