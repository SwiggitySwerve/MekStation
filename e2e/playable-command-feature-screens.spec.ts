import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  createTestCampaign,
  deleteCampaign,
  persistCampaignThroughDashboard,
} from './fixtures/campaign';
import {
  ATLAS_AS7_D_E2E_UNIT_ID,
  cloneCanonicalAtlasAs7DConfig,
  expectCanonicalAtlasCustomizerStats,
  expectCanonicalAtlasStoredConfiguration,
} from './fixtures/campaignUnits';
import { assertNoMekStationLoading } from './helpers/wait';

interface HexCoord {
  readonly q: number;
  readonly r: number;
}

interface EvidenceScreen {
  readonly file: string;
  readonly readyMarker: string;
  readonly route: string;
  readonly routeKind: 'product' | 'harness';
}

interface SeededCampaign {
  readonly campaignId: string;
  readonly initialDate: string;
  readonly startingFunds: number;
}

interface SeededCustomizerCampaign {
  readonly campaignId: string;
  readonly missionId: string;
}

const evidenceDir = path.resolve(
  process.cwd(),
  process.env.MEKSTATION_COMMAND_SCREEN_EVIDENCE_DIR ??
    '.sisyphus/evidence/feature-screens/2026-06-30-playable-command-screens',
);

const expectedEvidenceFiles = [
  '01-starmap-logistics-preview.png',
  '02-starmap-logistics-after-commit.png',
  '03-mission-readiness-roster.png',
  '04-campaign-refit-customizer.png',
  '05-readiness-return-after-refit-save.png',
  '06-gm-ledger-preview.png',
  '07-gm-ledger-approved-public-private.png',
  '08-gm-ledger-guest-redacted.png',
  '09-tactical-command-map-movement.png',
  '10-networked-host-gm-authority.png',
  '11-networked-guest-public-result.png',
] as const;

test.setTimeout(180_000);
test.use({ viewport: { width: 1440, height: 1000 } });

test.describe('playable command feature screen evidence', () => {
  test('captures hydrated product and harness command screens with manifest metadata', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const manifestScreens: EvidenceScreen[] = [];
    prepareEvidenceDirectory();

    await captureStarmapScreens(page, manifestScreens);
    await captureMissionReadinessScreens(page, manifestScreens);
    await captureGmLedgerScreens(page, manifestScreens);
    await captureTacticalCommandScreen(page, manifestScreens);
    await captureNetworkedCommandScreens(page, manifestScreens);

    writeEvidenceManifest(manifestScreens);
    expect(manifestScreens.map((screen) => screen.file)).toEqual(
      expectedEvidenceFiles,
    );
  });
});

function prepareEvidenceDirectory(): void {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const file of expectedEvidenceFiles) {
    fs.rmSync(path.join(evidenceDir, file), { force: true });
  }
  for (const entry of fs.readdirSync(evidenceDir, { withFileTypes: true })) {
    if (entry.isFile() && /^failure-.*\.png$/i.test(entry.name)) {
      fs.rmSync(path.join(evidenceDir, entry.name), { force: true });
    }
  }
  fs.rmSync(path.join(evidenceDir, 'command-screen-evidence.json'), {
    force: true,
  });
  // Provenance README regenerates with the manifest — never leave a stale
  // one describing a previous capture's build mode.
  fs.rmSync(path.join(evidenceDir, 'README.md'), { force: true });
}

async function captureEvidence(
  page: Page,
  manifestScreens: EvidenceScreen[],
  options: {
    readonly file: (typeof expectedEvidenceFiles)[number];
    readonly readyMarker: string;
    readonly readyLocator: ReturnType<Page['getByTestId']>;
    readonly routeKind: 'product' | 'harness';
  },
): Promise<void> {
  await expect(options.readyLocator).toBeVisible({ timeout: 20_000 });
  await assertNoMekStationLoading(page);
  await page.waitForTimeout(250);
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: path.join(evidenceDir, options.file),
  });
  manifestScreens.push({
    file: options.file,
    readyMarker: options.readyMarker,
    route: page.url(),
    routeKind: options.routeKind,
  });
}

