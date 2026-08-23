import type { ILibraryItem } from '../types/LibraryItem';

import { hashLibraryContent } from '../repositories/InMemoryLibraryRepository';

export const LIBRARY_SYNC_RESOLUTIONS = [
  'keepLocal',
  'acceptRemote',
  'fork',
] as const;

export type LibrarySyncResolution = (typeof LIBRARY_SYNC_RESOLUTIONS)[number];

export interface ILibrarySyncConflict {
  readonly itemId: string;
  readonly local: ILibraryItem;
  readonly remote: ILibraryItem;
}

export type LibrarySyncExchange =
  | { readonly kind: 'applied'; readonly item: ILibraryItem }
  | { readonly kind: 'conflict'; readonly conflict: ILibrarySyncConflict };

/**
 * One in-memory replica of a library. Connected replicas exchange latest
 * items. Disconnecting models a network partition.
 */
export class InMemoryLibraryReplica {
  private readonly items = new Map<string, ILibraryItem>();
  private peer: InMemoryLibraryReplica | null = null;

  public connect(peer: InMemoryLibraryReplica): void {
    this.peer = peer;
    peer.peer = this;
  }

  public disconnect(): void {
    if (this.peer) {
      this.peer.peer = null;
    }
    this.peer = null;
  }

  public isConnected(): boolean {
    return this.peer !== null;
  }

  public put(item: ILibraryItem): void {
    this.items.set(item.itemId, item);
    if (this.peer) {
      this.peer.receive(item);
    }
  }

  public get(itemId: string): ILibraryItem | null {
    return this.items.get(itemId) ?? null;
  }

  public syncFromPeer(): LibrarySyncExchange[] {
    if (!this.peer) return [];
    const exchanges: LibrarySyncExchange[] = [];
    Array.from(this.peer.items.values()).forEach((remote) => {
      exchanges.push(this.receive(remote));
    });
    return exchanges;
  }

  public resolve(
    conflict: ILibrarySyncConflict,
    resolution: LibrarySyncResolution,
  ): ILibraryItem {
    switch (resolution) {
      case 'keepLocal':
        this.items.set(conflict.itemId, conflict.local);
        return conflict.local;
      case 'acceptRemote':
        this.items.set(conflict.itemId, conflict.remote);
        return conflict.remote;
      case 'fork': {
        const forked: ILibraryItem = {
          ...conflict.remote,
          itemId: `${conflict.remote.itemId}:fork`,
          contentHash: hashLibraryContent(conflict.remote.content),
        };
        this.items.set(forked.itemId, forked);
        this.items.set(conflict.itemId, conflict.local);
        return forked;
      }
      default: {
        const exhaustive: never = resolution;
        throw new Error(`Unhandled resolution: ${String(exhaustive)}`);
      }
    }
  }

  private receive(remote: ILibraryItem): LibrarySyncExchange {
    const local = this.items.get(remote.itemId);
    if (!local) {
      this.items.set(remote.itemId, remote);
      return { kind: 'applied', item: remote };
    }
    if (local.contentHash === remote.contentHash) {
      return { kind: 'applied', item: local };
    }
    return {
      kind: 'conflict',
      conflict: { itemId: remote.itemId, local, remote },
    };
  }
}
