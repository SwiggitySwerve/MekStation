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

