import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IAdaptedUnit } from '@/engine/types';

import { buildEncounterPersistBody } from '@/components/encounter/persistEncounterFromSession';
import { persistEncounterGame } from '@/components/encounter/persistEncounterGame';
import { buildPreBattleLaunchLinkage } from '@/components/gameplay/pages/preBattle/preBattleLaunchLinkage';
import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { readyCanonicalCatalog } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { scanReplayDirectory } from '@/replay-library/backfill-scan';
import { readReplayIndex } from '@/replay-library/index-reader';
import { createContract } from '@/types/campaign/Mission';
import {
  EncounterStatus,
  TerrainPreset,
} from '@/types/encounter/EncounterInterfaces';
import {
  ForceType,
  ForceStatus,
  ForcePosition,
  type IForce,
} from '@/types/force';
import {
  GameSide,
  Facing,
  MovementType,
  LockState,
  type IGameEvent,
} from '@/types/gameplay';

import { ReplayRow } from '../ReplayLibraryList';
import ReplayLibraryPage from '../ReplayLibraryPage';

jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/quickgame/QuickGameReplayPanel', () => ({
  QuickGameReplayPanel: () => <div>Replay content</div>,
}));
const originalFetch = globalThis.fetch;

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));
const mockAdapt = jest.mocked(adaptUnit);
function force(id: string, bv: number): IForce {
  return {
    id,
    name: id,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: [
      {
        id,
        unitId: 'locust-lct-1v',
        pilotId: null,
        position: ForcePosition.Member,
        slot: 1,
      },
    ],
    stats: {
      totalBV: bv,
      totalTonnage: 20,
      assignedPilots: 0,
      assignedUnits: 1,
      emptySlots: 0,
      averageSkill: null,
    },
    createdAt: '',
    updatedAt: '',
  };
}
function adapted(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: 10,
    heatSinkType: 'single',
    armor: { center_torso: 20 },
    structure: { center_torso: 10 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    hasRetreated: false,
    hasEjected: false,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  jest.clearAllMocks();
});
it.each(['encounter', 'mission'] as const)(
  '%s production builders preserve real BV and encounter classification',
  async (kind) => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'encounter-bv-'));
    try {
      mockAdapt.mockImplementation(async (id, options) =>
        adapted(id, options?.side ?? GameSide.Player),
      );
      const playerForce = force('player', 432),
        opponentForce = force('opponent', 765);
      if (kind === 'mission') {
        let forceIndex = 0;
        const fetchImpl: typeof fetch = async (input, init) => {
          const url = String(input);
          let payload: unknown = { success: true };
          if (url === '/api/forces' && init?.method === 'POST') {
            const created = [playerForce, opponentForce][forceIndex++];
            payload = { success: true, id: created.id, force: created };
          } else if (url === '/api/encounters' && init?.method === 'POST')
            payload = { success: true, id: 'encounter-bv' };
          return {
            ok: true,
            status: 200,
            json: async () => payload,
          } as Response;
        };
        const mission = createContract({
          id: 'mission',
          name: 'Mission',
          employerId: 'davion',
          targetId: 'liao',
        });
        const result = await materializeCampaignMissionEncounter({
          campaign: {
            id: 'campaign',
            name: 'Campaign',
            missions: new Map([['mission', mission]]),
          },
          missionId: 'mission',
          rosterUnits: [
            {
              unitId: 'unit',
              unitName: 'Locust',
              chassisVariant: 'LCT-1V',
              pilotId: undefined,
              unitRef: 'locust-lct-1v',
              readiness: 'Ready',
            },
          ],
          catalog: readyCanonicalCatalog(['locust-lct-1v']),
          fetchImpl,
        });
        expect(result.encounterId).toBe('encounter-bv');
      }

      const encounter = {
        id: 'encounter-bv',
        name: 'BV battle',
        status: EncounterStatus.Ready,
        playerForce: {
          forceId: playerForce.id,
          forceName: playerForce.name,
          totalBV: 432,
          unitCount: 1,
        },
        opponentForce: {
          forceId: opponentForce.id,
          forceName: opponentForce.name,
          totalBV: 765,
          unitCount: 1,
        },
        mapConfig: {
          radius: 3,
          terrain: TerrainPreset.Clear,
          playerDeploymentZone: 'south' as const,
          opponentDeploymentZone: 'north' as const,
        },
        victoryConditions: [],
        optionalRules: [],
        createdAt: '',
        updatedAt: '',
        ...(kind === 'mission'
          ? {
              campaignMeta: {
                campaignId: 'campaign',
                contractId: 'mission',
                scenarioId: 'scenario',
              },
            }
          : {}),
      };
      const linkage = buildPreBattleLaunchLinkage({ encounter });
      const prepared = await buildPreparedBattleData({
        playerForce,
        opponentForce,
        pilots: [],
      });
      expect(prepared.gameUnits.every((unit) => !('bv' in unit))).toBe(true);
      const engine = new GameEngine({ seed: 42, mapRadius: 3, turnLimit: 1 });
      for (const session of [
        engine
          .createInteractiveSession(
            prepared.playerAdapted,
            prepared.opponentAdapted,
            prepared.gameUnits,
            linkage,
          )
          .getSession(),
        engine.runToCompletion(
          prepared.playerAdapted,
          prepared.opponentAdapted,
          prepared.gameUnits,
          linkage,
        ),
      ]) {
        const body = buildEncounterPersistBody(session);
        const result = await persistEncounterGame({
          ...body,
          templateType: null,
          cwd,
        });
        expect(result.manifestEntry?.bvTotal).toBe(1197);
        const entries = await readReplayIndex({ cwd });
        const row = entries.find((entry) => entry.id === session.id)!;
        expect(row.replaySource).toBe('encounter');
        render(<ReplayRow entry={row} onWatch={() => undefined} />);
        expect(screen.getByTestId('replay-bv-total')).toHaveTextContent('1197');
        expect(screen.getByTestId('replay-source')).toHaveTextContent(
          'encounter',
        );
        cleanup();
        const scanned = await scanReplayDirectory({ cwd });
        expect(scanned.find((entry) => entry.id === session.id)).toMatchObject({
          replaySource: 'encounter',
          bvTotal: 1197,
        });
        const events = (await readFile(result.path!, 'utf8'))
          .split('\n')
          .map((line) => JSON.parse(line) as IGameEvent);
        expect(
          events.every((event) => event.replaySource === 'encounter'),
        ).toBe(true);
        globalThis.fetch = jest.fn(
          async (input) =>
            ({
              ok: true,
              json: async () =>
                String(input) === '/api/replay-library'
                  ? { entries: [row], total: 1 }
                  : { events },
            }) as Response,
        );
        render(<ReplayLibraryPage />);
        await screen.findByTestId(`replay-row-${session.id}`);
        fireEvent.click(screen.getByTestId('source-filter-encounter'));
        expect(
          screen.getByTestId(`replay-row-${session.id}`),
        ).toBeInTheDocument();
        fireEvent.click(screen.getByTestId(`replay-watch-${session.id}`));
        expect(
          await screen.findByText(`Watching ${session.id} (encounter)`),
        ).toBeInTheDocument();
        cleanup();
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
);