function writeEvidenceManifest(screens: readonly EvidenceScreen[]): void {
  const buildMode =
    process.env.MEKSTATION_COMMAND_SCREEN_BUILD_MODE === 'production'
      ? 'production'
      : 'development';
  const proofMode =
    process.env.MEKSTATION_COMMAND_SCREEN_PROOF_MODE ??
    (buildMode === 'production' ? 'production-signoff' : 'dev-only');
  const capturedAt = new Date().toISOString();

  fs.writeFileSync(
    path.join(evidenceDir, 'command-screen-evidence.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        buildMode,
        proofMode,
        capturedAt,
        captureCommand: 'npm.cmd run qc:command-evidence:capture',
        screens,
      },
      null,
      2,
    )}\n`,
  );

  writeEvidenceProvenanceReadme(screens, buildMode, proofMode, capturedAt);
}

/**
 * Human-visible provenance beside the PNGs (re-audit H2/H3): the manifest
 * carries buildMode / proofMode / routeKind, but a reviewer browsing the
 * folder sees only screenshots — the dev-build N badge and the networked
 * harness frames read as product truth without a label at eye level. This
 * README is GENERATED from the same values the manifest records, so the
 * two cannot drift.
 */
function writeEvidenceProvenanceReadme(
  screens: readonly EvidenceScreen[],
  buildMode: 'development' | 'production',
  proofMode: string,
  capturedAt: string,
): void {
  const banner =
    buildMode === 'production'
      ? '**Production-build evidence** — captured against `npm run build` + the standalone server.'
      : '**DEV-BUILD EVIDENCE** — captured against the dev server (`next dev`); the N badge on frames is the Next.js dev indicator, not product UI. For sign-off captures run `npm run qc:command-evidence:prod`.';
  const harnessCount = screens.filter(
    (screen) => screen.routeKind === 'harness',
  ).length;
  const lines = [
    '# Command-screen evidence provenance',
    '',
    `- Build mode: \`${buildMode}\` / proof mode: \`${proofMode}\``,
    `- Captured at: ${capturedAt}`,
    '',
    banner,
    '',
    `Harness frames below are E2E proof pages, NOT product UI (${harnessCount} of ${screens.length} screens).`,
    '',
    '| Screen | Kind |',
    '| --- | --- |',
    ...screens.map(
      (screen) =>
        `| ${screen.file} | ${
          screen.routeKind === 'harness' ? '**E2E HARNESS**' : 'product'
        } |`,
    ),
    '',
  ];
  fs.writeFileSync(path.join(evidenceDir, 'README.md'), lines.join('\n'));
}

async function waitForCampaignStoresReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: { campaign?: unknown; campaignRoster?: unknown };
        }
      ).__ZUSTAND_STORES__;
      return Boolean(stores?.campaign && stores.campaignRoster);
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function seedTravelCampaign(page: Page): Promise<SeededCampaign> {
  await page.goto('/gameplay/campaigns');
  await waitForCampaignStoresReady(page);

  return page.evaluate(() => {
    type StoreApi = {
      getState: () => Record<string, any>;
    };
    type ExposedStore = StoreApi | (() => StoreApi);
    const resolveStore = (store: ExposedStore): StoreApi =>
      typeof (store as StoreApi).getState === 'function'
        ? (store as StoreApi)
        : (store as () => StoreApi)();

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: ExposedStore;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store is not exposed');
    }

    const campaignStore = resolveStore(stores.campaign);
    const campaignState = campaignStore.getState();
    const startingFunds = 2_000_000;
    const campaignId = campaignState.createCampaign(
      'E2E Starmap Logistics Evidence',
      'Davion',
      {
        startingFunds,
        payForMaintenance: false,
        payForSalaries: false,
        unitMarketMethod: 'none',
        personnelMarketStyle: 'disabled',
        contractMarketMethod: 'none',
      },
    );
    const initialDate = '3025-01-01T00:00:00.000Z';
    campaignState.updateCampaign({
      currentDate: new Date(initialDate),
      currentSystemId: 'terra',
      updatedAt: initialDate,
    });

    return { campaignId, initialDate, startingFunds };
  });
}

