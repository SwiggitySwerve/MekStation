/**
 * Campaign event scope stamping (design D3 / task 3.1).
 *
 * Pins: the closed-vocabulary guard; exhaustive default classification;
 * every intent-derived event carrying a scope; digest protection of
 * scope inside the journal envelope; freeze/no-mutator immutability;
 * and the QC sweep failing a deliberately unstamped snippet while
 * passing the real tree.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D3)
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

import type {
  CampaignEventScope,
  CampaignIntentKind,
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import {
  CAMPAIGN_EVENT_TYPES,
  createEmptyCampaignState,
  isCampaignEventScope,
} from '@/types/campaign/CampaignSync';

import {
  CAMPAIGN_EVENT_DEFAULT_SCOPE,
  assertCampaignEventScopeTableCompleteness,
  freezeCampaignEvent,
  resolveCampaignEventScope,
} from '../campaignEventScope';
import {
  appendCampaignCommandBatch,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

const CAMPAIGN_ID = 'campaign-scope';
const NOW = '3025-01-03T00:00:00.000Z';
const QC_SCRIPT = path.resolve(
  process.cwd(),
  'scripts/qc/validate-campaign-event-scope-stamping.mjs',
);
const QC_FIXTURE_DIR = path.resolve(
  process.cwd(),
  'scripts/qc/__fixtures__/campaign-event-scope',
);

function ledgerState(): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    balance: 1_000_000,
    salvagePool: 50_000,
    factionStanding: { steiner: 1 },
  };
}

describe('isCampaignEventScope', () => {
  it('accepts the four closed-vocabulary forms', () => {
    expect(isCampaignEventScope('gm')).toBe(true);
    expect(isCampaignEventScope('campaign')).toBe(true);
    expect(isCampaignEventScope('team:alpha')).toBe(true);
    expect(isCampaignEventScope('player:pid-host')).toBe(true);
  });

  it('rejects empty team/player ids, unknown prefixes, non-strings, and objects', () => {
    expect(isCampaignEventScope('team:')).toBe(false);
    expect(isCampaignEventScope('player:')).toBe(false);
    expect(isCampaignEventScope('team: ')).toBe(false);
    expect(isCampaignEventScope('player:  ')).toBe(false);
    expect(isCampaignEventScope('gm:hidden')).toBe(false);
    expect(isCampaignEventScope('lance:alpha')).toBe(false);
    expect(isCampaignEventScope('Campaign')).toBe(false);
    expect(isCampaignEventScope(1)).toBe(false);
    expect(isCampaignEventScope(null)).toBe(false);
    expect(isCampaignEventScope(undefined)).toBe(false);
    expect(isCampaignEventScope({ scope: 'gm' })).toBe(false);
  });
});

describe('CAMPAIGN_EVENT_DEFAULT_SCOPE completeness', () => {
  it('names every CampaignEventType exactly once', () => {
    expect(() => assertCampaignEventScopeTableCompleteness()).not.toThrow();
    expect(Object.keys(CAMPAIGN_EVENT_DEFAULT_SCOPE).sort()).toEqual(
      [...CAMPAIGN_EVENT_TYPES].sort(),
    );
    expect(CAMPAIGN_EVENT_TYPES).toHaveLength(7);
  });

  it('rejects a partial table at runtime', () => {
    const partial: Record<string, CampaignEventScope> = {
      CampaignDayAdvanced: 'campaign',
    };
    expect(() => assertCampaignEventScopeTableCompleteness(partial)).toThrow(
      /missing=\[FundsChanged/,
    );
  });

  it('defaults every current ledger type to campaign and honors overrides', () => {
    for (const type of CAMPAIGN_EVENT_TYPES) {
      expect(resolveCampaignEventScope(type)).toBe('campaign');
    }
    expect(resolveCampaignEventScope('FundsChanged', 'gm')).toBe('gm');
    expect(resolveCampaignEventScope('PilotHired', 'team:lance-1')).toBe(
      'team:lance-1',
    );
  });
});

describe('validateCampaignIntent stamps scope on every derived event', () => {
  const intents: readonly ICampaignIntent[] = [
    {
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'i-spend',
      payload: { amount: 10, reason: 'ammo' },
    },
    {
      kind: 'HirePilot',
      campaignId: CAMPAIGN_ID,
      intentId: 'i-hire',
      payload: { pilot: { pilotId: 'p1', name: 'Natasha' }, cost: 20 },
    },
    {
      kind: 'AcceptContract',
      campaignId: CAMPAIGN_ID,
      intentId: 'i-contract',
      payload: {
        contract: {
          contractId: 'c1',
          name: 'Raid',
          employerFactionId: 'steiner',
        },
      },
    },
    {
      kind: 'AllocateSalvage',
      campaignId: CAMPAIGN_ID,
      intentId: 'i-salvage',
      payload: { value: 5 },
    },
    {
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'i-day',
      payload: {},
    },
  ];

  it('covers every intent kind that produces events', () => {
    const kinds = new Set(intents.map((intent) => intent.kind));
    const expected: CampaignIntentKind[] = [
      'HirePilot',
      'AcceptContract',
      'SpendFunds',
      'AllocateSalvage',
      'AdvanceDay',
    ];
    expect(Array.from(kinds).sort()).toEqual([...expected].sort());
  });

  it('stamps a valid scope on every derived event', () => {
    const state = ledgerState();
    const derived = intents.flatMap((intent) => {
      const result = validateCampaignIntent(intent, state, 'pid-host', NOW);
      expect(result.ok).toBe(true);
      return result.ok ? result.events : [];
    });
    expect(derived.length).toBeGreaterThanOrEqual(intents.length);
    for (const event of derived) {
      expect(isCampaignEventScope(event.scope)).toBe(true);
      expect(event.scope).toBe(CAMPAIGN_EVENT_DEFAULT_SCOPE[event.type]);
    }
  });
});

describe('scope is inside journal canonical bytes', () => {
  it('two otherwise-identical events differing only in scope digest differently', async () => {
    const shared = {
      sequence: 0 as const,
      campaignId: CAMPAIGN_ID,
      ts: NOW,
      authorPlayerId: 'pid-host',
      type: 'FundsChanged' as const,
      payload: { delta: -1, reason: 'repair', balance: 1 },
    };
    const campaignScoped = freezeCampaignEvent({
      ...shared,
      scope: 'campaign' as const,
    });
    const gmScoped = freezeCampaignEvent({
      ...shared,
      scope: 'gm' as const,
    });
    const commandId = 'cmd-scope-digest';

    async function appendAndRead(event: ICampaignEvent<'FundsChanged'>) {
      const journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(
        () => NOW,
      );
      const result = await appendCampaignCommandBatch(journal, {
        campaignId: CAMPAIGN_ID,
        commandId,
        events: [event],
        expectedPostStateDigest: null,
      });
      expect(result.kind).toBe('committed');
      const rows = await journal.readStream({
        streamType: 'campaign',
        streamId: CAMPAIGN_ID,
        branchId: 'root',
        afterRevision: 0,
        limit: 2,
      });
      expect(rows).toHaveLength(1);
      const stored = rows[0];
      if (stored === undefined)
        throw new Error('expected a stored journal row');
      return stored;
    }

    const [controlA, controlB, campaignRow, gmRow] = await Promise.all([
      appendAndRead(campaignScoped),
      appendAndRead(campaignScoped),
      appendAndRead(campaignScoped),
      appendAndRead(gmScoped),
    ]);

    // Isolated journals, pinned clock, identical command identity: the
    // same envelope (including scope) is byte-stable, and changing only
    // scope changes the digest.
    expect(controlA.eventId).toBe(controlB.eventId);
    expect(controlA.eventDigest).toBe(controlB.eventDigest);
    expect(campaignRow.eventId).toBe(gmRow.eventId);
    expect(campaignRow.payload.campaignEvent.scope).toBe('campaign');
    expect(gmRow.payload.campaignEvent.scope).toBe('gm');
    expect(campaignRow.eventDigest).not.toBe(gmRow.eventDigest);
    expect(campaignRow.eventDigest).toBe(controlA.eventDigest);
  });
});

describe('emitted events are immutable at scope', () => {
  it('freezes the derived event and has no exported scope rewriter', () => {
    const result = validateCampaignIntent(
      {
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: 'i-day',
        payload: {},
      },
      ledgerState(),
      'pid-host',
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const event = result.events[0];
    expect(Object.isFrozen(event)).toBe(true);
    expect(() => {
      (event as { scope: CampaignEventScope }).scope = 'gm';
    }).toThrow();

    const scopeExports = [
      'CAMPAIGN_EVENT_DEFAULT_SCOPE',
      'assertCampaignEventScopeTableCompleteness',
      'freezeCampaignEvent',
      'resolveCampaignEventScope',
    ];
    expect(
      scopeExports.filter((name) => /set|rewrite|mutate/i.test(name)),
    ).toEqual([]);
  });
});

describe('QC sweep script', () => {
  it('fails a deliberately unstamped fixture and passes the real tree', () => {
    const failRun = spawnSync(
      process.execPath,
      [QC_SCRIPT, `--scan-root=${QC_FIXTURE_DIR}`, '--skip-self-check'],
      { encoding: 'utf8' },
    );
    expect(failRun.status).not.toBe(0);
    expect(failRun.stderr + failRun.stdout).toMatch(/UNSTAMPED/);
    expect(failRun.stderr + failRun.stdout).toMatch(/FundsChanged/);

    const passRun = spawnSync(process.execPath, [QC_SCRIPT], {
      encoding: 'utf8',
    });
    expect(passRun.status).toBe(0);
    expect(passRun.stdout).toMatch(/QC campaign-event-scope: pass/);
    expect(passRun.stdout).toMatch(/construction sites: [1-9]/);
  });
});
