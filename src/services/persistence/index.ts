/**
 * Persistence Services Exports
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

export {
  IndexedDBService,
  getIndexedDBService,
  _resetIndexedDBService,
  STORES,
} from './IndexedDBService';
export type { IIndexedDBService } from './IndexedDBService';

export { FileService, getFileService, _resetFileService } from './FileService';
export type { IFileService } from './FileService';

export {
  SQLiteService,
  getSQLiteService,
  resetSQLiteService,
  DATABASE_CONFIG,
} from './SQLiteService';
export type {
  ISQLiteService,
  IDatabaseConfig,
  IMigration,
} from './SQLiteService';
