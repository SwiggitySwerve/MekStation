/**
 * Two-process scoped convergence and durable source/restart under
 * journal authority (R2.authority-cutover CO3; task 5.7, design D10).
 *
 * The acceptance line this answers: "Real durable source/restart and
 * two-process scoped convergence before cutover acceptance; no E2E-only
 * flag used as production proof."
 *
 * WHY THE E2E ARM IS NOT USED, AND WHAT IS USED INSTEAD.
 * `isCampaignJournalAuthorityEnabled()` ORs the hardcoded-false
 * production constant with an e2e-only arm that requires BOTH
 * `NEXT_PUBLIC_E2E_MODE==='true'` and
 * `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY==='1'` in the same process.
 * That arm is unreachable in a real deployment by construction, so a
 * proof standing on it would demonstrate a branch production can never
 * execute. It is never armed here - asserted twice, structurally (the
 * env this spec hands the process it spawns, and the constant itself)
 * and behaviourally (the create path leaves NO marker, which is only
 * true while the gate is closed).
 *
 * The campaign reaches journal authority instead by writing the durable
 * marker directly against the shared database file -
 * `writeCampaignMigrationMarker(createJournalNativeMarker(id))`, the
 * same call `campaignAuthorityBlocked.test.ts` makes, just against a
 * real file two live servers also hold. The journal STREAM it needs is
 * not manufactured: registering the co-op host already committed a
 * `CampaignSnapshotPublished` baseline through the durable store, so the
 * cutover appends nothing and the head does not move. (The CLI keeps a
 * `appendCampaignGenesis` arm for an unseeded stream - a marker over an
 * empty journal resolves to `blocked`, never `journal` - but this drive
 * asserts which arm ran.)
 *
 * Everything downstream - the seat gate, the authority resolution, the
 * command pipeline, the head read - is the ordinary production path,
 * because none of it can tell how the marker got there. That is the
 * point: `resolveCampaignAuthorityFromStores` reads the durable marker
 * and nothing else, so a campaign cut over by any means routes commands
 * exactly as a genuinely-cutover production campaign would.
 *
 * THE TOPOLOGY, and why it is this one. `/commands` is gated by
 * `isActiveCampaignSeat`, and a campaign with no co-op session has no
 * seats - the #29 single-player boundary, deliberately untouched here.
 * The one shipped path that binds a durable seat is a co-op HOST match
 * creation, where `commitCoopCampaignAuthority` binds the host as GM
 * through the creation checkpoint before the 201. So the campaign is
 * co-op-hosted, exactly as `gmTwoPlayerAuthorityRecovery.ts` drives it -
 * NOT the plain PUT-created campaign of
 * `campaign-two-device-drive.spec.ts`, which has no participants at all
 * and could never clear the seat gate.
 *
 * WHICH PROCESS IS WHICH. The spec-owned process on its own port is the
 * SOURCE - it takes the commands and it is the one restarted, because a
 * spec cannot kill and respawn Playwright's own webServer. Playwright's
 * webServer is the REPLICA READER: it never writes this campaign after
 * creation and only ever answers the read-only `GET /activity`. Both
 * point at ONE database file, which is the deliberate inversion of the
 * two-device drive (that spec gives its second process a separate file,
 * because replication across files is what IT proves).
 *
 * THE CONVERGENCE READ IS `/activity`, NOT `/head`. `/head` resolves the
 * event-history BRANCH record, which a plain journal append never
 * creates - measured here, it answers `no-authoritative-stream` for a
 * campaign whose journal demonstrably holds events. `/activity` is
 * derived from the committed journal and is SCOPED to the caller's
 * durable seat, which is the property the acceptance line names.
 *
 * WHAT IS NOT PROVEN HERE is stated at the bottom of the file rather
 * than left for a reader to infer from a missing assertion.
 *
 * @tags @campaign @multiplayer @two-process @authority
 */

import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  campaignEnvelope,
  hostIdentity,
  postCommand,
  readActivity,
  SEED_BALANCE,
  SPEND_PER_COMMAND,
} from './helpers/campaignJournalDrive';
import {
  cutoverCampaignToJournalAuthority,
  readHighestSequence,
  readMarker,
  resolveServerDatabase,
  restartSourceServer,
  runAuthorityCli,
  sourceServerEnv,
  startSourceServer,
  stopSourceServer,
  type ISourceServer,
} from './helpers/campaignJournalTwoProcess';

