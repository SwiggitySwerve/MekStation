import { type IUnitGameState } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { createInitialUnitState } from '../initialization';
import {
  POSITION,
  SAMPLE_BA_INIT,
  baseGameUnit,
  makeInfantryUnit,
} from './initialization.combatState.fixtures';

describe('createInitialUnitState infantry seeding', () => {
  it("seeds combatState with kind='platoon' for INFANTRY", () => {
    const unit = baseGameUnit({
      id: 'inf-1',
      unitType: UnitType.INFANTRY,
      infantryInit: makeInfantryUnit(),
    });
    const state = createInitialUnitState(unit, POSITION);

    expect(state.combatState?.kind).toBe('platoon');
    if (state.combatState?.kind === 'platoon') {
      expect(state.combatState.state.startingTroopers).toBe(28);
      expect(state.combatState.state.survivingTroopers).toBe(28);
      expect(state.combatState.state.hasAntiMechTraining).toBe(true);
    }
  });

  it('throws when infantryInit is missing for INFANTRY', () => {
    const unit = baseGameUnit({ id: 'inf-2', unitType: UnitType.INFANTRY });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /inf-2.*infantryInit/i,
    );
  });

  it("narrows on combatState.kind === 'platoon' for downstream consumers", () => {
    const unit = baseGameUnit({
      id: 'inf-narrow',
      unitType: UnitType.INFANTRY,
      infantryInit: makeInfantryUnit(),
    });
    const state: IUnitGameState = createInitialUnitState(unit, POSITION);

    if (state.combatState?.kind === 'platoon') {
      const survivingTroopers: number =
        state.combatState.state.survivingTroopers;
      expect(survivingTroopers).toBe(28);
    } else {
      throw new Error('expected platoon combatState');
    }
  });
});

describe('createInitialUnitState battle armor seeding', () => {
  it("seeds combatState with kind='squad' for BATTLE_ARMOR", () => {
    const unit = baseGameUnit({
      id: 'ba-1',
      unitType: UnitType.BATTLE_ARMOR,
      battleArmorInit: SAMPLE_BA_INIT,
    });
    const state = createInitialUnitState(unit, POSITION);

    expect(state.combatState?.kind).toBe('squad');
    if (state.combatState?.kind === 'squad') {
      expect(state.combatState.state.squadSize).toBe(5);
      expect(state.combatState.state.troopers).toHaveLength(5);
      expect(
        state.combatState.state.troopers.every(
          (trooper: { alive: boolean }) => trooper.alive,
        ),
      ).toBe(true);
    }
  });

  it('throws when battleArmorInit is missing or incomplete', () => {
    const missingBlock = baseGameUnit({
      id: 'ba-2',
      unitType: UnitType.BATTLE_ARMOR,
    });
    const missingArmor = baseGameUnit({
      id: 'ba-3',
      unitType: UnitType.BATTLE_ARMOR,
      battleArmorInit: {
        squadSize: 4,
        armorPointsPerTrooper: undefined as unknown as number,
      },
    });

    expect(() => createInitialUnitState(missingBlock, POSITION)).toThrow(
      /ba-2.*battleArmorInit/i,
    );
    expect(() => createInitialUnitState(missingArmor, POSITION)).toThrow(
      /ba-3.*armorPointsPerTrooper/i,
    );
  });
});
