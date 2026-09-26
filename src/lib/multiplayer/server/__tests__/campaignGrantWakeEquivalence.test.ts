/**
 * U98 equivalence row: what a room-code guest's live grant session delivers
 * is byte-identical to a fresh full projection of the host log.
 *
 * The U89 harness setup (real SQLite on a temp file, a journal-native
 * campaign, the co-op host in the shared registry, the GM and a guest bound
 * as server.js binds them, the guest by room code). The live session's
 * delivery pages are captured where they reach the replica
 * (SQLiteCampaignReplicaStore.ingest, the replica offset removed). After
 * each step the captured items must serialise exactly as the items a fresh
 * projectCampaignStreamForGrant (no kept position, a null cursor, an adapter
 * over the whole host log) returns after the join cursor, and the replica's
 * last delivery sequence must be the last of them. The steps: a batch of
 * 600 events committed at once (a read of it crosses the 500-row page
 * boundary), a checkpoint adoption through the host PUT, a participant
 * removal committed with a gm-scoped fact the guest may not see, and a
 * second adoption.
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { UnsequencedCampaignEvent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';

import {
  createJournalNative,
  useTempCampaignDatabase,
} from '@/__tests__/api/campaigns/campaignJournalEffectsFixture';
import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import { ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET } from '@/lib/campaign/coop/roomCodeGuestHydration';
import {
  canonicalizeCampaignJson,
  foldCampaignGrantDeliveryItems,
} from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import { projectCampaignStreamForGrant } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import { SQLiteCampaignReplicaStore } from '@/lib/campaign/replica/SQLiteCampaignReplicaStore';
import { createHostCampaignEventJournal } from '@/lib/campaign/sync/hostCampaignEventJournal';
import { mintVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  createCampaignGrantChannelDepsFromSqlite,
  createCampaignReplicaStoreFromSqlite,
} from '@/lib/multiplayer/server/campaignGrantChannelDeps';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  GUEST,
  HOST,
  MATCH_ID,
  ROOM,
  clearMeasurement,
  hostPut,
  joined,
  seed,
} from './campaignHostIntentServerTime.test-helpers';

/** Resolves once `read()` answered the same value for 500 ms (20 ms polls), or after 20 s. */
async function quiet(read: () => Promise<number>): Promise<void> {
  const deadline = Date.now() + 20_000;
  let last = await read();
  let stable = 0;
  while (stable < 25 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const value = await read();
    stable = value === last ? stable + 1 : 0;
    last = value;
  }
}

/** `size` FundsChanged events of +1/-1 from `balance`. */
function fundsBatch(
  campaignId: string,
  balance: number,
  size: number,
): UnsequencedCampaignEvent[] {
  return Array.from({ length: size }, (_, index) => ({
    type: 'FundsChanged' as const,
    campaignId,
    authorPlayerId: HOST,
    ts: nowIso(),
    scope: 'campaign' as const,
    payload: {
      delta: index % 2 === 0 ? 1 : -1,
      reason: 'u98 batch',
      balance: balance + (index % 2 === 0 ? 1 : 0),
    },
  }));
}

