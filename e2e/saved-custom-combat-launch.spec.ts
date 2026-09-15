/**
 * Server-saved custom unit through the PRODUCTION combat-launch route.
 *
 * `saved-custom-combat.spec.ts` stops at the Mech Bay.
 * `encounter-combat-continuity.spec.ts` proves pre-battle -> terminal ->
 * post-battle-review, but only for store-seeded CANONICAL units that never
 * touch `missions/:id/launch`. Neither clicks `launch-mission-direct` with a
 * real `custom-*` roster unit, so the saved-custom boundary of the combat
 * chain has never had a browser witness. This spec closes that gap.
 *
 * The saved Atlas is DELIBERATELY off-canonical by one value (left-arm armor
 * 30 vs the canonical 34): that delta is the no-substitution probe, since
 * every readback below would look identical for a canonical Atlas EXCEPT the
 * seeded armor. The canonical comparison rides in the same battle for free —
 * the OpFor is materialized from canonical representative units, so one
 * GameCreated payload witnesses both seeds side by side.
 *
 * @tags @customizer @campaign @encounter @combat
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

import atlas from '../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { withBrowserDiagnostics } from './helpers/browserDiagnostics';

/** Canonical `Atlas AS7-D` left-arm armor; the saved design moves it to 30. */
const CANONICAL_LEFT_ARM_ARMOR = atlas.armor.allocation.LEFT_ARM;
const CUSTOM_LEFT_ARM_ARMOR = 30;

test.use({ serviceWorkers: 'block' });
// Wizard + persistence + materialization + battle + review + cold reload.
test.setTimeout(240_000);

interface SessionProof {
  readonly sessionId: string | null;
  readonly status: string | null;
  readonly config: Record<string, string | null | undefined> | null;
  /** Units as stamped onto the GameCreated seed event. */
  readonly createdUnits: readonly {
    id: string;
    unitRef: string;
    side: string | null;
    leftArmArmor: number | null;
  }[];
  /** Terminal per-unit combat state, keyed by session unit id. */
  readonly terminalUnits: readonly {
    id: string;
    leftArmArmor: number | null;
    side: string | null;
  }[];
  readonly pendingBattleOutcomes: readonly {
    matchId: string;
    contractId: string;
    scenarioId: string;
  }[];
  readonly processedBattleIds: readonly string[];
}

/**
 * Read the live gameplay session plus the campaign battle ledger out of the
 * production stores. GameCreated is the authoritative record of what
 * construction actually entered combat.
 */
async function readSessionProof(page: Page): Promise<SessionProof> {
  return page.evaluate(() => {
    type Armor = Record<string, number> | undefined;
    type Unit = SessionProof['createdUnits'][number];
    type Seed = Unit & { side?: string; armorByLocation?: Armor };
    type State = { side?: string; destroyed?: boolean; armor?: Armor };
    type Session = {
      id: string;
      config: SessionProof['config'];
      events: { type: string; payload?: { units?: Seed[] } }[];
      currentState: {
        status: string;
        units: Record<string, State>;
      };
    } | null;
    type Keys = 'pendingBattleOutcomes' | 'processedBattleIds';
    type Ledger = Pick<SessionProof, Keys>;
    type Store<T> = { getState: () => T } | undefined;

    // Combat-side location keys are lower_snake_case: the catalog adapter
    // maps the construction's `LEFT_ARM` through LOCATION_KEY_MAP
    // (`CompendiumAdapter.armor.ts`) before it reaches `armorByLocation`.
    const leftArm = (armor: Armor): number | null =>
      typeof armor?.left_arm === 'number' ? armor.left_arm : null;
    type Exposed = {
      campaign?: Store<Ledger>;
      gameplay?: Store<{ session: Session }>;
    };
    const stores = (window as unknown as { __ZUSTAND_STORES__?: Exposed })
      .__ZUSTAND_STORES__;

    const session = stores?.gameplay?.getState().session ?? null;
    const campaign = stores?.campaign?.getState();
    const created = session?.events.find(
      (event) => event.type === 'game_created',
    );

    return {
      sessionId: session?.id ?? null,
      status: session?.currentState.status ?? null,
      config: session?.config ?? null,
      createdUnits: (created?.payload?.units ?? []).map((unit) => ({
        id: unit.id,
        unitRef: unit.unitRef,
        side: unit.side ?? null,
        leftArmArmor: leftArm(unit.armorByLocation),
      })),
      terminalUnits: Object.entries(session?.currentState.units ?? {}).map(
        ([id, unit]) => ({
          id,
          leftArmArmor: leftArm(unit.armor),
          side: unit.side ?? null,
        }),
      ),
      pendingBattleOutcomes:
        campaign?.pendingBattleOutcomes.map((o) => ({
          matchId: o.matchId,
          contractId: o.contractId,
          scenarioId: o.scenarioId,
        })) ?? [],
      processedBattleIds: campaign?.processedBattleIds ?? [],
    };
  });
}

