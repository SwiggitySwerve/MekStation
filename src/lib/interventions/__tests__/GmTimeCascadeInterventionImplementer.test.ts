import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';
import type {
  IGmAuthorityContext,
  IGmPrivateMetadata,
  IGmTimeCascadeInterventionCommandPayload,
  IGmTimeCascadeInterventionDomainPayload,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadePublicEffect,
  IInterventionLedgerCommand,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import { createCampaign } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';

import { ActionLedger } from '../ActionLedger';
import {
  applyGmTimeCascadeProjectedEffects,
  approveGmCascadePreview,
  createGmCascadePreview,
  projectInterventionRecordForGm,
  projectInterventionRecordForPlayer,
  projectTimeCascadeEffectsForRecord,
  registerGmTimeCascadeInterventionImplementer,
} from '../index';
import { InterventionLedger } from '../InterventionLedger';

type TimeCascadeCommand =
  IInterventionLedgerCommand<IGmTimeCascadeInterventionCommandPayload>;

type TimeCascadeRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmTimeCascadePublicEffect,
  IGmTimeCascadeInterventionDomainPayload
>;

const BASE_UPDATED_AT = '2026-06-22T00:00:00.000Z';
const BASE_CURRENT_DATE = '3025-02-02T00:00:00.000Z';
const GENERATED_AT = '2026-06-22T00:05:00.000Z';

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  campaignId: 'campaign-1',
  ownedStateRefs: ['campaign:campaign-1'],
};

function makeState(
  overrides: Partial<IGmTimeCascadeInterventionState> = {},
): IGmTimeCascadeInterventionState {
  const campaign = createCampaign('Wave 9 Test Campaign', 'mercenary', {
    useRoleBasedSalaries: true,
  });

  return {
    ...campaign,
    id: 'campaign-1',
    currentDate: new Date(BASE_CURRENT_DATE),
    currentSystemId: 'terra',
    updatedAt: BASE_UPDATED_AT,
    finances: {
      balance: new Money(1_000_000),
      transactions: [],
    },
    repairQueue: [makeRepairTicket({ remainingHours: 16 })],
    unitCombatStates: {
      'unit-1': makeCombatState(),
    },
    unitMaxStates: {
      'unit-1': makeUnitMaxState(),
    },
    partsInventory: [],
    timeCascadeEvents: [],
    ...overrides,
  };
}

function makeLedger(): InterventionLedger<IGmTimeCascadeInterventionState> {
  return registerGmTimeCascadeInterventionImplementer(
    new InterventionLedger<IGmTimeCascadeInterventionState>(),
  );
}

function makePayload(
  correction: Partial<
    IGmTimeCascadeInterventionCommandPayload['correction']
  > = {},
  overrides: Partial<IGmTimeCascadeInterventionCommandPayload> = {},
): IGmTimeCascadeInterventionCommandPayload {
  return {
    correction: {
      family: 'time-advance',
      days: 1,
      baseUpdatedAt: BASE_UPDATED_AT,
      baseCurrentDate: BASE_CURRENT_DATE,
      generatedAt: GENERATED_AT,
      ...correction,
    },
    publicSummary: overrides.publicSummary,
    privateMetadata: {
      reason: 'Hidden time correction reason.',
      defaultOutcome: 'The campaign would remain on the original date.',
      hiddenNotes: 'Secret contract timing branch stays private.',
    },
    visibleToPlayerIds: overrides.visibleToPlayerIds,
    conflicts: overrides.conflicts,
  };
}

function makeCommand(
  payload: IGmTimeCascadeInterventionCommandPayload,
  overrides: Partial<TimeCascadeCommand> = {},
): TimeCascadeCommand {
  return {
    domain: 'time',
    kind: 'fix',
    actorId: 'gm-1',
    targetRefs: ['campaign:campaign-1:currentDate'],
    payload,
    causedBy: ['player-action-1'],
    ...overrides,
  };
}

