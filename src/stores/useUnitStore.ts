/**
 * Unit Store - Re-export shim
 *
 * All implementation has moved to src/stores/unit/.
 * This file preserves the original import path for backwards compatibility.
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

export {
  createUnitStore,
  createNewUnitStore,
  UnitStoreContext,
  useUnitStore,
  useUnitStoreApi,
} from './unit/useUnitStore';

export type { UnitStore } from './unitState';
