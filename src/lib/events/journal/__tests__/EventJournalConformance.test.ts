import { InMemoryEventJournal } from '../InMemoryEventJournal';
import { defineEventJournalConformance } from './EventJournalConformance';

defineEventJournalConformance('InMemoryEventJournal', () => {
  let journal = new InMemoryEventJournal<{ readonly value: string }>();
  return {
    current: () => journal,
    restart: async () => {
      journal = InMemoryEventJournal.fromSnapshotForTesting(
        await journal.exportSnapshotForTesting(),
      );
    },
    failNextCommitAfterWrites: () => journal.failNextCommit(),
    assertStorageConsistent: async () => {
      InMemoryEventJournal.fromSnapshotForTesting(
        await journal.exportSnapshotForTesting(),
      );
    },
    dispose: () => Promise.resolve(),
  };
});
