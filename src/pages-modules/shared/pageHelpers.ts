import type {
  ISharedItem,
  SharedItemsResponse,
  ViewMode,
} from '@/pages-modules/shared/types';

interface SharedItemsLists {
  readonly sharedWithMe: ISharedItem[];
  readonly mySharedItems: ISharedItem[];
}

export async function fetchSharedItemsList(): Promise<SharedItemsLists> {
  const response = await fetch('/api/vault/shared');
  if (!response.ok) throw new Error('Failed to fetch shared items');
  const data = (await response.json()) as SharedItemsResponse;
  return {
    sharedWithMe: data.sharedWithMe,
    mySharedItems: data.mySharedItems,
  };
}

export async function requestVaultSync(): Promise<void> {
  await fetch('/api/vault/sync', { method: 'POST' });
}

export async function revokeSharedItem(
  itemId: string,
  viewMode: ViewMode,
): Promise<void> {
  const scope = viewMode === 'received' ? 'received' : 'mine';
  const response = await fetch(`/api/vault/shared/${scope}/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to revoke sharing');
}

export function sharedItemPath(item: ISharedItem): string {
  const basePath = item.type === 'folder' ? '/folders' : `/${item.type}s`;
  return `${basePath}/${item.id}`;
}

export function withoutSharedItem(
  items: readonly ISharedItem[],
  itemId: string,
): ISharedItem[] {
  return items.filter((item) => item.id !== itemId);
}
