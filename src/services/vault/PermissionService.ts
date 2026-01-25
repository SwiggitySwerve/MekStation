/**
 * Permission Service
 *
 * Business logic layer for managing vault permissions.
 * Handles permission grants, checks, and inheritance.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IPermissionGrant,
  PermissionLevel,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';
import { getPermissionRepository, PermissionRepository } from './PermissionRepository';
import { createSingleton } from '../core/createSingleton';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a permission grant
 */
export interface IGrantPermissionOptions {
  /** Friend code of the grantee, or 'public' */
  granteeId: string;
  /** Type of scope */
  scopeType: PermissionScopeType;
  /** ID of item/folder (null for category/all) */
  scopeId?: string | null;
  /** Category for category-level permissions */
  scopeCategory?: ContentCategory | null;
  /** Permission level */
  level: PermissionLevel;
  /** Expiry time (null for never) */
  expiresAt?: string | null;
  /** Display name for the grantee */
  granteeName?: string;
}

/**
 * Result of a permission operation
 */
export interface IPermissionOperationResult {
  success: boolean;
  grant?: IPermissionGrant;
  error?: string;
}

/**
 * Permission check result with details
 */
export interface IPermissionCheckResult {
  /** Whether access is granted */
  hasAccess: boolean;
  /** The effective permission level (null if no access) */
  level: PermissionLevel | null;
  /** Source of the permission (item, category, all, or public) */
  source?: 'item' | 'folder' | 'category' | 'all' | 'public';
  /** The specific grant that provides access */
  grant?: IPermissionGrant;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Permission Service for managing vault access permissions
 */
export class PermissionService {
  private repository: PermissionRepository;

  constructor(repository?: PermissionRepository) {
    this.repository = repository || getPermissionRepository();
  }

  /**
   * Grant a permission to a grantee
   */
  async grant(options: IGrantPermissionOptions): Promise<IPermissionOperationResult> {
    try {
      // Validate inputs
      if (!options.granteeId) {
        return { success: false, error: 'Grantee ID is required' };
      }

      if (!options.level) {
        return { success: false, error: 'Permission level is required' };
      }

      // For item/folder scope, require scope ID
      if ((options.scopeType === 'item' || options.scopeType === 'folder') && !options.scopeId) {
        return { success: false, error: `Scope ID is required for ${options.scopeType} scope` };
      }

      // For category scope, require category
      if (options.scopeType === 'category' && !options.scopeCategory) {
        return { success: false, error: 'Category is required for category scope' };
      }

      // Validate expiry date format
      if (options.expiresAt) {
        const date = new Date(options.expiresAt);
        if (isNaN(date.getTime())) {
          return { success: false, error: 'Invalid expiry date format' };
        }
      }

      const grant = await this.repository.create({
        granteeId: options.granteeId,
        scopeType: options.scopeType,
        scopeId: options.scopeId || null,
        scopeCategory: options.scopeCategory || null,
        level: options.level,
        expiresAt: options.expiresAt || null,
        granteeName: options.granteeName,
      });

      return { success: true, grant };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grant permission';
      return { success: false, error: message };
    }
  }

  /**
   * Revoke a permission by ID
   */
  async revoke(permissionId: string): Promise<IPermissionOperationResult> {
    try {
      const deleted = await this.repository.delete(permissionId);
      if (!deleted) {
        return { success: false, error: 'Permission not found' };
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke permission';
      return { success: false, error: message };
    }
  }

  /**
   * Check if a grantee has access to an item
   * Implements permission inheritance: item -> folder -> category -> all -> public
   */
  async check(
    granteeId: string,
    scopeType: PermissionScopeType,
    scopeId: string | null,
    category?: ContentCategory
  ): Promise<IPermissionCheckResult> {
    const level = await this.repository.checkPermission(
      granteeId,
      scopeType,
      scopeId,
      category
    );

    if (level) {
      return {
        hasAccess: true,
        level,
        source: scopeType,
      };
    }

    return {
      hasAccess: false,
      level: null,
    };
  }

  /**
   * Check if a grantee can perform a specific action
   */
  async canPerformAction(
    granteeId: string,
    action: 'read' | 'write' | 'admin',
    scopeType: PermissionScopeType,
    scopeId: string | null,
    category?: ContentCategory
  ): Promise<boolean> {
    const result = await this.check(granteeId, scopeType, scopeId, category);
    
    if (!result.hasAccess || !result.level) {
      return false;
    }

    // Permission hierarchy: admin > write > read
    switch (action) {
      case 'read':
        return ['read', 'write', 'admin'].includes(result.level);
      case 'write':
        return ['write', 'admin'].includes(result.level);
      case 'admin':
        return result.level === 'admin';
      default:
        return false;
    }
  }

  /**
   * Get all permissions granted to a specific grantee
   */
  async getGrantsForGrantee(granteeId: string): Promise<IPermissionGrant[]> {
    return this.repository.getByGrantee(granteeId);
  }

  /**
   * Get all permissions for a specific item
   */
  async getGrantsForItem(
    scopeType: PermissionScopeType,
    scopeId: string
  ): Promise<IPermissionGrant[]> {
    return this.repository.getByItem(scopeType, scopeId);
  }

  /**
   * Get all permissions
   */
  async getAllGrants(): Promise<IPermissionGrant[]> {
    return this.repository.getAll();
  }

  /**
   * Update permission level
   */
  async updateLevel(
    permissionId: string,
    level: PermissionLevel
  ): Promise<IPermissionOperationResult> {
    try {
      const updated = await this.repository.updateLevel(permissionId, level);
      if (!updated) {
        return { success: false, error: 'Permission not found' };
      }
      const grant = await this.repository.getById(permissionId);
      return { success: true, grant: grant || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update permission';
      return { success: false, error: message };
    }
  }

  /**
   * Update permission expiry
   */
  async updateExpiry(
    permissionId: string,
    expiresAt: string | null
  ): Promise<IPermissionOperationResult> {
    try {
      const updated = await this.repository.updateExpiry(permissionId, expiresAt);
      if (!updated) {
        return { success: false, error: 'Permission not found' };
      }
      const grant = await this.repository.getById(permissionId);
      return { success: true, grant: grant || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update expiry';
      return { success: false, error: message };
    }
  }

  /**
   * Revoke all permissions for a grantee
   */
  async revokeAllForGrantee(granteeId: string): Promise<number> {
    return this.repository.deleteByGrantee(granteeId);
  }

  /**
   * Revoke all permissions for an item
   */
  async revokeAllForItem(
    scopeType: PermissionScopeType,
    scopeId: string
  ): Promise<number> {
    return this.repository.deleteByItem(scopeType, scopeId);
  }

  /**
   * Clean up expired permissions
   */
  async cleanupExpired(): Promise<number> {
    return this.repository.cleanupExpired();
  }
}

// =============================================================================
// Singleton
// =============================================================================

const permissionServiceFactory = createSingleton(() => new PermissionService());

export function getPermissionService(): PermissionService {
  return permissionServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetPermissionService(): void {
  permissionServiceFactory.reset();
}
