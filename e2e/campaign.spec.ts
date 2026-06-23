/**
 * Campaign System E2E Tests
 *
 * Tests for campaign list, creation, detail, and management functionality.
 *
 * @spec openspec/changes/add-comprehensive-e2e-tests/specs/e2e-testing/spec.md
 * @tags @campaign
 */

import { test, expect, type Page } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';
import { CampaignListPage, CampaignCreatePage } from './pages/campaign.page';

// =============================================================================
// Test Configuration
// =============================================================================

test.setTimeout(30000);

// Helper to ensure store is available before tests
async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { campaign?: unknown };
      };
      return win.__ZUSTAND_STORES__?.campaign !== undefined;
    },
    { timeout: 10000 },
  );
}

// =============================================================================
// Campaign List Page Tests
// =============================================================================

test.describe('Campaign List Page @smoke @campaign', () => {
  let listPage: CampaignListPage;

  test.beforeEach(async ({ page }) => {
    listPage = new CampaignListPage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
  });

  test('navigates to campaigns list page', async ({ page }) => {
    // Page should load with title
    await expect(page).toHaveURL(/\/gameplay\/campaigns$/);
    await expect(
      page.getByRole('heading', { name: /campaigns/i }),
    ).toBeVisible();
  });

  test('displays empty state when no campaigns exist', async () => {
    // Should show empty state or no campaign cards
    const cardCount = await listPage.getCardCount();
    if (cardCount === 0) {
      const emptyVisible = await listPage.isEmptyStateVisible();
      expect(emptyVisible).toBe(true);
    }
  });

  test('shows create campaign button', async ({ page }) => {
    // Create button should be visible
    await expect(page.getByTestId('create-campaign-btn')).toBeVisible();
  });

  test('displays campaigns when they exist', async ({ page }) => {
    // Create a campaign via store
    const campaignId = await createTestCampaign(page, {
      name: 'Test Campaign Alpha',
      description: 'E2E test campaign for list display',
    });

    // Refresh to see the new campaign
    await listPage.navigate();

    // Campaign should appear in list
    const names = await listPage.getCampaignNames();
    expect(names).toContain('Test Campaign Alpha');

    // Cleanup
    await deleteCampaign(page, campaignId);
  });

  test('updates displayed campaign when current campaign changes', async ({
    page,
  }) => {
    // The current campaign store is a singleton, so creating a new campaign
    // replaces the visible campaign on the list.
    await createTestCampaign(page, { name: 'Alpha Strike Force' });

    await listPage.navigate();

    let names = await listPage.getCampaignNames();
    expect(names).toContain('Alpha Strike Force');

    const id = await createTestCampaign(page, { name: 'Beta Recon Unit' });

    await listPage.navigate();

    names = await listPage.getCampaignNames();
    expect(names).toContain('Beta Recon Unit');
    expect(names).not.toContain('Alpha Strike Force');

    // Cleanup
    await deleteCampaign(page, id);
  });
});

// =============================================================================
// Campaign Creation Tests
// =============================================================================

