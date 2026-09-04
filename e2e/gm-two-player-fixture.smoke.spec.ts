import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';
import {
  EVIDENCE_KINDS,
  EVIDENCE_ROLES,
  EvidenceBundleError,
  openEvidenceBundle,
  writeCompleteEvidenceMatrix,
} from './fixtures/gmTwoPlayerEvidence';
test('creates three isolated future-role contexts @fixture-smoke', async ({
  baseURL,
  browser,
  request,
}) => {
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    expect(fixture).toMatchObject({
      clients: { length: 3 },
      session: {
        ownerRunId: fixture.runId,
        id: expect.stringMatching(/^gm2p-/),
      },
      server: {
        owner: 'playwright-web-server',
        ownerRunId: fixture.runId,
        baseURL,
      },
    });
    expect(new Set(fixture.clients.map(({ context }) => context)).size).toBe(3);
    for (const field of ['id', 'playerId', 'authFingerprint'] as const) {
      expect(
        new Set(fixture.clients.map((client) => client.identity[field])).size,
      ).toBe(3);
    }
    for (const client of fixture.clients) {
      await expect(client.page).toHaveURL(/\/gameplay\/campaigns$/);
      await expect(
        client.page.getByTestId('create-coop-campaign-btn'),
      ).toBeVisible();
      const authKey = `${AUTH_PREFIX}${fixture.session.id}`;
      const storage = await client.page.evaluate(
        ({ authKey, prefix }) => {
          const matching = (store: Storage) =>
            Object.keys(store).filter((key) => key.startsWith(prefix));
          const parsed = JSON.parse(
            sessionStorage.getItem(authKey) ?? '{}',
          ) as Record<string, unknown>;
          return {
            local: matching(localStorage),
            session: Object.keys(sessionStorage),
            auth: {
              matchId: parsed.matchId,
              playerId: parsed.playerId,
              wireTokenLength:
                typeof parsed.wireToken === 'string'
                  ? parsed.wireToken.length
                  : 0,
            },
          };
        },
        { authKey, prefix: STORAGE_PREFIX },
      );
      expect(storage.local).toEqual([client.storageKey]);
      expect(storage.session.sort()).toEqual(
        [authKey, client.storageKey].sort(),
      );
      expect(storage.auth).toMatchObject({
        matchId: fixture.session.id,
        playerId: client.identity.playerId,
      });
      expect(storage.auth.wireTokenLength).toBeGreaterThan(0);
    }
    // Task 20.3: the run's own databases are readable through a
    // dedicated read-only connection, never the production store. A
    // schema surface with tables in it is the proof the reader is
    // pointed at the real file rather than one it created.
    const evidence = fixture.openEvidence('app');
    try {
      const before = evidence.fileHash();
      expect(evidence.tables().length).toBeGreaterThan(0);
      // Reading changed nothing, which is what makes the artifact
      // describe the run rather than the probe.
      expect(evidence.fileHash()).toBe(before);
    } finally {
      evidence.close();
    }
    // Task 20.4: the run writes a declared, role-labeled bundle under
    // its own directory, and the manifest records what it MEANT to
    // capture so a missing artifact is a gap rather than a silence.
    const bundle = fixture.openEvidenceBundle();
    for (const client of fixture.clients) {
      bundle.write(
        'environment',
        client.role,
        'context.json',
        JSON.stringify({
          role: client.role,
          playerId: client.identity.playerId,
        }),
      );
    }
    const manifestPath = bundle.finalize(
      {
        node: process.version,
        runId: fixture.runId,
      },
      { allowIncompleteEvidence: true },
    );
    expect(manifestPath).toContain(fixture.runId);
  } finally {
    await fixture.cleanup();
  }
});

test('E2E-78 incomplete evidence bundle fails closed and a complete one finalizes @E2E-78', () => {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gm2p-e2e78-'));
  try {
    const incomplete = openEvidenceBundle('e2e-78-incomplete', runtimeRoot);
    incomplete.write('trace', 'future-gm', 'cell.json', '{"ok":true}');
    try {
      incomplete.finalize({ node: process.version });
      throw new Error('expected finalize to refuse an incomplete bundle');
    } catch (error) {
      expect(error).toBeInstanceOf(EvidenceBundleError);
      expect(String(error)).toContain('EVIDENCE_INCOMPLETE');
      expect(String(error)).toContain('screenshot/future-player-2');
      expect(String(error)).toContain('cleanup-log/future-gm');
      expect(String(error)).not.toContain('trace/future-gm');
    }
    expect(fs.existsSync(path.join(incomplete.root, 'manifest.json'))).toBe(
      false,
    );

    const complete = openEvidenceBundle('e2e-78-complete', runtimeRoot);
    writeCompleteEvidenceMatrix(complete);
    const manifestPath = complete.finalize({ node: process.version });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      captured: { kind: string; role: string }[];
      missing: { kind: string; role: string; why: string }[];
    };
    expect(manifest.captured).toHaveLength(
      EVIDENCE_KINDS.length * EVIDENCE_ROLES.length,
    );
    expect(manifest.missing).toEqual([]);
  } finally {
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  }
});

const STORAGE_PREFIX = 'mekstation.gm-two-player.fixture.';
const AUTH_PREFIX = 'mekstation.coopCampaign.token.';
