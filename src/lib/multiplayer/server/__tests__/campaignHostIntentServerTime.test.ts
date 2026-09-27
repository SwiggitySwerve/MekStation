/**
 * Server time of a GM command on the campaign host-intent path, by step,
 * at a short and a long campaign log (roadmap unit U89; the UAT round 1
 * diagnosis, mode 2 of F-perf-E2E-71-72-73).
 *
 * Real SQLite on a temp file through the U35e fixture, a journal-native
 * campaign, a co-op host registered in the shared registry (its store is
 * the production selector's journal store with the record rewrite), and the
 * socket binder bound the way server.js binds it: the production membership
 * port, the grant channel and replica left to their SQLite defaults, a GM
 * socket and a guest joined by room code. The log is grown to N events by
 * the host's own commit path before any socket joins.
 *
 * Each measured GM command is one CampaignHostIntent frame (SpendFunds or
 * AdvanceDay); the guest acknowledges each head. Steps are timed by
 * wrapping the functions from the test only (no product instrumentation):
 * the heal read, the gate and commit highest-sequence reads, the gate,
 * appendCommandBatch, the record rewrite inside it, publish, the grant
 * wake's host-log reads and replica ingest after publish, and, for a host
 * PUT through the item route, the adoption's two reads.
 *
 * Sizes come from U89_LOG_SIZES (default 50,1000). Samples and per-step
 * medians are written to <U35E_ROWS_DIR>/u89-server-time-<U89_RUN>.json.
 */

import {
  createJournalNative,
  flushMeasurements,
  useTempCampaignDatabase,
} from '@/__tests__/api/campaigns/campaignJournalEffectsFixture';
import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';

import {
  GUEST,
  HOST,
  MATCH_ID,
  MEASURED,
  PUTS,
  ROOM,
  WARM_UP,
  clearMeasurement,
  command,
  hostPut,
  instrument,
  joined,
  medians,
  seed,
  type Steps,
} from './campaignHostIntentServerTime.test-helpers';

const SIZES = (process.env.U89_LOG_SIZES ?? '50,1000').split(',').map(Number);

const results: Record<string, unknown> = {
  sizes: SIZES,
  run: process.env.U89_RUN ?? null,
};

describe('U89 campaign host-intent server time by step and log size', () => {
  useTempCampaignDatabase('u89-server-time-');

  afterEach(() => {
    clearMeasurement();
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  afterAll(async () => {
    await flushMeasurements(
      `u89-server-time-${process.env.U89_RUN ?? 'local'}`,
      results,
    );
  });

  it.each(SIZES)(
    'times each step of a GM command at a %i-event log',
    async (size) => {
      const id = `u89-log-${size}`;
      const { record } = await createJournalNative(id);
      const entry = await getCampaignHostRegistry().register(MATCH_ID, {
        campaignId: id,
        hostPlayerId: HOST,
        roomCode: ROOM,
        state: authoritativeStateFromSerializedCampaign(record),
      });
      await seed(entry, size);
      const eventsAtStart = (
        await entry.host.getEventLog().getCampaignEvents(0)
      ).length;
      const gm = await joined(HOST, 'host');
      const guest = await joined(GUEST, 'guest');
      instrument(entry);

      let index = 0;
      for (const kind of WARM_UP)
        await command(entry, gm, guest, kind, (index += 1));
      const samples: Steps[] = [];
      for (const kind of MEASURED) {
        samples.push({
          ...(await command(entry, gm, guest, kind, (index += 1))),
          advanceDay: kind === 'AdvanceDay' ? 1 : 0,
        });
      }
      await hostPut(id);
      const puts: Steps[] = [];
      for (let put = 0; put < PUTS; put += 1) puts.push(await hostPut(id));

      results[String(size)] = {
        eventsAtStart,
        eventsAtEnd: (await entry.host.getEventLog().getCampaignEvents(0))
          .length,
        commandMedians: medians(samples),
        spendFundsMedians: medians(
          samples.filter((sample) => sample.advanceDay === 0),
        ),
        advanceDayMedians: medians(
          samples.filter((sample) => sample.advanceDay === 1),
        ),
        putMedians: medians(puts),
        samples,
        puts,
      };

      expect(eventsAtStart).toBe(size);
      expect(samples.every((sample) => sample.refused === 0)).toBe(true);
      expect(
        samples.every((sample) => Number.isFinite(sample.deliverToGuest)),
      ).toBe(true);
      expect(puts.every((put) => put.putStatus === 200)).toBe(true);
    },
    600_000,
  );

  // The red rows. A step grows when its median on the long log exceeds
  // twice its median on the short log AND exceeds a 5 ms floor (so noise on
  // sub-millisecond reads cannot fail it), or when it exceeds 50 ms
  // outright; a missing median grows.
  const [short, long] = [SIZES[0], SIZES[SIZES.length - 1]];
  /** Each [group, step] pair's short and long medians and its verdict. */
  const growth = (pairs: readonly (readonly [string, string])[]) =>
    pairs.map(([group, step]) => {
      const at = (size: number): number | null =>
        (
          results[String(size)] as
            | Record<string, Record<string, number | null>>
            | undefined
        )?.[group]?.[step] ?? null;
      const [a, b] = [at(short), at(long)];
      return {
        step,
        short: a,
        long: b,
        grows: a === null || b === null || (b > 2 * a && b > 5) || b > 50,
      };
    });

  // U89: the reads that fix owns.
  it('the heal read and the highest-sequence reads do not grow with the log', () => {
    const rows = growth([
      ['commandMedians', 'healRead'],
      ['commandMedians', 'gateHighestSequence'],
      ['commandMedians', 'commitHighestSequence'],
      ['putMedians', 'adoptHighestSequence'],
    ]);
    results.redRow = { short, long, rows };
    expect(short).toBeLessThan(long);
    expect(rows.filter((row) => row.grows)).toEqual([]);
  });

  // U98: the grant wake after publish (the adapter's host-log reads, its
  // readStream, the epoch's sequence assignment), the replica ingest, and
  // the GM frame in to the last timed step net of the record rewrite.
  it('the grant wake and the replica ingest do not grow with the log', () => {
    const rows = growth([
      ['commandMedians', 'grantHostLogRead'],
      ['commandMedians', 'grantReadStream'],
      ['commandMedians', 'grantAssignSequences'],
      ['commandMedians', 'replicaIngest'],
      ['commandMedians', 'serverTotalWithoutRecordRewrite'],
    ]);
    results.redRowU98 = { short, long, rows };
    expect(short).toBeLessThan(long);
    expect(rows.filter((row) => row.grows)).toEqual([]);
  });

  it('the record rewrite stays under the absolute 50 ms ceiling', () => {
    const at = (size: number): number | null =>
      (
        results[String(size)] as
          | Record<string, Record<string, number | null>>
          | undefined
      )?.commandMedians?.recordRewrite ?? null;
    const row = {
      step: 'recordRewrite',
      short: at(short),
      long: at(long),
    };
    results.recordRewriteCeiling = { short, long, row };
    expect(short).toBeLessThan(long);
    expect(row.long === null || row.long > 50).toBe(false);
  });
});