async function captureStarmapScreens(
  page: Page,
  manifestScreens: EvidenceScreen[],
): Promise<void> {
  const seeded = await seedTravelCampaign(page);
  await persistCampaignThroughDashboard(page, seeded.campaignId);

  try {
    await page.goto(`/gameplay/campaigns/${seeded.campaignId}/starmap`);
    await assertNoMekStationLoading(page);
    await expect(page.getByTestId('starmap-travel-controls')).toBeVisible({
      timeout: 20_000,
    });
    await page
      .getByTestId('starmap-destination-select')
      .selectOption('luthien');
    await expect(page.getByTestId('starmap-route-status')).toContainText(
      'ready',
    );
    await expect(page.getByTestId('starmap-detail-status')).toContainText(
      'Zoom',
    );
    await expect(page.getByTestId('starmap-detail-status')).not.toContainText(
      'Detail',
    );
    await expect(page.getByTestId('starmap-detail-status')).not.toContainText(
      'LOD',
    );
    await expect(page.getByTestId('starmap-annotation-legend')).toBeVisible();
    await expect(page.getByTestId('starmap-travel-preview')).not.toContainText(
      'roster-owned',
    );
    await expect(page.getByTestId('starmap-travel-preview')).not.toContainText(
      'GM time cascade',
    );
    await captureEvidence(page, manifestScreens, {
      file: '01-starmap-logistics-preview.png',
      readyLocator: page.getByTestId('starmap-route-status'),
      readyMarker: 'starmap-route-status:ready',
      routeKind: 'product',
    });

    await page.getByTestId('starmap-travel-btn').click();
    await expect(page.getByTestId('starmap-current-system')).toContainText(
      'Luthien',
    );
    await expect(page.getByTestId('starmap-arrival-date')).toContainText(
      '3025-03-14',
    );
    await expect(page.getByTestId('starmap-travel-btn')).toBeDisabled();
    await expect(page.getByTestId('starmap-travel-btn')).toContainText(
      'Already at Luthien',
    );
    await expect(
      page.getByTestId('starmap-travel-action-reason'),
    ).toContainText('Luthien is already the campaign location.');
    await expect(
      page.getByTestId('starmap-travel-action-reason'),
    ).not.toContainText('destination-current-system');
    await captureEvidence(page, manifestScreens, {
      file: '02-starmap-logistics-after-commit.png',
      readyLocator: page.getByTestId('starmap-current-system'),
      readyMarker: 'starmap-current-system:Luthien',
      routeKind: 'product',
    });
  } finally {
    await deleteCampaign(page, seeded.campaignId).catch(() => undefined);
  }
}

async function seedCampaignWithRoster(
  page: Page,
): Promise<SeededCustomizerCampaign> {
  await page.goto('/gameplay/campaigns');
  await waitForCampaignStoresReady(page);
  const atlasConfig = cloneCanonicalAtlasAs7DConfig();

  return page.evaluate(
    ({ atlasConfig: seededAtlasConfig, atlasUnitId }) => {
      type StoreApi = {
        getState: () => Record<string, unknown>;
        setState?: (state: Record<string, unknown>) => void;
      };
      const resolveStore = (store: StoreApi | (() => StoreApi)): StoreApi =>
        typeof (store as StoreApi).getState === 'function'
          ? (store as StoreApi)
          : (store as () => StoreApi)();
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            campaign?: StoreApi | (() => StoreApi);
            campaignRoster?: StoreApi;
          };
        }
      ).__ZUSTAND_STORES__;

      if (!stores?.campaign || !stores.campaignRoster) {
        throw new Error('Campaign E2E stores are not exposed');
      }

      const campaignStore = resolveStore(stores.campaign);
      const campaignState = campaignStore.getState() as {
        createCampaign: (
          name: string,
          factionId: string,
          options: Record<string, unknown>,
        ) => string;
        getCampaign: () => Record<string, unknown>;
        updateCampaign: (updates: Record<string, unknown>) => void;
        getMissionsStore?: () => {
          getState: () => {
            addMission?: (mission: Record<string, unknown>) => void;
          };
        };
      };
      const campaignId = campaignState.createCampaign(
        'E2E Customizer Handoff Evidence',
        'mercenary',
        {
          startingFunds: 2_500_000,
        },
      );
      const campaign = campaignState.getCampaign();
      const missionId = 'mission-alpha';
      const mission = {
        id: missionId,
        name: 'Mission Readiness Evidence',
        status: 'Active',
        type: 'mission',
        systemId: 'terra',
        scenarioIds: [],
        description: 'Browser proof mission for readiness customizer handoff.',
        briefing:
          'Verify readiness refit returns without resetting deployment.',
        startDate: '3025-01-03',
        createdAt: '3025-01-03T00:00:00.000Z',
        updatedAt: '3025-01-03T00:00:00.000Z',
      };
      campaignState.updateCampaign({
        ...campaign,
        currentDate: new Date('3025-01-03T00:00:00.000Z'),
        missions: new Map([[missionId, mission]]),
        unitConfigurations: {
          ...((campaign.unitConfigurations as Record<string, unknown>) ?? {}),
          [atlasUnitId]: seededAtlasConfig,
        },
      });
      campaignState.getMissionsStore?.().getState().addMission?.(mission);
      stores.campaignRoster.setState?.({
        campaignId,
        units: [
          {
            unitId: atlasUnitId,
            unitName: 'Atlas',
            chassisVariant: 'AS7-D',
            readiness: 'Ready',
          },
        ],
        pilots: [],
        missions: [],
        activeMissionId: null,
        missionCount: 1,
      });
      return { campaignId, missionId };
    },
    {
      atlasConfig,
      atlasUnitId: ATLAS_AS7_D_E2E_UNIT_ID,
    },
  );
}

