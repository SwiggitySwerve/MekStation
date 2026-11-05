/**
 * ProtoMech tonnage edits stay inside the range the Structure tab offers.
 *
 * The Structure tab offers 10–15 t for an Ultraheavy chassis and 2–9 t for
 * the others (ProtoMechStructureTab.logic.ts getTonnageOptions), so the store
 * clamps each edit to its chassis range rather than to 2–9 t for everyone.
 */

import { createNewProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

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
