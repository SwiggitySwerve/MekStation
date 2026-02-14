/**
 * Vault Contact Types
 *
 * Contact management and vault folder type definitions.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ResultType } from '@/services/core/types/BaseTypes';

import type { ShareableContentType } from './VaultCoreTypes';

// =============================================================================
// Contact Types
// =============================================================================

export type ContactStatus = 'online' | 'offline' | 'connecting' | 'syncing';

export interface IContact {
  id: string;
  friendCode: string;
  publicKey: string;
  nickname: string | null;
  displayName: string;
  avatar: string | null;
  addedAt: string;
  lastSeenAt: string | null;
  isTrusted: boolean;
  notes: string | null;
}

export interface IStoredContact {
  id: string;
  friend_code: string;
  public_key: string;
  nickname: string | null;
  display_name: string;
  avatar: string | null;
  added_at: string;
  last_seen_at: string | null;
  is_trusted: number;
  notes: string | null;
}

export interface IAddContactOptions {
  friendCode: string;
  nickname?: string;
  notes?: string;
  trusted?: boolean;
}

export interface IAddContactData {
  contact: IContact;
}

export interface IAddContactError {
  message: string;
  errorCode: 'INVALID_CODE' | 'ALREADY_EXISTS' | 'SELF_ADD' | 'LOOKUP_FAILED';
}

export type IAddContactResult = ResultType<IAddContactData, IAddContactError>;

// =============================================================================
// Vault Folder Types
// =============================================================================

export interface IVaultFolder {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  isShared: boolean;
}

export interface IStoredVaultFolder {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  is_shared: number;
}

export interface IFolderItem {
  folderId: string;
  itemId: string;
  itemType: ShareableContentType;
  assignedAt: string;
}

export interface IStoredFolderItem {
  folder_id: string;
  item_id: string;
  item_type: ShareableContentType;
  assigned_at: string;
}