/**
 * Seed a mission onto the server-persisted campaign and push it back through
 * the same persistence store the launch page commits with. The create wizard
 * authors no missions, so this mirrors `campaign-customizer-handoff.spec.ts`.
 */
async function seedMissionOnCampaign(
  page: Page,
  missionId: string,
): Promise<void> {
  const status = await page.evaluate(async (id) => {
    type StoreApi = { getState: () => Record<string, unknown> };
    type Exposed = { campaign?: StoreApi; campaignPersistence?: StoreApi };
    const stores = (window as unknown as { __ZUSTAND_STORES__?: Exposed })
      .__ZUSTAND_STORES__;
    if (!stores?.campaign || !stores.campaignPersistence) {
      throw new Error('Campaign E2E stores are not exposed');
    }

    type Mission = Record<string, unknown>;
    const campaignState = stores.campaign.getState() as {
      getCampaign: () => { missions: Map<string, unknown> } | null;
      updateCampaign: (updates: Record<string, unknown>) => void;
      // Returns null (not undefined) for a wizard-created campaign whose
      // missions store has not been attached yet, so the call result needs
      // its own optional chain, not just the method reference.
      getMissionsStore?: () => {
        getState: () => { addMission?: (mission: Mission) => void };
      } | null;
    };
    const campaign = campaignState.getCampaign();
    if (!campaign) {
      throw new Error('Campaign is not loaded in the campaign store');
    }

    const at = '3025-01-03T00:00:00.000Z';
    const mission = {
      id,
      name: 'Saved Custom Combat Launch Proof',
      status: 'Active',
      type: 'mission',
      systemId: 'terra',
      scenarioIds: [],
      description: 'Browser proof mission for saved-custom combat launch.',
      startDate: '3025-01-03',
      createdAt: at,
      updatedAt: at,
    };
    const missions = new Map(campaign.missions);
    missions.set(id, mission);
    campaignState.updateCampaign({ missions });
    campaignState.getMissionsStore?.()?.getState().addMission?.(mission);

    const persistence = stores.campaignPersistence.getState() as {
      saveCampaign: (o?: { retryOnConflict?: boolean }) => Promise<{
        status: string;
      }>;
    };
    return (await persistence.saveCampaign({ retryOnConflict: false })).status;
  }, missionId);

  expect(status, 'seeded mission must persist server-side').toBe('saved');
}

/** Server readback of the roster triple that must survive the whole loop. */
async function readRosterUnit(
  request: APIRequestContext,
  campaignId: string,
  rosterId: string,
): Promise<unknown> {
  const response = await request.get(`/api/campaigns/${campaignId}`);
  expect(response.ok()).toBe(true);
  const unit = (await response.json()).body.rosterProjection.units.find(
    (entry: { unitId: string }) => entry.unitId === rosterId,
  );
  expect(unit, `roster instance ${rosterId} must be present`).toBeTruthy();
  return unit;
}

