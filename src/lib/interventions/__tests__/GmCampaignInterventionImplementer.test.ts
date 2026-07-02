import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type {
  GmCampaignInterventionDomain,
  IGmAuthorityContext,
  IGmCampaignInterventionCommandPayload,
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
  IInterventionLedgerCommand,
  IInterventionLedgerRecord,
} from '@/types/interventions';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { createCampaign } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';
import { DamageLevel, type ISalvageAllocation } from '@/types/campaign/Salvage';
import { TransactionType } from '@/types/campaign/Transaction';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import { ActionLedger } from '../ActionLedger';
import {
  applyGmCampaignProjectedEffects,
  approveGmCascadePreview,
  createGmCascadePreview,
  projectCampaignEffectsForRecord,
  projectInterventionRecordForPlayer,
  registerGmCampaignInterventionImplementers,
} from '../index';
import { InterventionLedger } from '../InterventionLedger';

type CampaignRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCampaignPublicEffect,
  IGmCampaignInterventionDomainPayload
>;

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  campaignId: 'campaign-1',
  ownedStateRefs: ['campaign:campaign-1'],
};

function makeState(): IGmCampaignInterventionState {
  const campaign = createCampaign('Wave 8 Test Campaign', 'mercenary');
  return {
    ...campaign,
    id: 'campaign-1',
    currentDate: new Date('3025-02-01T00:00:00.000Z'),
    finances: {
      balance: new Money(1_000_000),
      transactions: [],
    },
    repairQueue: [makeRepairTicket()],
    salvageAllocations: {
      'match-1': makeSalvageAllocation({ processed: false }),
    },
    partsInventory: [makeInventoryItem({ quantity: 3 })],
    unitCombatStates: {
      'unit-1': makeCombatState({ combatReady: false }),
    },
    unitConfigurations: {
      'unit-1': makeConfig({ jumpMP: 0 }),
    },
    gmInterventionEvents: [],
  };
}

function makeLedger(): InterventionLedger<IGmCampaignInterventionState> {
  return registerGmCampaignInterventionImplementers(
    new InterventionLedger<IGmCampaignInterventionState>(),
  );
}

function makeCommand(
  domain: GmCampaignInterventionDomain,
  payload: IGmCampaignInterventionCommandPayload,
  overrides: Partial<
    IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload>
  > = {},
): IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload> {
  return {
    domain,
    kind: 'fix',
    actorId: 'gm-1',
    targetRefs: [`campaign:campaign-1:${payload.correction.family}`],
    payload,
    causedBy: ['player-action-1'],
    ...overrides,
  };
}

function payload(
  correction: IGmCampaignInterventionCommandPayload['correction'],
  publicSummary?: string,
  overrides: Partial<IGmCampaignInterventionCommandPayload> = {},
): IGmCampaignInterventionCommandPayload {
  return {
    correction,
    publicSummary,
    privateMetadata: {
      reason: 'Hidden campaign correction reason.',
      defaultOutcome: 'The campaign state would remain as originally resolved.',
      hiddenNotes: 'Secret employer clause stays private.',
    },
    ...overrides,
  };
}

function approveCommand(
  command: IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload>,
  state = makeState(),
  actionLedger?: ActionLedger,
): {
  readonly state: IGmCampaignInterventionState;
  readonly record: CampaignRecord;
} {
  const ledger = makeLedger();
  const preview = createGmCascadePreview({
    ledger,
    command,
    state,
    authority: gmAuthority,
    interventionId: `gm-int-${command.domain}-${command.payload?.correction.family}`,
  });

  const result = approveGmCascadePreview({
    ledger,
    actionLedger,
    preview,
    state,
    createdAt: '2026-06-22T00:00:00.000Z',
    approvedAt: '2026-06-22T00:01:00.000Z',
  });

  expect(result.status).toBe('approved');
  if (result.status !== 'approved' || !result.record) {
    throw new Error('Expected campaign GM intervention approval.');
  }

  return {
    state: result.state as IGmCampaignInterventionState,
    record: result.record as CampaignRecord,
  };
}

