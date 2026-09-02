/**
 * Live two-device drive: source on one server process, replica on a
 * second (task 4.5, design D2/D5/D6).
 *
 * Everything before this exercised source and replica inside ONE
 * process, which quietly assumes away the thing the design is about.
 * Two processes with their own ports and their own journal files is the
 * situation a player is actually in: a campaign hosted on one machine,
 * consumed on another.
 *
 * Driven here, end to end, across two real servers:
 *
 *   share    - the source issues a scoped, signed grant. Deliberately
 *              WITHOUT a bearer token: this campaign has no co-op
 *              session and therefore no participants, so there is no
 *              principal to authorize against and the share endpoint
 *              asks for nothing it could not check (finding #33, the
 *              #29 boundary). The dial below DOES present one - it is
 *              bound to the stored grant, so there the check is real.
 *   redeem   - the CONSUMING server redeems it and records a replica
 *   dial     - the consuming server starts syncing toward the source
 *   offline  - the replica serves its own copy with the source stopped
 *
 * What is NOT driven, and why, is stated at the bottom of the file
 * rather than left for a reader to infer from a missing assertion.
 *
 * @tags @campaign @multiplayer @two-device
 */

import { expect, test, type APIRequestContext } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

/** The consuming device's server. Playwright's own webServer is the source. */
interface ISecondServer {
  readonly origin: string;
  readonly dataDir: string;
  readonly process: ChildProcess;
}

const SECOND_PORT = Number(process.env.MEKSTATION_E2E_SECOND_PORT ?? 3617);

/**
 * Boots a second app process on its own port with its own database file.
 *
 * The separate `DATABASE_PATH` is the point of the whole spec: two
 * servers sharing one file would satisfy every assertion below while
 * proving nothing about replication.
 */
async function startSecondServer(
  request: APIRequestContext,
): Promise<ISecondServer> {
  // Refuse to adopt a server this spec did not start. A leftover process
  // from an earlier run answers instantly, so the drive would "pass" in
  // under a second against a stale database without ever having started
  // a second device - observed exactly once, which is why this is a
  // hard failure rather than a warning.
  const origin = `http://127.0.0.1:${SECOND_PORT}`;
  let occupied = false;
  try {
    const probe = await request.get(`${origin}/api/campaigns`, {
      timeout: 3_000,
    });
    occupied = probe.ok();
  } catch {
    occupied = false;
  }
  if (occupied) {
    throw new Error(
      `port ${SECOND_PORT} is already serving; stop it before running the two-device drive`,
    );
  }

  const dataDir = await mkdtemp(path.join(tmpdir(), 'mekstation-device-b-'));
  // `node server.js` directly, NOT an npm script. `npm run dev` begins
  // with `kill-port 3600`, which would take down device A - Playwright's
  // own server - and `npm run start` needs a standalone build the
  // nightly e2e lane does not produce. The custom server honours PORT
  // and works with or without a build.
  const child = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      PORT: String(SECOND_PORT),
      DATABASE_PATH: path.join(dataDir, 'device-b.db'),
      // server.js refuses any hostname but localhost/127.0.0.1, and a
      // shell that exports the machine name trips that guard.
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'pipe',
  });
  // Drained, not forwarded: a second server's log is noise in the report
  // unless it fails, and an unread pipe eventually blocks the child.
  child.stdout?.on('data', () => undefined);
  child.stderr?.on('data', () => undefined);
  return {
    origin,
    dataDir,
    process: child,
  };
}

