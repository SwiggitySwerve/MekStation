/**
 * Tripod and QuadVee crew seats live on the unit draft, follow its undo
 * history and dirty tracking, and are kept in the draft storage payload.
 */
import { getUnitEditHistory } from '@/stores/unit/unitEditHistory';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { createDefaultUnitState } from '../unitState';
import { createUnitStore } from '../useUnitStore';

function storeFor(configuration: MechConfiguration, tonnage: number) {
  return createUnitStore({
    ...createDefaultUnitState({
      id: '5b0f7c64-5f0e-4c43-a3f0-6f4f4d7a1c01',
      name: 'Crew Fixture',
      tonnage,
      techBase: TechBase.INNER_SPHERE,
    }),
    configuration,
  });
}
const seat = (slotIndex: number, name: string, g = 4, p = 5) => ({
  slotIndex,
  name,
  gunnery: g,
  piloting: p,
});

describe('setCrewSeat', () => {
  it('assigns seats in slot order with unequal skills and marks the draft modified', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 100);
    store.getState().setCrewSeat(seat(1, 'Gunner Gwen', 2, 6));
    store.getState().setCrewSeat(seat(0, 'Pilot Pat', 3, 4));
    expect(store.getState().crewSeats).toEqual([
      seat(0, 'Pilot Pat', 3, 4),
      seat(1, 'Gunner Gwen', 2, 6),
    ]);
    expect(store.getState().isModified).toBe(true);
  });

  it('replaces a seat and clears it with null', () => {
    const store = storeFor(MechConfiguration.QUADVEE, 30);
    store.getState().setCrewSeat(seat(0, 'First'));
    store.getState().setCrewSeat(seat(0, 'Second'));
    expect(store.getState().crewSeats).toEqual([seat(0, 'Second')]);
    store.getState().clearCrewSeat(0);
    expect(store.getState().crewSeats).toBeUndefined();
  });

  it('refuses seats on a configuration without native crew seats', () => {
    const store = storeFor(MechConfiguration.BIPED, 50);
    expect(() => store.getState().setCrewSeat(seat(0, 'Nobody'))).toThrow(
      RangeError,
    );
    expect(store.getState().crewSeats).toBeUndefined();
  });

  it('refuses the Tech Officer seat on an ordinary tripod and allows it above 100 tons', () => {
    const ordinary = storeFor(MechConfiguration.TRIPOD, 100);
    expect(() => ordinary.getState().setCrewSeat(seat(2, 'Tech'))).toThrow(
      RangeError,
    );
    const superheavy = storeFor(MechConfiguration.TRIPOD, 105);
    superheavy.getState().setCrewSeat(seat(2, 'Tech'));
    expect(superheavy.getState().crewSeats).toEqual([seat(2, 'Tech')]);
  });

  it('keeps the stored Tech Officer when tonnage crosses back over 100', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 105);
    store.getState().setCrewSeat(seat(2, 'Tech'));
    store.getState().setTonnage(100);
    expect(store.getState().crewSeats).toEqual([seat(2, 'Tech')]);
    store.getState().setTonnage(105);
    expect(store.getState().crewSeats).toEqual([seat(2, 'Tech')]);
  });

  it('undoes and redoes a seat assignment', () => {
    const store = storeFor(MechConfiguration.TRIPOD, 100);
    const history = getUnitEditHistory(store);
    store.getState().setCrewSeat(seat(0, 'Undo Me'));
    expect(history.getState().undoLabel).toBe('Assign crew seat');
    history.getState().undo();
    expect(store.getState().crewSeats).toBeUndefined();
    history.getState().redo();
    expect(store.getState().crewSeats).toEqual([seat(0, 'Undo Me')]);
  });

  it('restores seats from the draft storage when the unit is reopened', async () => {
    const first = storeFor(MechConfiguration.TRIPOD, 100);
    first.getState().setCrewSeat(seat(0, 'Draft Pilot'));
    const second = storeFor(MechConfiguration.TRIPOD, 100);
    expect(second.getState().crewSeats).toBeUndefined();
    await (
      second as unknown as { persist: { rehydrate(): Promise<void> } }
    ).persist.rehydrate();
    expect(second.getState().crewSeats).toEqual([seat(0, 'Draft Pilot')]);
  });
});
