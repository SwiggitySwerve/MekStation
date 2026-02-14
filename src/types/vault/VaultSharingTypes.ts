/**
 * Vault Sharing Types
 *
 * Permission and share link type definitions.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ResultType } from '@/services/core/types/BaseTypes';

// =============================================================================
// Permission Types
// =============================================================================

export type PermissionLevel = 'read' | 'write' | 'admin';

export type PermissionScopeType = 'item' | 'folder' | 'category' | 'all';

export type ContentCategory = 'units' | 'pilots' | 'forces' | 'encounters';

export interface IPermissionGrant {
  id: string;
  granteeId: string;
  scopeType: PermissionScopeType;
  scopeId: string | null;
  scopeCategory: ContentCategory | null;
  level: PermissionLevel;
  expiresAt: string | null;
  createdAt: string;
  granteeName?: string;
}

export interface IStoredPermission {
  id: string;
  grantee_id: string;
  scope_type: PermissionScopeType;
  scope_id: string | null;
  scope_category: ContentCategory | null;
  level: PermissionLevel;
  expires_at: string | null;
  created_at: string;
  grantee_name: string | null;
}

// =============================================================================
// Share Link Types
// =============================================================================

export interface IShareLink {
  id: string;
  token: string;
  scopeType: PermissionScopeType;
  scopeId: string | null;
  scopeCategory: ContentCategory | null;
  level: PermissionLevel;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
  label?: string;
  isActive: boolean;
}

export interface IStoredShareLink {
  id: string;
  token: string;
  scope_type: PermissionScopeType;
  scope_id: string | null;
  scope_category: ContentCategory | null;
  level: PermissionLevel;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
  label: string | null;
  is_active: number;
}

export interface IShareLinkOptions {
  level: PermissionLevel;
  expiresAt?: string | null;
  maxUses?: number | null;
  label?: string;
}

export interface IShareLinkData {
  link: IShareLink;
}

export interface IShareLinkError {
  message: string;
  errorCode: 'NOT_FOUND' | 'EXPIRED' | 'MAX_USES' | 'INACTIVE' | 'INVALID';
}

export type IShareLinkRedeemResult = ResultType<
  IShareLinkData,
  IShareLinkError
>;
