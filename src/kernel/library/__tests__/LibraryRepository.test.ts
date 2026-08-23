import type { ILibraryItem, LibraryPublishResult } from '@/kernel/library';

import {
  hashLibraryContent,
  InMemoryLibraryRepository,
} from '@/kernel/library';

import { TOY_CARD_PLUGIN } from '../../plugins/toyCardPlugin';

const ACE = '{"name":"ace of spades"}';
const FOIL = '{"name":"ace of spades foil"}';

function createLibrary(): InMemoryLibraryRepository {
  return new InMemoryLibraryRepository(TOY_CARD_PLUGIN);
}

function expectPublished(result: LibraryPublishResult): ILibraryItem {
  if (result.kind !== 'ok') {
    throw new Error(`Expected a successful publish, got ${result.kind}`);
  }
  return result.item;
}

describe('InMemoryLibraryRepository', () => {
  it('publishes a first version at expectedVersion 0 and reads it back', async () => {
    const library = createLibrary();
    const item = expectPublished(
      await library.publish({
        itemId: 'card-ace',
        contentType: 'card',
        content: ACE,
        expectedVersion: 0,
      }),
    );

    expect(item.version).toBe(1);
    expect(item.contentHash).toBe(hashLibraryContent(ACE));
    expect(await library.get('card-ace')).toEqual(item);
    expect(await library.getVersion('card-ace', 1)).toEqual(item);
    expect(await library.getVersion('card-ace', 2)).toBeNull();
    expect(await library.listLatest()).toEqual([item]);
  });

  it('returns null for an item that was never published', async () => {
    const library = createLibrary();

    expect(await library.get('card-missing')).toBeNull();
    expect(await library.getVersion('card-missing', 1)).toBeNull();
    expect(await library.listLatest()).toEqual([]);
  });

  it('rejects a stale expectedVersion without touching stored content', async () => {
    const library = createLibrary();
    await library.publish({
      itemId: 'card-ace',
      contentType: 'card',
      content: ACE,
      expectedVersion: 0,
    });

    const stale = await library.publish({
      itemId: 'card-ace',
      contentType: 'card',
      content: FOIL,
      expectedVersion: 0,
    });

    expect(stale).toEqual({
      kind: 'conflict',
      expectedVersion: 0,
      actualVersion: 1,
    });
    const latest = await library.get('card-ace');
    expect(latest?.version).toBe(1);
    expect(latest?.content).toBe(ACE);
    expect(await library.getVersion('card-ace', 2)).toBeNull();
  });

  it('rejects a contentType the plugin does not declare', async () => {
    const library = createLibrary();

    const rejected = await library.publish({
      itemId: 'ship-1',
      contentType: 'spaceship',
      content: '{"name":"not a card"}',
      expectedVersion: 0,
    });

    expect(rejected).toEqual({
      kind: 'unknown-content-type',
      contentType: 'spaceship',
    });
    expect(await library.get('ship-1')).toBeNull();
    expect(await library.listLatest()).toEqual([]);
  });

  it('checks contentType before expectedVersion', async () => {
    const library = createLibrary();

    const rejected = await library.publish({
      itemId: 'ship-1',
      contentType: 'spaceship',
      content: '{"name":"not a card"}',
      expectedVersion: 7,
    });

    expect(rejected.kind).toBe('unknown-content-type');
  });

  it('keeps every published version addressable while listLatest tracks the newest', async () => {
    const library = createLibrary();
    await library.publish({
      itemId: 'card-ace',
      contentType: 'card',
      content: ACE,
      expectedVersion: 0,
    });
    await library.publish({
      itemId: 'card-king',
      contentType: 'card',
      content: '{"name":"king of spades"}',
      expectedVersion: 0,
    });
    const republished = expectPublished(
      await library.publish({
        itemId: 'card-ace',
        contentType: 'card',
        content: FOIL,
        expectedVersion: 1,
      }),
    );

    expect(republished.version).toBe(2);
    expect((await library.getVersion('card-ace', 1))?.content).toBe(ACE);
    expect((await library.getVersion('card-ace', 2))?.content).toBe(FOIL);

    const latest = await library.listLatest();
    expect(latest.map((entry) => [entry.itemId, entry.version]).sort()).toEqual(
      [
        ['card-ace', 2],
        ['card-king', 1],
      ],
    );
  });
});
