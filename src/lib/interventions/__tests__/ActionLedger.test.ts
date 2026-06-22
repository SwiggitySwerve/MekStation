import type {
  IActionLedgerRecord,
  IInterventionLedgerRecord,
  IGmPrivateMetadata,
  IGmPublicEffect,
} from '@/types/interventions';

import { ActionLedger } from '../ActionLedger';

interface TestDomainPayload {
  readonly delta: number;
}

const makeGmInterventionRecord = (): IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmPublicEffect,
  TestDomainPayload
> => ({
  id: 'gm-int-1',
  domain: 'combat',
  kind: 'fix',
  status: 'approved',
  actorId: 'gm-1',
  targetRefs: ['unit:atlas-1'],
  causedBy: ['normal-action-1'],
  supersedes: ['normal-action-1'],
  privateMetadata: {
    reason: 'GM-only damage correction.',
    defaultOutcome: 'The target would remain destroyed.',
    hiddenNotes: 'Hidden objective state stays private.',
    manualTakeoverNotes: 'GM chose the least disruptive repair.',
  },
  publicEffect: {
    summary: 'Atlas damage corrected.',
    changedStateRefs: ['unit:atlas-1', 'armor:center-torso'],
  },
  domainPayload: {
    delta: 4,
  },
  createdAt: '2026-06-22T00:00:00.000Z',
  approvedAt: '2026-06-22T00:01:00.000Z',
});

describe('ActionLedger', () => {
  it('keeps normal actions and approved GM interventions in one append-only order', () => {
    const ledger = new ActionLedger();

    const normal = ledger.appendNormalAction({
      id: 'normal-action-1',
      actorId: 'player-1',
      domain: 'combat',
      action: 'declare-attack',
      targetRefs: ['unit:atlas-1'],
      publicEffect: {
        summary: 'Player declared an attack.',
        changedStateRefs: ['attack:declared'],
      },
      createdAt: '2026-06-22T00:00:00.000Z',
    });
    const gmAction = ledger.appendGmInterventionRecord(
      makeGmInterventionRecord(),
    );

    expect(normal).toMatchObject({
      sequence: 1,
      recordKind: 'normal',
      actorRole: 'player',
      status: 'committed',
    });
    expect(gmAction).toMatchObject({
      sequence: 2,
      recordKind: 'gm-intervention',
      actorRole: 'gm',
      action: 'fix',
      interventionRecordId: 'gm-int-1',
      causedBy: ['normal-action-1'],
      supersedes: ['normal-action-1'],
    });
    expect(ledger.getRecords().map((record) => record.id)).toEqual([
      'normal-action-1',
      'action:gm-int-1',
    ]);
  });

  it('projects player-safe output without GM-private metadata', () => {
    const ledger = new ActionLedger();

    ledger.appendNormalAction({
      id: 'normal-action-1',
      actorId: 'player-1',
      domain: 'combat',
      action: 'move',
      targetRefs: ['unit:atlas-1'],
      publicEffect: {
        summary: 'Atlas moved.',
        changedStateRefs: ['unit:atlas-1'],
      },
      createdAt: '2026-06-22T00:00:00.000Z',
    });
    ledger.appendGmInterventionRecord(makeGmInterventionRecord());

    const playerProjection = ledger.projectForPlayer<IGmPublicEffect>();
    const gmProjection = ledger.projectForGm<
      IGmPublicEffect,
      IGmPrivateMetadata,
      TestDomainPayload
    >();

    expect(playerProjection).toHaveLength(2);
    expect(playerProjection[1]).toMatchObject({
      id: 'action:gm-int-1',
      publicEffect: {
        summary: 'Atlas damage corrected.',
        changedStateRefs: ['unit:atlas-1', 'armor:center-torso'],
      },
    });
    expect(JSON.stringify(playerProjection)).not.toContain(
      'GM-only damage correction',
    );
    expect(JSON.stringify(playerProjection)).not.toContain(
      'Hidden objective state',
    );
    expect(JSON.stringify(playerProjection)).not.toContain(
      'least disruptive repair',
    );

    expect(gmProjection[1].privateMetadata).toMatchObject({
      reason: 'GM-only damage correction.',
      defaultOutcome: 'The target would remain destroyed.',
      hiddenNotes: 'Hidden objective state stays private.',
      manualTakeoverNotes: 'GM chose the least disruptive repair.',
    });
    expect(gmProjection[1].domainPayload).toEqual({
      delta: 4,
    });
  });

  it('returns copies so callers cannot mutate the ledger through record reads', () => {
    const ledger = new ActionLedger();

    ledger.appendSystemAction({
      id: 'system-action-1',
      actorId: 'system',
      domain: 'combat',
      action: 'phase-started',
      targetRefs: ['phase:movement'],
      publicEffect: {
        summary: 'Movement phase started.',
        changedStateRefs: ['phase:movement'],
      },
      createdAt: '2026-06-22T00:00:00.000Z',
    });

    const records = ledger.getRecords() as IActionLedgerRecord[];
    records.pop();

    expect(ledger.getRecords()).toHaveLength(1);
  });
});