async function captureMissionReadinessScreens(
  page: Page,
  manifestScreens: EvidenceScreen[],
): Promise<void> {
  const seeded = await seedCampaignWithRoster(page);
  await expectCanonicalAtlasStoredConfiguration(page);
  await persistCampaignThroughDashboard(page, seeded.campaignId);

  try {
    await page.goto(
      `/gameplay/campaigns/${seeded.campaignId}/missions/${seeded.missionId}/launch`,
    );
    await assertNoMekStationLoading(page);
    await expect(page.getByTestId('mission-readiness-panel')).toBeVisible();
    await expect(page.locator('body')).toContainText(
      'Mission Readiness Evidence',
    );
    await expect(page.locator('body')).not.toContainText('mission-alpha');
    await expect(page.locator('body')).not.toContainText(
      'single-player mission',
    );
    await expect(page.getByTestId('mission-readiness-status')).toContainText(
      'Ready with warnings (1)',
    );
    await expect(
      page.getByTestId(
        `mission-readiness-action-${ATLAS_AS7_D_E2E_UNIT_ID}-pilot_unassigned`,
      ),
    ).toContainText('Assign pilot');
    await expect(page.getByTestId('launch-mission-direct')).toContainText(
      'Launch with warnings',
    );
    await captureEvidence(page, manifestScreens, {
      file: '03-mission-readiness-roster.png',
      readyLocator: page.getByTestId('mission-readiness-panel'),
      readyMarker: 'mission-readiness-panel',
      routeKind: 'product',
    });

    await page
      .getByTestId(`mission-readiness-customize-${ATLAS_AS7_D_E2E_UNIT_ID}`)
      .click();
    await expect(page.getByTestId('campaign-refit-command-bar')).toBeVisible();
    await expectCanonicalAtlasCustomizerStats(page);
    await expect(page.getByTestId('campaign-refit-save')).toBeDisabled();
    await expect(page.getByTestId('campaign-refit-no-delta')).toContainText(
      'No refit order will be created',
    );
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      '3025-01-03',
    );
    await expect(page.getByTestId('campaign-refit-context')).toContainText(
      'Campaign refit limits',
    );
    await expect(page.getByTestId('campaign-refit-context')).not.toContainText(
      '3025-01-03T00:00:00.000Z',
    );
    await expect(page.getByTestId('campaign-refit-context')).not.toContainText(
      'campaign-owned-refit',
    );
    await captureEvidence(page, manifestScreens, {
      file: '04-campaign-refit-customizer.png',
      readyLocator: page.getByTestId('campaign-refit-command-bar'),
      readyMarker: 'campaign-refit-command-bar',
      routeKind: 'product',
    });

    await page.getByTestId('structure-heat-sink-increment').click();
    await expect(page.getByTestId('campaign-refit-change-count')).toContainText(
      '1 build field changed',
    );
    await expect(page.getByTestId('campaign-refit-save')).toBeEnabled();
    await page.getByTestId('campaign-refit-save').click();
    await expect(
      page.getByTestId('mission-readiness-refit-return-status'),
    ).toContainText('Refit order saved');
    await expect(page.getByTestId('mission-readiness-panel')).toBeVisible();
    await expect(page.getByTestId('mission-readiness-status')).toContainText(
      'Ready with warnings (1)',
    );
    await captureEvidence(page, manifestScreens, {
      file: '05-readiness-return-after-refit-save.png',
      readyLocator: page.getByTestId('mission-readiness-refit-return-status'),
      readyMarker: 'mission-readiness-refit-return-status',
      routeKind: 'product',
    });
  } finally {
    await deleteCampaign(page, seeded.campaignId).catch(() => undefined);
  }
}

