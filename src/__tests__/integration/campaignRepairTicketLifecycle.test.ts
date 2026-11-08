import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type {
  IGmCampaignInterventionCommandPayload,
  IGmCampaignInterventionState,
  IInterventionLedgerCommand,
} from '@/types/interventions';

import { buildRepairCompletionCommand } from '@/components/campaign/gm/GmCampaignBaseFixCommands';
import { DayPipelineRegistry } from '@/lib/campaign/dayPipeline';
import {
  serializeCampaign,
  deserializeCampaignBody,
} from '@/lib/campaign/persistence/serializeCampaign';
import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';
import { repairProgressProcessor } from '@/lib/campaign/processors/repairProgressProcessor';
import { repairQueueBuilderProcessor } from '@/lib/campaign/processors/repairQueueBuilderProcessor';
import { createGmCampaignInterventionImplementer } from '@/lib/interventions/GmCampaignInterventionImplementer';
import {
  applyGmCampaignProjectedEffects,
  projectCampaignEffectsForRecord,
} from '@/lib/interventions/GmCampaignInterventionProjection';
import { createCampaign } from '@/types/campaign/Campaign';
import { createInitialCombatState } from '@/types/campaign/UnitCombatState';
import {
  CombatEndReason,
  UnitFinalStatus,
  PilotFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

const iso = '3025-03-01T00:00:00.000Z';
const date = new Date(iso);
const unitId = 'unit-alpha';
function ticket(overrides: Partial<IRepairTicket> = {}): IRepairTicket {
  return {
    ticketId: 'ticket-match-1-unit-alpha-armor-CT',
    unitId,
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 6,
    expectedHours: 4,
    partsRequired: [
      { partId: 'standard-armor-pt', quantity: 6, matched: false },
    ],
    source: 'combat',
    matchId: 'match-1',
    createdAt: iso,
    status: 'queued',
    ...overrides,
  };
}
function campaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    ...createCampaign('K7', 'mercenary'),
    id: 'campaign-k7',
    currentDate: date,
    createdAt: iso,
    updatedAt: iso,
    unitCombatStates: {
      [unitId]: {
        ...createInitialCombatState({
          unitId,
          armorPerLocation: { CT: 4 },
          structurePerLocation: { CT: 6 },
        }),
        lastCombatOutcomeId: 'match-1',
      },
    },
    unitMaxStates: {
      [unitId]: {
        unitId,
        maxArmorPerLocation: { CT: 10 },
        maxStructurePerLocation: { CT: 6 },
        maxAmmoPerBin: {},
      },
    },
    partsInventory: [
      {
        inventoryId: 'armor-lot',
        partId: 'standard-armor-pt',
        partName: 'Armor',
        quantity: 20,
        source: 'manual',
        acquiredAt: iso,
      },
    ],
    repairQueue: [ticket()],
    processedBattleIds: ['match-1'],
    ...overrides,
  };
}
function outcome(matchId = 'match-1'): ICombatOutcome {
  return {
    version: 1,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    capturedAt: iso,
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 1,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [
      {
        unitId,
        side: GameSide.Player,
        destroyed: false,
        finalStatus: UnitFinalStatus.Damaged,
        armorRemaining: { CT: 4 },
        internalsRemaining: { CT: 6 },
        destroyedLocations: [],
        destroyedComponents: [],
        heatEnd: 0,
        ammoRemaining: {},
        pilotState: {
          conscious: true,
          wounds: 0,
          killed: false,
          finalStatus: PilotFinalStatus.Active,
        },
      },
    ],
  };
}
function roundTrip(state: ICampaign): ICampaign {
  return deserializeCampaignBody(
    JSON.parse(JSON.stringify(serializeCampaign(state))),
  );
}

