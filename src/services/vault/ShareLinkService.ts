/**
 * Share Link Service
 *
 * Business logic layer for managing shareable links.
 * Handles link generation, redemption, and URL building.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IShareLink,
  IShareLinkOptions,
  IShareLinkRedeemResult,
  PermissionLevel,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

import {
  createSingleton,
  type SingletonFactory,
} from '../core/createSingleton';
import {
  getShareLinkRepository,
  ShareLinkRepository,
} from './ShareLinkRepository';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a share link
 */
export interface ICreateShareLinkOptions {
  /** Type of scope */
  scopeType: PermissionScopeType;
  /** ID of item/folder (null for category/all) */
  scopeId?: string | null;
  /** Category for category-level shares */
  scopeCategory?: ContentCategory | null;
  /** Permission level */
  level: PermissionLevel;
  /** Expiry time (null for never) */
  expiresAt?: string | null;
  /** Max uses (null for unlimited) */
  maxUses?: number | null;
  /** Optional label */
  label?: string;
}

/**
 * Result of a share link operation
 */
export interface IShareLinkOperationResult {
  success: boolean;
  link?: IShareLink;
  url?: string;
  error?: string;
}

function shareLinkOperationFailure(
  error: unknown,
  fallback: string,
): IShareLinkOperationResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

// =============================================================================
// Constants
// =============================================================================

/** Default base URL for share links */
const DEFAULT_BASE_URL = 'mekstation://share';

/** Web fallback URL pattern */
const WEB_BASE_URL = '/share';

// =============================================================================
// Service
// =============================================================================

/**
 * Share Link Service for managing shareable URLs
 */
export class ShareLinkService {
  private repository: ShareLinkRepository;
  private baseUrl: string;

