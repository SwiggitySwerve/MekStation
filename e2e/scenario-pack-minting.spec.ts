/**
 * Scenario Pack Minter — the ONLY way pack payloads are written (design D7
 * layer 1 "generator minting"; spec: "Generator-Minted Payloads"; tasks
 * 3.2/3.3). Drives the named flow-audit flow's UI actions (reusing the
 * SAME reusable helpers `e2e/flow-audits.spec.ts` itself calls —
 * `createCampaignViaWizard`/`openContractMarketAction`/
 * `acceptFirstContractAction`/`seedHiringHall`, `e2e/helpers/`) to reach a
 * `holdSafe: true` checkpoint, captures the campaign envelope via live
 * `GET /api/campaigns/:id`, runs `canonicalizePackPayload` (design D11 —
 * deterministic pack-scoped template ids, cross-store refs stripped), and
 * writes `e2e/scenario-packs/campaign/<id>.campaign.json` plus a
 * `<id>.provenance.json` sidecar (transcribed into `manifest.ts`'s
 * `provenance` field by hand — the registry stays a hand-maintained typed
 * TS module, the `e2e/flows/manifest.ts` precedent, never
 * generator-written).
 *
 * Env-gated (`MEKSTATION_MINT_PACK_ID`) and excluded from every default
 * project via `testIgnore` (`playwright.config.ts`) plus its own dedicated
 * `scenario-pack-mint` project — mirrors `flow-audits.spec.ts` /
 * `flow-audit`'s exact isolation pattern (design/tasks 3.4, R8) so a bare
 * `npm run test:e2e` never mints anything. Invoke via
 * `node scripts/qc/mint-scenario-pack.mjs <pack-id>`.
 *
 * **The experience pack's `standalonePilot` side-channel** (design R10's
 * "front-door pilot-row creation plan"): `pilot-xp-progression`'s genesis
 * checkpoint (`xp-surface-viewed`) creates a STANDALONE vault pilot with NO
 * campaign at all (`/gameplay/pilots/create` -> `POST /api/pilots`), but
 * every pack this loader can load is `kind: 'campaign'` (the only two
 * manifest kinds are `'campaign' | 'encounter'`,
 * `src/lib/scenarioPacks/packSchemas.ts`, already committed by task 2.1) —
 * loaded via `PUT /api/campaigns/:id` + `page.goto`. Reconciling this: the
 * experience pack's payload IS a (minimal, carrier) campaign envelope
 * satisfying `campaignPackSchema`, PLUS an additive `standalonePilot` field
 * (rides through the schema's `.passthrough()`, untyped by the committed
 * schema, read via a narrow local shape in `scenarioPackLoading.ts`) naming
 * the real `POST /api/pilots` request body. `loadCampaignPack` performs
 * that POST front-door on every load (a fresh server-minted pilot id per
 * load is inherently parallel-safe — no id-stamping of the pilot id family
 * needed, design D4's remap machinery is unaffected) and substitutes the
 * new pilot id into the manifest's `{pilotId}`-templated `targetRoute`. The
 * minter does not need to drive the pilot-creation wizard itself (the
 * created-per-load pilot is never captured/replayed, only its creation
 * PARAMETERS are), so the constant createRequest is defined directly here;
 * the real front-door pilot creation is exercised for real by
 * `loadCampaignPack` at LOAD time and hard-asserted by the pack's own
 * parity spec — this is where "front-door, fail-loud, parity-proven"
 * actually gets proven for the standalone pilot, not at mint time.
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7, D11, R10)
 */

import { expect, test, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  campaignPackSchema,
  type CampaignPackPayload,
} from '../src/lib/scenarioPacks/packSchemas';
import { canonicalizePackPayload } from '../src/lib/scenarioPacks/packStamping';
import {
  acceptFirstContractAction,
  createCampaignViaWizard,
  openContractMarketAction,
  type CampaignFlowRecorder,
} from './helpers/campaignFlow';
import { seedHiringHall } from './helpers/campaignSeeders';
import { assertNoMekStationLoading } from './helpers/wait';

// =============================================================================
// Env selection — mirrors flow-audits.spec.ts's MEKSTATION_FLOW_ID gate
// =============================================================================

