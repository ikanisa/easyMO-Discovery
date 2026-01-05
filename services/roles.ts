/**
 * User Roles Service
 * Manages multi-role support for users (passenger, driver, vendor)
 */

import { supabase } from './supabase';
import { Role } from '../types';

export interface UserRole {
  user_id: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const RolesService = {
  /**
   * Get all active roles for the current user
   */
  getActiveRoles: async (userId: string): Promise<Role[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return (data?.map(r => r.role) || []) as Role[];
  },

  /**
   * Check if user has a specific role
   */
  hasRole: async (userId: string, role: Role): Promise<boolean> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking user role:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Add a role to user (idempotent - won't duplicate if already exists)
   */
  addRole: async (userId: string, role: Role): Promise<boolean> => {
    const { error } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: userId,
          role: role,
          is_active: true,
        },
        {
          onConflict: 'user_id,role',
        }
      );

    if (error) {
      console.error('Error adding user role:', error);
      return false;
    }

    return true;
  },

  /**
   * Remove a role from user (soft delete - sets is_active to false)
   */
  removeRole: async (userId: string, role: Role): Promise<boolean> => {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      console.error('Error removing user role:', error);
      return false;
    }

    return true;
  },

  /**
   * Set user's roles (replaces all existing roles)
   */
  setRoles: async (userId: string, roles: Role[]): Promise<boolean> => {
    // Get current active roles
    const currentRoles = await RolesService.getActiveRoles(userId);

    // Deactivate roles that are no longer in the new list
    const rolesToRemove = currentRoles.filter(r => !roles.includes(r));
    for (const role of rolesToRemove) {
      await RolesService.removeRole(userId, role);
    }

    // Add new roles
    for (const role of roles) {
      await RolesService.addRole(userId, role);
    }

    return true;
  },

  /**
   * Initialize user with default passenger role if no roles exist
   */
  initializeDefaultRole: async (userId: string): Promise<boolean> => {
    const activeRoles = await RolesService.getActiveRoles(userId);
    
    if (activeRoles.length === 0) {
      // No roles exist, create default passenger role
      return await RolesService.addRole(userId, 'passenger');
    }

    return true;
  },
};

