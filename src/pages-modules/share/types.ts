import type { IShareLink } from '@/types/vault';

export interface ShareLinksResponse {
  links: IShareLink[];
  count: number;
}

export interface ActionState {
  linkId: string | null;
  type: 'copy' | 'toggle' | 'delete' | null;
}
