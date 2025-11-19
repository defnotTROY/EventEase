/**
 * Role Management Service
 * Handles user roles and permission checks
 */

import { supabase } from '../lib/supabase';

export const ROLES = {
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  USER: 'user'
};

/**
 * Check if user has a specific role
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  
  // Check user_metadata first (Supabase Auth)
  const userRole = user.user_metadata?.role?.toLowerCase();
  
  // Support both legacy and new role formats
  if (role === ROLES.ADMIN) {
    return userRole === 'admin' || userRole === 'administrator';
  }
  
  return userRole === role.toLowerCase();
};

/**
 * Check if user is Admin
 */
export const isAdmin = (user) => {
  return hasRole(user, ROLES.ADMIN);
};

/**
 * Check if user is Event Organizer
 */
export const isOrganizer = (user) => {
  return hasRole(user, ROLES.ORGANIZER);
};

/**
 * Check if user is Regular User
 */
export const isUser = (user) => {
  return hasRole(user, ROLES.USER);
};

/**
 * Check if user can create events
 * Only Admins and Organizers can create events
 */
export const canCreateEvents = (user) => {
  return isAdmin(user) || isOrganizer(user);
};

/**
 * Check if user can access analytics
 * Only Admins and Organizers can access analytics
 */
export const canAccessAnalytics = (user) => {
  return isAdmin(user) || isOrganizer(user);
};

/**
 * Check if user can manage participants
 * Only Admins and Organizers can manage participants
 */
export const canManageParticipants = (user) => {
  return isAdmin(user) || isOrganizer(user);
};

/**
 * Check if user can manage all events (Admin only)
 */
export const canManageAllEvents = (user) => {
  return isAdmin(user);
};

/**
 * Get user's display role name
 */
export const getUserRoleName = (user) => {
  if (!user) return 'Guest';
  
  const role = user.user_metadata?.role?.toLowerCase();
  
  if (role === 'admin' || role === 'administrator') return 'Administrator';
  if (role === 'organizer') return 'Event Organizer';
  if (role === 'user') return 'Regular User';
  
  // Default to Event Organizer if no role specified (backwards compatibility)
  return 'Event Organizer';
};

/**
 * Get user's role for database/signup
 */
export const getUserRole = (user) => {
  if (!user) return null;
  
  const role = user.user_metadata?.role?.toLowerCase();
  
  if (role === 'admin' || role === 'administrator') return ROLES.ADMIN;
  if (role === 'organizer') return ROLES.ORGANIZER;
  if (role === 'user') return ROLES.USER;
  
  // Default to organizer for backwards compatibility
  return ROLES.ORGANIZER;
};

/**
 * Update user's role
 */
export const updateUserRole = async (userId, newRole) => {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: newRole
        }
      }
    );
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { data: null, error };
  }
};

export default {
  ROLES,
  hasRole,
  isAdmin,
  isOrganizer,
  isUser,
  canCreateEvents,
  canAccessAnalytics,
  canManageParticipants,
  canManageAllEvents,
  getUserRoleName,
  getUserRole,
  updateUserRole
};