/**
 * The e2e opt-in key, spelled here because a spec cannot import the
 * module that defines it: Playwright's babel transform refuses the
 * `declare` class fields in `JournalCampaignEventStore.ts`, which
 * `campaignJournalAuthorityEnabled.ts` imports. The literal is bound to
 * the real constant by the `flags` assertion in the drive below, so a
 * rename cannot leave this string silently guarding nothing.
 */
const E2E_ARM_KEY = 'MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY';

test.describe('campaign journal authority across two processes', () => {
  test.describe.configure({ mode: 'serial' });

  let source: ISourceServer | null = null;
  let multiplayerDir: string | null = null;

  test.afterAll(async () => {
    if (source) await stopSourceServer(source);
    if (multiplayerDir) {
      await rm(multiplayerDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
      }).catch(() => undefined);
    }
  });

  test('a journal-authority campaign converges across two OS processes and survives a source restart', async ({
    request,
    baseURL,
  }) => {
    test.setTimeout(420_000);
    const replicaOrigin =
      baseURL ?? `http://localhost:${process.env.MEKSTATION_E2E_PORT ?? 3600}`;
    const campaignId = `co3-convergence-${Date.now()}`;

    // --- the flag is closed, and it is closed HERE too ----------------
    // Read out of a real Node process that loaded the production
    // modules, not asserted from a comment. `cutoverFlag` is the
    // hardcoded production switch and `effective` is it OR'd with the
    // e2e arm; both false means neither door is open. The env key is
    // returned by the same call, which is what binds the literal above
    // to the constant the module actually exports.
    const flagsBefore = runAuthorityCli('flags');
    expect(flagsBefore.e2eEnvKey).toBe(E2E_ARM_KEY);
    expect(flagsBefore.cutoverFlag).toBe(false);
    expect(flagsBefore.effective).toBe(false);
    // playwright.config.ts forwards the arm to its webServer ONLY when
    // the parent process already carries it, so an absent key here is
    // also an absent key in the replica process.
    expect(process.env[E2E_ARM_KEY]).toBeUndefined();

    // --- create the campaign through the replica process --------------
    const created = await request.put(
      `${replicaOrigin}/api/campaigns/${campaignId}`,
      { data: { envelope: campaignEnvelope(campaignId, 0), baseVersion: 0 } },
    );
    expect(
      created.ok(),
      `create failed: ${created.status()} ${await created.text()}`,
    ).toBe(true);

    // The database is RESOLVED from the row the server just wrote, never
    // assumed: a wrong path opens an empty file and every assertion
    // below would pass for the wrong reason.
    const databasePath = resolveServerDatabase(campaignId);

    // Behavioural proof the gate is closed: the create path calls
    // `maybeAppendCampaignGenesisOnCreate`, which writes a marker ONLY
    // when the gate opens. No marker means the e2e arm did not fire.
    expect(readMarker(databasePath, campaignId)).toBeNull();
    // And the journal has nothing for this campaign: the create path did
    // not append a genesis either, which is the other half of the same
    // closed gate.
    expect(readHighestSequence(databasePath, campaignId)).toBe(-1);

    // --- boot the source process on the SAME database file ------------
    multiplayerDir = await mkdtemp(path.join(tmpdir(), 'mekstation-co3-mp-'));
    const env = sourceServerEnv(
      databasePath,
      path.join(multiplayerDir, 'multiplayer-matches.db'),
      E2E_ARM_KEY,
    );
    // Falsifiable rather than asserted: the arm is absent from the env
    // object actually handed to `spawn`.
    expect(env[E2E_ARM_KEY]).toBeUndefined();
    source = await startSourceServer(request, env);
    expect(source.origin).not.toBe(replicaOrigin);

    // The two processes already share the file: the source sees a
    // campaign it never created.
    const seenOnSource = await request.get(
      `${source.origin}/api/campaigns/${campaignId}`,
    );
    expect(seenOnSource.status()).toBe(200);

    // --- bind the GM seat through a co-op host match ------------------
    const host = await hostIdentity();
    const match = await request.post(
      `${source.origin}/api/multiplayer/matches`,
      {
        headers: { Authorization: `Bearer ${host.wireToken}` },
        data: {
          config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
          displayName: 'CO3 Host',
          layout: '1v1',
          coopCampaign: {
            campaignId,
            arbitrationMode: 'host-review',
            state: {
              campaignId,
              day: 0,
              // The ledger the commands below spend from. The host
              // commits this state as the stream's baseline, so the
              // balance after N spends is an absolute fact about how
              // much history survived.
              balance: SEED_BALANCE,
              rosterUnits: {},
              forceUnits: {},
              pilots: {},
              contracts: {},
              factionStanding: {},
              salvagePool: 0,
            },
          },
        },
      },
    );
    expect(match.status(), await match.text()).toBe(201);
    const matchId = ((await match.json()) as { matchId: string }).matchId;
    // The checkpoint's genesis stage is `skipped` while the gate is
    // closed, so the seat exists and the campaign has NO cutover marker.
    // Both halves matter: the seat is what the command needs, and the
    // absent marker is what keeps this proof flag-free - the create and
    // checkpoint paths are the only two that would have written one, and
    // neither did.
    expect(readMarker(databasePath, campaignId)).toBeNull();

    // Registering the co-op host DID seed the campaign's journal stream:
    // `CampaignMatchHost` commits a `CampaignSnapshotPublished` baseline
    // from its initial state on open, through the durable store. So the
    // stream exists - and the campaign is still NOT on journal
    // authority, because authority is the marker, not the stream.
    const seededSequence = readHighestSequence(databasePath, campaignId);
    expect(seededSequence).toBe(0);

    // Both processes answer the same scoped feed for the same seat,
    // each through its own handle on the shared file.
    const sourceSeeded = await readActivity(
      request,
      source.origin,
      campaignId,
      matchId,
      host.playerId,
    );
    const replicaSeeded = await readActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      host.playerId,
    );
    expect(sourceSeeded.kind).toBe('activity');
    // The seat the checkpoint bound, seen from the process that never
    // created the match.
    expect(replicaSeeded.viewerSeat).toBe('gm');
    expect(replicaSeeded).toEqual(sourceSeeded);
    const seededEntries = sourceSeeded.entries?.length ?? -1;

    // --- control: a command before cutover is refused, not accepted ---
    // Without this row every assertion after the cutover would pass for
    // a route that simply accepts everything from a seated caller.
    const beforeCutover = await postCommand(
      request,
      source.origin,
      campaignId,
      host.wireToken,
      `${campaignId}-cmd-0`,
    );
    expect(beforeCutover.status).toBe(409);
    expect(beforeCutover.body).toMatchObject({
      kind: 'blocked',
      reason: 'campaign-not-on-journal-authority',
    });

    // --- the cutover, with no flag anywhere ---------------------------
    const cutover = cutoverCampaignToJournalAuthority(databasePath, campaignId);
    expect(cutover.marker?.state).toBe('journal');
    expect(cutover.marker?.firstJournalAuthorityCommandId).toBeNull();
    // Which arm ran, stated rather than implied: the stream was already
    // there, so this wrote a marker and appended nothing.
    expect(cutover.path).toBe('marker');
    expect(cutover.highestSequence).toBeGreaterThanOrEqual(0);
    // The cutover ran in a process where both switches were still shut.
    expect(cutover.cutoverFlag).toBe(false);
    expect(cutover.effective).toBe(false);
    expect(cutover.e2eEnvValue).toBeNull();

    // Writing the marker appends NOTHING: the stream is still the one
    // the co-op host seeded, and both processes still answer the same
    // feed. A cutover that moved the head would have fabricated history,
    // which D10 forbids.
    expect(readHighestSequence(databasePath, campaignId)).toBe(seededSequence);
    expect(
      await readActivity(
        request,
        replicaOrigin,
        campaignId,
        matchId,
        host.playerId,
      ),
    ).toEqual(sourceSeeded);

    // --- a real command on the source under journal authority ---------
    const firstCommandId = `${campaignId}-cmd-1`;
    const first = await postCommand(
      request,
      source.origin,
      campaignId,
      host.wireToken,
      firstCommandId,
    );
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.kind).toBe('committed');
    // Replayed from the stream, not echoed from the intent: the baseline
    // the co-op host committed, minus this one spend.
    expect(first.body.state?.balance).toBe(SEED_BALANCE - SPEND_PER_COMMAND);

    // CO0 (#1739) durable effect: the commit reported itself to the
    // cutover marker, which is the field D10's first rollback guard
    // reads. Asserted on the durable row, not on the response.
    const markerAfterFirst = readMarker(databasePath, campaignId);
    expect(markerAfterFirst?.state).toBe('journal');
    expect(markerAfterFirst?.firstJournalAuthorityCommandId).toBe(
      firstCommandId,
    );

    // --- scoped convergence: the replica sees it, and it is a process -
    // The replica has no live connection to the source's application
    // state; it shares only the file, and it answered `seededEntries` a
    // moment ago. One more entry here, on the SAME seat, is the
    // committed command reaching it through the durable record and
    // nothing else.
    const replicaAfterFirst = await readActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      host.playerId,
    );
    expect(replicaAfterFirst.entries?.length).toBe(seededEntries + 1);
    expect(replicaAfterFirst).toEqual(
      await readActivity(
        request,
        source.origin,
        campaignId,
        matchId,
        host.playerId,
      ),
    );
    expect(readHighestSequence(databasePath, campaignId)).toBe(
      seededSequence + 1,
    );

    // --- OS-level restart of the source -------------------------------
    const activityBeforeRestart = await readActivity(
      request,
      source.origin,
      campaignId,
      matchId,
      host.playerId,
    );
    const sequenceBeforeRestart = readHighestSequence(databasePath, campaignId);
    const priorPid = source.pid;
    source = await restartSourceServer(request, source, env);
    // The restart is a different OS process, not a reused one. Without
    // this the rows below would hold for a spec that never restarted
    // anything.
    expect(source.pid).not.toBe(priorPid);

    // The journal and the marker survived the restart: same head, same
    // recorded first command, still journal authority.
    expect(readHighestSequence(databasePath, campaignId)).toBe(
      sequenceBeforeRestart,
    );
    expect(
      await readActivity(
        request,
        source.origin,
        campaignId,
        matchId,
        host.playerId,
      ),
    ).toEqual(activityBeforeRestart);
    const markerAfterRestart = readMarker(databasePath, campaignId);
    expect(markerAfterRestart?.state).toBe('journal');
    expect(markerAfterRestart?.firstJournalAuthorityCommandId).toBe(
      firstCommandId,
    );

    // --- the restarted source continues the SAME history --------------
    // The balance is the assertion that separates survival from a fresh
    // log: a restarted process that began a new stream would replay ONE
    // spend and answer 200 with the wrong ledger, looking healthy while
    // having lost the campaign.
    const second = await postCommand(
      request,
      source.origin,
      campaignId,
      host.wireToken,
      `${campaignId}-cmd-2`,
    );
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body.kind).toBe('committed');
    expect(second.body.state?.balance).toBe(
      SEED_BALANCE - 2 * SPEND_PER_COMMAND,
    );

    // The marker still records the FIRST command, not this one: the
    // field is provenance, not a cursor.
    expect(
      readMarker(databasePath, campaignId)?.firstJournalAuthorityCommandId,
    ).toBe(firstCommandId);

    // --- the replica catches up after the restart ---------------------
    const replicaAfterRestart = await readActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      host.playerId,
    );
    expect(replicaAfterRestart.entries?.length).toBe(seededEntries + 2);
    expect(replicaAfterRestart).toEqual(
      await readActivity(
        request,
        source.origin,
        campaignId,
        matchId,
        host.playerId,
      ),
    );

    // --- the gate stayed closed for the whole drive -------------------
    const flagsAfter = runAuthorityCli('flags');
    expect(flagsAfter.cutoverFlag).toBe(false);
    expect(flagsAfter.effective).toBe(false);
    expect(process.env[E2E_ARM_KEY]).toBeUndefined();
    expect(env[E2E_ARM_KEY]).toBeUndefined();
  });
});