function approveCommand(input: {
  readonly command: TimeCascadeCommand;
  readonly state?: IGmTimeCascadeInterventionState;
  readonly actionLedger?: ActionLedger;
  readonly interventionId?: string;
}): {
  readonly state: IGmTimeCascadeInterventionState;
  readonly record: TimeCascadeRecord;
} {
  const state = input.state ?? makeState();
  const ledger = makeLedger();
  const preview = createGmCascadePreview({
    ledger,
    command: input.command,
    state,
    authority: gmAuthority,
    interventionId: input.interventionId ?? 'gm-int-time-advance',
  });

  const result = approveGmCascadePreview({
    ledger,
    actionLedger: input.actionLedger,
    preview,
    state,
    createdAt: GENERATED_AT,
    approvedAt: '2026-06-22T00:06:00.000Z',
  });

  expect(result.status).toBe('approved');
  if (result.status !== 'approved' || !result.record) {
    throw new Error('Expected time cascade GM intervention approval.');
  }

  return {
    state: result.state as IGmTimeCascadeInterventionState,
    record: result.record as TimeCascadeRecord,
  };
}

describe('GM time cascade intervention implementer', () => {
  it('previews and applies one day without mutating the source campaign', () => {
    const state = makeState();
    const ledger = makeLedger();
    const command = makeCommand(makePayload());

    const preview = createGmCascadePreview({
      ledger,
      command,
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-preview',
    });
    const result = approveGmCascadePreview({
      ledger,
      preview,
      state,
      createdAt: GENERATED_AT,
      approvedAt: '2026-06-22T00:06:00.000Z',
    });

    expect(preview).toMatchObject({
      status: 'ready',
      domain: 'time',
      affectedStateRefs: [
        'campaign:campaign-1:currentDate',
        'campaign:campaign-1:repairQueue',
      ],
      publicEffect: {
        family: 'time-advance',
        days: 1,
        fromDate: BASE_CURRENT_DATE,
        toDate: '3025-02-03T00:00:00.000Z',
      },
    });
    expect(preview.projectedEvents).toHaveLength(1);
    expect(state.currentDate.toISOString()).toBe(BASE_CURRENT_DATE);
    expect(state.repairQueue?.[0].remainingHours).toBe(16);

    expect(result.status).toBe('approved');
    expect(result.state.currentDate.toISOString()).toBe(
      '3025-02-03T00:00:00.000Z',
    );
    expect(result.state.repairQueue?.[0]).toMatchObject({
      ticketId: 'ticket-1',
      status: 'in-progress',
      remainingHours: 8,
    });
    expect(result.state.timeCascadeEvents).toHaveLength(1);
  });

  it('replays stored projected effects for multi-day repair completion', () => {
    const state = makeState();
    const command = makeCommand(makePayload({ days: 2 }));
    const approved = approveCommand({
      command,
      state,
      interventionId: 'gm-int-time-two-days',
    });
    const effects = projectTimeCascadeEffectsForRecord(approved.record);
    const replayed = applyGmTimeCascadeProjectedEffects(state, effects);

    expect(approved.state.currentDate.toISOString()).toBe(
      '3025-02-04T00:00:00.000Z',
    );
    expect(approved.state.repairQueue?.[0]).toMatchObject({
      ticketId: 'ticket-1',
      status: 'completed',
      remainingHours: 0,
    });
    expect(approved.state.unitCombatStates['unit-1']).toMatchObject({
      currentArmorPerLocation: {
        CT: 28,
      },
      lastUpdated: '3025-02-03T00:00:00.000Z',
    });
    expect(effects[0]).toMatchObject({
      interventionId: 'gm-int-time-two-days',
      daySummaries: [
        {
          dayIndex: 1,
          eventTypes: ['repair_progress'],
        },
        {
          dayIndex: 2,
          eventTypes: ['repair_completed'],
        },
      ],
    });
    expect(replayed.currentDate.toISOString()).toBe(
      approved.state.currentDate.toISOString(),
    );
    expect(replayed.repairQueue).toEqual(approved.state.repairQueue);
    expect(replayed.timeCascadeEvents).toHaveLength(1);
  });

  it('stores repeated cascades without recursively nesting prior event history', () => {
    const first = approveCommand({
      command: makeCommand(makePayload({ days: 1 })),
      state: makeState(),
      interventionId: 'gm-int-time-first-day',
    });
    const second = approveCommand({
      command: makeCommand(
        makePayload({
          days: 1,
          baseUpdatedAt: first.state.updatedAt,
          baseCurrentDate: first.state.currentDate.toISOString(),
          generatedAt: '2026-06-22T00:10:00.000Z',
        }),
      ),
      state: first.state,
      interventionId: 'gm-int-time-second-day',
    });

    const events = second.state.timeCascadeEvents ?? [];
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.interventionId)).toEqual([
      'gm-int-time-first-day',
      'gm-int-time-second-day',
    ]);
    for (const event of events) {
      expect(
        Object.prototype.hasOwnProperty.call(
          event.afterCampaign,
          'timeCascadeEvents',
        ),
      ).toBe(false);
    }

    const firstEventBytes = JSON.stringify(
      first.state.timeCascadeEvents,
    ).length;
    const secondEventBytes = JSON.stringify(events).length;
    expect(JSON.stringify(events)).not.toContain('"timeCascadeEvents":');
    expect(secondEventBytes).toBeLessThan(firstEventBytes * 2.5);
  });

  it('records action-ledger projections while redacting GM-private context', () => {
    const actionLedger = new ActionLedger();
    actionLedger.appendNormalAction({
      id: 'player-action-1',
      actorId: 'player-1',
      domain: 'campaign',
      action: 'advance-time-request',
      targetRefs: ['campaign:campaign-1:currentDate'],
      publicEffect: { summary: 'Player requested campaign time advance.' },
      createdAt: '2026-06-22T00:04:00.000Z',
    });

    const approved = approveCommand({
      command: makeCommand(
        makePayload(
          { days: 1 },
          { publicSummary: 'Campaign date corrected by one day.' },
        ),
      ),
      actionLedger,
    });
    const playerRecord = projectInterventionRecordForPlayer(approved.record);
    const gmRecord = projectInterventionRecordForGm(approved.record);
    const playerActions = actionLedger.projectForPlayer();
    const gmActions = actionLedger.projectForGm();

    expect(playerRecord.publicEffect).toMatchObject({
      summary: 'Campaign date corrected by one day.',
      days: 1,
      toDate: '3025-02-03T00:00:00.000Z',
    });
    expect(gmRecord.privateMetadata).toMatchObject({
      reason: 'Hidden time correction reason.',
    });
    expect(playerActions).toHaveLength(2);
    expect(playerActions[1]).toMatchObject({
      recordKind: 'gm-intervention',
      interventionRecordId: approved.record.id,
      publicEffect: {
        summary: 'Campaign date corrected by one day.',
      },
    });
    expect(gmActions[1]).toMatchObject({
      privateMetadata: {
        hiddenNotes: 'Secret contract timing branch stays private.',
      },
    });
    expect(JSON.stringify(playerRecord)).not.toContain('Hidden time');
    expect(JSON.stringify(playerRecord)).not.toContain('Secret contract');
    expect(JSON.stringify(playerActions)).not.toContain('Secret contract');
  });

  it('supports optional travel in the same projected cascade', () => {
    const approved = approveCommand({
      command: makeCommand(makePayload({ destinationSystemId: 'new-avalon' })),
      interventionId: 'gm-int-time-travel',
    });

    expect(approved.state.currentSystemId).toBe('new-avalon');
    expect(approved.state.currentDate.toISOString()).toBe(
      '3025-02-03T00:00:00.000Z',
    );
    expect(approved.record.publicEffect).toMatchObject({
      fromSystemId: 'terra',
      toSystemId: 'new-avalon',
    });
    expect(approved.record.domainPayload?.projectedEffects[0]).toMatchObject({
      before: {
        currentSystemId: 'terra',
      },
      after: {
        currentSystemId: 'new-avalon',
      },
    });
  });

  it('blocks invalid day counts before approval', () => {
    const state = makeState();
    const ledger = makeLedger();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(makePayload({ days: 0 })),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-invalid-days',
    });
    const result = approveGmCascadePreview({ ledger, preview, state });

    expect(preview).toMatchObject({
      status: 'blocked',
      conflicts: [
        {
          code: 'time-cascade-days-invalid',
          affectedRefs: ['campaign:campaign-1:currentDate'],
        },
      ],
    });
    expect(result).toMatchObject({
      status: 'blocked',
      appended: false,
      state,
    });
    expect(ledger.getRecords()).toEqual([]);
  });

  it('blocks stale base campaign versions', () => {
    const state = makeState();
    const ledger = makeLedger();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        makePayload({ baseUpdatedAt: '2026-06-21T00:00:00.000Z' }),
      ),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-stale-version',
    });

    expect(preview).toMatchObject({
      status: 'blocked',
      conflicts: [
        {
          code: 'time-cascade-base-stale',
          affectedRefs: [
            'campaign:campaign-1',
            'campaign:campaign-1:updatedAt',
          ],
        },
      ],
    });
  });

  it('blocks approval when campaign state changes after preview creation', () => {
    const state = makeState();
    const ledger = makeLedger();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(makePayload()),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-stale-approval',
    });
    const changedState = {
      ...state,
      updatedAt: '2026-06-22T00:30:00.000Z',
    };
    const result = approveGmCascadePreview({
      ledger,
      preview,
      state: changedState,
    });

    expect(preview.status).toBe('ready');
    expect(result).toMatchObject({
      status: 'blocked',
      appended: false,
      state: changedState,
      reason:
        'Cannot approve GM cascade preview from a stale campaign version.',
    });
    expect(ledger.getRecords()).toEqual([]);
  });

  it('blocks unknown travel destinations', () => {
    const state = makeState();
    const ledger = makeLedger();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        makePayload({ destinationSystemId: 'does-not-exist' }),
      ),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-unknown-destination',
    });

    expect(preview).toMatchObject({
      status: 'blocked',
      conflicts: [
        {
          code: 'time-cascade-destination-unknown',
          affectedRefs: ['campaign:campaign-1:currentSystemId'],
        },
      ],
    });
  });

  it('requires manual takeover when external effects are named but not projected', () => {
    const state = makeState();
    const ledger = makeLedger();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(
        makePayload({
          externalEffectRefs: ['roster:pilot-1:fatigue'],
        }),
      ),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-external-manual',
    });
    const result = approveGmCascadePreview({ ledger, preview, state });

    expect(preview).toMatchObject({
      status: 'requires-manual-takeover',
      conflicts: [
        {
          code: 'time-cascade-external-effect-unprojected',
          affectedRefs: ['roster:pilot-1:fatigue'],
          requiresManualTakeover: true,
        },
      ],
    });
    expect(result).toMatchObject({
      status: 'blocked',
      appended: false,
      state,
    });
  });

  it('approves external effects once the cascade includes their projection', () => {
    const approved = approveCommand({
      command: makeCommand(
        makePayload({
          externalEffectRefs: ['roster:pilot-1:fatigue'],
          projectedExternalEffects: [
            {
              ref: 'roster:pilot-1:fatigue',
              summary: 'Pilot fatigue advanced one day.',
              before: { daysRested: 0 },
              after: { daysRested: 1 },
            },
          ],
        }),
      ),
      interventionId: 'gm-int-time-external-projected',
    });

    expect(approved.record.publicEffect.changedStateRefs).toContain(
      'roster:pilot-1:fatigue',
    );
    expect(approved.record.domainPayload?.projectedEffects[0]).toMatchObject({
      externalEffects: [
        {
          ref: 'roster:pilot-1:fatigue',
          summary: 'Pilot fatigue advanced one day.',
        },
      ],
    });
    expect(approved.state.timeCascadeEvents?.[0]).toMatchObject({
      externalEffects: [
        {
          ref: 'roster:pilot-1:fatigue',
        },
      ],
    });
  });
});

function makeRepairTicket(
  overrides: Partial<IRepairTicket> = {},
): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-1',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 8,
    expectedHours: 16,
    remainingHours: 16,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: BASE_CURRENT_DATE,
    status: 'queued',
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
    },
    currentStructurePerLocation: {
      CT: 10,
    },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    combatReady: true,
    lastCombatOutcomeId: 'match-1',
    lastUpdated: BASE_CURRENT_DATE,
    ...overrides,
  };
}

function makeUnitMaxState(): IUnitMaxState {
  return {
    unitId: 'unit-1',
    maxArmorPerLocation: {
      CT: 28,
    },
    maxStructurePerLocation: {
      CT: 10,
    },
    maxAmmoPerBin: {},
  };
}