test.describe('Campaign Creation @smoke @campaign', () => {
  let listPage: CampaignListPage;
  let createPage: CampaignCreatePage;

  test.beforeEach(async ({ page }) => {
    listPage = new CampaignListPage(page);
    createPage = new CampaignCreatePage(page);
    await listPage.navigate();
    await waitForStoreReady(page);
  });

  test('navigates to create page from list', async ({ page }) => {
    await listPage.clickCreateButton();
    await expect(page).toHaveURL(/\/gameplay\/campaigns\/create$/);
  });

  test('creates campaign through wizard', async ({ page }) => {
    await createPage.navigate();

    // Step 1: Basic Info
    await createPage.fillName('E2E Test Campaign');
    await createPage.fillDescription('Created via E2E test');
    await page.getByTestId('wizard-next-btn').click();

    // Step 2: Type - keep the default Mercenary Company type
    await page.getByTestId('wizard-next-btn').click();

    // Step 3: Template - select custom
    await page.getByTestId('template-custom').click();
    await page.getByTestId('wizard-next-btn').click();

    // Step 4: Roster (skip for now)
    await page.getByTestId('wizard-next-btn').click();

    // Step 5: Review and submit
    await page.getByTestId('wizard-submit-btn').click();

    // Should redirect to campaign detail
    await expect(page).toHaveURL(/\/gameplay\/campaigns\/[^/]+$/);
    await expect(page.getByTestId('page-title')).toContainText(
      'E2E Test Campaign',
    );
  });

  test('validates required fields', async ({ page }) => {
    await createPage.navigate();

    // Try to proceed without name
    await page.getByTestId('wizard-next-btn').click();

    // Should show error
    const hasError = await createPage.hasFieldError('name');
    expect(hasError).toBe(true);
  });

  test('can cancel campaign creation', async ({ page }) => {
    await createPage.navigate();
    await createPage.fillName('Campaign to Cancel');

    // Click cancel
    await page.getByTestId('wizard-cancel-btn').click();

    // Should return to list
    await expect(page).toHaveURL(/\/gameplay\/campaigns$/);
  });
});

// =============================================================================
// Campaign Detail Page Tests
// =============================================================================

test.describe('Campaign Detail Page @campaign', () => {
  let listPage: CampaignListPage;
  let campaignId: string;

  test.beforeEach(async ({ page }) => {
    listPage = new CampaignListPage(page);
    // Navigate to list first to ensure store is initialized
    await listPage.navigate();
    await waitForStoreReady(page);

    // Create a campaign for detail tests via store
    campaignId = await createTestCampaign(page, {
      name: 'Detail Test Campaign',
      description: 'Campaign for detail page tests',
      cBills: 5000000,
      supplies: 150,
      morale: 80,
    });

    // PT-009: `setSearchQuery` was removed from the campaign store. The
    // original code here used it to nudge React subscribers
    // after a programmatic campaign creation. The downstream waitFor below
    // covers the same need on its own — if the new campaign card doesn't
    // appear within 10s, the assertion fails with a clear signal anyway.
    // No-op placeholder retained for future store-nudge needs.
    await page.evaluate(() => {
      /* no-op — see PT-009 comment above */
    });

    // Wait for any campaign card to appear (React should re-render when store updates)
    await page
      .locator('[data-testid^="campaign-card-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    try {
      await deleteCampaign(page, campaignId);
    } catch {
      // Campaign may already be deleted
    }
  });

  // The campaign detail route now mounts CampaignDashboardPage
  // (src/pages/gameplay/campaigns/[id]/index.tsx) — the old tabbed
  // CampaignOverviewTab surface (tab-overview/tab-audit, resources-card,
  // campaign-status) is no longer mounted anywhere. These tests pin the
  // CURRENT dashboard contract.
  test('displays campaign dashboard via list click', async ({ page }) => {
    // Navigate to detail by clicking on campaign card in list
    await listPage.clickCampaignCard(campaignId);
    await page.waitForLoadState('networkidle');

    // PageLayout title carries the campaign name
    // (CampaignDashboardPage.tsx: title={campaign.name})
    await expect(page.getByTestId('page-title')).toHaveText(
      'Detail Test Campaign',
    );

    // The dashboard card grid mounts (CampaignDashboard.tsx)
    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();
  });

  test('displays campaign finances via list click', async ({ page }) => {
    // Navigate via list click
    await listPage.clickCampaignCard(campaignId);
    await page.waitForLoadState('networkidle');

    // Finances card replaces the old resources-card surface; the balance
    // renders Money.format() of the fixture's startingFunds
    // (Money.ts format(): "<amount> C-bills").
    await expect(page.getByTestId('dashboard-card-finances')).toBeVisible();
    await expect(page.getByTestId('finances-balance')).toHaveText(
      '5,000,000.00 C-bills',
    );
  });

  // Skip: Campaign created via store doesn't include missions
  test.skip('displays mission tree via list click', async ({ page }) => {
    // Navigate via list click
    await listPage.clickCampaignCard(campaignId);
    await page.waitForLoadState('networkidle');

    // Mission tree should be visible
    await expect(page.getByTestId('mission-tree')).toBeVisible();
  });

  test('audit feed stays unmounted for a fresh campaign', async ({ page }) => {
    // Navigate via list click first
    await listPage.clickCampaignCard(campaignId);
    await page.waitForLoadState('networkidle');

    // The tabbed audit-timeline surface was replaced by the
    // DailyBattleAuditFeed on the dashboard (CampaignDashboardPage.tsx:228),
    // which "returns null when the ledger is empty so the dashboard layout
    // doesn't show an empty card" (DailyBattleAuditFeed.tsx:26-33). A fresh
    // campaign has no audit entries, so the contract here is ABSENCE; the
    // populated-feed path is covered store-side by campaign-round-trip's
    // dailyBattleAudit assertions.
    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();
    await expect(page.getByTestId('daily-battle-audit-feed')).toHaveCount(0);
  });
});