describe('campaign repair lifecycle persistence', () => {
  it('loads an old save with many terminal tickets, prunes and saves without replaying repairs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mekstation-k7-'));
    try {
      const path = join(directory, 'campaign.json');
      const old = campaign({
        repairQueue: Array.from({ length: 300 }, (_, i) =>
          ticket({
            ticketId: `old-${i}`,
            matchId: `old-match-${i}`,
            status: i % 2 ? 'completed' : 'cancelled',
          }),
        ),
      });
      writeFileSync(path, JSON.stringify(serializeCampaign(old)));
      const loaded = deserializeCampaignBody(
        JSON.parse(readFileSync(path, 'utf8')),
      );
      const pruned = repairProgressProcessor.process(loaded, date).campaign;
      expect(pruned.repairQueue).toEqual([]);
      expect(pruned.unitCombatStates).toEqual(loaded.unitCombatStates);
      expect(pruned.partsInventory).toEqual(loaded.partsInventory);
      writeFileSync(path, JSON.stringify(serializeCampaign(pruned)));
      const saved = deserializeCampaignBody(
        JSON.parse(readFileSync(path, 'utf8')),
      );
      expect(saved.repairQueue).toEqual([]);
      expect(saved.processedBattleIds).toEqual(['match-1']);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('retains every terminal ticket referenced by pending or recently-applied outcomes', () => {
    const state = campaign({
      repairQueue: [
        ticket({
          ticketId: 'pending',
          status: 'completed',
          matchId: 'pending-match',
        }),
        ticket({
          ticketId: 'recent',
          status: 'cancelled',
          matchId: 'recent-match',
        }),
        ticket({
          ticketId: 'obsolete',
          status: 'completed',
          matchId: 'old-match',
        }),
      ],
      pendingBattleOutcomes: [outcome('pending-match')],
      recentlyAppliedOutcomes: [outcome('recent-match')],
    });
    const pruned = repairProgressProcessor.process(
      roundTrip(state),
      date,
    ).campaign;
    expect(pruned.repairQueue?.map((t) => t.ticketId)).toEqual([
      'pending',
      'recent',
    ]);
  });

  it('reprocessing the same outcome after pruning creates no duplicate tickets or double repair', () => {
    const state = campaign();
    const completed = repairProgressProcessor.process(state, date).campaign;
    const pruned = repairProgressProcessor.process(
      roundTrip(completed),
      date,
    ).campaign;
    expect(pruned.repairQueue).toEqual([]);
    const reapplied = applyPostBattle(outcome(), {
      ...roundTrip(pruned),
      pendingBattleOutcomes: [outcome()],
    }).campaign;
    const rebuilt = repairQueueBuilderProcessor.process(
      reapplied,
      date,
    ).campaign;
    const rerun = repairProgressProcessor.process(rebuilt, date).campaign;
    expect(rerun.repairQueue).toEqual([]);
    expect(rerun.unitCombatStates).toEqual(pruned.unitCombatStates);
    expect(rerun.partsInventory).toEqual(pruned.partsInventory);
    expect(rerun.processedBattleIds).toEqual(['match-1']);
  });

  it('reports completion on day two and prunes on day three without repeating repair or parts consumption', () => {
    const state = campaign({
      repairQueue: [ticket({ expectedHours: 16, remainingHours: 16 })],
    });
    const pipeline = new DayPipelineRegistry();
    pipeline.register(repairProgressProcessor);
    const first = pipeline.processDay(state);
    const second = pipeline.processDay(first.campaign);
    const third = pipeline.processDay(second.campaign);

    expect(first.campaign.repairQueue?.[0]).toMatchObject({
      status: 'in-progress',
      remainingHours: 8,
    });
    expect(first.campaign.partsInventory).toEqual(state.partsInventory);
    expect(second.campaign.repairQueue?.[0]).toMatchObject({
      status: 'completed',
      remainingHours: 0,
    });
    expect(second.campaign.partsInventory?.[0].quantity).toBe(14);
    expect(second.campaign.unitCombatStates[unitId]).toMatchObject({
      currentArmorPerLocation: { CT: 10 },
      lastUpdated: '3025-03-02T00:00:00.000Z',
    });
    expect(third.date.toISOString()).toBe('3025-03-03T00:00:00.000Z');
    expect(third.campaign.repairQueue).toEqual([]);
    expect(third.campaign.unitCombatStates).toEqual(
      second.campaign.unitCombatStates,
    );
    expect(third.campaign.partsInventory).toEqual(
      second.campaign.partsInventory,
    );
    expect(third.campaign.processedBattleIds).toEqual(state.processedBattleIds);
    const completions = [first, second, third].flatMap((report) =>
      report.events.filter((event) => event.type === 'repair_completed'),
    );
    expect(completions).toEqual([
      expect.objectContaining({
        data: { ticketId: state.repairQueue?.[0].ticketId, unitId },
      }),
    ]);
    expect(first.events.map((event) => event.type)).toEqual([
      'repair_progress',
    ]);
    expect(second.events.map((event) => event.type)).toEqual([
      'repair_completed',
    ]);
    expect(third.events).toEqual([]);
    expect(roundTrip(third.campaign).repairQueue).toEqual([]);
  });

  it('GM ledger replay restores units and stock identically across save and reload', () => {
    const before = roundTrip(campaign());
    const command: IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload> =
      buildRepairCompletionCommand({ actorId: 'gm', campaign: before });
    const implementer = createGmCampaignInterventionImplementer('repair');
    const preview = implementer.preview(command, before);
    if (
      preview.status !== 'ready' ||
      !preview.privateMetadata ||
      !preview.publicEffect
    )
      throw new Error('Repair preview must be ready');
    const record = {
      id: 'k7-completion',
      domain: command.domain,
      kind: command.kind,
      status: 'approved' as const,
      actorId: 'gm',
      targetRefs: command.targetRefs,
      createdAt: iso,
      approvedAt: iso,
      privateMetadata: preview.privateMetadata,
      publicEffect: preview.publicEffect,
      domainPayload: preview.domainPayload,
    };
    const approved = implementer.apply(record, before);
    expect(approved.unitCombatStates[unitId].currentArmorPerLocation.CT).toBe(
      10,
    );
    expect(approved.partsInventory?.[0].quantity).toBe(14);
    const saved = roundTrip(approved);
    const storedRecord: typeof record = JSON.parse(JSON.stringify(record));
    const replayed = applyGmCampaignProjectedEffects(
      roundTrip(before),
      projectCampaignEffectsForRecord(storedRecord),
    );
    expect(serializeCampaign(replayed)).toEqual(serializeCampaign(approved));
    expect(serializeCampaign(roundTrip(replayed))).toEqual(
      serializeCampaign(saved),
    );
    expect(replayed).toEqual(saved);
    // A replay of the same absolute effects does not spend parts or repair again.
    expect(
      applyGmCampaignProjectedEffects(
        before,
        projectCampaignEffectsForRecord(storedRecord),
      ),
    ).toEqual(replayed);
  });
});
