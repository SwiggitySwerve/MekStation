/**
 * UX Walkthrough Audit — normal-user journeys with per-step screenshot catalog
 *
 * Run via `npm run qc:ux-audit` (see scripts/qc/run-ux-walkthrough.mjs). Each
 * test below walks one user journey the way a first-time player would — no
 * seeded fixtures, no harness routes — and records every step (screenshot,
 * route, console errors, timing) through WalkthroughRecorder into the per-run
 * catalog under .sisyphus/evidence/ux-walkthrough/<runId>/.
 *
 * Journeys are intentionally tolerant: a broken step records its failure
 * evidence and fails the journey test, but every journey runs regardless of
 * the others (fresh browser context per test = fresh client-side storage).
 */

import { expect, test } from '@playwright/test';

import { createWalkthroughRecorder } from './helpers/uxWalkthrough';
import { assertNoMekStationLoading } from './helpers/wait';

// A journey covers many screens on a dev server that compiles routes on first
// hit — budget generously; the recorder tracks per-step timing for review.
test.setTimeout(300_000);

test.describe('ux walkthrough audit — desktop', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('journey: first visit and global navigation', async ({
    page,
  }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '01-first-visit-navigation',
      'first-time visitor exploring the app shell',
      testInfo,
    );
    try {
      await walk.step('land on dashboard', async () => {
        await page.goto('/');
        await expect(
          page.getByRole('heading', { name: 'MekStation' }),
        ).toBeVisible();
        await assertNoMekStationLoading(page);
      });

      await walk.step('open Browse menu', async () => {
        await page.getByRole('button', { name: 'Browse', exact: true }).click();
        await expect(page.getByRole('menu')).toBeVisible();
      });

      await walk.step('open Gameplay menu', async () => {
        await page
          .getByRole('button', { name: 'Gameplay', exact: true })
          .click();
        await expect(
          page.getByRole('menuitem', { name: 'Quick Game' }),
        ).toBeVisible();
      });

      await walk.step('visit gameplay hub from dashboard card', async () => {
        await page.keyboard.press('Escape');
        await page
          .getByRole('link', { name: /gameplay start quick games/i })
          .click();
        await expect(page.getByTestId('page-title')).toHaveText('Gameplay');
      });

      await walk.step('read onboarding page', async () => {
        await page.goto('/onboarding');
        await assertNoMekStationLoading(page);
      });

      await walk.step('return to dashboard from onboarding', async () => {
        await page.getByRole('link', { name: /back to dashboard/i }).click();
        await expect(
          page.getByRole('heading', { name: 'MekStation' }),
        ).toBeVisible();
      });

      await walk.step('open settings', async () => {
        await page.getByRole('link', { name: 'Settings' }).click();
        await expect(page.getByTestId('page-title')).toHaveText('Settings');
      });
    } finally {
      walk.finish();
    }
  });

  test('journey: browse the compendium', async ({ page }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '02-compendium-browse',
      'player researching units and equipment',
      testInfo,
    );
    try {
      await walk.step('open compendium hub', async () => {
        await page.goto('/compendium');
        await expect(page.getByTestId('compendium-search')).toBeVisible();
      });

      await walk.step('search the compendium for "heat"', async () => {
        await page.getByTestId('compendium-search').fill('heat');
      });

      await walk.step('clear search and open unit database', async () => {
        await page.getByTestId('compendium-search').fill('');
        await page
          .getByTestId('compendium-units-section')
          .getByRole('link')
          .first()
          .click();
        await expect(
          page.getByRole('heading', { name: 'Unit Database' }),
        ).toBeVisible({ timeout: 20_000 });
      });

      await walk.step('open the first unit detail', async () => {
        const firstUnitLink = page
          .locator('table tbody tr')
          .first()
          .getByRole('link')
          .first();
        await expect(firstUnitLink).toBeVisible({ timeout: 20_000 });
        await firstUnitLink.click();
        await expect(page).toHaveURL(/\/compendium\/units\/.+/);
        await assertNoMekStationLoading(page);
      });

      await walk.step('browser-back returns to unit database', async () => {
        await page.goBack();
        await expect(
          page.getByRole('heading', { name: 'Unit Database' }),
        ).toBeVisible({ timeout: 20_000 });
      });

      await walk.step('open equipment catalog', async () => {
        await page.goto('/compendium/equipment');
        await expect(
          page.getByRole('heading', { name: 'Equipment Catalog' }),
        ).toBeVisible({ timeout: 20_000 });
      });

      await walk.step('open the first equipment detail', async () => {
        const firstEquipmentLink = page
          .locator('table tbody tr')
          .first()
          .getByRole('link')
          .first();
        await expect(firstEquipmentLink).toBeVisible({ timeout: 20_000 });
        await firstEquipmentLink.click();
        await expect(page).toHaveURL(/\/compendium\/equipment\/.+/, {
          timeout: 20_000,
        });
        await assertNoMekStationLoading(page);
      });

      await walk.step('open rules reference', async () => {
        await page.goto('/compendium/rules');
        await assertNoMekStationLoading(page);
      });
    } finally {
      walk.finish();
    }
  });

  test('journey: fresh-profile empty states', async ({ page }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '03-fresh-profile-empty-states',
      'new player with no saved content yet',
      testInfo,
    );
    try {
      await walk.step('my units is empty', async () => {
        await page.goto('/units');
        await expect(page.getByTestId('page-title')).toHaveText(
          'Custom Units',
          { timeout: 20_000 },
        );
      });

      await walk.step('replay library', async () => {
        await page.goto('/replay-library');
        await expect(page.getByTestId('page-title')).toHaveText(
          'Replay Library',
          { timeout: 20_000 },
        );
      });

      // The library may be empty (fresh install) or populated (developer
      // machine with prior runs). Both are legitimate first-user states —
      // walk whichever path the profile presents and record which one ran.
      const emptyState = page.getByTestId('replay-library-empty');
      if (await emptyState.isVisible().catch(() => false)) {
        await walk.step(
          'empty-state CTA leads to quick game',
          async () => {
            await page.getByTestId('empty-state-quick-game').click();
            await expect(page).toHaveURL(/\/gameplay\/quick/);
            await assertNoMekStationLoading(page);
          },
          {
            note: 'Empty state offers a concrete next action — good recovery affordance.',
          },
        );
      } else {
        await walk.step(
          'watch the first replay',
          async () => {
            await page.getByRole('button', { name: 'Watch' }).first().click();
            await expect(
              page
                .getByTestId('back-to-library')
                .or(page.getByTestId('replay-viewer-error')),
            ).toBeVisible({ timeout: 30_000 });
          },
          {
            note: 'Library was already populated on this profile — exercised the watch path instead of the empty-state CTA.',
          },
        );

        await walk.step('return to the library', async () => {
          await page.getByTestId('back-to-library').click();
          await expect(page.getByTestId('page-title')).toHaveText(
            'Replay Library',
            { timeout: 20_000 },
          );
        });
      }
    } finally {
      walk.finish();
    }
  });

  test('journey: quick game to auto-resolve results', async ({
    page,
  }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '04-quick-game-auto-resolve',
      'player running their first quick battle',
      testInfo,
    );
    try {
      await walk.step('quick game welcome', async () => {
        await page.goto('/gameplay/quick');
        await expect(page.getByTestId('start-quick-game-btn')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('start setup', async () => {
        await page.getByTestId('start-quick-game-btn').click();
        await expect(
          page.getByRole('heading', { name: 'Select Your Units' }),
        ).toBeVisible();
      });

      await walk.step('add two units to my force', async () => {
        await page.getByRole('button', { name: /Atlas AS7-D/i }).click();
        await page.getByRole('button', { name: /Marauder MAD-3R/i }).click();
        await expect(page.getByTestId('next-step-btn')).toBeEnabled();
      });

      await walk.step('continue to scenario configuration', async () => {
        await page.getByTestId('next-step-btn').click();
        await expect(
          page.getByRole('heading', { name: /configure scenario/i }),
        ).toBeVisible();
      });

      await walk.step('generate scenario', async () => {
        await page.getByTestId('generate-scenario-btn').click();
        // Scenario generation auto-advances to Review once loading settles.
        await expect(page.getByTestId('start-game-btn')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('review scenario', async () => {
        await expect(
          page.getByRole('heading', { name: /review scenario/i }),
        ).toBeVisible();
      });

      await walk.step('auto-resolve the battle', async () => {
        await page.getByTestId('start-game-btn').click();
        await expect(page.getByRole('tab', { name: /summary/i })).toBeVisible({
          timeout: 60_000,
        });
        await expect(
          page.getByRole('heading', { name: /victory|defeat|draw/i }),
        ).toBeVisible();
      });

      await walk.step('inspect unit outcomes tab', async () => {
        await page.getByRole('tab', { name: /units/i }).click();
      });

      await walk.step('inspect replay tab', async () => {
        await page.getByRole('tab', { name: /replay/i }).click();
      });

      await walk.step('exit to games', async () => {
        await page.getByTestId('exit-btn').click();
        await expect(page).toHaveURL(/\/gameplay\/games/);
        await assertNoMekStationLoading(page);
      });
    } finally {
      walk.finish();
    }
  });

  test('journey: build a new unit in the customizer', async ({
    page,
  }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '05-customizer-new-unit',
      'player building their first custom BattleMech',
      testInfo,
    );
    try {
      await walk.step('open the customizer', async () => {
        await page.goto('/customizer');
        await expect(page.getByText('Loading customizer...')).toHaveCount(0, {
          timeout: 30_000,
        });
        await expect(
          page.getByRole('heading', { name: 'No Units Open' }),
        ).toBeVisible({ timeout: 20_000 });
      });

      await walk.step('open the new-unit dialog', async () => {
        await page.getByRole('button', { name: 'New Unit' }).first().click();
        await expect(
          page.getByRole('heading', { name: 'Create New Unit' }),
        ).toBeVisible();
      });

      await walk.step('create a default BattleMech', async () => {
        await page.getByRole('button', { name: 'Create Unit' }).click();
        await expect(page).toHaveURL(/\/customizer\/[0-9a-f-]+\/structure/, {
          timeout: 20_000,
        });
        await expect(page.getByTestId('structure-heat-sink-count')).toBeVisible(
          { timeout: 20_000 },
        );
      });

      await walk.step(
        'adjust heat sinks (autosave)',
        async () => {
          await page.getByTestId('structure-heat-sink-increment').click();
        },
        {
          note: 'Edits autosave to local storage; the transient Saved toast is the only save feedback.',
        },
      );

      await walk.step('view armor diagram', async () => {
        await page.getByRole('tab', { name: 'Armor' }).click();
        await expect(page.getByTestId('armor-diagram')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('view overview tab', async () => {
        await page.getByRole('tab', { name: 'Overview' }).click();
        await expect(page.getByTestId('omnimech-section')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('view equipment tab', async () => {
        const tab = page.getByRole('tab', { name: 'Equipment' });
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
      });

      await walk.step('view critical slots tab', async () => {
        const tab = page.getByRole('tab', { name: 'Critical Slots' });
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
      });

      await walk.step('view record sheet preview', async () => {
        const tab = page.getByRole('tab', { name: 'Preview' });
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
      });
    } finally {
      walk.finish();
    }
  });

  test('journey: create a campaign and reach a mission launch', async ({
    page,
  }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '06-campaign-create-to-launch',
      'player starting a mercenary campaign',
      testInfo,
    );
    let campaignId = '';
    let missionId = '';
    try {
      await walk.step('campaigns list (fresh profile)', async () => {
        await page.goto('/gameplay/campaigns');
        await expect(page.getByTestId('create-campaign-btn')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('start the campaign wizard', async () => {
        await page.getByTestId('create-campaign-btn').click();
        await expect(page.getByTestId('campaign-name-input')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('name the campaign', async () => {
        await page.getByTestId('campaign-name-input').fill('Steel Vanguards');
        await page
          .getByTestId('campaign-description-input')
          .fill('UX walkthrough audit campaign');
      });

      await walk.step('choose campaign type (default mercenary)', async () => {
        await page.getByTestId('wizard-next-btn').click();
        await expect(page.getByTestId('wizard-next-btn')).toBeVisible();
      });

      await walk.step('choose preset (default standard)', async () => {
        await page.getByTestId('wizard-next-btn').click();
        await expect(page.getByTestId('wizard-next-btn')).toBeVisible();
      });

      await walk.step('add a starting unit and pilot', async () => {
        await page.getByTestId('wizard-next-btn').click();
        const addUnit = page.locator('[data-testid^="add-unit-"]').first();
        await expect(addUnit).toBeVisible({ timeout: 20_000 });
        await addUnit.click();
        await page.getByTestId('add-pilot-btn').click();
      });

      await walk.step('review and create the campaign', async () => {
        await page.getByTestId('wizard-next-btn').click();
        await expect(page.getByTestId('wizard-submit-btn')).toBeVisible();
      });

      await walk.step('land on the campaign dashboard', async () => {
        await page.getByTestId('wizard-submit-btn').click();
        await expect(page.getByTestId('campaign-save-status-card')).toBeVisible(
          { timeout: 30_000 },
        );
        campaignId = new URL(page.url()).pathname.split('/').pop() ?? '';
        expect(campaignId).not.toBe('');
      });

      await walk.step(
        'save the campaign to the server',
        async () => {
          const saveButton = page.getByTestId('campaign-save-now-btn');
          await expect(saveButton).toBeEnabled({ timeout: 20_000 });
          const saved = page.waitForResponse(
            (response) =>
              response.url().includes('/api/campaigns/') &&
              response.request().method() === 'PUT' &&
              response.ok(),
            { timeout: 20_000 },
          );
          await saveButton.click();
          await saved;
        },
        {
          note: 'A new campaign lives only in browser storage until the player finds the Save now card — easy to lose a campaign without noticing.',
        },
      );

      await walk.step('visit the starmap', async () => {
        await page.getByRole('link', { name: 'Starmap' }).click();
        await expect(page).toHaveURL(/\/starmap/);
        await assertNoMekStationLoading(page);
      });

      await walk.step('visit the mech bay', async () => {
        await page.getByTestId('campaign-nav-bays-group').click();
        await page.getByRole('link', { name: 'Mech Bay', exact: true }).click();
        await expect(page).toHaveURL(/\/mech-bay/);
        await assertNoMekStationLoading(page);
      });

      await walk.step('browse the contract market', async () => {
        await page.getByTestId('campaign-nav-command-group').click();
        await page.getByRole('link', { name: 'Contract Market' }).click();
        await expect(page.getByTestId('contract-market-grid')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('accept a contract offer', async () => {
        const accept = page.locator('[data-testid^="offer-accept-"]').first();
        await expect(accept).toBeVisible({ timeout: 20_000 });
        const acceptTestId = await accept.getAttribute('data-testid');
        missionId = acceptTestId?.replace('offer-accept-', '') ?? '';
        await accept.click();
      });

      await walk.step('see the mission on the missions page', async () => {
        await page.getByRole('link', { name: 'Missions', exact: true }).click();
        await expect(
          page.locator('[data-testid^="mission-card-"]').first(),
        ).toBeVisible({ timeout: 20_000 });
        const launchLink = missionId
          ? page.getByTestId(`mission-launch-${missionId}`)
          : page.locator('[data-testid^="mission-launch-"]').first();
        await expect(launchLink).toBeVisible({ timeout: 20_000 });
      });

      await walk.step(
        'open the mission launch screen',
        async () => {
          const launchLink = missionId
            ? page.getByTestId(`mission-launch-${missionId}`)
            : page.locator('[data-testid^="mission-launch-"]').first();
          await launchLink.click();
          await expect(page.getByTestId('mission-launch-briefing')).toBeVisible(
            { timeout: 30_000 },
          );
          const launchEnabled = await page
            .getByTestId('launch-mission-direct')
            .isEnabled()
            .catch(() => false);
          walk.note(
            launchEnabled
              ? 'Launch button is enabled with the wizard-added roster.'
              : 'Launch button is disabled — readiness gating with the default wizard roster.',
          );
        },
        {
          note: 'Launch screen reached through the mission-card Launch link.',
        },
      );
    } finally {
      walk.finish();
    }
  });
});

test.describe('ux walkthrough audit — mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
  });

  test('journey: mobile navigation', async ({ page }, testInfo) => {
    const walk = createWalkthroughRecorder(
      page,
      '07-mobile-navigation',
      'phone user finding their way around',
      testInfo,
    );
    try {
      await walk.step('mobile dashboard', async () => {
        await page.goto('/');
        await expect(
          page.getByRole('heading', { name: 'MekStation' }),
        ).toBeVisible();
        await assertNoMekStationLoading(page);
      });

      await walk.step('open hamburger menu', async () => {
        await page.getByRole('button', { name: 'Open menu' }).click();
        await expect(page.getByTestId('mobile-menu')).toBeVisible();
      });

      await walk.step('navigate to quick game from mobile menu', async () => {
        await page
          .getByTestId('mobile-menu')
          .getByRole('link', { name: 'Quick Game' })
          .click();
        await expect(page).toHaveURL(/\/gameplay\/quick/);
        await expect(page.getByTestId('start-quick-game-btn')).toBeVisible({
          timeout: 20_000,
        });
      });

      await walk.step('mobile compendium hub', async () => {
        await page.goto('/compendium');
        await expect(page.getByTestId('compendium-search')).toBeVisible();
      });

      await walk.step('mobile unit database', async () => {
        await page.goto('/compendium/units');
        await expect(
          page.getByRole('heading', { name: 'Unit Database' }),
        ).toBeVisible({ timeout: 20_000 });
      });
    } finally {
      walk.finish();
    }
  });
});
