import { sha256 } from 'js-sha256';

import type { IGamePlugin } from '../types/GamePlugin';
import type { ILibraryRepository } from './ILibraryRepository';
import type {
  ILibraryItem,
  IPublishLibraryItemInput,
  LibraryPublishResult,
} from './LibraryItem';

import { pluginAllowsContentType } from '../types/GamePlugin';

type VersionMap = Map<number, ILibraryItem>;

export function hashLibraryContent(content: string): string {
  return sha256(content);
}

export class InMemoryLibraryRepository implements ILibraryRepository {
  private readonly versions = new Map<string, VersionMap>();
  private readonly latest = new Map<string, number>();

  public constructor(private readonly plugin: IGamePlugin) {}

  public async publish(
    input: IPublishLibraryItemInput,
  ): Promise<LibraryPublishResult> {
    if (!pluginAllowsContentType(this.plugin, input.contentType)) {
      return {
        kind: 'unknown-content-type',
        contentType: input.contentType,
      };
    }
    const actualVersion = this.latest.get(input.itemId) ?? 0;
    if (actualVersion !== input.expectedVersion) {
      return {
        kind: 'conflict',
        expectedVersion: input.expectedVersion,
        actualVersion,
      };
    }
    const nextVersion = actualVersion + 1;
    const item: ILibraryItem = {
      itemId: input.itemId,
      contentType: input.contentType,
      version: nextVersion,
      contentHash: hashLibraryContent(input.content),
      content: input.content,
    };
    const history = this.versions.get(input.itemId) ?? new Map();
    history.set(nextVersion, item);
    this.versions.set(input.itemId, history);
    this.latest.set(input.itemId, nextVersion);
    return { kind: 'ok', item };
  }

  public async get(itemId: string): Promise<ILibraryItem | null> {
    const version = this.latest.get(itemId);
    if (version === undefined) return null;
    return this.getVersion(itemId, version);
  }

  public async getVersion(
    itemId: string,
    version: number,
  ): Promise<ILibraryItem | null> {
    return this.versions.get(itemId)?.get(version) ?? null;
  }

  public async listLatest(): Promise<readonly ILibraryItem[]> {
    const items: ILibraryItem[] = [];
    Array.from(this.latest.entries()).forEach(([itemId, version]) => {
      const item = this.versions.get(itemId)?.get(version);
      if (item) items.push(item);
    });
    return items;
  }
}