function readEnv(name: string): string | null {
  const raw = process.env[name];
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

const MINT_PACK_ID = readEnv('MEKSTATION_MINT_PACK_ID');

/** A trivial recorder satisfying `CampaignFlowRecorder` — the minter has no checkpoint/finding machinery of its own, it just needs the shared UI-action helpers. */
class MintRecorder implements CampaignFlowRecorder {
  async step(
    _title: string,
    action: (page: Page) => Promise<void>,
  ): Promise<number> {
    await action(this.page);
    return 0;
  }
  constructor(private readonly page: Page) {}
}

/**
 * Save the current campaign to the server through the dashboard save card
 * (mirrors `flow-audits.spec.ts`'s own `saveCampaignToServer`, not exported
 * there — duplicated here as ~15 lines rather than exporting from a file
 * this change does not otherwise need to touch).
 */
async function saveCampaignToServer(
  page: Page,
  campaignId: string,
): Promise<void> {
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  const saveNow = page.getByTestId('campaign-save-now-btn');
  if ((await saveNow.count()) > 0 && (await saveNow.first().isVisible())) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/campaigns/${campaignId}`) &&
          response.status() === 200,
        { timeout: 30_000 },
      ),
      saveNow.click(),
    ]);
  }
  await expect(page.getByTestId('campaign-last-saved')).not.toContainText(
    'Never saved',
    {
      timeout: 5_000,
    },
  );
}

async function settleAutosave(page: Page): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2_000);
}

// =============================================================================
// Capture + canonicalize + write (shared tail every mint mode uses)
// =============================================================================

const REPO_ROOT = path.resolve(__dirname, '..');

interface MintResult {
  readonly packId: string;
  readonly genesisSource: string;
  readonly extra?: Record<string, unknown>;
}

/**
 * Captures the live campaign envelope, validates it (fail-loud — a
 * malformed capture must never silently become a malformed committed
 * pack), canonicalizes the id graph (design D11), re-validates the
 * canonicalized output (task 3.2 acceptance: "round-trips 2.1's campaign
 * schema"), attaches any `extra` passthrough fields (the experience pack's
 * `standalonePilot`), and writes both the payload and a provenance
 * sidecar.
 */
async function captureCanonicalizeAndWrite(
  page: Page,
  result: MintResult,
): Promise<void> {
  const campaignId = campaignIdFromUrl(page);
  const getResponse = await page.request.get(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
  );
  if (!getResponse.ok()) {
    throw new Error(
      `mint-scenario-pack: capture GET failed for pack "${result.packId}" — server responded ${getResponse.status()}`,
    );
  }
  const raw: unknown = await getResponse.json();
  // Fail-loud on the raw capture BEFORE canonicalizing — a malformed
  // capture must never silently become a malformed committed pack.
  const captured = campaignPackSchema.parse(raw);

  const { payload: canonicalized } = canonicalizePackPayload(captured, {
    packId: result.packId,
  });

  const withExtra: CampaignPackPayload & Record<string, unknown> = {
    ...canonicalized,
    ...(result.extra ?? {}),
  };

  // Round-trip validation (task 3.2 acceptance): the canonicalized +
  // extra-attached payload must still satisfy the campaign pack schema.
  campaignPackSchema.parse(withExtra);

  const payloadDir = path.join(REPO_ROOT, 'e2e', 'scenario-packs', 'campaign');
  fs.mkdirSync(payloadDir, { recursive: true });
  const payloadPath = path.join(payloadDir, `${result.packId}.campaign.json`);
  fs.writeFileSync(
    payloadPath,
    `${JSON.stringify(withExtra, null, 2)}\n`,
    'utf8',
  );

  const baseCommit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT })
    .toString()
    .trim();
  const provenance = {
    genesisSource: result.genesisSource,
    mintedAt: new Date().toISOString(),
    baseCommit,
  };
  const provenancePath = path.join(
    payloadDir,
    `${result.packId}.provenance.json`,
  );
  fs.writeFileSync(
    provenancePath,
    `${JSON.stringify(provenance, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `[mint-scenario-pack] wrote ${path.relative(REPO_ROOT, payloadPath)}`,
  );
  console.log(`[mint-scenario-pack] provenance: ${JSON.stringify(provenance)}`);
}

function campaignIdFromUrl(page: Page): string {
  const match = page.url().match(/\/gameplay\/campaigns\/([^/?#]+)/);
  if (!match) {
    throw new Error(
      `mint-scenario-pack: could not read campaign id from ${page.url()}`,
    );
  }
  return decodeURIComponent(match[1]);
}

// =============================================================================
// Mint modes — one per pilot pack this group mints (task 3.3)
// =============================================================================

const MINT_CAMPAIGN_DESCRIPTION =
  'Scenario pack minter capture (generator-minted, never hand-authored).';

/** navigation-briefing: campaign-create-to-launch @ contract-accepted. */
async function mintNavigationBriefing(page: Page): Promise<void> {
  const recorder = new MintRecorder(page);
  const campaign = await createCampaignViaWizard(recorder, page, {
    name: `Mint navigation-briefing ${Date.now()}`,
    description: MINT_CAMPAIGN_DESCRIPTION,
  });
  await saveCampaignToServer(page, campaign.campaignId);
  await openContractMarketAction(page, campaign.campaignId);
  await acceptFirstContractAction(page);
  await settleAutosave(page);

  await captureCanonicalizeAndWrite(page, {
    packId: 'navigation-briefing',
    genesisSource: 'flow:campaign-create-to-launch@contract-accepted',
  });
}

/** personnel-roster: personnel-hiring @ roster-updated. */
async function mintPersonnelRoster(page: Page): Promise<void> {
  const recorder = new MintRecorder(page);
  const campaign = await createCampaignViaWizard(recorder, page, {
    name: `Mint personnel-roster ${Date.now()}`,
    description: MINT_CAMPAIGN_DESCRIPTION,
  });
  await saveCampaignToServer(page, campaign.campaignId);

  const offerId = `mint-hire-${Date.now()}`;
  await page.goto(`/gameplay/campaigns/${campaign.campaignId}/hiring`);
  await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 20_000 });
  await seedHiringHall(page, [
    { offerId, pilotName: 'Mint Pack Recruit', hireBonus: 25_000 },
  ]);
  await expect(page.getByTestId(`candidate-card-${offerId}`)).toBeVisible({
    timeout: 15_000,
  });

  const hireBtn = page.getByTestId(`candidate-hire-${offerId}`);
  await expect(hireBtn).toBeVisible({ timeout: 15_000 });
  await hireBtn.click();
  await page.waitForTimeout(1_000);
  await settleAutosave(page);

  // `campaign-save-status-card`/`campaign-save-now-btn` only render on the
  // dashboard route, not the hiring page — return there to force-flush the
  // hire through a real Save Now click before capturing (mirrors the
  // dashboard-only save-card contract every other mint mode also uses).
  await page.goto(`/gameplay/campaigns/${campaign.campaignId}`);
  await saveCampaignToServer(page, campaign.campaignId);

  await page.goto(`/gameplay/campaigns/${campaign.campaignId}/personnel`);
  await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 20_000 });
  await assertNoMekStationLoading(page);

  await captureCanonicalizeAndWrite(page, {
    packId: 'personnel-roster',
    genesisSource: 'flow:personnel-hiring@roster-updated',
  });
}

/**
 * experience-pilot: a minimal carrier campaign (satisfies `campaignPackSchema`'s
 * required floor) plus the `standalonePilot` side-channel (design R10 — see
 * this file's header comment).
 */
async function mintExperiencePilot(page: Page): Promise<void> {
  const recorder = new MintRecorder(page);
  const campaign = await createCampaignViaWizard(recorder, page, {
    name: `Mint experience-pilot ${Date.now()}`,
    description: MINT_CAMPAIGN_DESCRIPTION,
  });
  await saveCampaignToServer(page, campaign.campaignId);

  await captureCanonicalizeAndWrite(page, {
    packId: 'experience-pilot',
    genesisSource: 'flow:pilot-xp-progression@xp-surface-viewed',
    extra: {
      standalonePilot: {
        createRequest: {
          mode: 'template',
          template: 'veteran',
          identity: {
            name: 'Scenario Pack Pilot',
            callsign: 'PACK-XP',
            background:
              'Minted by the scenario-pack experience-pilot generator.',
          },
        },
      },
    },
  });
}

const MINT_MODES: Record<string, (page: Page) => Promise<void>> = {
  'navigation-briefing': mintNavigationBriefing,
  'personnel-roster': mintPersonnelRoster,
  'experience-pilot': mintExperiencePilot,
};

// =============================================================================
// Test entry — one test per registered mint mode, env-selected
// =============================================================================

test.describe('scenario pack minting', () => {
  for (const packId of Object.keys(MINT_MODES)) {
    test(`mint ${packId}`, async ({ page }) => {
      test.skip(
        MINT_PACK_ID !== packId,
        `MEKSTATION_MINT_PACK_ID=${MINT_PACK_ID ?? ''} selected; skipping mint of ${packId}`,
      );
      test.setTimeout(180_000);
      await MINT_MODES[packId](page);
    });
  }
});