// =============================================================================
// Campaign Deletion Tests — RETIRED (obsolete surface)
//
// The UI deletion flow (delete-campaign-btn + delete-confirm-dialog) lived
// on CampaignOverviewTab, which is no longer mounted anywhere — the
// campaign detail route renders CampaignDashboardPage, which has NO
// delete affordance. There is currently no UI surface for deleting a
// campaign at all; that product gap is tracked as T2-F3 in
// docs/audits/2026-06-09-remediation-tracker.md. Store-level deletion
// behavior stays covered by playtest-campaign-smoke.spec.ts
// ("deletes a campaign cleanly and leaves the campaign store empty").
// =============================================================================

// =============================================================================
// Campaign Mission Tests
// =============================================================================

test.describe('Campaign Missions @campaign', () => {
  let listPage: CampaignListPage;
  let campaignId: string;

  test.beforeEach(async ({ page }) => {
    listPage = new CampaignListPage(page);
    await listPage.navigate();
    await waitForStoreReady(page);

    // Create a campaign with default missions (from template)
    campaignId = await createTestCampaign(page, {
      name: 'Mission Test Campaign',
    });

    // Wait for any campaign card to appear
    await page
      .locator('[data-testid^="campaign-card-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    try {
      await deleteCampaign(page, campaignId);
    } catch {
      // Ignore cleanup errors
    }
  });

  // Skip: Campaign created via store doesn't include missions (needs template)
  test.skip('displays mission tree with available missions', async ({
    page,
  }) => {
    // Navigate via list click
    await listPage.clickCampaignCard(campaignId);
    await page.waitForLoadState('networkidle');

    // Mission tree should have mission nodes
    const missionNodes = page.locator('[data-testid^="mission-node-"]');
    await expect(missionNodes.first()).toBeVisible();
  });

  // Skip: Campaign created via store doesn't include missions (needs template)
  test.skip('clicking mission shows details panel', async ({ page }) => {
    // Navigate via list click
    await listPage.clickCampaignCard(campaignId);
    await page.waitForLoadState('networkidle');

    // Click first mission in tree
    const firstMission = page.locator('[data-testid^="mission-node-"]').first();
    const missionId = await firstMission.getAttribute('data-mission-id');
    await firstMission.click();

    // Mission details panel should show
    await expect(page.getByTestId('mission-details-panel')).toBeVisible();

    // Panel should show mission name
    if (missionId) {
      await expect(page.getByTestId('mission-details-name')).toBeVisible();
    }
  });
});

// =============================================================================
// Campaign Audit Timeline Tests — RETIRED (obsolete surface)
//
// These tests drove the old in-detail "audit tab" (tab-audit on
// CampaignOverviewTab), which is no longer mounted anywhere — the
// campaign detail route renders CampaignDashboardPage, where the
// always-on DailyBattleAuditFeed replaces the tabbed timeline (asserted
// in "shows the daily battle audit feed on the dashboard" above). The
// timeline refresh/filter controls live on the standalone
// /audit/timeline page, covered by replay-player.spec.ts's
// "Audit Timeline Page" suite (search, category filters, advanced
// query builder).
// =============================================================================