/*
 * NOT DRIVEN HERE, deliberately:
 *
 * - The production cutover flag. `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED`
 *   stays false; no campaign is born journal-native by this drive.
 * - The single-player command path. `/commands` refuses a campaign with
 *   no seats, which is the #29 boundary and not a gap this proof papers
 *   over - the campaign here is genuinely co-op-hosted.
 * - The shadow-parity route to `journal`. The campaign is cut over
 *   directly on genesis, matching D10's journal-native state; the
 *   `legacy -> shadowing -> journal` parity gate is a separate row.
 * - Rollback refusal after a committed command. That surface is CO1/CO2
 *   (`scripts/campaign-authority-cutover.ts`), unmerged at this base -
 *   the marker field it reads is asserted here, the CLI that reads it is
 *   not.
 * - Replication across SEPARATE database files. That is
 *   `campaign-two-device-drive.spec.ts`; this spec proves the opposite
 *   property, one file seen by two processes.
 * - The websocket broadcast path. Convergence here is read back through
 *   the scoped activity route, which is derived from the durable record
 *   itself; no socket is opened by this drive.
 * - The event-history BRANCH surface. `/head` answers
 *   `no-authoritative-stream` for these campaigns because nothing in
 *   this path writes a branch record - stated as a measured fact, not
 *   worked around.
 */