/** Polls the second server until it answers, then gives up loudly. */
async function waitForServer(
  request: APIRequestContext,
  origin: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no attempt made';
  while (Date.now() < deadline) {
    try {
      const response = await request.get(`${origin}/api/campaigns`, {
        timeout: 5_000,
      });
      if (response.ok()) return;
      lastError = `status ${response.status()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`second server never became ready: ${lastError}`);
}

/**
 * Stops the second server and clears its data directory.
 *
 * The wait for `exit` is load-bearing on Windows: SQLite holds the WAL
 * open until the process is really gone, and removing the directory
 * first fails with EBUSY - observed. The child is the server itself
 * rather than a shell wrapper, so a plain kill reaches it.
 *
 * A failed cleanup is logged, not thrown: a temp directory the OS will
 * reclaim is not worth turning a passing drive red.
 */
async function stopSecondServer(server: ISecondServer): Promise<void> {
  const exited = new Promise<void>((resolve) => {
    server.process.once('exit', () => resolve());
    setTimeout(resolve, 15_000);
  });
  server.process.kill();
  await exited;
  try {
    await rm(server.dataDir, { recursive: true, force: true, maxRetries: 5 });
  } catch (error) {
    console.warn(`second server data dir left behind: ${String(error)}`);
  }
}

interface IGrantRecord {
  readonly grantId: string;
  readonly campaignId: string;
  readonly participantId: string;
  readonly scopes: readonly string[];
  readonly issuedAt: string;
  readonly expiresAt: string;
}

/**
 * Ed25519 keypair in the encodings the vault identity service uses: raw
 * public key, base64. The grant is ISSUED with this public key, so the
 * signature below is anchored to the issuing identity rather than to
 * whatever key a token happens to carry — the trust anchor task 2.1
 * exists to enforce.
 */
/**
 * A self-issued bearer token for the replica-sync calls below.
 *
 * `replica-sync` dials a socket and writes what comes back into this
 * device's store, so every verb needs a named caller. Minting one needs
 * no server: the token is signed by a vault identity and verified from
 * the public key it carries. That it is this cheap is exactly why the
 * SHARE endpoint does not ask for one on a campaign with no
 * participants - there, a token would prove nothing there was anything
 * to check against (finding #33, the #29 boundary).
 */
async function bearerToken(): Promise<string> {
  const keys = await generateKeyPair();
  const token = await issuePlayerToken({
    id: 'identity-two-device-drive',
    displayName: 'Two Device Drive',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: new Date().toISOString(),
  });
  return encodeTokenForWire(token);
}

async function issuerKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
}> {
  const pair = (await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const raw = await webcrypto.subtle.exportKey('raw', pair.publicKey);
  return {
    publicKey: Buffer.from(raw).toString('base64'),
    privateKey: pair.privateKey,
  };
}

/**
 * The canonical signed payload. Field order is alphabetical and fixed:
 * these exact bytes are what the server verifies, so a different
 * ordering here fails as a bad signature rather than as a mismatch.
 */
function canonicalPayload(grant: IGrantRecord): string {
  return JSON.stringify({
    campaignId: grant.campaignId,
    expiresAt: grant.expiresAt,
    grantId: grant.grantId,
    issuedAt: grant.issuedAt,
    participantId: grant.participantId,
    scopes: grant.scopes,
  });
}

async function signGrantToken(
  grant: IGrantRecord,
  issuer: { publicKey: string; privateKey: CryptoKey },
): Promise<Record<string, unknown>> {
  const signature = await webcrypto.subtle.sign(
    { name: 'Ed25519' },
    issuer.privateKey,
    new TextEncoder().encode(canonicalPayload(grant)),
  );
  return {
    grantId: grant.grantId,
    campaignId: grant.campaignId,
    participantId: grant.participantId,
    scopes: grant.scopes,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    publicKey: issuer.publicKey,
    signature: Buffer.from(signature).toString('base64'),
  };
}

/** Minimal campaign body the persistence route accepts. */
function campaignBody(campaignId: string) {
  return {
    id: campaignId,
    name: 'Two Device Drive',
    factionId: 'mercenary',
    campaignStartDate: '3025-01-01T00:00:00.000Z',
    currentDate: '3025-01-01T00:00:00.000Z',
    finances: { balance: 1_000_000, transactions: [] },
    forces: [],
    missions: [],
    factionStandings: {},
  };
}

function campaignEnvelope(campaignId: string, version: number) {
  return {
    campaignId,
    schemaVersion: 2,
    version,
    savedAt: '2026-08-24T00:00:00.000Z',
    originDeviceId: 'device-a',
    // D2 fails closed on an unparseable role, so the envelope states its
    // authority explicitly. The server owns `instanceId` and overwrites
    // this placeholder - a browser is not a hosting server and must not
    // mint one, which is the same rule the client builder follows.
    instanceId: 'device-a-placeholder',
    authority: { role: 'source' },
    body: campaignBody(campaignId),
  };
}

test.describe('live two-device campaign drive', () => {
  test.describe.configure({ mode: 'serial' });

  let deviceB: ISecondServer | null = null;

  test.afterAll(async () => {
    if (deviceB) await stopSecondServer(deviceB);
  });

  test('shares a campaign from one server process and consumes it on another', async ({
    request,
    baseURL,
  }) => {
    test.setTimeout(300_000);
    const sourceOrigin = baseURL ?? 'http://127.0.0.1:3600';
    const campaignId = `campaign-drive-${Date.now()}`;

    // --- device A: the source ----------------------------------------
    const created = await request.put(
      `${sourceOrigin}/api/campaigns/${campaignId}`,
      { data: { envelope: campaignEnvelope(campaignId, 0), baseVersion: 0 } },
    );
    expect(
      created.ok(),
      `create failed: ${created.status()} ${await created.text()}`,
    ).toBe(true);
    const sourceRecord = (await created.json()) as {
      instanceId: string;
      authority: { role: string };
    };
    expect(sourceRecord.authority.role).toBe('source');

    // --- device B: a genuinely separate process + database ------------
    deviceB = await startSecondServer(request);
    await waitForServer(request, deviceB.origin);
    expect(deviceB.origin).not.toBe(sourceOrigin);

    // The campaign exists on A and NOT on B. Without this, the redeem
    // below could be satisfied by a shared file rather than by sharing.
    const absentOnB = await request.get(
      `${deviceB.origin}/api/campaigns/${campaignId}`,
    );
    expect(absentOnB.status()).toBe(404);

    // --- share: the source issues a scoped grant ----------------------
    const issuer = await issuerKeyPair();
    const grantResponse = await request.post(
      `${sourceOrigin}/api/campaigns/${campaignId}/grants`,
      {
        data: {
          participantId: 'participant-device-b',
          issuerPublicKey: issuer.publicKey,
          scopes: ['campaign'],
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      },
    );
    expect(
      grantResponse.ok(),
      `issue failed: ${grantResponse.status()} ${await grantResponse.text()}`,
    ).toBe(true);
    const grant = (await grantResponse.json()) as IGrantRecord;
    expect(grant.grantId).toMatch(/^[0-9a-f]{32}$/);

    // --- redeem: the CONSUMING server records the replica -------------
    const token = await signGrantToken(grant, issuer);
    const redeemed = await request.post(
      `${deviceB.origin}/api/campaigns/redeem`,
      {
        data: {
          token,
          sourceInstanceId: sourceRecord.instanceId,
          body: campaignBody(campaignId),
        },
      },
    );
    expect(
      redeemed.ok(),
      `redeem failed: ${redeemed.status()} ${await redeemed.text()}`,
    ).toBe(true);

    // B holds a REPLICA whose source is A. The authority is a STORED
    // fact, not an inference from which server answered — the D2
    // property this whole change exists for.
    const onB = await request.get(
      `${deviceB.origin}/api/campaigns/${campaignId}`,
    );
    expect(onB.ok()).toBe(true);
    const replicaRecord = (await onB.json()) as {
      instanceId: string;
      authority: { role: string; sourceInstanceId?: string };
    };
    expect(replicaRecord.authority.role).toBe('replica');
    expect(replicaRecord.authority.sourceInstanceId).toBe(
      sourceRecord.instanceId,
    );
    // Two processes, two instance identities. Equal ids would mean the
    // servers share a database and the drive proves nothing.
    expect(replicaRecord.instanceId).not.toBe(sourceRecord.instanceId);

    // --- the source refuses to be told it is a replica ----------------
    const wire = await bearerToken();
    const sourceSync = await request.post(
      `${sourceOrigin}/api/campaigns/${campaignId}/replica-sync`,
      {
        headers: { Authorization: `Bearer ${wire}` },
        data: {
          sourceSocketUrl: `${deviceB.origin.replace('http', 'ws')}/api/multiplayer/socket`,
          matchId: 'match-drive',
          playerId: grant.participantId,
          token,
        },
      },
    );
    expect(sourceSync.status()).toBe(403);

    // --- dial: the consuming server starts syncing toward the source --
    const started = await request.post(
      `${deviceB.origin}/api/campaigns/${campaignId}/replica-sync`,
      {
        headers: { Authorization: `Bearer ${wire}` },
        data: {
          sourceSocketUrl: `${sourceOrigin.replace('http', 'ws')}/api/multiplayer/socket`,
          matchId: 'match-drive',
          playerId: grant.participantId,
          token,
        },
      },
    );
    expect(started.status(), `start failed: ${await started.text()}`).toBe(202);

    // --- offline read: B serves its own copy, source or no source -----
    await request.delete(
      `${deviceB.origin}/api/campaigns/${campaignId}/replica-sync?grantId=${grant.grantId}`,
      { headers: { Authorization: `Bearer ${wire}` } },
    );

    const offlineRead = await request.get(
      `${deviceB.origin}/api/campaigns/${campaignId}`,
    );
    expect(offlineRead.ok()).toBe(true);
    const offlineRecord = (await offlineRead.json()) as {
      authority: { role: string };
    };
    // The point of D6: a consuming device reads from ITS OWN store. A
    // replica readable only while connected would be a remote view
    // wearing a local name.
    expect(offlineRecord.authority.role).toBe('replica');

    // --- and a replica still refuses local mutation -------------------
    const localWrite = await request.put(
      `${deviceB.origin}/api/campaigns/${campaignId}`,
      { data: { envelope: campaignEnvelope(campaignId, 1), baseVersion: 1 } },
    );
    expect(localWrite.status()).toBe(403);
  });
});

/**
 * NOT DRIVEN HERE — and not because it was hard to reach.
 *
 * Source-to-replica event CONVERGENCE cannot be driven on a live server
 * today by any supported path. The grant delivery projection reads
 * campaign events from the SQLite journal, but the only production
 * writer of campaign events — the co-op match host — goes through
 * `createDefaultCampaignEventStore`, which returns the IN-MEMORY store
 * while `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` is false. Nothing a live
 * server does puts a campaign event where the delivery path looks.
 *
 * The other candidate producer, `POST /api/campaigns/[id]/commands`,
 * requires the campaign to be on journal authority, which requires a
 * cutover marker, which only the flag-gated genesis and adoption hooks
 * write. Both roads end at the same flag.
 *
 * So convergence is gated on the reviewed cutover, not on more test
 * scaffolding — and it is said here rather than papered over with a
 * scenario that reaches into a database to fake what a server would have
 * written. The in-process convergence proofs (tasks 3.2–3.4, 5.4) still
 * hold; what waits is proving them across two processes.
 */
