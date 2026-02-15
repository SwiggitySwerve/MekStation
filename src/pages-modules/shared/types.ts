import type { PermissionLevel, ShareableContentType } from '@/types/vault';

export interface ISharedItem {
  id: string;
  name: string;
  type: ShareableContentType | 'folder';
  level: PermissionLevel;
  ownerId: string | null;
  ownerName: string;
  sharedWith?: {
    friendCode: string;
    name: string;
    level: PermissionLevel;
  }[];
  sharedAt: string;
  lastSyncAt: string | null;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
}

export interface SharedItemsResponse {
  sharedWithMe: ISharedItem[];
  mySharedItems: ISharedItem[];
}

export type ViewMode = 'received' | 'shared';