test('server-saved custom unit launches through production combat to a durable post-battle roster @customizer @campaign @encounter @combat', async ({
  page,
  request,
}, testInfo) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
  const variant = `Launch proof ${Date.now()}-${testInfo.workerIndex}`;
  const name = `Atlas ${variant}`;
  const missionId = `mission-launch-${Date.now()}-${testInfo.workerIndex}`;
  let customId = '';
  let campaignId = '';

  try {
    await withBrowserDiagnostics(page, testInfo, async () => {
      const armor = {
        ...atlas.armor,
        allocation: {
          ...atlas.armor.allocation,
          LEFT_ARM: CUSTOM_LEFT_ARM_ARMOR,
        },
      };
      const createdResponse = await request.post('/api/units/custom', {
        data: { chassis: 'Atlas', variant, data: { ...atlas, variant, armor } },
      });
      expect(createdResponse.status()).toBe(201);
      const created = await createdResponse.json();
      expect(created.success).toBe(true);
      customId = created.data.id;
      expect(customId).toMatch(/^custom-/);
      expect(CUSTOM_LEFT_ARM_ARMOR).not.toBe(CANONICAL_LEFT_ARM_ARMOR);

      const catalog = await request.get('/api/units/custom/combat-catalog');
      expect(catalog.ok()).toBe(true);
      expect((await catalog.json()).customCombatRefs).toContain(customId);

      await page.goto('/gameplay/campaigns/create');
      await page.getByTestId('campaign-name-input').fill(name);
      await page.getByTestId('wizard-next-btn').click();
      await page.getByTestId('wizard-next-btn').click();
      await page.getByTestId('wizard-next-btn').click();
      await page
        .getByRole('button', { name: `Add saved design ${name}`, exact: true })
        .click();
      const selected = page.locator('[data-unit-source="custom"]');
      await expect(selected).toHaveAttribute('data-unit-ref', customId);
      const rosterId = (await selected.getAttribute('data-testid'))?.replace(
        /^roster-unit-/,
        '',
      );
      expect(rosterId).toBeTruthy();
      expect(rosterId).not.toBe(customId);
      await page.getByTestId('wizard-next-btn').click();
      const savedResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes('/api/campaigns/') &&
          response.ok(),
      );
      await page.getByTestId('wizard-submit-btn').click();
      const saved = await savedResponse;
      campaignId = new URL(saved.url()).pathname.split('/').pop()!;
      await page.waitForURL(new RegExp(`/gameplay/campaigns/${campaignId}`));

      const rosterBefore = await readRosterUnit(request, campaignId, rosterId!);
      expect(rosterBefore).toMatchObject({
        unitId: rosterId,
        unitRef: customId,
        unitSource: 'custom',
      });

      await page.goto(`/gameplay/campaigns/${campaignId}/mech-bay`);
      await expect(page.getByTestId('mech-bay-grid')).toBeVisible();
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();

      await page.goto(`/gameplay/campaigns/${campaignId}`);
      await seedMissionOnCampaign(page, missionId);
      await page.goto(
        `/gameplay/campaigns/${campaignId}/missions/${missionId}/launch`,
      );
      await expect(page.getByTestId('mission-readiness-panel')).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.getByTestId(`mission-readiness-unit-${rosterId}`),
      ).toBeVisible();
      const launchButton = page.getByTestId('launch-mission-direct');
      await expect(launchButton).toBeEnabled({ timeout: 30_000 });

      await launchButton.click();
      await page.waitForURL(
        (url) =>
          /^\/gameplay\/encounters\/[^/]+$/.test(url.pathname) &&
          url.searchParams.get('campaignId') === campaignId &&
          url.searchParams.get('missionId') === missionId,
        { timeout: 60_000 },
      );
      const path = new URL(page.url()).pathname;
      const encounterId = decodeURIComponent(path.split('/').pop()!);
      expect(encounterId).toBeTruthy();

      // --- 7. Server readback: the encounter's player force carries the
      //        CUSTOM ref, not a canonical stand-in.
      const encounterResponse = await request.get(
        `/api/encounters/${encodeURIComponent(encounterId)}`,
      );
      expect(encounterResponse.ok()).toBe(true);
      const enc = (await encounterResponse.json()).encounter;
      const playerForceId = enc.playerForce.forceId;
      expect(playerForceId).toBeTruthy();
      const forceResponse = await request.get(
        `/api/forces/${encodeURIComponent(playerForceId)}`,
      );
      expect(forceResponse.ok()).toBe(true);
      const assignedUnitIds = (await forceResponse.json()).force.assignments
        .map((assignment: { unitId: string | null }) => assignment.unitId)
        .filter(Boolean);
      expect(assignedUnitIds).toContain(customId);

      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled({
        timeout: 30_000,
      });
      await page.getByTestId('launch-encounter-btn').click();
      await page.waitForURL(
        (url) =>
          url.pathname ===
            `/gameplay/encounters/${encodeURIComponent(encounterId)}/pre-battle` &&
          url.searchParams.get('campaignId') === campaignId &&
          url.searchParams.get('missionId') === missionId,
        { timeout: 30_000 },
      );
      await expect(page.getByTestId('mode-selection')).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByTestId('auto-resolve-btn')).toBeEnabled();
      // Terminal archive writes are fire-and-forget effects (see
      // `GameSessionPage.lifecycle.ts`), so await them before navigating off
      // the completed screen or navigation cancels the POSTs.
      const archivedReplay = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r.url().includes('/api/replay-library/encounter'),
        { timeout: 60_000 },
      );
      const archivedMatch = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' && r.url().includes('/api/matches'),
        { timeout: 60_000 },
      );
      await page.getByTestId('auto-resolve-btn').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/games/[^?]+\\?campaignId=${campaignId}&missionId=${missionId}`,
        ),
        { timeout: 60_000 },
      );
      await expect(page.getByTestId('game-completed')).toBeVisible({
        timeout: 30_000,
      });

      const terminal = await readSessionProof(page);
      expect(terminal.sessionId).toBeTruthy();
      expect(terminal.status).toBe('completed');
      expect(terminal.config).toMatchObject({
        campaignId,
        contractId: missionId,
        scenarioId: encounterId,
        encounterId,
      });

      const seededCustom = terminal.createdUnits.filter(
        (u) => u.unitRef === customId,
      );
      expect(seededCustom, 'one GameCreated unit carries the ref').toHaveLength(
        1,
      );
      expect(seededCustom[0]!.side).toBe('player');
      expect(
        seededCustom[0]!.leftArmArmor,
        'the custom construction, not a canonical Atlas, must seed combat',
      ).toBe(CUSTOM_LEFT_ARM_ARMOR);

      // Canonical comparison inside the same battle: the OpFor is canonical,
      // seeded from the catalog, and is armor-seeded on the same code path.
      const canonical = terminal.createdUnits.filter(
        (u) => !u.unitRef.startsWith('custom-'),
      );
      expect(canonical.length, 'canonical OpFor is present').toBeGreaterThan(0);
      for (const unit of canonical) expect(unit.leftArmArmor).not.toBeNull();

      // --- 9b. Server-bound readback of the archived GameCreated snapshot.
      const replayResponse = await archivedReplay;
      expect(replayResponse.ok()).toBe(true);
      const archived = replayResponse.request().postDataJSON();
      expect(archived.gameId).toBe(terminal.sessionId);
      const archivedUnits = archived.events.find(
        (e: { type: string }) => e.type === 'game_created',
      ).payload.units;
      const archivedCustom = archivedUnits.filter(
        (u: { unitRef: string }) => u.unitRef === customId,
      );
      expect(archivedCustom).toHaveLength(1);
      expect(
        archivedCustom[0].armorByLocation.left_arm,
        'the archived GameCreated snapshot must carry the custom armor',
      ).toBe(CUSTOM_LEFT_ARM_ARMOR);
      expect((await archivedMatch).ok()).toBe(true);
      // The terminal persist effects can re-fire before their own guard
      // latches (the guard is set in the resolve callback), so let the
      // duplicate archive writes settle before navigating away.
      await page.waitForLoadState('networkidle');

      const terminalCustom = terminal.terminalUnits.find(
        (u) => u.id === seededCustom[0]!.id,
      );
      expect(terminalCustom, 'custom unit is in terminal state').toBeTruthy();
      expect(terminalCustom!.side).toBe('player');
      // Seeded from the CUSTOM allocation and may only have gone down.
      expect(terminalCustom!.leftArmArmor).not.toBeNull();
      expect(terminalCustom!.leftArmArmor!).toBeLessThanOrEqual(
        CUSTOM_LEFT_ARM_ARMOR,
      );

      expect(terminal.pendingBattleOutcomes).toContainEqual({
        matchId: terminal.sessionId!,
        contractId: missionId,
        scenarioId: encounterId,
      });
      await page.goto(`/gameplay/games/${terminal.sessionId}/review`);
      await expect(page.getByTestId('post-battle-review-screen')).toBeVisible({
        timeout: 30_000,
      });
      await page.getByTestId('apply-outcome-cta').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/campaigns/${campaignId}\\?pendingBattle=${terminal.sessionId}`,
        ),
        { timeout: 30_000 },
      );
      const applied = await readSessionProof(page);
      expect(applied.processedBattleIds).toContain(terminal.sessionId);
      expect(applied.pendingBattleOutcomes).not.toContainEqual(
        expect.objectContaining({ matchId: terminal.sessionId }),
      );

      await page.goto(`/gameplay/campaigns/${campaignId}/mech-bay`);
      await page.reload();
      await expect(page.getByTestId('mech-bay-grid')).toBeVisible();
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
      // Identity must be byte-stable across the battle; readiness/damage may
      // legitimately have moved, so only the identity triple is pinned.
      expect(
        await readRosterUnit(request, campaignId, rosterId!),
      ).toMatchObject({
        unitId: rosterId,
        unitRef: customId,
        unitSource: 'custom',
      });
      expect(
        (await request.get(`/api/units/custom/${customId}`)).ok(),
        'the saved custom row must survive the whole loop',
      ).toBe(true);

      await testInfo.attach('saved-custom-combat-launch-authority', {
        contentType: 'application/json',
        body: JSON.stringify({
          customId,
          rosterId,
          campaignId,
          missionId,
          encounterId,
          playerForceId,
          sessionId: terminal.sessionId,
          seededLeftArmArmor: seededCustom[0]!.leftArmArmor,
          canonicalLeftArmArmor: CANONICAL_LEFT_ARM_ARMOR,
        }),
      });
    });
  } finally {
    const cleanup = async (path: string): Promise<void> => {
      expect((await request.delete(path)).ok()).toBe(true);
    };
    if (campaignId) await cleanup(`/api/campaigns/${campaignId}`);
    if (customId) await cleanup(`/api/units/custom/${customId}`);
  }
});