describe('GM campaign intervention implementer', () => {
  it('registers campaign domains and leaves time deferred', () => {
    const ledger = makeLedger();
    const state = makeState();

    const economyPreview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        'economy',
        payload({
          family: 'funds-transaction',
          transactionId: 'gm-economy-1',
          amountCents: 250_000,
          description: 'Reverse duplicated merchant charge.',
          transactionType: TransactionType.PartPurchase,
          date: '3025-02-02T00:00:00.000Z',
        }),
      ),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-economy-ready',
    });
    const timePreview = createGmCascadePreview({
      ledger,
      command: {
        domain: 'time',
        kind: 'fix',
        actorId: 'gm-1',
        targetRefs: ['campaign:campaign-1:currentDate'],
      },
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-deferred',
    });

    expect(economyPreview.status).toBe('ready');
    expect(timePreview).toMatchObject({
      status: 'deferred',
      domain: 'time',
      projectedEvents: [],
    });
  });

  it('previews and applies salvage allocation corrections with player-safe output', () => {
    const result = approveCommand(
      makeCommand(
        'salvage',
        payload(
          {
            family: 'salvage-allocation',
            matchId: 'match-1',
            patch: {
              processed: true,
            },
          },
          'Salvage allocation for match-1 corrected.',
        ),
      ),
    );
    const playerRecord = projectInterventionRecordForPlayer(result.record);

    expect(result.state.salvageAllocations?.['match-1'].processed).toBe(true);
    expect(result.state.gmInterventionEvents).toHaveLength(1);
    expect(playerRecord.publicEffect).toMatchObject({
      summary: 'Salvage allocation for match-1 corrected.',
      family: 'salvage-allocation',
      changedStateRefs: [
        'campaign:campaign-1:salvageAllocations',
        'campaign:campaign-1:salvageAllocations:match-1',
      ],
    });
    expect(JSON.stringify(playerRecord)).not.toContain('Hidden campaign');
    expect(JSON.stringify(playerRecord)).not.toContain('Secret employer');
  });

  it('previews and applies repair ticket corrections', () => {
    const result = approveCommand(
      makeCommand(
        'repair',
        payload({
          family: 'repair-ticket',
          ticketId: 'ticket-1',
          patch: {
            status: 'completed',
            remainingHours: 0,
          },
        }),
      ),
    );

    expect(result.state.repairQueue?.[0]).toMatchObject({
      ticketId: 'ticket-1',
      status: 'completed',
      remainingHours: 0,
    });
    expect(result.record.publicEffect.changedStateRefs).toContain(
      'campaign:campaign-1:repairQueue:ticket-1',
    );
  });

  it('applies funds corrections through the intervention and action ledgers', () => {
    const actionLedger = new ActionLedger();
    actionLedger.appendNormalAction({
      id: 'player-action-1',
      actorId: 'player-1',
      domain: 'economy',
      action: 'buy-part',
      targetRefs: ['campaign:campaign-1:partsInventory:inventory-1'],
      publicEffect: {
        summary: 'Player bought a part.',
        changedStateRefs: ['campaign:campaign-1:finances'],
      },
      createdAt: '2026-06-22T00:00:00.000Z',
    });

    const state = makeState();
    const result = approveCommand(
      makeCommand(
        'economy',
        payload(
          {
            family: 'funds-transaction',
            transactionId: 'merchant-reversal-1',
            amountCents: 250_000,
            description: 'Reverse duplicated merchant charge.',
            transactionType: TransactionType.PartPurchase,
            date: '3025-02-02T00:00:00.000Z',
          },
          'Merchant charge corrected by +2,500.00 C-bills.',
        ),
      ),
      state,
      actionLedger,
    );
    const replayed = applyGmCampaignProjectedEffects(
      state,
      projectCampaignEffectsForRecord(result.record),
    );
    const playerProjection = actionLedger.projectForPlayer();
    const gmProjection = actionLedger.projectForGm();

    expect(result.state.finances.balance.centsValue).toBe(100_250_000);
    expect(result.state.finances.transactions).toHaveLength(1);
    expect(result.state.finances.transactions[0]).toMatchObject({
      id: 'merchant-reversal-1',
      type: TransactionType.PartPurchase,
      description: 'Reverse duplicated merchant charge.',
    });
    expect(result.state.finances.transactions[0].amount.centsValue).toBe(
      250_000,
    );
    expect(replayed).toEqual(result.state);
    expect(playerProjection.map((record) => record.id)).toEqual([
      'player-action-1',
      'action:gm-int-economy-funds-transaction',
    ]);
    expect(JSON.stringify(playerProjection)).not.toContain('Hidden campaign');
    expect(JSON.stringify(gmProjection)).toContain('Hidden campaign');
  });

  it('previews and applies inventory and base unit state corrections', () => {
    const state = makeState();
    const inventoryResult = approveCommand(
      makeCommand(
        'economy',
        payload({
          family: 'inventory-lot',
          inventoryId: 'inventory-1',
          quantityDelta: -1,
        }),
      ),
      state,
    );
    const baseStateResult = approveCommand(
      makeCommand(
        'post-combat',
        payload({
          family: 'base-unit-state',
          unitId: 'unit-1',
          combatStatePatch: {
            combatReady: true,
            lastUpdated: '3025-02-02T00:00:00.000Z',
          },
          configurationPatch: {
            jumpMP: 3,
          },
        }),
      ),
      inventoryResult.state,
    );

    expect(inventoryResult.state.partsInventory?.[0]).toMatchObject({
      inventoryId: 'inventory-1',
      quantity: 2,
    });
    expect(baseStateResult.state.unitCombatStates['unit-1']).toMatchObject({
      combatReady: true,
      lastUpdated: '3025-02-02T00:00:00.000Z',
    });
    expect(baseStateResult.state.unitConfigurations?.['unit-1'].jumpMP).toBe(3);
  });

  it('requires manual takeover for unresolved campaign cascades and blocks approval', () => {
    const ledger = makeLedger();
    const actionLedger = new ActionLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        'economy',
        payload(
          {
            family: 'inventory-lot',
            inventoryId: 'inventory-1',
            quantityDelta: -2,
          },
          undefined,
          {
            conflicts: [
              {
                code: 'merchant-cascade-ambiguous',
                message:
                  'Merchant reversal also affects a hidden contract option.',
                affectedRefs: ['campaign:campaign-1:finances'],
                requiresManualTakeover: true,
              },
            ],
          },
        ),
      ),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-manual-economy',
    });
    const result = approveGmCascadePreview({
      ledger,
      actionLedger,
      preview,
      state,
    });

    expect(preview.status).toBe('requires-manual-takeover');
    expect(preview.conflicts[0]).toMatchObject({
      code: 'merchant-cascade-ambiguous',
      requiresManualTakeover: true,
    });
    expect(result).toMatchObject({
      status: 'blocked',
      state,
      appended: false,
    });
    expect(ledger.getRecords()).toEqual([]);
    expect(actionLedger.getRecords()).toEqual([]);
  });

  it('blocks missing campaign targets before approval', () => {
    const ledger = makeLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        'repair',
        payload({
          family: 'repair-ticket',
          ticketId: 'missing-ticket',
          patch: {
            status: 'completed',
          },
        }),
      ),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-missing-ticket',
    });

    expect(preview.status).toBe('blocked');
    expect(preview.conflicts).toContainEqual(
      expect.objectContaining({
        code: 'campaign-repair-ticket-not-found',
      }),
    );
  });

  it('rejects non-GM campaign corrections without returning private metadata', () => {
    const ledger = makeLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        'salvage',
        payload({
          family: 'salvage-allocation',
          matchId: 'match-1',
          patch: {
            processed: true,
          },
        }),
      ),
      state,
      authority: {
        ...gmAuthority,
        actorId: 'player-1',
        role: 'player',
      },
      interventionId: 'gm-int-rejected',
    });

    expect(preview).toMatchObject({
      status: 'rejected',
      reason: 'Intervention actor does not match the authority context actor.',
    });
    expect(JSON.stringify(preview)).not.toContain('Hidden campaign');
    expect(JSON.stringify(preview)).not.toContain('Secret employer');
  });

  it.each([
    [
      'salvage',
      payload({
        family: 'salvage-allocation',
        matchId: 'match-1',
        patch: {
          processed: true,
        },
      }),
    ],
    [
      'repair',
      payload({
        family: 'repair-ticket',
        ticketId: 'ticket-1',
        patch: {
          status: 'completed',
          remainingHours: 0,
        },
      }),
    ],
    [
      'economy',
      payload({
        family: 'inventory-lot',
        inventoryId: 'inventory-1',
        quantityDelta: -1,
      }),
    ],
    [
      'post-combat',
      payload({
        family: 'base-unit-state',
        unitId: 'unit-1',
        combatStatePatch: {
          combatReady: true,
        },
      }),
    ],
  ] as const)(
    'replays projected effects for %s corrections',
    (domain, body) => {
      const state = makeState();
      const result = approveCommand(makeCommand(domain, body), state);
      const replayed = applyGmCampaignProjectedEffects(
        state,
        projectCampaignEffectsForRecord(result.record),
      );

      expect(replayed).toEqual(result.state);
      expect(replayed.gmInterventionEvents).toHaveLength(1);
    },
  );
});

