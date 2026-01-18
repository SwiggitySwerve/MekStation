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
import { getShareLinkRepository, ShareLinkRepository } from './ShareLinkRepository';

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
  async create(options: ICreateShareLinkOptions): Promise<IShareLinkOperationResult> {
    try {
      // Validate inputs
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
        linkOptions
      );

      const url = this.buildUrl(link.token);

      return { success: true, link, url };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share link';
      return { success: false, error: message };
    }
  }

  /**
   * Build URL from token
   */
  buildUrl(token: string): string {
    return `${this.baseUrl}/${token}`;
  }

  /**
   * Build web-compatible URL from token
   */
  buildWebUrl(token: string, host?: string): string {
    const base = host ? `https://${host}` : '';
    return `${base}${WEB_BASE_URL}/${token}`;
  }

  /**
   * Extract token from URL
   */
  extractToken(url: string): string | null {
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
  }

  /**
   * Redeem a share link by token
   */
  async redeem(token: string): Promise<IShareLinkRedeemResult> {
    return this.repository.redeem(token);
  }

  /**
   * Redeem a share link by URL
   */
  async redeemByUrl(url: string): Promise<IShareLinkRedeemResult> {
    const token = this.extractToken(url);
    if (!token) {
      return { success: false, error: 'Invalid share URL', errorCode: 'INVALID' };
    }
    return this.redeem(token);
  }

  /**
   * Get share link by ID
   */
  async getById(id: string): Promise<IShareLink | null> {
    return this.repository.getById(id);
  }

  /**
   * Get share link by token
   */
  async getByToken(token: string): Promise<IShareLink | null> {
    return this.repository.getByToken(token);
  }

  /**
   * Get all share links for an item
   */
  async getLinksForItem(
    scopeType: PermissionScopeType,
    scopeId: string
  ): Promise<IShareLink[]> {
    return this.repository.getByItem(scopeType, scopeId);
  }

  /**
   * Get all active share links
   */
  async getActiveLinks(): Promise<IShareLink[]> {
    return this.repository.getActive();
  }

  /**
   * Get all share links
   */
  async getAllLinks(): Promise<IShareLink[]> {
    return this.repository.getAll();
  }

  /**
   * Deactivate (revoke) a share link
   */
  async deactivate(linkId: string): Promise<IShareLinkOperationResult> {
    try {
      const deactivated = await this.repository.deactivate(linkId);
      if (!deactivated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate share link';
      return { success: false, error: message };
    }
  }

  /**
   * Reactivate a share link
   */
  async reactivate(linkId: string): Promise<IShareLinkOperationResult> {
    try {
      const reactivated = await this.repository.reactivate(linkId);
      if (!reactivated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reactivate share link';
      return { success: false, error: message };
    }
  }

  /**
   * Update share link label
   */
  async updateLabel(linkId: string, label: string | null): Promise<IShareLinkOperationResult> {
    try {
      const updated = await this.repository.updateLabel(linkId, label);
      if (!updated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update label';
      return { success: false, error: message };
    }
  }

  /**
   * Update share link expiry
   */
  async updateExpiry(linkId: string, expiresAt: string | null): Promise<IShareLinkOperationResult> {
    try {
      const updated = await this.repository.updateExpiry(linkId, expiresAt);
      if (!updated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update expiry';
      return { success: false, error: message };
    }
  }

  /**
   * Update share link max uses
   */
  async updateMaxUses(linkId: string, maxUses: number | null): Promise<IShareLinkOperationResult> {
    try {
      const updated = await this.repository.updateMaxUses(linkId, maxUses);
      if (!updated) {
        return { success: false, error: 'Share link not found' };
      }
      const link = await this.repository.getById(linkId);
      return { success: true, link: link || undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update max uses';
      return { success: false, error: message };
    }
  }

  /**
   * Delete a share link
   */
  async delete(linkId: string): Promise<IShareLinkOperationResult> {
    try {
      const deleted = await this.repository.delete(linkId);
      if (!deleted) {
        return { success: false, error: 'Share link not found' };
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete share link';
      return { success: false, error: message };
    }
  }

  /**
   * Delete all share links for an item
   */
  async deleteAllForItem(scopeType: PermissionScopeType, scopeId: string): Promise<number> {
    return this.repository.deleteByItem(scopeType, scopeId);
  }

  /**
   * Clean up expired share links
   */
  async cleanupExpired(): Promise<number> {
    return this.repository.cleanupExpired();
  }

  /**
   * Check if a link is valid (not expired, not at max uses, active)
   */
  isLinkValid(link: IShareLink): boolean {
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
  }

  /**
   * Get remaining uses for a link (null if unlimited)
   */
  getRemainingUses(link: IShareLink): number | null {
    if (link.maxUses === null) {
      return null;
    }
    return Math.max(0, link.maxUses - link.useCount);
  }
}

// =============================================================================
// Singleton
// =============================================================================

let shareLinkService: ShareLinkService | null = null;

export function getShareLinkService(): ShareLinkService {
  if (!shareLinkService) {
    shareLinkService = new ShareLinkService();
  }
  return shareLinkService;
}

/**
 * Reset the singleton (for testing)
 */
export function resetShareLinkService(): void {
  shareLinkService = null;
}
