import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

import {
  getEncounterRepository,
  resetEncounterRepository,
} from '@/services/encounter/EncounterRepository';
import {
  getEncounterService,
  resetEncounterService,
} from '@/services/encounter/EncounterService';
import { resetForceRepository } from '@/services/forces/ForceRepository';
import {
  getForceService,
  resetForceService,
} from '@/services/forces/ForceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { resetPilotRepository } from '@/services/pilots/PilotRepository';
import {
  getPilotService,
  resetPilotService,
} from '@/services/pilots/PilotService';
import { ScenarioTemplateType } from '@/types/encounter';
import { ForceType } from '@/types/force';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { PilotType } from '@/types/pilot';
import { createGameSession } from '@/utils/gameplay/gameSessionCore';

let mockSessionIdCounter = 0;

jest.mock('@/utils/gameplay/gameSessionCore', () => ({
  createGameSession: jest.fn((config, units) => {
    mockSessionIdCounter += 1;
    return {
      id: `campaign-wave-3-session-${mockSessionIdCounter}`,
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
      config,
      units,
      events: [],
      currentState: {},
    };
  }),
}));

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(async (unitRef: string, options?: { side?: unknown }) => ({
    id: unitRef,
    side: options?.side,
    position: { q: 0, r: 0 },
    facing: 0,
    heat: 0,
    movementThisTurn: 'stationary',
    hexesMovedThisTurn: 0,
    heatSinks: 10,
    heatSinkType: 'single',
    armor: { head: 9, center_torso: 20 },
    structure: { head: 3, center_torso: 10 },
    startingInternalStructure: { head: 3, center_torso: 10 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: 'pending',
    tonnage: 50,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  })),
}));

function resetDatabaseState(): void {
  resetEncounterService();
  resetEncounterRepository();
  resetForceService();
  resetForceRepository();
  resetPilotService();
  resetPilotRepository();
  resetSQLiteService();
  mockSessionIdCounter = 0;
  jest.mocked(createGameSession).mockClear();
}

function initializeTestDatabase(): void {
  resetDatabaseState();
  getSQLiteService({ path: ':memory:' }).initialize();
}

function createPilot({
  callsign,
  gunnery,
  name,
  piloting,
}: {
  readonly callsign: string;
  readonly gunnery: number;
  readonly name: string;
  readonly piloting: number;
}): string {
  const result = getPilotService().createPilot({
    identity: { name, callsign },
    type: PilotType.Persistent,
    skills: { gunnery, piloting },
  });
  expect(result.success).toBe(true);
  expect(result.id).toBeDefined();
  return result.id!;
}

function createAssignedLance({
  assignments,
  name,
}: {
  readonly name: string;
  readonly assignments: readonly {
    readonly pilotId?: string;
    readonly unitRef: string;
  }[];
}): string {
  const forceService = getForceService();
  const createResult = forceService.createForce({
    name,
    forceType: ForceType.Lance,
  });
  expect(createResult.success).toBe(true);
  expect(createResult.id).toBeDefined();

  const force = forceService.getForce(createResult.id!);
  expect(force).not.toBeNull();
  for (let index = 0; index < assignments.length; index += 1) {
    const assignment = assignments[index];
    const slot = force?.assignments[index];
    if (!assignment || !slot) {
      throw new Error(`Missing force assignment slot ${index + 1}`);
    }

    const result = assignment.pilotId
      ? forceService.assignPilotAndUnit(
          slot.id,
          assignment.pilotId,
          assignment.unitRef,
        )
      : forceService.assignUnit(slot.id, assignment.unitRef);
    expect(result.success).toBe(true);
  }

  return createResult.id!;
}

