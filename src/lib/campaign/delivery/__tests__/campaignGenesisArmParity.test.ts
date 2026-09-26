/**
 * The baseline law: two arms, one committed stream, one answer
 * (umbrella 12.1, OD-umbrella-12-1-slice).
 *
 * The legacy session projects a joining viewer's baseline through
 * `projectCampaignForViewer`; the grant channel projects a grant's
 * stream through `projectCampaignStreamForGrant` and folds its scoped
 * snapshot from that. Both decide whether a stored full-state
 * `CampaignSnapshotPublished` may reach a restricted viewer, and the
 * two used to decide it differently: the legacy arm by ORDER (folded
 * while nothing withheld precedes it), the grant arm by a BLANKET rule
 * (never, genesis included). The same player got two different opening
 * ledgers, and the legacy arm folded an imported migration baseline -
 * an existing campaign's whole state - into a player's baseline.
 *
 * These rows drive the real arms over the same committed stream and
 * pin the one law both take from `campaignBaselineReachesViewer`: a
 * migration-authored baseline never reaches a restricted viewer, a
 * genesis baseline does while nothing withheld precedes it, and a viewer
 * entitled to every scope receives either.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { campaignViewerStateDigest } from '@/lib/campaign/sync/campaignViewerProjection';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import {
  createEmptyCampaignState,
  type ICampaignAuthoritativeState,
} from '@/types/campaign/CampaignSync';

import type { ICampaignEventStore } from '../../sync/ICampaignEventStore';

import { createGmGrantScopes } from '../../grants/campaignGrantGuards';
import { buildScopedCampaignSnapshot } from '../buildScopedCampaignSnapshot';
import { projectCampaignStreamForGrant } from '../projectCampaignStreamForGrant';
import {
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
} from './grantProjectionHarness';

const CAMPAIGN_ID = 'campaign-genesis-arm-parity';
const GM_ID = 'gm-player';
const OPENING_BALANCE = 500_000;
/** Present only in the genesis ledger - the marker the arms differ on. */
const OPENING_PILOT_ID = 'pilot-in-the-opening-ledger';
/** Present only in the imported (migration) baseline's whole state. */
const IMPORTED_PILOT_ID = 'pilot-in-the-imported-campaign';
const NOW_ISO = '2026-08-22T16:45:00.000Z';

/** The shared opening ledger both arms start their campaign from. */
function openingState(): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    balance: OPENING_BALANCE,
    pilots: {
      [OPENING_PILOT_ID]: { pilotId: OPENING_PILOT_ID, name: 'Founder' },
    },
  };
}

/** An existing campaign's whole state, as an import carries it. */
function importedState(): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    balance: 777_000,
    pilots: {
      [IMPORTED_PILOT_ID]: { pilotId: IMPORTED_PILOT_ID, name: 'Imported' },
    },
  };
}

/**
 * Joins `participantId` on the legacy arm - a real host and session over
 * `eventStore` - and returns the baseline frame it was handed. With an
 * empty store the host's `open` mints the genesis row from
 * `initialState`; over a populated store it keeps the stream it finds.
 * `commitAfterOpen` commits one shared and one gm-scoped fact first.
 */
async function legacyArmBaseline(
  eventStore: ICampaignEventStore,
  participantId: string,
  commitAfterOpen: boolean,
): Promise<ICampaignEvent<'CampaignSnapshotPublished'>> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: GM_ID,
    eventStore,
    initialState: openingState(),
  });
  const session = new CampaignSyncSession(host);
  const roomCode = await session.open();
  if (commitAfterOpen) {
    await host._commitEventsForTests([
      {
        type: 'FundsChanged',
        campaignId: CAMPAIGN_ID,
        ts: NOW_ISO,
        authorPlayerId: GM_ID,
        scope: 'campaign',
        payload: { delta: 0, reason: 'shared-one', balance: 1 },
      },
      {
        type: 'FundsChanged',
        campaignId: CAMPAIGN_ID,
        ts: NOW_ISO,
        authorPlayerId: GM_ID,
        scope: 'gm',
        payload: { delta: 0, reason: 'withheld-one', balance: 2 },
      },
    ]);
  }

  const seen: ICampaignEvent[] = [];
  const join = await session.joinGuest(
    roomCode,
    (event) => seen.push(event),
    participantId,
  );
  if (!join.ok) throw new Error('legacy arm refused the join');
  const baseline = seen.find(
    (event) => event.type === 'CampaignSnapshotPublished',
  ) as ICampaignEvent<'CampaignSnapshotPublished'> | undefined;
  if (baseline === undefined) throw new Error('legacy arm sent no baseline');
  return baseline;
}

/** The legacy arm over its own genesis stream, for the player. */
async function legacyArmBaselineState(): Promise<ICampaignAuthoritativeState> {
  const baseline = await legacyArmBaseline(
    new InMemoryCampaignEventStore(),
    PARTICIPANT_PLAYER,
    true,
  );
  return baseline.payload.state;
}

