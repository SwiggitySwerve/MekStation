/**
 * Persistence Services Exports
 * 
 * @spec openspec/specs/persistence-services/spec.md
 */

export { 
  IndexedDBService, 
  indexedDBService, 
  getIndexedDBService,
  _resetIndexedDBService,
  STORES,
} from './IndexedDBService';
export type { IIndexedDBService } from './IndexedDBService';

export { 
  FileService, 
  fileService,
  getFileService,
  _resetFileService,
} from './FileService';
export type { IFileService } from './FileService';

export { 
  SQLiteService, 
  getSQLiteService, 
  resetSQLiteService,
  DATABASE_CONFIG,
} from './SQLiteService';
export type { ISQLiteService, IDatabaseConfig, IMigration } from './SQLiteService';

export { MigrationService, migrationService } from './MigrationService';
export type { IMigrationService, IMigrationResult, IMigrationError } from './MigrationService';

