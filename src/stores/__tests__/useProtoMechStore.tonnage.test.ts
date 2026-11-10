/**
 * ProtoMech tonnage edits stay inside the range the Structure tab offers.
 *
 * The Structure tab offers 10–15 t for an Ultraheavy chassis and 2–9 t for
 * the others (ProtoMechStructureTab.logic.ts getTonnageOptions), so the store
 * clamps each edit to its chassis range rather than to 2–9 t for everyone.
 */

import { createNewProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  computeProtoStructure,
  validateProtoChassis,
} from '@/utils/construction/protomech';

type ProtoStore = ReturnType<typeof createNewProtoMechStore>;

describe('ProtoMech store setTonnage', () => {
  it('keeps an Ultraheavy tonnage of 12 t', () => {
    const store = createNewProtoMechStore({
      tonnage: 10,
      chassisType: ProtoChassis.ULTRAHEAVY,
    });

    store.getState().setTonnage(12);

    expect(store.getState().tonnage).toBe(12);
  });

  it('clamps an Ultraheavy to 10–15 t', () => {
    const store = createNewProtoMechStore({
      tonnage: 10,
      chassisType: ProtoChassis.ULTRAHEAVY,
    });

    store.getState().setTonnage(40);
    expect(store.getState().tonnage).toBe(15);

    store.getState().setTonnage(3);
    expect(store.getState().tonnage).toBe(10);
  });

  it('clamps other chassis to 2–9 t', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });

    store.getState().setTonnage(12);
    expect(store.getState().tonnage).toBe(9);

    store.getState().setTonnage(1);
    expect(store.getState().tonnage).toBe(2);
  });
});

/**
 * Switching chassis moves tonnage into the new chassis range, as MegaMekLab's
 * PMChassisView.refreshTonnage clamps its spinner after a motive change.
 * Ultraheavy means tonnage above TestProtoMek.MAX_STD_TONNAGE (9 t), up to
 * TestProtoMek.MAX_TONNAGE (15 t).
 */
describe('ProtoMech store setChassisType', () => {
  function chassisFindings(state: ReturnType<ProtoStore['getState']>) {
    return validateProtoChassis({
      tonnage: state.tonnage,
      chassisType: state.chassisType,
      jumpMP: state.jumpMP,
      myomerBooster: state.hasMyomerBooster,
    }).findings;
  }

  it('raises a 5 t ProtoMech to 10 t when it becomes Ultraheavy', () => {
    const store = createNewProtoMechStore({ tonnage: 5 });

    store.getState().setChassisType(ProtoChassis.ULTRAHEAVY);

    const state = store.getState();
    expect(state.tonnage).toBe(10);
    expect(state.structureByLocation).toEqual(
      computeProtoStructure(10, ProtoChassis.ULTRAHEAVY, state.hasMainGun),
    );
    expect(chassisFindings(state)).toEqual([]);
  });

  it('lowers a 12 t Ultraheavy to 9 t when it becomes a Biped', () => {
    const store = createNewProtoMechStore({
      tonnage: 12,
      chassisType: ProtoChassis.ULTRAHEAVY,
    });

    store.getState().setChassisType(ProtoChassis.BIPED);

    expect(store.getState().tonnage).toBe(9);
  });

  it('keeps a Glider above the Light class without a finding (no pinned weight rule)', () => {
    const store = createNewProtoMechStore({ tonnage: 9 });

    store.getState().setChassisType(ProtoChassis.GLIDER);

    const state = store.getState();
    expect(state.tonnage).toBe(9);
    expect(chassisFindings(state)).toEqual([]);
  });
});
