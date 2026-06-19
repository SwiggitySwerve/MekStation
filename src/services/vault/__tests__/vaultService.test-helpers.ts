import type {
  IVaultFolder,
  IFolderItem,
  ShareableContentType,
} from '@/types/vault';

interface MockContact {
  id: string;
  friendCode: string;
  nickname: string | null;
  displayName: string;
}

export const mockContacts: Map<string, MockContact> = new Map();

jest.mock('../ContactRepository', () => ({
  getContactRepository: () => ({
    getByFriendCode: async (friendCode: string) => {
      return mockContacts.get(friendCode) ?? null;
    },
  }),
}));

export class MockVaultFolderRepository {
  private folders: Map<string, IVaultFolder> = new Map();
  private folderItems: Map<string, IFolderItem[]> = new Map();
  private idCounter = 0;

  createFolder = async (
    name: string,
    options?: { description?: string; parentId?: string; isShared?: boolean },
  ): Promise<IVaultFolder> => {
    const id = `folder-mock-${++this.idCounter}`;
    const now = new Date().toISOString();
    const folder: IVaultFolder = {
      id,
      name,
      description: options?.description ?? null,
      parentId: options?.parentId ?? null,
      createdAt: now,
      updatedAt: now,
      itemCount: 0,
      isShared: options?.isShared ?? false,
    };
    this.folders.set(id, folder);
    this.folderItems.set(id, []);
    return folder;
  };

  getFolderById = async (id: string): Promise<IVaultFolder | null> => {
    return this.folders.get(id) || null;
  };

  getRootFolders = async (): Promise<IVaultFolder[]> => {
    return Array.from(this.folders.values()).filter((f) => f.parentId === null);
  };

  getChildFolders = async (parentId: string): Promise<IVaultFolder[]> => {
    return Array.from(this.folders.values()).filter(
      (f) => f.parentId === parentId,
    );
  };

  getAllFolders = async (): Promise<IVaultFolder[]> => {
    return Array.from(this.folders.values());
  };

  getSharedFolders = async (): Promise<IVaultFolder[]> => {
    return Array.from(this.folders.values()).filter((f) => f.isShared);
  };

  updateFolderName = async (id: string, name: string): Promise<boolean> => {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.name = name;
    folder.updatedAt = new Date().toISOString();
    return true;
  };

  updateFolderDescription = async (
    id: string,
    description: string | null,
  ): Promise<boolean> => {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.description = description;
    folder.updatedAt = new Date().toISOString();
    return true;
  };

  moveFolder = async (
    id: string,
    newParentId: string | null,
  ): Promise<boolean> => {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.parentId = newParentId;
    folder.updatedAt = new Date().toISOString();
    return true;
  };

  setFolderShared = async (id: string, isShared: boolean): Promise<boolean> => {
    const folder = this.folders.get(id);
    if (!folder) return false;
    folder.isShared = isShared;
    folder.updatedAt = new Date().toISOString();
    return true;
  };

  deleteFolder = async (id: string): Promise<boolean> => {
    this.folderItems.delete(id);
    return this.folders.delete(id);
  };

