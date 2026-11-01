/**
 * Duplicating an aerospace unit keeps what makes it that kind of unit
 * (follow-up 57: FixedWingSupport flag; follow-up 61: small craft).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { BayType } from '@/types/unit/CapitalShipInterfaces';
import { makeSmallCraftCrew } from '@/utils/construction/aerospace/crewCalculations';

import {
  clearAllAerospaceStores,
  createAndRegisterAerospace,
  duplicateAerospace,
} from '../aerospaceStoreRegistry';

describe('duplicateAerospace', () => {
  beforeEach(() => {
    clearAllAerospaceStores();
    localStorage.clear();
  });
  afterEach(() => clearAllAerospaceStores());

  it('keeps the FixedWingSupport flag and its safe-thrust SI', () => {
    const source = createAndRegisterAerospace({
      name: 'Support Wing',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      isConventional: true,
    });
    source.setState({ isFixedWingSupport: true });
    // 50 t: a fighter would keep floor(50 / 10) = 5; support wings use thrust.
    source.getState().setSafeThrust(3);
    expect(source.getState().structuralIntegrity).toBe(3);

    const copy = duplicateAerospace(source.getState().id)?.getState();
    expect(copy?.isFixedWingSupport).toBe(true);
    expect(copy?.aerospaceSubType).toBe(AerospaceSubType.CONVENTIONAL_FIGHTER);
    expect(copy?.safeThrust).toBe(3);
    expect(copy?.structuralIntegrity).toBe(3);
  });

  it('derives a copied fighter SI from the copied safe thrust', () => {
    const source = createAndRegisterAerospace({
      name: 'Fast Fighter',
      tonnage: 30,
      techBase: TechBase.INNER_SPHERE,
    });
    source.getState().setSafeThrust(8);
    expect(source.getState().structuralIntegrity).toBe(8);

    const copy = duplicateAerospace(source.getState().id)?.getState();
    expect(copy?.isFixedWingSupport).toBeFalsy();
    expect(copy?.structuralIntegrity).toBe(8);
  });

  it('keeps a small craft a small craft with its own SI, crew, motion and bays', () => {
    const source = createAndRegisterAerospace({
      name: 'Shuttle',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
      isSmallCraft: true,
    });
    source.getState().setStructuralIntegrity(24);
    source.getState().setCrew(makeSmallCraftCrew(9, 3, 2));
    const bays = [
      { type: BayType.CARGO, capacity: 20, doors: 1, bayNumber: 1 },
    ];
    source.setState({ motionType: AerospaceMotionType.SPHEROID, bays });

    const copy = duplicateAerospace(source.getState().id)?.getState();
    expect(copy?.aerospaceSubType).toBe(AerospaceSubType.SMALL_CRAFT);
    expect(copy?.unitType).toBe(UnitType.SMALL_CRAFT);
    expect(copy?.structuralIntegrity).toBe(24);
    expect(copy?.crew).toEqual(makeSmallCraftCrew(9, 3, 2));
    expect(copy?.motionType).toBe(AerospaceMotionType.SPHEROID);
    expect(copy?.bays).toEqual(bays);
  });
});