describe('campaign mission encounter launch integration', () => {
  beforeEach(initializeTestDatabase);
  afterEach(resetDatabaseState);

  it('launches a four-unit campaign encounter into a session with resolved player pilots', async () => {
    const sablePilotId = createPilot({
      name: 'Ari Valen',
      callsign: 'Sable',
      gunnery: 2,
      piloting: 3,
    });
    const vectorPilotId = createPilot({
      name: 'Ben Novak',
      callsign: 'Vector',
      gunnery: 3,
      piloting: 4,
    });
    const kestrelPilotId = createPilot({
      name: 'Cyra Holt',
      callsign: 'Kestrel',
      gunnery: 4,
      piloting: 5,
    });
    const bulwarkPilotId = createPilot({
      name: 'Dane Rook',
      callsign: 'Bulwark',
      gunnery: 5,
      piloting: 6,
    });
    const pilotIds = [
      sablePilotId,
      vectorPilotId,
      kestrelPilotId,
      bulwarkPilotId,
    ];
    const playerUnitRefs = [
      'locust-lct-1v',
      'hunchback-hbk-4g',
      'marauder-mad-3r',
      'atlas-as7-d',
    ] as const;

    const playerForceId = createAssignedLance({
      name: 'Wave 3 Player Lance',
      assignments: [
        { unitRef: playerUnitRefs[0], pilotId: sablePilotId },
        { unitRef: playerUnitRefs[1], pilotId: vectorPilotId },
        { unitRef: playerUnitRefs[2], pilotId: kestrelPilotId },
        { unitRef: playerUnitRefs[3], pilotId: bulwarkPilotId },
      ],
    });
    const opponentForceId = createAssignedLance({
      name: 'Wave 3 OpFor Lance',
      assignments: [
        { unitRef: 'locust-lct-1v' },
        { unitRef: 'hunchback-hbk-4g' },
        { unitRef: 'marauder-mad-3r' },
        { unitRef: 'atlas-as7-d' },
      ],
    });

    const encounterService = getEncounterService();
    const createEncounter = encounterService.createEncounter({
      name: 'Campaign Wave 3 Launch',
      template: ScenarioTemplateType.Skirmish,
    });
    expect(createEncounter.success).toBe(true);
    expect(createEncounter.id).toBeDefined();
    expect(
      encounterService.setPlayerForce(createEncounter.id!, playerForceId),
    ).toMatchObject({ success: true });
    expect(
      encounterService.setOpponentForce(createEncounter.id!, opponentForceId),
    ).toMatchObject({ success: true });

    const launch = await encounterService.launchEncounter(createEncounter.id!, {
      campaignId: 'campaign-1',
      contractId: 'contract-1',
      scenarioId: createEncounter.id!,
    });

    expect(launch.success).toBe(true);
    expect(createGameSession).toHaveBeenCalledTimes(1);
    const sessionUnits = jest.mocked(createGameSession).mock.calls[0]?.[1] as
      | readonly IGameUnit[]
      | undefined;
    expect(sessionUnits).toBeDefined();
    const playerUnits =
      sessionUnits?.filter((unit) => unit.side === GameSide.Player) ?? [];
    const opponentUnits =
      sessionUnits?.filter((unit) => unit.side === GameSide.Opponent) ?? [];

    expect(playerUnits).toHaveLength(4);
    expect(opponentUnits).toHaveLength(4);
    expect(playerUnits.map((unit) => unit.unitRef)).toEqual(playerUnitRefs);
    expect(playerUnits.map((unit) => unit.pilotRef)).toEqual(pilotIds);
    expect(playerUnits.map((unit) => unit.name)).toEqual([
      'Sable',
      'Vector',
      'Kestrel',
      'Bulwark',
    ]);
    expect(
      playerUnits.map((unit) => ({
        gunnery: unit.gunnery,
        piloting: unit.piloting,
      })),
    ).toEqual([
      { gunnery: 2, piloting: 3 },
      { gunnery: 3, piloting: 4 },
      { gunnery: 4, piloting: 5 },
      { gunnery: 5, piloting: 6 },
    ]);
    expect(
      getEncounterRepository().getEncounterById(createEncounter.id!),
    ).toMatchObject({ gameSessionId: 'campaign-wave-3-session-1' });
  });
});