  constructor(repository?: ShareLinkRepository, baseUrl?: string) {
    this.repository = repository || getShareLinkRepository();
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Create a new share link
   */
  readonly create = async (
    options: ICreateShareLinkOptions,
  ): Promise<IShareLinkOperationResult> => {
    try {
      // Validate inputs
      if (!options.level) {
        return { success: false, error: 'Permission level is required' };
      }

      // For item/folder scope, require scope ID
      if (
        (options.scopeType === 'item' || options.scopeType === 'folder') &&
        !options.scopeId
      ) {
        return {
          success: false,
          error: `Scope ID is required for ${options.scopeType} scope`,
        };
      }

      // For category scope, require category
      if (options.scopeType === 'category' && !options.scopeCategory) {
        return {
          success: false,
          error: 'Category is required for category scope',
        };
      }

      // Validate expiry date format
      if (options.expiresAt) {
        const date = new Date(options.expiresAt);
        if (isNaN(date.getTime())) {
          return { success: false, error: 'Invalid expiry date format' };
        }
      }

      const linkOptions: IShareLinkOptions = {
        level: options.level,
        expiresAt: options.expiresAt,
        maxUses: options.maxUses,
        label: options.label,
      };

      const link = await this.repository.create(
        options.scopeType,
        options.scopeId || null,
        options.scopeCategory || null,
        linkOptions,
      );

      const url = this.buildUrl(link.token);

      return { success: true, link, url };
    } catch (error) {
      return shareLinkOperationFailure(error, 'Failed to create share link');
    }
  };

  /**
   * Build URL from token
   */
  readonly buildUrl = (token: string): string => {
    return `${this.baseUrl}/${token}`;
  };

  /**
   * Build web-compatible URL from token
   */
  readonly buildWebUrl = (token: string, host?: string): string => {
    const base = host ? `https://${host}` : '';
    return `${base}${WEB_BASE_URL}/${token}`;
  };

  /**
   * Extract token from URL
   */
  readonly extractToken = (url: string): string | null => {
    // Try custom protocol: mekstation://share/TOKEN
    const customMatch = url.match(/mekstation:\/\/share\/([A-Za-z0-9_-]+)/);
    if (customMatch) {
      return customMatch[1];
    }

    // Try web URL: /share/TOKEN or https://example.com/share/TOKEN
    const webMatch = url.match(/\/share\/([A-Za-z0-9_-]+)/);
    if (webMatch) {
      return webMatch[1];
    }

    // Try bare token
    if (/^[A-Za-z0-9_-]{20,}$/.test(url)) {
      return url;
    }

    return null;
  };

  /**
   * Redeem a share link by token
   */
  readonly redeem = async (token: string): Promise<IShareLinkRedeemResult> => {
    return this.repository.redeem(token);
  };

  /**
   * Redeem a share link by URL
   */
  readonly redeemByUrl = async (
    url: string,
  ): Promise<IShareLinkRedeemResult> => {
    const token = this.extractToken(url);
    if (!token) {
      return {
        success: false,
        error: { message: 'Invalid share URL', errorCode: 'INVALID' as const },
      };
    }
    return this.redeem(token);
  };

  /**
   * Get share link by ID
   */
  readonly getById = async (id: string): Promise<IShareLink | null> => {
    return this.repository.getById(id);
  };

  /**
   * Get share link by token
   */
  readonly getByToken = async (token: string): Promise<IShareLink | null> => {
    return this.repository.getByToken(token);
  };

  /**
   * Get all share links for an item
   */
  readonly getLinksForItem = async (
    scopeType: PermissionScopeType,
    scopeId: string,
  ): Promise<IShareLink[]> => {
    return this.repository.getByItem(scopeType, scopeId);
  };

  /**
   * Get all active share links
   */
  readonly getActiveLinks = async (): Promise<IShareLink[]> => {
    return this.repository.getActive();
  };

  /**
   * Get all share links
   */
  readonly getAllLinks = async (): Promise<IShareLink[]> => {
    return this.repository.getAll();
  };

  /**
   * Deactivate (revoke) a share link
   */
  readonly deactivate = async (
    linkId: string,
  ): Promise<IShareLinkOperationResult> => {
    try {
      const deactivated = await this.repository.deactivate(linkId);
      if (!deactivated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      return shareLinkOperationFailure(
        error,
        'Failed to deactivate share link',
      );
    }
  };

  /**
   * Reactivate a share link
   */
  readonly reactivate = async (
    linkId: string,
  ): Promise<IShareLinkOperationResult> => {
    try {
      const reactivated = await this.repository.reactivate(linkId);
      if (!reactivated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      return shareLinkOperationFailure(
        error,
        'Failed to reactivate share link',
      );
    }
  };

  /**
   * Update share link label
   */
  readonly updateLabel = async (
    linkId: string,
    label: string | null,
  ): Promise<IShareLinkOperationResult> => {
    try {
      const updated = await this.repository.updateLabel(linkId, label);
      if (!updated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      return shareLinkOperationFailure(error, 'Failed to update label');
    }
  };

  /**
   * Update share link expiry
   */
  readonly updateExpiry = async (
    linkId: string,
    expiresAt: string | null,
  ): Promise<IShareLinkOperationResult> => {
    try {
      const updated = await this.repository.updateExpiry(linkId, expiresAt);
      if (!updated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      return shareLinkOperationFailure(error, 'Failed to update expiry');
    }
  };

  /**
   * Update share link max uses
   */
  readonly updateMaxUses = async (
    linkId: string,
    maxUses: number | null,
  ): Promise<IShareLinkOperationResult> => {
    try {
      const updated = await this.repository.updateMaxUses(linkId, maxUses);
      if (!updated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      return shareLinkOperationFailure(error, 'Failed to update max uses');
    }
  };

  /**
   * Delete a share link
   */
  readonly delete = async (
    linkId: string,
  ): Promise<IShareLinkOperationResult> => {
    try {
      const deleted = await this.repository.delete(linkId);
      if (!deleted) {
        return { success: false, error: 'Share link not found' };
      }
      return { success: true };
    } catch (error) {
      return shareLinkOperationFailure(error, 'Failed to delete share link');
    }
  };

  /**
   * Delete all share links for an item
   */
  readonly deleteAllForItem = async (
    scopeType: PermissionScopeType,
    scopeId: string,
  ): Promise<number> => {
    return this.repository.deleteByItem(scopeType, scopeId);
  };

  /**
   * Clean up expired share links
   */
  readonly cleanupExpired = async (): Promise<number> => {
    return this.repository.cleanupExpired();
  };

  /**
   * Check if a link is valid (not expired, not at max uses, active)
   */
  readonly isLinkValid = (link: IShareLink): boolean => {
    if (!link.isActive) {
      return false;
    }

    if (link.expiresAt) {
      const now = new Date();
      const expiry = new Date(link.expiresAt);
      if (now > expiry) {
        return false;
      }
    }

    if (link.maxUses !== null && link.useCount >= link.maxUses) {
      return false;
    }

    return true;
  };

  /**
   * Get remaining uses for a link (null if unlimited)
   */
  readonly getRemainingUses = (link: IShareLink): number | null => {
    if (link.maxUses === null) {
      return null;
    }
    return Math.max(0, link.maxUses - link.useCount);
  };
}

// =============================================================================
// Singleton
// =============================================================================

const shareLinkServiceFactory: SingletonFactory<ShareLinkService> =
  createSingleton((): ShareLinkService => new ShareLinkService());

export function getShareLinkService(): ShareLinkService {
  return shareLinkServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetShareLinkService(): void {
  shareLinkServiceFactory.reset();
}
