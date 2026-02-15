import type { IShareLink } from '@/types/vault';

import { formatExpiry } from '@/utils/formatting';

export function buildShareUrl(token: string): string {
  return `mekstation://share/${token}`;
}

export function getScopeDisplay(link: IShareLink): string {
  switch (link.scopeType) {
    case 'all':
      return 'All Content';
    case 'category':
      return link.scopeCategory
        ? link.scopeCategory.charAt(0).toUpperCase() +
            link.scopeCategory.slice(1)
        : 'Category';
    case 'folder':
      return 'Folder';
    case 'item':
      return 'Single Item';
    default:
      return link.scopeType;
  }
}

export function getLevelVariant(level: string): 'emerald' | 'amber' | 'violet' {
  switch (level) {
    case 'read':
      return 'emerald';
    case 'write':
      return 'amber';
    case 'admin':
      return 'violet';
    default:
      return 'emerald';
  }
}

export function getLinkStatus(link: IShareLink): {
  label: string;
  variant: 'emerald' | 'red' | 'amber' | 'slate';
} {
  if (!link.isActive) {
    return { label: 'Inactive', variant: 'slate' };
  }

  const expiry = formatExpiry(link.expiresAt);
  if (expiry.isExpired) {
    return { label: 'Expired', variant: 'red' };
  }

  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return { label: 'Max Uses', variant: 'amber' };
  }

  return { label: 'Active', variant: 'emerald' };
}
