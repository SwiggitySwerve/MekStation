import type { Page, TestInfo } from '@playwright/test';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as ts from 'typescript';

import type { WalkthroughFindingRecord } from '../../e2e/helpers/uxWalkthrough';

import {
  canonicalizeWalkthroughRoute,
  createWalkthroughRecorder,
} from '../../e2e/helpers/uxWalkthrough';

describe('UX walkthrough recorder privacy ingress', () => {
  it('exposes no guard-bypass options at the production capture boundary', () => {
    const source = ts.createSourceFile(
      'uxWalkthrough.ts',
      fs.readFileSync(path.resolve('e2e/helpers/uxWalkthrough.ts'), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const declaration = source.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === 'captureCamp01AttestedPng',
    );
    expect(declaration && ts.isFunctionDeclaration(declaration)).toBe(true);
    expect(declaration?.parameters).toHaveLength(2);
    expect(declaration?.parameters[1]?.type?.kind).toBe(
      ts.SyntaxKind.StringKeyword,
    );
  });

  it('keeps route shape while replacing dynamic path and query values', () => {
    const rawRoute =
      'https://localhost:3600/gameplay/campaigns/campaign-private-42/starmap?' +
      'missionId=mission-private-7&privateMarker=PROOF03_PRIVATE_MARKER';

    const canonical = canonicalizeWalkthroughRoute(rawRoute);
    expect(canonical).toContain('/gameplay/campaigns/<route:');
    expect(canonical).toContain('/starmap?');
    expect(canonical).toContain('missionId=<query:');
    expect(canonical).not.toContain('campaign-private-42');
    expect(canonical).not.toContain('mission-private-7');
    expect(canonical).not.toContain('PROOF03_PRIVATE_MARKER');
    expect(canonical).toBe(canonicalizeWalkthroughRoute(rawRoute));
  });
  it('uses route position and sorted query shape instead of segment vocabulary', () => {
    const first = canonicalizeWalkthroughRoute(
      '/gameplay/campaigns/campaigns/starmap?tab=z&tab=a&missionId=mission',
    );
    const second = canonicalizeWalkthroughRoute(
      '/gameplay/campaigns/%63ampaigns/starmap?missionId=mission&tab=a&tab=z',
    );
    expect(first).toBe(second);
    expect(first).toContain('/gameplay/campaigns/<route:');
    expect(first.indexOf('missionId=')).toBeLessThan(first.indexOf('tab='));
    expect(first).not.toContain('/campaigns/starmap');

    const contractMarket = canonicalizeWalkthroughRoute(
      '/gameplay/campaigns/campaigns/contract-market',
    );
    const missions = canonicalizeWalkthroughRoute(
      '/gameplay/campaigns/%63ampaigns/missions',
    );
    const preBattle = canonicalizeWalkthroughRoute(
      '/gameplay/encounters/encounters/pre-battle',
    );
    expect(contractMarket).toMatch(
      /^\/gameplay\/campaigns\/<route:[0-9a-f]{16}>\/contract-market$/,
    );
    expect(missions).toMatch(
      /^\/gameplay\/campaigns\/<route:[0-9a-f]{16}>\/missions$/,
    );
    expect(preBattle).toMatch(
      /^\/gameplay\/encounters\/<route:[0-9a-f]{16}>\/pre-battle$/,
    );
  });
  it('redacts recorder state at entity, hold, runtime, and note ingress', async () => {
    const runDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'mekstation-proof03-'),
    );
    const previousRunDir = process.env.MEKSTATION_UX_WALKTHROUGH_RUN_DIR;
    process.env.MEKSTATION_UX_WALKTHROUGH_RUN_DIR = runDir;
    const rawId = 'campaign-private-42';
    const rawUrl =
      `https://localhost:3600/gameplay/campaigns/${rawId}/gm-ledger?` +
      'description=PROOF03_PRIVATE_MARKER';
    const screenshotCalls: Array<{ style?: string }> = [];
    const screenshotBytes = Buffer.from('NON_CAMP_SCREENSHOT_BYTES');
    const listeners = new Map<string, (value: unknown) => void>();
    const page = {
      url: () => rawUrl,
      on: (event: string, listener: (value: unknown) => void) => {
        if (!listeners.has(event)) listeners.set(event, listener);
      },
      waitForLoadState: async () => undefined,
      waitForTimeout: async () => undefined,
      screenshot: async (options: { style?: string; path: string }) => {
        screenshotCalls.push(options);
        fs.writeFileSync(options.path, screenshotBytes);
      },
    } as unknown as Page;
    const secondaryPage = { ...page } as unknown as Page;
    const testInfo = {
      project: { use: { viewport: { width: 1280, height: 720 } } },
    } as unknown as TestInfo;
    try {
      const recorder = createWalkthroughRecorder(
        page,
        'PRIVATE_JOURNEY',
        'PRIVATE_PERSONA_TEXT',
        testInfo,
      );
      recorder.attachSurface('PRIVATE_SURFACE', secondaryPage);
      recorder.registerEntity('PRIVATE_KIND', rawId);
      recorder.registerHoldUrl('PRIVATE_HOLD_LABEL', rawUrl);
      await recorder.step(
        'PRIVATE_STEP_TITLE',
        async () => {
          listeners.get('console')?.({
            type: () => 'error',
            text: () => 'PROOF03_PRIVATE_MARKER from game response',
          });
          listeners.get('pageerror')?.('PROOF03_PRIVATE_MARKER page exception');
        },
        { note: 'Private campaign description marker' },
      );
      recorder.note('PROOF03_PRIVATE_MARKER arbitrary game narrative');
      await recorder.checkpoint('PRIVATE_CHECKPOINT', async () => undefined, {
        surface: 'PRIVATE_SURFACE',
      });
      recorder.finding({
        id: 'PRIVATE_FINDING_ID',
        severity: 'major',
        summary: 'private ordinary prose from a game response',
        steps: [1],
        privateText: 'EXTRA_RAW_PRIVATE_TEXT',
      } as WalkthroughFindingRecord & {
        privateText: string;
      });
      recorder.finish();
      const recordPath = path.join(
        runDir,
        'journeys',
        fs.readdirSync(path.join(runDir, 'journeys'))[0],
      );
      const serialized = fs.readFileSync(recordPath, 'utf8');
      const record = JSON.parse(serialized) as {
        steps: Array<{
          screenshot: string;
          route: string;
          notes: string[];
          consoleErrors: string[];
          pageErrors: string[];
        }>;
        entityIds: Array<{ id: string }>;
        holdUrls: Array<{ label: string; url: string }>;
        findings: Array<{ id: string; summary: string }>;
        checkpoints: Array<{ name: string }>;
      };
      for (const rawValue of [
        rawId,
        'PROOF03_PRIVATE_MARKER',
        'PRIVATE_JOURNEY',
        'PRIVATE_PERSONA_TEXT',
        'PRIVATE_KIND',
        'PRIVATE_HOLD_LABEL',
        'PRIVATE_STEP_TITLE',
        'PRIVATE_SURFACE',
        'PRIVATE_CHECKPOINT',
        'PRIVATE_FINDING_ID',
        'private ordinary prose from a game response',
        'EXTRA_RAW_PRIVATE_TEXT',
      ])
        expect(serialized).not.toContain(rawValue);
      expect(record.steps[0].route).toContain('/gameplay/campaigns/<route:');
      expect(
        record.steps[0].notes.every((note) => note.includes('sha256')),
      ).toBe(true);
      expect(record.steps[0].consoleErrors[0]).toContain('console:<sha256:');
      expect(record.steps[0].pageErrors[0]).toContain('page-error:<sha256:');
      expect(record.entityIds[0].id).toMatch(/^<entity:[0-9a-f]{16}>$/);
      expect(record.holdUrls[0].url).toContain('/gameplay/campaigns/<route:');
      expect(record.holdUrls[0].label).toMatch(/^hold-[0-9a-f]{16}$/);
      expect(record.findings[0].id).toMatch(/^finding-[0-9a-f]{16}$/);
      expect(record.findings[0].summary).toContain('finding-summary:<sha256:');
      expect(record.checkpoints[0].name).toMatch(/^checkpoint-[0-9a-f]{16}$/);
      expect(screenshotCalls[0].style).toMatch(
        /color:transparent.*content:none.*img,svg,canvas,video/,
      );
      expect(
        fs.readFileSync(path.join(runDir, record.steps[0].screenshot)),
      ).toEqual(screenshotBytes);
      expect(
        fs.existsSync(path.join(runDir, '.capture-attestations.json')),
      ).toBe(false);
      const reject = (finding: WalkthroughFindingRecord) =>
        expect(() => recorder.finding(finding)).toThrow();
      reject({
        id: 'bad',
        severity: 'unknown' as WalkthroughFindingRecord['severity'],
        summary: 'bad',
        steps: [1],
      });
      reject({ id: 'bad', severity: 'minor', summary: 'bad', steps: [99] });
    } finally {
      if (previousRunDir === undefined) {
        delete process.env.MEKSTATION_UX_WALKTHROUGH_RUN_DIR;
      } else {
        process.env.MEKSTATION_UX_WALKTHROUGH_RUN_DIR = previousRunDir;
      }
      fs.rmSync(runDir, { recursive: true, force: true });
    }
  });
});
