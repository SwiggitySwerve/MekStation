import type {
  ActionState,
  ShareLinksResponse,
} from '@/pages-modules/share/types';
import type { IShareLink } from '@/types/vault';

export const idleShareAction: ActionState = {
  linkId: null,
  type: null,
};

export async function fetchShareLinksList(): Promise<IShareLink[]> {
  const response = await fetch('/api/vault/share');
  if (!response.ok) throw new Error('Failed to fetch share links');
  const data = (await response.json()) as ShareLinksResponse;
  return data.links;
}

export async function updateShareLinkActive(link: IShareLink): Promise<void> {
  const response = await fetch(`/api/vault/share/${link.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: !link.isActive }),
  });
  if (!response.ok) throw new Error('Failed to update link');
}

export async function deleteShareLink(linkId: string): Promise<void> {
  const response = await fetch(`/api/vault/share/${linkId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete link');
}

export function replaceShareLinkActive(
  links: readonly IShareLink[],
  linkId: string,
): IShareLink[] {
  return links.map((link) =>
    link.id === linkId ? { ...link, isActive: !link.isActive } : link,
  );
}

export function withoutShareLink(
  links: readonly IShareLink[],
  linkId: string,
): IShareLink[] {
  return links.filter((link) => link.id !== linkId);
}

export function shareLinksSubtitle(linkCount: number): string {
  const suffix = linkCount === 1 ? '' : 's';
  return `Manage ${linkCount} share link${suffix} for your vault content`;
}
