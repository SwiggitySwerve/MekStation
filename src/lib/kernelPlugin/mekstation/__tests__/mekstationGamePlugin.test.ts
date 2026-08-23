import {
  createRepositories,
  InMemoryEventJournal,
  InMemoryLibraryRepository,
  InMemorySaveEnvelopeRepository,
} from '@/kernel';

import { MEKSTATION_GAME_PLUGIN } from '../mekstationGamePlugin';

const NOW = '2026-08-23T00:00:00.000Z';

describe('MekStation game plugin', () => {
  it('binds unit library content through the generic kernel', async () => {
    const journal = new InMemoryEventJournal(() => NOW);
    const repos = createRepositories(MEKSTATION_GAME_PLUGIN, {
      journal,
      library: new InMemoryLibraryRepository(MEKSTATION_GAME_PLUGIN),
      snapshots: new InMemorySaveEnvelopeRepository(),
    });
    const published = await repos.publishLibraryItem({
      itemId: 'saved-design-9',
      contentType: 'unit',
      content: '{"chassis":"WHM"}',
      expectedVersion: 0,
      expectedLibraryStreamRevision: 0,
      commandId: 'ms-publish-1',
      occurredAt: NOW,
    });
    const enrolled = await repos.enrollInstance({
      envelopeId: 'campaign-1',
      instanceId: 'roster-1',
      libraryItemId: 'saved-design-9',
      expectedSaveRevision: 0,
      expectedSaveStreamRevision: 0,
      commandId: 'ms-enroll-1',
      occurredAt: NOW,
    });
    await repos.publishLibraryItem({
      itemId: 'saved-design-9',
      contentType: 'unit',
      content: '{"chassis":"WHM-refit"}',
      expectedVersion: 1,
      expectedLibraryStreamRevision: 1,
      commandId: 'ms-publish-2',
      occurredAt: NOW,
    });
    expect(enrolled.sourceVersion).toBe(published.version);
    const latest = await repos.library.get('saved-design-9');
    const pinned = await repos.library.getVersion(
      'saved-design-9',
      enrolled.sourceVersion,
    );
    expect(latest?.version).toBe(2);
    expect(pinned?.content).toBe('{"chassis":"WHM"}');
  });
});
