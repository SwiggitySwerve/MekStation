import type { IAdaptedUnit } from '@/engine/types';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { ForcePosition, ForceStatus, ForceType } from '@/types/force';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
} from '@/types/gameplay';
import { PilotStatus, PilotType } from '@/types/pilot';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

const MIRRORED_REPRESENTATIVE_REFS = [
  'locust-lct-1v',
  'hunchback-hbk-4g',
  'marauder-mad-3r',
  'atlas-as7-d',
] as const;

const CANONICAL_COMBAT_SHEETS: Record<
  (typeof MIRRORED_REPRESENTATIVE_REFS)[number],
  {
    readonly armor: Record<string, number>;
    readonly structure: Record<string, number>;
  }
> = {
  'locust-lct-1v': {
    armor: { head: 9, center_torso: 20, left_torso: 10, right_torso: 10 },
    structure: { head: 3, center_torso: 10, left_torso: 5, right_torso: 5 },
  },
  'hunchback-hbk-4g': {
    armor: { head: 9, center_torso: 30, left_torso: 22, right_torso: 22 },
    structure: { head: 3, center_torso: 21, left_torso: 15, right_torso: 15 },
  },
  'marauder-mad-3r': {
    armor: { head: 9, center_torso: 36, left_torso: 26, right_torso: 26 },
    structure: { head: 3, center_torso: 23, left_torso: 16, right_torso: 16 },
  },
  'atlas-as7-d': {
    armor: { head: 9, center_torso: 47, left_torso: 32, right_torso: 32 },
    structure: { head: 3, center_torso: 31, left_torso: 21, right_torso: 21 },
  },
};

function isRepresentativeRef(
  unitRef: string,
): unitRef is (typeof MIRRORED_REPRESENTATIVE_REFS)[number] {
  return (MIRRORED_REPRESENTATIVE_REFS as readonly string[]).includes(unitRef);
}

function sumLocations(values: Record<string, number> | undefined): number {
  return Object.values(values ?? {}).reduce((sum, value) => sum + value, 0);
}

function makeAdaptedUnit(
  unitRef: (typeof MIRRORED_REPRESENTATIVE_REFS)[number],
  side: GameSide,
): IAdaptedUnit {
  const sheet = CANONICAL_COMBAT_SHEETS[unitRef];
  return {
    id: unitRef,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: 10,
    heatSinkType: 'single',
    armor: { ...sheet.armor },
    structure: { ...sheet.structure },
    startingInternalStructure: { ...sheet.structure },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    hasRetreated: false,
    hasEjected: false,
    tonnage: unitRef === 'atlas-as7-d' ? 100 : 50,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeForce(
  id: string,
  assignments: readonly {
    readonly pilotId: string | null;
    readonly unitId: (typeof MIRRORED_REPRESENTATIVE_REFS)[number];
  }[],
): IForce {
  return {
    id,
    name: id,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: assignments.map((assignment, index) => ({
      id: `${id}-slot-${index + 1}`,
      pilotId: assignment.pilotId,
      unitId: assignment.unitId,
      position: ForcePosition.Member,
      slot: index + 1,
    })),
    stats: {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots: assignments.filter((assignment) => assignment.pilotId)
        .length,
      assignedUnits: assignments.length,
      emptySlots: 0,
      averageSkill: { gunnery: 4, piloting: 5 },
    },
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
  };
}

function makePilot(id: string): IPilot {
  return {
    id,
    name: `${id} Pilot`,
    callsign: id,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
  };
}

describe('campaign mission encounter launch integrity', () => {
  beforeEach(() => {
    adaptUnitMock.mockImplementation(async (unitRef, options) => {
      if (!isRepresentativeRef(unitRef)) {
        return null;
      }

      return makeAdaptedUnit(unitRef, options?.side ?? GameSide.Player);
    });
  });

  afterEach(() => {
    adaptUnitMock.mockReset();
  });

  it('launches mirrored representative campaign forces without collapsing unit identity or ending after Initiative', async () => {
    const pilots = MIRRORED_REPRESENTATIVE_REFS.map((_, index) =>
      makePilot(`pilot-${index + 1}`),
    );
    const playerForce = makeForce(
      'player-force',
      MIRRORED_REPRESENTATIVE_REFS.map((unitId, index) => ({
        unitId,
        pilotId: pilots[index]?.id ?? null,
      })),
    );
    const opponentForce = makeForce(
      'opponent-force',
      MIRRORED_REPRESENTATIVE_REFS.map((unitId) => ({
        unitId,
        pilotId: null,
      })),
    );

    const prepared = await buildPreparedBattleData({
      playerForce,
      opponentForce,
      pilots,
    });

    const interactive = new GameEngine({
      seed: 42,
      mapRadius: 7,
      turnLimit: 10,
      victoryConditions: ['elimination'],
    }).createInteractiveSession(
      prepared.playerAdapted,
      prepared.opponentAdapted,
      prepared.gameUnits,
    );

    const launched = interactive.getSession();
    expect(Object.keys(launched.currentState.units)).toHaveLength(8);

    for (const unit of launched.units) {
      const stateUnit = launched.currentState.units[unit.id];
      const sheet =
        CANONICAL_COMBAT_SHEETS[
          unit.unitRef as (typeof MIRRORED_REPRESENTATIVE_REFS)[number]
        ];
      expect(stateUnit).toBeDefined();
      expect(stateUnit?.side).toBe(unit.side);
      expect(sumLocations(stateUnit?.armor)).toBe(sumLocations(sheet.armor));
      expect(sumLocations(stateUnit?.structure)).toBe(
        sumLocations(sheet.structure),
      );
      expect(sumLocations(stateUnit?.armor)).toBeGreaterThan(0);
      expect(sumLocations(stateUnit?.structure)).toBeGreaterThan(0);
      expect(stateUnit?.destroyed).toBe(false);
    }

    interactive.advancePhase();

    const afterInitiative = interactive.getSession();
    expect(afterInitiative.currentState.phase).toBe(GamePhase.Movement);
    expect(afterInitiative.currentState.status).toBe(GameStatus.Active);
    expect(afterInitiative.currentState.result).toBeUndefined();
    expect(
      Object.values(afterInitiative.currentState.units).filter(
        (unit) => !unit.destroyed && !unit.hasRetreated && !unit.hasEjected,
      ),
    ).toHaveLength(8);
    expect(
      afterInitiative.events.some(
        (event) => event.type === GameEventType.GameEnded,
      ),
    ).toBe(false);
  });
});
