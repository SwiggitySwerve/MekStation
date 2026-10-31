/** @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md */
import { TechBase } from '@/types/enums/TechBase';

import { createDefaultAerospaceState } from '../aerospaceState';
import {
  clearAllAerospaceStores,
  createAerospaceFromFullState,
  createAndRegisterAerospace,
  duplicateAerospace,
} from '../aerospaceStoreRegistry';

const OPTIONS = {
  name: 'Max thrust persistence',
  tonnage: 45,
  techBase: TechBase.INNER_SPHERE,
};

beforeEach(() => {
  clearAllAerospaceStores();
  localStorage.clear();
});
afterEach(() => clearAllAerospaceStores());

// Independent unmodified movement examples: MegaMek 48fcb2f64a1b,
// Entity.java:4004-4016 (Aero.java:1656-1658 delegates when airborne).
it('duplicating a fighter derives max thrust from the copied safe thrust', () => {
  const source = createAndRegisterAerospace(OPTIONS);
  source.getState().setSafeThrust(7);
  expect(source.getState().maxThrust).toBe(11);

  const copy = duplicateAerospace(source.getState().id);
  expect(copy?.getState().safeThrust).toBe(7);
  expect(copy?.getState().maxThrust).toBe(11);
});

it('reopening a saved fighter ignores a stale stored max thrust', () => {
  const saved = {
    ...createDefaultAerospaceState(OPTIONS),
    safeThrust: 5,
    maxThrust: 7,
  };
  const store = createAerospaceFromFullState(saved);
  expect(store.getState().safeThrust).toBe(5);
  expect(store.getState().maxThrust).toBe(8);
});
