/**
 * Versioned library blob. Plugin `contentType` strings only — no game
 * nouns in the kernel.
 */
export interface ILibraryItem {
  readonly itemId: string;
  readonly contentType: string;
  readonly version: number;
  readonly contentHash: string;
  readonly content: string;
}

export interface IPublishLibraryItemInput {
  readonly itemId: string;
  readonly contentType: string;
  readonly content: string;
  /** Optimistic expected current version; 0 means the item must be new. */
  readonly expectedVersion: number;
}

export type LibraryPublishResult =
  | { readonly kind: 'ok'; readonly item: ILibraryItem }
  | {
      readonly kind: 'conflict';
      readonly expectedVersion: number;
      readonly actualVersion: number;
    }
  | { readonly kind: 'unknown-content-type'; readonly contentType: string };
