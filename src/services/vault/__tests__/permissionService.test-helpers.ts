import type { IPermissionGrant, PermissionLevel } from '@/types/vault';

export class MockPermissionRepository {
  private permissions: Map<string, IPermissionGrant> = new Map();
  private idCounter = 0;

  create = async (
    grant: Omit<IPermissionGrant, 'id' | 'createdAt'>,
  ): Promise<IPermissionGrant> => {
    const id = `perm-mock-${++this.idCounter}`;
    const createdAt = new Date().toISOString();
    const permission: IPermissionGrant = {
      id,
      granteeId: grant.granteeId,
      scopeType: grant.scopeType,
      scopeId: grant.scopeId,
      scopeCategory: grant.scopeCategory,
      level: grant.level,
      expiresAt: grant.expiresAt,
      createdAt,
      granteeName: grant.granteeName,
    };
    this.permissions.set(id, permission);
    return permission;
  };

  getById = async (id: string): Promise<IPermissionGrant | null> => {
    return this.permissions.get(id) || null;
  };

  getByGrantee = async (granteeId: string): Promise<IPermissionGrant[]> => {
    return Array.from(this.permissions.values()).filter(
      (p) => p.granteeId === granteeId,
    );
  };

  getByItem = async (
    scopeType: string,
    scopeId: string,
  ): Promise<IPermissionGrant[]> => {
    return Array.from(this.permissions.values()).filter(
      (p) => p.scopeType === scopeType && p.scopeId === scopeId,
    );
  };

  getByCategory = async (category: string): Promise<IPermissionGrant[]> => {
    return Array.from(this.permissions.values()).filter(
      (p) => p.scopeCategory === category,
    );
  };

  getAll = async (): Promise<IPermissionGrant[]> => {
    return Array.from(this.permissions.values());
  };

  checkPermission = async (
    granteeId: string,
    scopeType: string,
    scopeId: string | null,
    category?: string,
  ): Promise<PermissionLevel | null> => {
    const now = new Date().toISOString();

    // Check for explicit item permission
    if (scopeType === 'item' && scopeId) {
      const itemPerm = Array.from(this.permissions.values()).find(
        (p) =>
          p.granteeId === granteeId &&
          p.scopeType === 'item' &&
          p.scopeId === scopeId &&
          (!p.expiresAt || p.expiresAt > now),
      );
      if (itemPerm) return itemPerm.level;
    }

    // Check for category permission
    if (category) {
      const categoryPerm = Array.from(this.permissions.values()).find(
        (p) =>
          p.granteeId === granteeId &&
          p.scopeType === 'category' &&
          p.scopeCategory === category &&
          (!p.expiresAt || p.expiresAt > now),
      );
      if (categoryPerm) return categoryPerm.level;
    }

    // Check for vault-wide permission
    const allPerm = Array.from(this.permissions.values()).find(
      (p) =>
        p.granteeId === granteeId &&
        p.scopeType === 'all' &&
        (!p.expiresAt || p.expiresAt > now),
    );
    if (allPerm) return allPerm.level;

    // Check for public permission
    if (granteeId !== 'public') {
      return this.checkPermission('public', scopeType, scopeId, category);
    }

    return null;
  };

  updateLevel = async (
    id: string,
    level: PermissionLevel,
  ): Promise<boolean> => {
    const perm = this.permissions.get(id);
    if (!perm) return false;
    this.permissions.set(id, { ...perm, level });
    return true;
  };

  updateExpiry = async (
    id: string,
    expiresAt: string | null,
  ): Promise<boolean> => {
    const perm = this.permissions.get(id);
    if (!perm) return false;
    this.permissions.set(id, { ...perm, expiresAt });
    return true;
  };

  delete = async (id: string): Promise<boolean> => {
    return this.permissions.delete(id);
  };

  deleteByGrantee = async (granteeId: string): Promise<number> => {
    let count = 0;
    const entries = Array.from(this.permissions.entries());
    for (const [id, perm] of entries) {
      if (perm.granteeId === granteeId) {
        this.permissions.delete(id);
        count++;
      }
    }
    return count;
  };

  deleteByItem = async (
    scopeType: string,
    scopeId: string,
  ): Promise<number> => {
    let count = 0;
    const entries = Array.from(this.permissions.entries());
    for (const [id, perm] of entries) {
      if (perm.scopeType === scopeType && perm.scopeId === scopeId) {
        this.permissions.delete(id);
        count++;
      }
    }
    return count;
  };

  cleanupExpired = async (): Promise<number> => {
    const now = new Date().toISOString();
    let count = 0;
    const entries = Array.from(this.permissions.entries());
    for (const [id, perm] of entries) {
      if (perm.expiresAt && perm.expiresAt < now) {
        this.permissions.delete(id);
        count++;
      }
    }
    return count;
  };

  // Test helper
  clear = (): void => {
    this.permissions.clear();
    this.idCounter = 0;
  };
}