describe('U98 grant wake: the live session equals a fresh full projection', () => {
  useTempCampaignDatabase('u98-grant-equivalence-');

  afterEach(() => {
    clearMeasurement();
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  it('after a 600-event batch, an adoption, a removal and a second adoption', async () => {
    const id = 'u98-equivalence';
    const { record } = await createJournalNative(id);
    const entry = await getCampaignHostRegistry().register(MATCH_ID, {
      campaignId: id,
      hostPlayerId: HOST,
      roomCode: ROOM,
      state: authoritativeStateFromSerializedCampaign(record),
    });
    await seed(entry, 20);
    await joined(HOST, 'host');
    await joined(GUEST, 'guest');

    const channel = createCampaignGrantChannelDepsFromSqlite({
      clock: nowIso,
      nowMs: () => Date.parse(nowIso()),
      nowIso,
    });
    const grant = channel.projectDeps.grantStore
      .listGrants(id)
      .find((row) => row.participantId === GUEST);
    if (grant === undefined) throw new Error('no guest grant');
    const replica = createCampaignReplicaStoreFromSqlite(nowIso);
    const lastReplicaSequence = async (): Promise<number> =>
      (await replica.readReplicaState(id, grant.grantId)).lastDeliverySequence;
    await quiet(lastReplicaSequence);
    const joinSequence =
      (await lastReplicaSequence()) - ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET;

    const captured: ICampaignGrantDeliveryItem[] = [];
    const origIngest = SQLiteCampaignReplicaStore.prototype.ingest;
    jest
      .spyOn(SQLiteCampaignReplicaStore.prototype, 'ingest')
      .mockImplementation(function (this: SQLiteCampaignReplicaStore, ...args) {
        for (const item of args[2].items) {
          captured.push({
            ...item,
            deliverySequence:
              item.deliverySequence - ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET,
          });
        }
        return origIngest.apply(this, args);
      });

    // The reference: no kept position, a null cursor, the whole host log.
    const fullDeps = {
      ...channel.projectDeps,
      journal: createHostCampaignEventJournal(id, () =>
        entry.host.getEventLog().getCampaignEvents(0),
      ),
    };
    const steps: Record<string, unknown>[] = [];
    const compare = async (step: string): Promise<void> => {
      await quiet(lastReplicaSequence);
      const full = await projectCampaignStreamForGrant(fullDeps, {
        principal: mintVerifiedPrincipal(GUEST),
        grantId: grant.grantId,
        cursor: null,
      });
      if (full.kind !== 'page') throw new Error(full.kind);
      const expected = full.items.filter(
        (item) => item.deliverySequence > joinSequence,
      );
      const read = await replica.readReplicaState(id, grant.grantId);
      const last = read.lastDeliverySequence;
      steps.push({
        step,
        delivered: captured.length,
        expected: expected.length,
        lastReplicaSequence: last,
      });
      expect({ step, items: JSON.stringify(captured) }).toEqual({
        step,
        items: JSON.stringify(expected),
      });
      // The guest's durable campaign state against the full fold.
      expect({
        step,
        state: canonicalizeCampaignJson(read.state),
      }).toEqual({
        step,
        state: canonicalizeCampaignJson(
          foldCampaignGrantDeliveryItems(id, full.items),
        ),
      });
      expect(last).toBe(
        (expected.at(-1)?.deliverySequence ?? joinSequence) +
          ROOM_CODE_GUEST_REPLICA_SEQUENCE_OFFSET,
      );
    };

    await entry.host._commitEventsForTests(
      fundsBatch(id, entry.host.getState().balance, 600),
    );
    await compare('batch of 600');

    expect((await hostPut(id)).putStatus).toBe(200);
    await compare('checkpoint adoption');

    await entry.host._commitEventsForTests([
      {
        type: 'ParticipantRemoved',
        campaignId: id,
        authorPlayerId: HOST,
        ts: nowIso(),
        scope: 'campaign',
        payload: { participantId: 'pid_removed', reason: 'u98 removal' },
      },
      {
        type: 'SalvageAllocated',
        campaignId: id,
        authorPlayerId: HOST,
        ts: nowIso(),
        scope: 'gm',
        payload: {
          value: 0,
          poolRemaining: entry.host.getState().salvagePool,
        },
      },
    ]);
    await compare('participant removal');

    expect((await hostPut(id)).putStatus).toBe(200);
    await compare('second checkpoint adoption');

    // Recorded for the receipt when the rows directory is set.
    if (process.env.U98_EQUIVALENCE_OUT) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        process.env.U98_EQUIVALENCE_OUT,
        JSON.stringify({ joinSequence, steps }, null, 2),
      );
    }
    expect(captured.length).toBeGreaterThan(600);
  }, 120_000);
});
