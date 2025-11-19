/**
 * Timezone utility functions
 * Enforces user timezone settings across the application
 */

/**
 * Get user's timezone from user metadata or default to UTC
 * @param {Object} user - User object from Supabase
 * @returns {string} Timezone string (e.g., 'UTC-5', 'America/New_York')
 */
export const getUserTimezone = (user) => {
  if (!user) return 'UTC';
  return user.user_metadata?.timezone || 'UTC';
};

/**
 * Convert UTC offset string to IANA timezone
 * @param {string} offset - UTC offset (e.g., 'UTC-5', 'UTC+8')
 * @returns {string} IANA timezone identifier
 */
export const offsetToIANA = (offset) => {
  const offsetMap = {
    'UTC-12': 'Etc/GMT+12',
    'UTC-11': 'Pacific/Midway',
    'UTC-10': 'Pacific/Honolulu',
    'UTC-9': 'America/Anchorage',
    'UTC-8': 'America/Los_Angeles',
    'UTC-7': 'America/Denver',
    'UTC-6': 'America/Chicago',
    'UTC-5': 'America/New_York',
    'UTC-4': 'America/Halifax',
    'UTC-3': 'America/Sao_Paulo',
    'UTC-2': 'Atlantic/South_Georgia',
    'UTC-1': 'Atlantic/Azores',
    'UTC+0': 'UTC',
    'UTC+1': 'Europe/London',
    'UTC+2': 'Europe/Berlin',
    'UTC+3': 'Europe/Moscow',
    'UTC+4': 'Asia/Dubai',
    'UTC+5': 'Asia/Karachi',
    'UTC+6': 'Asia/Dhaka',
    'UTC+7': 'Asia/Bangkok',
    'UTC+8': 'Asia/Shanghai',
    'UTC+9': 'Asia/Tokyo',
    'UTC+10': 'Australia/Sydney',
    'UTC+11': 'Pacific/Norfolk',
    'UTC+12': 'Pacific/Auckland'
  };
  return offsetMap[offset] || 'UTC';
};

/**
 * Format date according to user's timezone
 * @param {Date|string} date - Date to format
 * @param {Object} user - User object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateInTimezone = (date, user, options = {}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const timezone = getUserTimezone(user);
  const ianaTimezone = offsetToIANA(timezone);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: ianaTimezone,
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
};

/**
 * Format date and time according to user's timezone
 * @param {Date|string} date - Date to format
 * @param {Object} user - User object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date and time string
 */
export const formatDateTimeInTimezone = (date, user, options = {}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const timezone = getUserTimezone(user);
  const ianaTimezone = offsetToIANA(timezone);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ianaTimezone,
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
};

/**
 * Format time according to user's timezone
 * @param {Date|string} date - Date to format
 * @param {Object} user - User object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export const formatTimeInTimezone = (date, user, options = {}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const timezone = getUserTimezone(user);
  const ianaTimezone = offsetToIANA(timezone);
  
  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ianaTimezone,
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
};

/**
 * Convert date to user's timezone
 * @param {Date|string} date - Date to convert
 * @param {Object} user - User object
 * @returns {Date} Date in user's timezone
 */
export const convertToUserTimezone = (date, user) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const timezone = getUserTimezone(user);
  const ianaTimezone = offsetToIANA(timezone);
  
  // Get the time in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(dateObj);
  const year = parseInt(parts.find(p => p.type === 'year').value);
  const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
  const day = parseInt(parts.find(p => p.type === 'day').value);
  const hour = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const second = parseInt(parts.find(p => p.type === 'second').value);
  
  return new Date(year, month, day, hour, minute, second);
};

