import type {
  IShareLink,
  IShareLinkOptions,
  IShareLinkRedeemResult,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

export class MockShareLinkRepository {
  private links: Map<string, IShareLink> = new Map();
  private idCounter = 0;

  create = async (
    scopeType: PermissionScopeType,
    scopeId: string | null,
    scopeCategory: ContentCategory | null,
    options: IShareLinkOptions,
  ): Promise<IShareLink> => {
    const id = `link-mock-${++this.idCounter}`;
    const token = `test-token-${this.idCounter}`;
    const createdAt = new Date().toISOString();

    const link: IShareLink = {
      id,
      token,
      scopeType,
      scopeId,
      scopeCategory,
      level: options.level,
      expiresAt: options.expiresAt || null,
      maxUses: options.maxUses || null,
      useCount: 0,
      createdAt,
      label: options.label,
      isActive: true,
    };

    this.links.set(id, link);
    return link;
  };

  getById = async (id: string): Promise<IShareLink | null> => {
    return this.links.get(id) || null;
  };

  getByToken = async (token: string): Promise<IShareLink | null> => {
    const links = Array.from(this.links.values());
    for (const link of links) {
      if (link.token === token) {
        return link;
      }
    }
    return null;
  };

  getByItem = async (
    scopeType: PermissionScopeType,
    scopeId: string,
  ): Promise<IShareLink[]> => {
    return Array.from(this.links.values()).filter(
      (l) => l.scopeType === scopeType && l.scopeId === scopeId,
    );
  };

  getActive = async (): Promise<IShareLink[]> => {
    return Array.from(this.links.values()).filter((l) => l.isActive);
  };

  getAll = async (): Promise<IShareLink[]> => {
    return Array.from(this.links.values());
  };

  redeem = async (token: string): Promise<IShareLinkRedeemResult> => {
    const link = await this.getByToken(token);

    if (!link) {
      return {
        success: false,
        error: {
          message: 'Share link not found',
          errorCode: 'NOT_FOUND' as const,
        },
      };
    }

    if (!link.isActive) {
      return {
        success: false,
        error: {
          message: 'Share link is inactive',
          errorCode: 'INACTIVE' as const,
        },
      };
    }

    if (link.expiresAt) {
      const now = new Date();
      const expiry = new Date(link.expiresAt);
      if (now > expiry) {
        return {
          success: false,
          error: {
            message: 'Share link has expired',
            errorCode: 'EXPIRED' as const,
          },
        };
      }
    }

    if (link.maxUses !== null && link.useCount >= link.maxUses) {
      return {
        success: false,
        error: {
          message: 'Share link has reached maximum uses',
          errorCode: 'MAX_USES' as const,
        },
      };
    }

    // Increment use count
    const updatedLink = { ...link, useCount: link.useCount + 1 };
    this.links.set(link.id, updatedLink);

    return { success: true, data: { link: updatedLink } };
  };

  deactivate = async (id: string): Promise<boolean> => {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, isActive: false });
    return true;
  };

  reactivate = async (id: string): Promise<boolean> => {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, isActive: true });
    return true;
  };

  updateLabel = async (id: string, label: string | null): Promise<boolean> => {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, label: label || undefined });
    return true;
  };

  updateExpiry = async (
    id: string,
    expiresAt: string | null,
  ): Promise<boolean> => {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, expiresAt });
    return true;
  };

  updateMaxUses = async (
    id: string,
    maxUses: number | null,
  ): Promise<boolean> => {
    const link = this.links.get(id);
    if (!link) return false;
    this.links.set(id, { ...link, maxUses });
    return true;
  };

  delete = async (id: string): Promise<boolean> => {
    return this.links.delete(id);
  };

  deleteByItem = async (
    scopeType: PermissionScopeType,
    scopeId: string,
  ): Promise<number> => {
    let count = 0;
    const entries = Array.from(this.links.entries());
    for (const [id, link] of entries) {
      if (link.scopeType === scopeType && link.scopeId === scopeId) {
        this.links.delete(id);
        count++;
      }
    }
    return count;
  };

  cleanupExpired = async (): Promise<number> => {
    const now = new Date().toISOString();
    let count = 0;
    const entries = Array.from(this.links.entries());
    for (const [id, link] of entries) {
      if (link.expiresAt && link.expiresAt < now) {
        this.links.delete(id);
        count++;
      }
    }
    return count;
  };

  // Test helper
  clear = (): void => {
    this.links.clear();
    this.idCounter = 0;
  };
}