  addItemToFolder = async (
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> => {
    const items = this.folderItems.get(folderId) || [];
    const exists = items.some(
      (i) => i.itemId === itemId && i.itemType === itemType,
    );
    if (!exists) {
      items.push({
        folderId,
        itemId,
        itemType,
        assignedAt: new Date().toISOString(),
      });
      this.folderItems.set(folderId, items);
      const folder = this.folders.get(folderId);
      if (folder) folder.itemCount = items.length;
    }
    return true;
  };

  removeItemFromFolder = async (
    folderId: string,
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<boolean> => {
    const items = this.folderItems.get(folderId) || [];
    const newItems = items.filter(
      (i) => !(i.itemId === itemId && i.itemType === itemType),
    );
    this.folderItems.set(folderId, newItems);
    const folder = this.folders.get(folderId);
    if (folder) folder.itemCount = newItems.length;
    return items.length !== newItems.length;
  };

  getFolderItems = async (folderId: string): Promise<IFolderItem[]> => {
    return this.folderItems.get(folderId) || [];
  };

  getItemFolders = async (
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<IVaultFolder[]> => {
    const result: IVaultFolder[] = [];
    this.folderItems.forEach((items: IFolderItem[], folderId: string) => {
      if (
        items.some(
          (i: IFolderItem) => i.itemId === itemId && i.itemType === itemType,
        )
      ) {
        const folder = this.folders.get(folderId);
        if (folder) result.push(folder);
      }
    });
    return result;
  };

  moveItem = async (
    itemId: string,
    itemType: ShareableContentType,
    fromFolderId: string,
    toFolderId: string,
  ): Promise<boolean> => {
    await this.removeItemFromFolder(fromFolderId, itemId, itemType);
    return this.addItemToFolder(toFolderId, itemId, itemType);
  };

  removeItemFromAllFolders = async (
    itemId: string,
    itemType: ShareableContentType,
  ): Promise<number> => {
    let count = 0;
    this.folderItems.forEach((items: IFolderItem[], folderId: string) => {
      const newItems = items.filter(
        (i: IFolderItem) => !(i.itemId === itemId && i.itemType === itemType),
      );
      if (newItems.length !== items.length) {
        this.folderItems.set(folderId, newItems);
        const folder = this.folders.get(folderId);
        if (folder) folder.itemCount = newItems.length;
        count++;
      }
    });
    return count;
  };

  clear = (): void => {
    this.folders.clear();
    this.folderItems.clear();
    this.idCounter = 0;
  };
}

export interface MockPermission {
  id: string;
  granteeId: string;
  granteeName?: string;
  scopeType: 'item' | 'folder' | 'category' | 'all';
  scopeId: string | null;
  scopeCategory?: string | null;
  level: 'read' | 'write' | 'admin';
}

export class MockPermissionService {
  private permissions: Map<string, MockPermission> = new Map();
  private idCounter = 0;

  grant = async (params: {
    granteeId: string;
    granteeName?: string;
    scopeType: 'item' | 'folder' | 'category' | 'all';
    scopeId?: string | null;
    scopeCategory?: string | null;
    level: 'read' | 'write' | 'admin';
  }): Promise<{ success: boolean; id: string }> => {
    const id = `perm-mock-${++this.idCounter}`;
    this.permissions.set(id, {
      id,
      granteeId: params.granteeId,
      granteeName: params.granteeName,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
      scopeCategory: params.scopeCategory ?? null,
      level: params.level,
    });
    return { success: true, id };
  };

  revoke = async (id: string): Promise<{ success: boolean }> => {
    return { success: this.permissions.delete(id) };
  };

  check = async (
    granteeId: string,
    scopeType: string,
    scopeId: string | null,
    scopeCategory?: string | null,
  ): Promise<{
    hasAccess: boolean;
    level: 'read' | 'write' | 'admin' | null;
  }> => {
    const perms = Array.from(this.permissions.values());
    for (const perm of perms) {
      if (perm.granteeId === granteeId) {
        if (perm.scopeType === 'all') {
          return { hasAccess: true, level: perm.level };
        }
        if (perm.scopeType === scopeType && perm.scopeId === scopeId) {
          return { hasAccess: true, level: perm.level };
        }
        if (
          perm.scopeType === 'category' &&
          perm.scopeCategory === scopeCategory
        ) {
          return { hasAccess: true, level: perm.level };
        }
      }
    }
    return { hasAccess: false, level: null };
  };

  getGrantsForGrantee = async (
    granteeId: string,
  ): Promise<MockPermission[]> => {
    return Array.from(this.permissions.values()).filter(
      (p) => p.granteeId === granteeId,
    );
  };

  getGrantsForItem = async (
    scopeType: string,
    scopeId: string,
  ): Promise<MockPermission[]> => {
    return Array.from(this.permissions.values()).filter(
      (p) => p.scopeType === scopeType && p.scopeId === scopeId,
    );
  };

  revokeAllForItem = async (
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

  revokeAllForGrantee = async (granteeId: string): Promise<number> => {
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

  updateLevel = async (
    id: string,
    newLevel: 'read' | 'write' | 'admin',
  ): Promise<{ success: boolean }> => {
    const perm = this.permissions.get(id);
    if (!perm) return { success: false };
    perm.level = newLevel;
    return { success: true };
  };

  clear = (): void => {
    this.permissions.clear();
    this.idCounter = 0;
  };

  seedPermission = (permission: MockPermission): void => {
    this.permissions.set(permission.id, { ...permission });
  };
}