async function stampGuestCoopSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    type CampaignStoreApi = {
      getState: () => {
        updateCampaign: (updates: Record<string, unknown>) => void;
      };
    };
    type ExposedCampaignStore = CampaignStoreApi | (() => CampaignStoreApi);

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: ExposedCampaignStore;
        };
      }
    ).__ZUSTAND_STORES__;

    if (!stores?.campaign) {
      throw new Error('Campaign store not exposed');
    }

    const exposed = stores.campaign;
    const store = 'getState' in exposed ? exposed : exposed();
    store.getState().updateCampaign({
      coopSession: {
        mode: 'guest',
        roomCode: 'GUESTGM',
        hostMatchId: 'match-gm-ledger-host',
      },
    });
  });
}

async function captureGmLedgerScreens(
  page: Page,
  manifestScreens: EvidenceScreen[],
): Promise<void> {
  await page.goto('/gameplay/campaigns', { waitUntil: 'domcontentloaded' });
  const campaignId = await createTestCampaign(page, {
    name: 'GM Ledger Evidence',
    cBills: 1_000_000,
    persist: true,
  });

  try {
    await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
      waitUntil: 'domcontentloaded',
    });
    await assertNoMekStationLoading(page);
    await page.getByTestId('gm-ledger-preview-btn').click();
    await expect(page.getByTestId('gm-ledger-preview-status')).toContainText(
      'ready',
    );
    await captureEvidence(page, manifestScreens, {
      file: '06-gm-ledger-preview.png',
      readyLocator: page.getByTestId('gm-ledger-preview-status'),
      readyMarker: 'gm-ledger-preview-status:ready',
      routeKind: 'product',
    });

    await page.getByTestId('gm-ledger-approve-btn').click();
    await expect(page.getByTestId('gm-ledger-approval-status')).toContainText(
      'Approved and applied',
    );
    await captureEvidence(page, manifestScreens, {
      file: '07-gm-ledger-approved-public-private.png',
      readyLocator: page.getByTestId('gm-ledger-approval-status'),
      readyMarker: 'gm-ledger-approval-status:approved',
      routeKind: 'product',
    });

    await stampGuestCoopSession(page);
    await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`, {
      waitUntil: 'domcontentloaded',
    });
    await assertNoMekStationLoading(page);
    await expect(
      page.getByTestId('gm-ledger-player-only-notice'),
    ).toBeVisible();
    await captureEvidence(page, manifestScreens, {
      file: '08-gm-ledger-guest-redacted.png',
      readyLocator: page.getByTestId('gm-ledger-player-only-notice'),
      readyMarker: 'gm-ledger-player-only-notice',
      routeKind: 'product',
    });
  } finally {
    await deleteCampaign(page, campaignId).catch(() => undefined);
  }
}

async function startInteractiveQuickSkirmish(page: Page): Promise<void> {
  await page.goto('/gameplay/quick', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/gameplay\/quick/);

  await page.getByTestId('start-quick-game-btn').click();

  await expect(
    page.getByRole('heading', { name: /select your units/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Atlas AS7-D/i }).click();
  await page.getByRole('button', { name: /Marauder MAD-3R/i }).click();
  await page.getByTestId('next-step-btn').click();

  await expect(
    page.getByRole('heading', { name: /configure scenario/i }),
  ).toBeVisible();
  await page.getByTestId('generate-scenario-btn').click();
  await expect(page.getByTestId('interactive-skirmish-btn')).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId('interactive-skirmish-btn').click();

  await page.waitForURL(/\/gameplay\/games\/[^/?]+$/, { timeout: 30_000 });
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('tactical-action-dock')).toBeVisible();
}

async function normalizeToPlayerMovementPhase(page: Page): Promise<void> {
  await page.evaluate(() => {
    const stores = window.__ZUSTAND_STORES__;
    const gameplay = stores?.gameplay as
      | {
          getState: () => {
            interactiveSession?: {
              advancePhase: () => void;
              getSession: () => {
                id: string;
                events: readonly unknown[];
                currentState: {
                  phase: string;
                  units: Record<
                    string,
                    {
                      id: string;
                      side: string;
                      destroyed?: boolean;
                      position: HexCoord;
                    }
                  >;
                };
              };
            } | null;
            ui?: Record<string, unknown>;
          };
          setState: (state: Record<string, unknown>) => void;
        }
      | undefined;

    if (!gameplay) throw new Error('Gameplay store not exposed');
    const interactiveSession = gameplay.getState().interactiveSession;
    if (!interactiveSession) throw new Error('Interactive session missing');

    for (let index = 0; index < 8; index += 1) {
      if (interactiveSession.getSession().currentState.phase === 'movement') {
        break;
      }
      interactiveSession.advancePhase();
    }

    const session = interactiveSession.getSession();
    if (session.currentState.phase !== 'movement') {
      throw new Error(
        `Expected movement phase, found ${session.currentState.phase}`,
      );
    }

    const normalizedSession = {
      ...session,
      currentState: {
        ...session.currentState,
        firstMover: 'player',
        activationIndex: 0,
      },
    };
    (interactiveSession as { session?: typeof normalizedSession }).session =
      normalizedSession;

    const previousUi = gameplay.getState().ui ?? {};
    gameplay.setState({
      session: normalizedSession,
      interactivePhase: 'select_unit',
      plannedMovement: null,
      validMovementHexes: [],
      ui: {
        ...previousUi,
        selectedUnitId: null,
        targetUnitId: null,
        queuedWeaponIds: [],
      },
    });
  });
}

async function selectActiveUnitForMovement(page: Page): Promise<void> {
  const activeRailUnit = page
    .locator('[data-testid^="rail-unit-"][aria-current="true"]')
    .first();
  await expect(activeRailUnit).toBeVisible({ timeout: 20_000 });
  const railTestId = await activeRailUnit.getAttribute('data-testid');
  const unitId = railTestId?.replace(/^rail-unit-/, '');
  if (!unitId) throw new Error('Active rail unit did not expose a unit id');
  await activeRailUnit.click({ force: true });

  const selected = await page
    .waitForFunction(
      (selectedUnitId) => {
        const gameplay = window.__ZUSTAND_STORES__?.gameplay as
          | {
              getState: () => {
                ui: { selectedUnitId: string | null };
              };
            }
          | undefined;
        const state = gameplay?.getState();
        return (
          state?.ui.selectedUnitId === selectedUnitId &&
          document.querySelectorAll(
            '[data-testid^="hex-"][data-reachable="true"]',
          ).length > 0
        );
      },
      unitId,
      { timeout: 3_000 },
    )
    .then(
      () => true,
      () => false,
    );

  if (!selected) {
    await page.evaluate((selectedUnitId) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              selectUnitForMovement?: (unitId: string) => void;
            };
          }
        | undefined;
      gameplay?.getState().selectUnitForMovement?.(selectedUnitId);
    }, unitId);
  }

  await page.waitForFunction(
    (selectedUnitId) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              ui: { selectedUnitId: string | null };
            };
          }
        | undefined;
      const state = gameplay?.getState();
      return (
        state?.ui.selectedUnitId === selectedUnitId &&
        document.querySelectorAll(
          '[data-testid^="hex-"][data-reachable="true"]',
        ).length > 0
      );
    },
    unitId,
    { timeout: 20_000 },
  );
}

async function captureTacticalCommandScreen(
  page: Page,
  manifestScreens: EvidenceScreen[],
): Promise<void> {
  await startInteractiveQuickSkirmish(page);
  await assertNoMekStationLoading(page);
  await normalizeToPlayerMovementPhase(page);
  await expect(page.getByTestId('phase-name')).toContainText(/Movement/i);
  await selectActiveUnitForMovement(page);
  await expect(page.getByTestId('map-panel')).toHaveAttribute(
    'data-map-panel-width',
    '74',
  );
  // Single Movement Authority (`tactical-movement-intent-composer`): the dock
  // no longer renders movement-verb buttons; the Movement Intent Composer is the
  // SOLE interactive movement-composition surface, and the in-map MP legend /
  // mode readout is non-interactive. Re-anchored from the removed Walk/Run/Jump
  // mode buttons to the composer's posture palette / cost ledger / budget
  // resolver so the evidence exercises the intent-first flow, not mode buttons.
  await expect(page.getByTestId('movement-intent-composer')).toBeVisible();
  await expect(page.getByTestId('movement-posture-palette')).toBeVisible();
  await expect(page.getByTestId('movement-cost-ledger')).toBeVisible();
  await expect(page.getByTestId('movement-budget-resolver')).toBeVisible();
  // The composer never auto-picks: Lock-In is present but disabled until a mode
  // is chosen against a non-empty affordable set.
  await expect(page.getByTestId('movement-lock-in-btn')).toBeVisible();
  // Single Movement Authority also gates off the legacy planning panel while the
  // composer owns the unit — its mode/MP/heat readouts were a duplicate movement
  // surface, so the panel (and the mode readout it hosted) is absent, and the
  // removed dock mode switcher stays gone. The composer's ledger/resolver above
  // now carry the mode + MP readouts.
  await expect(page.getByTestId('combat-planning-panel-movement')).toHaveCount(
    0,
  );
  await expect(page.getByTestId('movement-mode-readout')).toHaveCount(0);
  await expect(page.getByTestId('movement-type-switcher')).toHaveCount(0);
  // The map is driven by the composer's affordable-mode envelopes — reachable
  // hexes render (the composer owns the map when active).
  await expect(
    page.locator('[data-testid^="hex-"][data-reachable="true"]').first(),
  ).toBeVisible();
  await expect(
    page.getByTestId('command-btn-facing.rotate-right'),
  ).toContainText('(D)');
  // Single Movement Authority: posture verbs live ONLY in the composer
  // palette while it is active — the dock must NOT render an Evade button,
  // and the palette's Evade keeps the (E) hotkey hint.
  await expect(page.getByTestId('command-btn-movement.evade')).toHaveCount(0);
  await expect(page.getByTestId('posture-action-EVADE')).toContainText('(E)');
  await expect(page.getByTestId('command-group-utility-danger')).toBeVisible();
  await expect(page.getByTestId('command-btn-utility.concede')).toHaveAttribute(
    'data-command-danger',
    'true',
  );
  await expect(page.getByTestId('tactical-action-dock')).not.toContainText(
    'Interactive:',
  );
  await captureEvidence(page, manifestScreens, {
    file: '09-tactical-command-map-movement.png',
    readyLocator: page.getByTestId('tactical-action-dock'),
    readyMarker: 'tactical-action-dock:movement',
    routeKind: 'product',
  });
}

async function captureNetworkedCommandScreens(
  page: Page,
  manifestScreens: EvidenceScreen[],
): Promise<void> {
  await page.goto('/e2e/networked-command-proof');
  await assertNoMekStationLoading(page);
  await page.getByTestId('network-proof-reset').click();
  await expect(page.getByTestId('networked-game-surface')).toBeVisible();
  await page.getByTestId('networked-gm-preview-btn').click();
  await expect(page.getByTestId('network-proof-preview-status')).toContainText(
    'Preview ready',
  );
  await page.getByTestId('networked-gm-approve-btn').click();
  await expect(page.getByTestId('network-command-result-feed')).toContainText(
    'Atlas armor corrected by the host GM.',
  );
  await captureEvidence(page, manifestScreens, {
    file: '10-networked-host-gm-authority.png',
    readyLocator: page.getByTestId('network-command-result-feed'),
    readyMarker: 'network-command-result-feed:host-result',
    routeKind: 'harness',
  });

  await page.getByTestId('network-proof-role-guest').click();
  await expect(
    page.getByTestId('network-command-authority-summary'),
  ).toContainText('Guest public mirror');
  await page.getByTestId('concede-button').click();
  await expect(page.getByTestId('network-proof-intent-log')).toContainText(
    'pid_guest:concede',
  );
  await captureEvidence(page, manifestScreens, {
    file: '11-networked-guest-public-result.png',
    readyLocator: page.getByTestId('network-command-authority-summary'),
    readyMarker: 'network-command-authority-summary:guest-public-mirror',
    routeKind: 'harness',
  });
}