function makeSalvageAllocation(
  overrides: Partial<ISalvageAllocation> = {},
): ISalvageAllocation {
  const candidate = {
    source: 'part' as const,
    unitId: 'enemy-1',
    designation: 'Medium Laser',
    destroyedFromBattle: 'match-1',
    finalStatus: 'destroyed' as const,
    damageLevel: DamageLevel.Moderate,
    originalValue: 40_000,
    recoveredValue: 20_000,
    recoveryPercentage: 0.5,
    repairCostEstimate: 2_000,
    partId: 'medium-laser',
    location: 'RA',
    disposition: 'mercenary' as const,
    status: 'awarded' as const,
  };

  return {
    pool: {
      battleId: 'match-1',
      contractId: 'contract-1',
      candidates: [candidate],
      totalEstimatedValue: 20_000,
      hostileTerritory: false,
    },
    employerAward: {
      side: 'employer',
      candidates: [],
      totalValue: 0,
      estimatedRepairCost: 0,
    },
    mercenaryAward: {
      side: 'mercenary',
      candidates: [candidate],
      totalValue: 20_000,
      estimatedRepairCost: 2_000,
    },
    splitMethod: 'contract',
    processed: false,
    ...overrides,
  };
}

function makeRepairTicket(
  overrides: Partial<IRepairTicket> = {},
): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-1',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 8,
    expectedHours: 4,
    remainingHours: 4,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: '3025-02-01T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

