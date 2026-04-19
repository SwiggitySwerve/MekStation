/**
 * Vehicle event factory tests.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 */

import { GameEventType, GamePhase } from '@/types/gameplay';

import {
  createMotiveDamagedEvent,
  createMotivePenaltyAppliedEvent,
  createTurretLockedEvent,
  createVehicleCrewStunnedEvent,
  createVehicleImmobilizedEvent,
  createVTOLCrashCheckEvent,
} from '../gameEvents';

describe('vehicle event factories', () => {
  it('createMotiveDamagedEvent carries severity + mpPenalty + rolls', () => {
    const e = createMotiveDamagedEvent(
      'game-1',
      5,
      3,
      GamePhase.WeaponAttack,
      'tank-1',
      'minor',
      1,
      [3, 4],
    );
    expect(e.type).toBe(GameEventType.MotiveDamaged);
    expect(e.payload).toMatchObject({
      unitId: 'tank-1',
      severity: 'minor',
      mpPenalty: 1,
      rolls: [3, 4],
    });
  });

  it('createMotivePenaltyAppliedEvent carries before/after MP', () => {
    const e = createMotivePenaltyAppliedEvent(
      'game-1',
      6,
      3,
      GamePhase.WeaponAttack,
      'tank-1',
      5,
      3,
      4,
    );
    expect(e.type).toBe(GameEventType.MotivePenaltyApplied);
    expect(e.payload).toMatchObject({
      previousCruiseMP: 5,
      newCruiseMP: 3,
      newFlankMP: 4,
    });
  });

  it('createVehicleImmobilizedEvent carries cause', () => {
    const e = createVehicleImmobilizedEvent(
      'game-1',
      7,
      3,
      GamePhase.WeaponAttack,
      'tank-1',
      'motive_roll',
    );
    expect(e.type).toBe(GameEventType.VehicleImmobilized);
    expect(e.payload).toMatchObject({ cause: 'motive_roll' });
  });

  it('createTurretLockedEvent defaults to primary turret', () => {
    const e = createTurretLockedEvent(
      'game-1',
      8,
      3,
      GamePhase.WeaponAttack,
      'tank-1',
      false,
    );
    expect(e.type).toBe(GameEventType.TurretLocked);
    expect(e.payload).toMatchObject({ secondary: false });
  });

  it('createVehicleCrewStunnedEvent carries phases count', () => {
    const e = createVehicleCrewStunnedEvent(
      'game-1',
      9,
      3,
      GamePhase.WeaponAttack,
      'tank-1',
      2,
    );
    expect(e.type).toBe(GameEventType.VehicleCrewStunned);
    expect(e.payload).toMatchObject({ phasesStunned: 2 });
  });

  it('createVTOLCrashCheckEvent carries altitude + fallDamage', () => {
    const e = createVTOLCrashCheckEvent(
      'game-1',
      10,
      3,
      GamePhase.WeaponAttack,
      'vtol-1',
      3,
      30,
    );
    expect(e.type).toBe(GameEventType.VTOLCrashCheck);
    expect(e.payload).toMatchObject({ altitude: 3, fallDamage: 30 });
  });
});
