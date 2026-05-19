/**
 * Tests for `composeCoopEncounter` — two-force composition (CO2,
 * tasks 2.4, 3.4).
 *
 * Covers: a co-op encounter contains both rosters on the shared side; a
 * zero-`deploy` launch is blocked with no encounter created; a mixed
 * deploy/HQ launch composes correctly; ownership validation rejects a
 * cross-player unit.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

import { composeCoopEncounter, ownsCoopUnit } from '../composeCoopEncounter';

function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
  };
}

const BASE_ENCOUNTER: IEncounter = {
  id: 'enc-coop-1',
  name: 'Co-op Standup',
  status: EncounterStatus.Ready,
  mapConfig: {
    radius: 8,
    terrain: TerrainPreset.Clear,
    playerDeploymentZone: 'south',
    opponentDeploymentZone: 'north',
  },
  victoryConditions: [],
  optionalRules: [],
  createdAt: '2026-05-19T00:00:00.000Z',
  updatedAt: '2026-05-19T00:00:00.000Z',
  campaignMeta: {
    campaignId: 'campaign-1',
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
  },
};

describe('composeCoopEncounter — both forces deploying', () => {
  it('puts both players units on the shared side', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: 'host',
        role: 'host',
        force: makeForce('force-host', ['u-h1', 'u-h2']),
        participation: 'deploy',
      },
      {
        playerId: 'guest',
        role: 'guest',
        force: makeForce('force-guest', ['u-g1']),
        participation: 'deploy',
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const seatUnits = result.composition.coopSeats.map((s) => s.unitId);
    expect(seatUnits).toEqual(['u-h1', 'u-h2', 'u-g1']);
    expect(result.composition.deployingPlayerIds).toEqual(['host', 'guest']);
    expect(result.composition.commandHqPlayerIds).toEqual([]);
  });

  it('tags each seat with its owning player', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: 'host',
        role: 'host',
        force: makeForce('force-host', ['u-h1']),
        participation: 'deploy',
      },
      {
        playerId: 'guest',
        role: 'guest',
        force: makeForce('force-guest', ['u-g1']),
        participation: 'deploy',
      },
    ]);
    if (!result.ok) throw new Error('expected ok');
    const hostSeat = result.composition.coopSeats.find(
      (s) => s.unitId === 'u-h1',
    );
    const guestSeat = result.composition.coopSeats.find(
      (s) => s.unitId === 'u-g1',
    );
    expect(hostSeat?.ownerPlayerId).toBe('host');
    expect(guestSeat?.ownerPlayerId).toBe('guest');
  });
});

describe('composeCoopEncounter — participation choice', () => {
  it('blocks a launch where no player chose deploy', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: 'host',
        role: 'host',
        force: makeForce('force-host', ['u-h1']),
        participation: 'command-hq',
      },
      {
        playerId: 'guest',
        role: 'guest',
        force: makeForce('force-guest', ['u-g1']),
        participation: 'command-hq',
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('no-deploying-player');
    }
  });

  it('a command-hq players force sits out the composition', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: 'host',
        role: 'host',
        force: makeForce('force-host', ['u-h1', 'u-h2']),
        participation: 'deploy',
      },
      {
        playerId: 'guest',
        role: 'guest',
        force: makeForce('force-guest', ['u-g1']),
        participation: 'command-hq',
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Only the deploying host's units are on the map.
    expect(result.composition.coopSeats.map((s) => s.unitId)).toEqual([
      'u-h1',
      'u-h2',
    ]);
    expect(result.composition.deployingPlayerIds).toEqual(['host']);
    expect(result.composition.commandHqPlayerIds).toEqual(['guest']);
  });

  it('rejects an empty contribution list', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-contributions');
  });

  it('rejects a duplicate player contribution', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: 'host',
        role: 'host',
        force: makeForce('f1', ['u1']),
        participation: 'deploy',
      },
      {
        playerId: 'host',
        role: 'guest',
        force: makeForce('f2', ['u2']),
        participation: 'deploy',
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('duplicate-player');
  });
});

describe('ownsCoopUnit — cross-player ownership', () => {
  it('a player owns only their own units', () => {
    const result = composeCoopEncounter(BASE_ENCOUNTER, [
      {
        playerId: 'host',
        role: 'host',
        force: makeForce('force-host', ['u-h1']),
        participation: 'deploy',
      },
      {
        playerId: 'guest',
        role: 'guest',
        force: makeForce('force-guest', ['u-g1']),
        participation: 'deploy',
      },
    ]);
    if (!result.ok) throw new Error('expected ok');
    const composition = result.composition;

    expect(ownsCoopUnit(composition, 'host', 'u-h1')).toBe(true);
    // A cross-player intent — host does not own the guest's unit.
    expect(ownsCoopUnit(composition, 'host', 'u-g1')).toBe(false);
    expect(ownsCoopUnit(composition, 'guest', 'u-g1')).toBe(true);
    // An unknown unit is owned by nobody.
    expect(ownsCoopUnit(composition, 'host', 'u-unknown')).toBe(false);
  });
});