function makeInventoryItem(
  overrides: Partial<IPartsInventoryItem> = {},
): IPartsInventoryItem {
  return {
    inventoryId: 'inventory-1',
    partId: 'medium-laser',
    partName: 'Medium Laser',
    quantity: 1,
    source: 'salvage',
    acquiredAt: '3025-02-01T00:00:00.000Z',
    unitId: 'enemy-1',
    location: 'RA',
    ...overrides,
  };
}

function makeCombatState(
  overrides: Partial<IUnitCombatState> = {},
): IUnitCombatState {
  return {
    unitId: 'unit-1',
    currentArmorPerLocation: {
      CT: 20,
      RA: 8,
    },
    currentStructurePerLocation: {
      CT: 10,
      RA: 0,
    },
    destroyedLocations: ['RA'],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    combatReady: true,
    lastCombatOutcomeId: 'match-1',
    lastUpdated: '3025-02-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeConfig(overrides: Partial<MechBuildConfig> = {}): MechBuildConfig {
  return {
    tonnage: 55,
    engineRating: 275,
    engineType: EngineType.STANDARD,
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.STANDARD,
    armorType: ArmorTypeEnum.STANDARD,
    totalArmorPoints: 168,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    totalHeatSinks: 10,
    jumpMP: 0,
    ...overrides,
  };
}