describe('genesis baseline across the legacy and grant arms', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  /** The grant arm over the same three committed facts. */
  async function grantArmSnapshotState(): Promise<ICampaignAuthoritativeState> {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendCampaignEvent(harness, {
      type: 'CampaignSnapshotPublished',
      sequence: 0,
      campaignId: CAMPAIGN_ID,
      ts: NOW_ISO,
      authorPlayerId: GM_ID,
      scope: 'campaign',
      payload: { state: openingState() },
    });
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'campaign', 'shared-one'),
    );
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 2, 'gm', 'withheld-one'),
    );
    const built = await buildScopedCampaignSnapshot(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: grant.grantId,
      nowIso: NOW_ISO,
    });
    if (built.kind !== 'snapshot') {
      throw new Error(`grant arm refused the snapshot: ${built.kind}`);
    }
    return built.snapshot.state;
  }

  it('both arms withhold the gm-scoped fact from the same player', async () => {
    // The control. Whatever the arms disagree about, it is NOT the
    // thing scope exists to decide - both withhold `withheld-one`.
    const legacy = await legacyArmBaselineState();
    const grant = await grantArmSnapshotState();
    expect(legacy.balance).not.toBe(2);
    expect(grant.balance).not.toBe(2);
  });

  it('the legacy arm folds the opening ledger into the player baseline', async () => {
    const legacy = await legacyArmBaselineState();
    expect(Object.keys(legacy.pilots)).toContain(OPENING_PILOT_ID);
  });

  it('the grant arm folds the opening ledger into the same player baseline', async () => {
    // A genesis baseline precedes every withhold, so it is a pure
    // function of facts this player may see: the grant arm keeps it
    // rather than starting the player from an empty campaign.
    const grant = await grantArmSnapshotState();
    expect(Object.keys(grant.pilots)).toContain(OPENING_PILOT_ID);
  });

  it('the same player gets the same state digest from both arms', async () => {
    const legacy = await legacyArmBaselineState();
    const grant = await grantArmSnapshotState();
    expect(campaignViewerStateDigest(grant)).toBe(
      campaignViewerStateDigest(legacy),
    );
  });
});

describe('an imported migration baseline across the legacy and grant arms', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  /**
   * Seq 0 is the REAL migration producer's baseline (authorPlayerId
   * 'migration'), followed by one shared fact. Both arms read this one
   * journal: the legacy host through `JournalCampaignEventStore`, the
   * grant projector directly.
   */
  async function importThenShare(): Promise<void> {
    const imported = await importCampaignBaseline(harness.journal, {
      campaignId: CAMPAIGN_ID,
      state: importedState(),
      sourceSnapshotRevision: 3,
      importedAt: NOW_ISO,
    });
    if (imported.kind !== 'imported') {
      throw new Error(`import refused: ${imported.kind}`);
    }
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 1, 'campaign', 'shared-one'),
    );
  }

  /** The grant arm's page and scoped snapshot for one grant, as JSON. */
  async function grantArmWire(
    participantId: string,
    scopes: readonly string[],
  ): Promise<string> {
    const grant = issueTestGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId,
      scopes,
    });
    const page = await projectCampaignStreamForGrant(harness.deps, {
      principal: mintGrantPrincipal(participantId),
      grantId: grant.grantId,
      cursor: null,
    });
    const built = await buildScopedCampaignSnapshot(harness.deps, {
      principal: mintGrantPrincipal(participantId),
      grantId: grant.grantId,
      nowIso: NOW_ISO,
    });
    return JSON.stringify({ page, built });
  }

  it('the migration baseline reaches the restricted player through neither arm', async () => {
    await importThenShare();
    const legacy = await legacyArmBaseline(
      new JournalCampaignEventStore(harness.journal),
      PARTICIPANT_PLAYER,
      false,
    );
    const grantWire = await grantArmWire(PARTICIPANT_PLAYER, ['campaign']);
    expect(JSON.stringify(legacy)).not.toContain(IMPORTED_PILOT_ID);
    expect(grantWire).not.toContain(IMPORTED_PILOT_ID);
  });

  it('the migration baseline still reaches the GM through both arms', async () => {
    // The control: the law restricts restricted viewers, not the
    // authority, who holds every scope and so the whole imported state.
    await importThenShare();
    const legacy = await legacyArmBaseline(
      new JournalCampaignEventStore(harness.journal),
      GM_ID,
      false,
    );
    const grantWire = await grantArmWire(PARTICIPANT_GM, createGmGrantScopes());
    expect(Object.keys(legacy.payload.state.pilots)).toContain(
      IMPORTED_PILOT_ID,
    );
    expect(grantWire).toContain(IMPORTED_PILOT_ID);
  });

  it('a later full-state checkpoint does not reach the restricted player either', async () => {
    // A checkpoint minted after the import is folded from the imported
    // record, so it carries the same material. Nothing gm-scoped
    // precedes it here: only the withheld migration baseline does, so
    // the refusal itself must count as a withhold.
    await importThenShare();
    await appendCampaignEvent(harness, {
      type: 'CampaignSnapshotPublished',
      sequence: 2,
      campaignId: CAMPAIGN_ID,
      ts: NOW_ISO,
      authorPlayerId: 'system',
      scope: 'campaign',
      payload: { state: importedState(), revision: 2 },
    });
    const legacy = await legacyArmBaseline(
      new JournalCampaignEventStore(harness.journal),
      PARTICIPANT_PLAYER,
      false,
    );
    const grantWire = await grantArmWire(PARTICIPANT_PLAYER, ['campaign']);
    expect(JSON.stringify(legacy)).not.toContain(IMPORTED_PILOT_ID);
    expect(grantWire).not.toContain(IMPORTED_PILOT_ID);
  });
});
