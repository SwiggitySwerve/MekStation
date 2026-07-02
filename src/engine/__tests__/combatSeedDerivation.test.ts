/**
 * Combat-seed derivation for bare-IGameUnit session producers.
 *
 * Per `extend-combat-seed-to-all-session-producers`
 * (game-session-management "Combat State Seeding at Session Creation"):
 * derived initial state from seeded producers carries real per-location
 * armor/structure (plus startingInternalStructure), the P2P mirror
 * inherits the host's seeded values, and catalog misses degrade to the
 * legacy unseeded unit instead of failing the launch.
 */
import type { ILobbyState } from '@/types/gameplay/GameLobbyInterfaces';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

jest.mock('../adapters/CompendiumAdapter', () => {
  const mockAdaptUnit = jest.fn();
  return {
    adaptUnit: mockAdaptUnit,
    __mockAdaptUnit: mockAdaptUnit,
  };
});

import { createMirrorSession } from '@/lib/p2p/mirrorSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  buildSeededGameSessionFromLobbyState,
  deriveCombatSeededGameUnits,
} from '../combatSeedDerivation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adapterModule = require('../adapters/CompendiumAdapter') as {
  __mockAdaptUnit: jest.Mock;
};
const mockAdaptUnit = adapterModule.__mockAdaptUnit;

const FIXTURE_ARMOR = { head: 9, center_torso: 47, center_torso_rear: 14 };
const FIXTURE_STRUCTURE = { head: 3, center_torso: 31 };

function adaptedFixture(unitRef: string, side: GameSide) {
  return {
    id: unitRef,
    side,
    position: { q: 0, r: 0 },
    facing: 0,
    heat: 0,
    movementThisTurn: 'stationary',
    hexesMovedThisTurn: 0,
    heatSinks: 20,
    heatSinkType: 'single',
    armor: { ...FIXTURE_ARMOR },
    structure: { ...FIXTURE_STRUCTURE },
    startingInternalStructure: { ...FIXTURE_STRUCTURE },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: 'pending',
    tonnage: 100,
    weapons: [],
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
  };
}

function gameUnit(id: string, unitRef: string, side: GameSide): IGameUnit {
  return {
    id,
    name: `Unit ${id}`,
    side,
    unitRef,
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
  };
}

function lobbyFixture(): ILobbyState {
  const loadout = (unitId: string, pilotId: string) => ({
    units: [
      {
        unitId,
        designation: `Mech ${unitId}`,
        tonnage: 100,
        bv: 1000,
      },
    ],
    pilots: [
      {
        pilotId,
        unitId,
        callsign: `${pilotId} Callsign`,
        gunnery: 4,
        piloting: 5,
      },
    ],
  });
  return {
    mode: '1v1',
    matchId: 'match-1',
    hostPeerId: 'peer-host',
    guestPeerId: 'peer-guest',
    hostLoadout: loadout('probe-mech-a', 'pilot-a'),
    guestLoadout: loadout('probe-mech-b', 'pilot-b'),
    mapConfig: { radius: 8, turnLimit: 12, terrainPreset: 'plains' },
    hostReady: true,
    guestReady: true,
  } as unknown as ILobbyState;
}

beforeEach(() => {
  mockAdaptUnit.mockReset();
  mockAdaptUnit.mockImplementation(
    async (unitRef: string, options?: { side?: GameSide }) =>
      adaptedFixture(unitRef, options?.side ?? GameSide.Player),
  );
});

describe('deriveCombatSeededGameUnits', () => {
  it('splices catalog armor/structure/heat sinks onto bare game units, re-keyed to the game unit id', async () => {
    const units = [
      gameUnit('game-unit-1', 'probe-mech-a', GameSide.Player),
      gameUnit('game-unit-2', 'probe-mech-b', GameSide.Opponent),
    ];

    const seeded = await deriveCombatSeededGameUnits(units);

    expect(seeded).toHaveLength(2);
    for (const unit of seeded) {
      expect(unit.armorByLocation).toEqual(FIXTURE_ARMOR);
      expect(unit.structureByLocation).toEqual(FIXTURE_STRUCTURE);
      expect(unit.heatSinks).toBe(20);
    }
    // The adapter returns catalog ids; the splice must have matched the
    // GAME unit ids or nothing would have been seeded.
    expect(seeded.map((unit) => unit.id)).toEqual([
      'game-unit-1',
      'game-unit-2',
    ]);
  });

  it('leaves catalog-miss units unseeded instead of failing (legacy degrade)', async () => {
    mockAdaptUnit.mockImplementation(async (unitRef: string) =>
      unitRef === 'probe-mech-a'
        ? adaptedFixture(unitRef, GameSide.Player)
        : null,
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const seeded = await deriveCombatSeededGameUnits([
      gameUnit('game-unit-1', 'probe-mech-a', GameSide.Player),
      gameUnit('game-unit-2', 'missing-mech', GameSide.Opponent),
    ]);

    expect(seeded[0].armorByLocation).toEqual(FIXTURE_ARMOR);
    expect(seeded[1].armorByLocation).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('buildSeededGameSessionFromLobbyState', () => {
  it('derives initial state with real per-location armor, structure, and startingInternalStructure', async () => {
    const session = await buildSeededGameSessionFromLobbyState(
      lobbyFixture(),
      'match-1',
    );

    const states = Object.values(session.currentState.units);
    expect(states).toHaveLength(2);
    for (const state of states) {
      expect(state.armor).toEqual(FIXTURE_ARMOR);
      expect(state.structure).toEqual(FIXTURE_STRUCTURE);
      expect(state.startingInternalStructure).toEqual(FIXTURE_STRUCTURE);
      expect(state.heatSinks).toBe(20);
    }
  });

  it('guest mirror inherits the host session seeded state (value-equal twin)', async () => {
    const host = await buildSeededGameSessionFromLobbyState(
      lobbyFixture(),
      'match-1',
    );

    const mirror = createMirrorSession(host.config, host.units, {
      id: host.id,
      createdAt: host.createdAt,
      hostPeerId: host.hostPeerId ?? 'peer-host',
      guestPeerId: host.guestPeerId ?? 'peer-guest',
      sideOwners: host.sideOwners,
    });

    for (const [unitId, hostState] of Object.entries(host.currentState.units)) {
      const mirrorState = mirror.currentState.units[unitId];
      expect(mirrorState.armor).toEqual(hostState.armor);
      expect(mirrorState.structure).toEqual(hostState.structure);
    }
  });
});
