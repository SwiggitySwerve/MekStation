/**
 * Test Mocks Index
 * 
 * Re-exports all mock implementations for convenient importing.
 */

// Service mocks
export {
  createMockFormulaRegistry,
  createFailingFormulaRegistry,
  TEST_FORMULAS,
} from './services/MockFormulaRegistry';

// Storage mocks
export {
  getMockDatabase,
  deleteMockDatabase,
  clearAllMockDatabases,
  mockIndexedDB,
  setupMockIndexedDB,
  teardownMockIndexedDB,
  MockDatabase,
  MockStore,
} from './storage/MockIndexedDB';

