/**
 * Test Helpers Index
 * 
 * Re-exports all test utilities for convenient importing.
 */

// Test mech builders
export {
  createTestMech,
  createLightMech,
  createMediumMech,
  createHeavyMech,
  createAssaultMech,
  createClanMech,
  createInvalidMech,
  CANONICAL_TEST_MECHS,
  type TestMech,
  type TestMechOptions,
} from './testMechBuilder';

// Custom assertions (auto-registers matchers on import)
export { registerBattleTechMatchers } from './assertions';

// API test helpers
export {
  parseApiResponse,
  parseSuccessResponse,
  parseErrorResponse,
  parseDeprecatedResponse,
  parseUnitListResponse,
  parseUnitResponse,
  parseImportResponse,
  parseFilterResponse,
  parseCategoryResponse,
  isApiError,
  isApiSuccess,
  type ApiResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type DeprecatedApiResponse,
  type UnitListResponse,
  type UnitResponse,
  type ImportResponse,
  type FilterItem,
  type FilterResponse,
  type CategoryResponse,
} from './apiTestHelpers';
