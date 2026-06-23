import type {
  IGmAuthorityContext,
  IGmTimeCascadeInterventionCommandPayload,
  IGmTimeCascadeInterventionState,
  IGmPrivateMetadata,
  IInterventionLedgerCommand,
  InterventionDomain,
} from '@/types/interventions';

import { createCampaign } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';

import type { IGmDeferredInterventionAttemptLog } from '../index';

import {
  approveGmCascadePreview,
  createGmCascadePreview,
  InterventionLedger,
  registerGmTimeCascadeInterventionImplementer,
} from '../index';

interface CampaignBoundaryState {
  readonly finances: {
    readonly cbills: number;
  };
  readonly inventory: readonly string[];
  readonly repairQueue: readonly string[];
  readonly salvage: readonly string[];
  readonly travel: {
    readonly currentSystem: string;
    readonly destinationSystem?: string;
  };
  readonly campaignTime: {
    readonly day: number;
    readonly hoursElapsed: number;
  };
  readonly postCombat: {
    readonly completedScenarioIds: readonly string[];
  };
}

interface DeferredCommandPayload {
  readonly privateMetadata: IGmPrivateMetadata;
}

const deferredDomains = [
  'time',
] as const satisfies readonly InterventionDomain[];

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  campaignId: 'campaign-1',
  ownedStateRefs: ['campaign:campaign-1'],
};

function makeState(): CampaignBoundaryState {
  return {
    finances: {
      cbills: 1200000,
    },
    inventory: ['medium-laser', 'ac20-ammo-ton'],
    repairQueue: ['repair-job-1'],
    salvage: ['salvage-lot-1'],
    travel: {
      currentSystem: 'Galatea',
      destinationSystem: 'Outreach',
    },
    campaignTime: {
      day: 42,
      hoursElapsed: 6,
    },
    postCombat: {
      completedScenarioIds: ['scenario-1'],
    },
  };
}

function makeCommand(
  domain: InterventionDomain,
): IInterventionLedgerCommand<DeferredCommandPayload> {
  return {
    domain,
    kind: domain === 'time' ? 'fix' : 'undo',
    actorId: 'gm-1',
    targetRefs: [`${domain}:root`],
    payload: {
      privateMetadata: {
        reason: 'GM wants to adjust a campaign cascade.',
        defaultOutcome: 'The campaign state would remain unchanged.',
        hiddenNotes: 'secret merchant inventory branch',
      },
    },
  };
}

function makeRegisteredTimeState(): IGmTimeCascadeInterventionState {
  const campaign = createCampaign('Boundary Time Campaign', 'mercenary', {
    useRoleBasedSalaries: true,
  });

  return {
    ...campaign,
    id: 'campaign-1',
    currentDate: new Date('3025-02-02T00:00:00.000Z'),
    updatedAt: '2026-06-22T00:00:00.000Z',
    currentSystemId: 'terra',
    finances: {
      balance: new Money(1_000_000),
      transactions: [],
    },
    timeCascadeEvents: [],
  };
}

function makeRegisteredTimeCommand(): IInterventionLedgerCommand<IGmTimeCascadeInterventionCommandPayload> {
  return {
    domain: 'time',
    kind: 'fix',
    actorId: 'gm-1',
    targetRefs: ['campaign:campaign-1:currentDate'],
    payload: {
      correction: {
        family: 'time-advance',
        days: 1,
        baseUpdatedAt: '2026-06-22T00:00:00.000Z',
        baseCurrentDate: '3025-02-02T00:00:00.000Z',
        generatedAt: '2026-06-22T00:05:00.000Z',
      },
      privateMetadata: {
        reason: 'Hidden time correction reason.',
        defaultOutcome: 'The campaign state would remain unchanged.',
      },
    },
  };
}

describe('GM campaign intervention boundaries', () => {
  it.each(deferredDomains)(
    'defers %s interventions without mutating campaign roots',
    (domain) => {
      const state = makeState();
      const ledger = new InterventionLedger<CampaignBoundaryState>();
      const logs: Array<{
        readonly message: string;
        readonly entry: IGmDeferredInterventionAttemptLog;
      }> = [];

      const preview = createGmCascadePreview({
        ledger,
        command: makeCommand(domain),
        state,
        authority: gmAuthority,
        interventionId: `gm-int-${domain}`,
        emitDeferredLog(message, entry): void {
          logs.push({ message, entry });
        },
      });
      const result = approveGmCascadePreview({
        ledger,
        preview,
        state,
      });

      expect(preview).toMatchObject({
        interventionId: `gm-int-${domain}`,
        status: 'deferred',
        domain,
        targetRefs: [`${domain}:root`],
        affectedStateRefs: [`${domain}:root`],
        projectedEvents: [],
        conflicts: [],
      });
      expect(result).toMatchObject({
        status: 'blocked',
        state,
        appended: false,
      });
      expect(result.state).toBe(state);
      expect(ledger.getRecords()).toEqual([]);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        message: '[gm-intervention:domain-deferred]',
        entry: {
          level: 'warn',
          service: 'gm-intervention',
          event: 'domain-deferred',
          actorId: 'gm-1',
          domain,
          kind: domain === 'time' ? 'fix' : 'undo',
          targetRefs: [`${domain}:root`],
        },
      });
      expect(JSON.stringify(result.state)).toBe(JSON.stringify(makeState()));
    },
  );

  it('logs deferred time attempts without exposing hidden scenario notes', () => {
    const state = makeState();
    const ledger = new InterventionLedger<CampaignBoundaryState>();
    const logs: Array<{
      readonly message: string;
      readonly entry: IGmDeferredInterventionAttemptLog;
    }> = [];

    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand('time'),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-safe-log',
      emitDeferredLog(message, entry): void {
        logs.push({ message, entry });
      },
    });

    expect(preview.status).toBe('deferred');
    expect(JSON.stringify(preview)).not.toContain('secret merchant');
    expect(JSON.stringify(logs)).not.toContain('secret merchant');
    expect(logs[0]?.entry).toMatchObject({
      domain: 'time',
      deferredReason:
        'No intervention ledger implementer registered for domain "time".',
    });
  });

  it('executes time interventions when the time cascade implementer is registered', () => {
    const state = makeRegisteredTimeState();
    const ledger = registerGmTimeCascadeInterventionImplementer(
      new InterventionLedger<IGmTimeCascadeInterventionState>(),
    );

    const preview = createGmCascadePreview({
      ledger,
      command: makeRegisteredTimeCommand(),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-time-registered',
    });
    const result = approveGmCascadePreview({
      ledger,
      preview,
      state,
    });

    expect(preview).toMatchObject({
      status: 'ready',
      domain: 'time',
      affectedStateRefs: ['campaign:campaign-1:currentDate'],
    });
    expect(result.status).toBe('approved');
    expect(result.state.currentDate.toISOString()).toBe(
      '3025-02-03T00:00:00.000Z',
    );
    expect(result.state.timeCascadeEvents).toHaveLength(1);
  });
});
