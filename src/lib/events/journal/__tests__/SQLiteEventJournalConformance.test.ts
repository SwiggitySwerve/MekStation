import { defineEventJournalConformance } from './EventJournalConformance';
import { createSQLiteEventJournalTestHarness } from './SQLiteEventJournalTestHarness';

defineEventJournalConformance(
  'SQLite file-backed',
  createSQLiteEventJournalTestHarness,
);
