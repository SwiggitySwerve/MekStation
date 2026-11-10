/**
 * ProtoMech tonnage edits and motive changes.
 *
 * MegaMekLab 62bf193 has one tonnage spinner, 2 to 15 t, for every motive
 * (PMChassisView.java:79), so a motive change does not move the tonnage, and ultraheavy
 * is a mass above 9 t (PMChassisView.java:205-207). The range, the kept walk and the
 * refusal are tested on the pinned corpus in useProtoMechStore.ultraheavyMass.test.ts.
 */

import { createNewProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  computeProtoStructure,
  validateProtoChassis,
} from '@/utils/construction/protomech';

type ProtoStore = ReturnType<typeof createNewProtoMechStore>;

describe('ProtoMech store setTonnage', () => {
  it('keeps 12 t on a biped, and clamps to 2–15 t', () => {
    const store = createNewProtoMechStore({ tonnage: 10 });

    store.getState().setTonnage(12);
    expect(store.getState().tonnage).toBe(12);

    store.getState().setTonnage(40);
    expect(store.getState().tonnage).toBe(15);

    store.getState().setTonnage(1);
    expect(store.getState().tonnage).toBe(2);
  });
});

describe('ProtoMech store setChassisType', () => {
  function chassisFindings(state: ReturnType<ProtoStore['getState']>) {
    return validateProtoChassis({
      tonnage: state.tonnage,
      chassisType: state.chassisType,
      jumpMP: state.jumpMP,
      myomerBooster: state.hasMyomerBooster,
    }).findings;
  }

  it('keeps a 5 t ProtoMech at 5 t when it becomes a Quad', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });

    store.getState().setChassisType(ProtoChassis.QUAD);

    const state = store.getState();
    expect(state.tonnage).toBe(5);
    expect(state.structureByLocation).toEqual(
      computeProtoStructure(5, ProtoChassis.QUAD, state.hasMainGun),
    );
    expect(chassisFindings(state)).toEqual([]);
  });

  it('keeps a 12 t biped at 12 t when it becomes a Glider', () => {
    const store = createNewProtoMechStore({ tonnage: 12 });

    store.getState().setChassisType(ProtoChassis.GLIDER);

    expect(store.getState().tonnage).toBe(12);
  });

  it('keeps a Glider above the Light class without a finding (no pinned weight rule)', () => {
    const store = createNewProtoMechStore({ tonnage: 9 });

    store.getState().setChassisType(ProtoChassis.GLIDER);

    const state = store.getState();
    expect(state.tonnage).toBe(9);
    expect(chassisFindings(state)).toEqual([]);
  });
});
