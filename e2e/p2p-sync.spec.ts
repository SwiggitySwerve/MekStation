/**
 * P2P Sync E2E Tests
 *
 * Tests for the P2P sync test harness UI and basic functionality.
 *
 * NOTE: Full peer-to-peer tests require real WebRTC connections which need
 * signaling servers. The core sync logic is tested via unit tests in:
 * - src/lib/p2p/__tests__/useSyncedVaultStore.test.ts
 * - src/lib/p2p/__tests__/roomCodes.test.ts
 *
 * @spec openspec/changes/add-p2p-vault-sync/tasks.md - Tasks 6.4, 6.5
 */

import { test, expect, type Page } from '@playwright/test';

test.setTimeout(30000);

const TEST_URL = '/e2e/sync-test?mockSync=true';

// =============================================================================
// Test Helpers
// =============================================================================

async function waitForConnectionState(
  page: Page,
  expectedState: string,
  timeout = 10000,
): Promise<void> {
  await expect(page.getByTestId('connection-state')).toHaveText(expectedState, {
    timeout,
  });
}

async function waitForItemCount(
  page: Page,
  expectedCount: number,
  timeout = 5000,
): Promise<void> {
  await expect(page.getByTestId('item-count')).toContainText(
    `Total items: ${expectedCount}`,
    {
      timeout,
    },
  );
}

async function addItem(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-item-input').fill(name);
  await page.getByTestId('add-item-btn').click({ force: true });
  await expect(page.getByTestId('new-item-input')).toHaveValue('', {
    timeout: 2000,
  });
}

// =============================================================================
// Test Suite: UI and Single-Peer Flow
// =============================================================================

test.describe('P2P Sync - Test Harness UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and wait for full hydration
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    // Wait for React hydration
    await page.waitForTimeout(500);
  });

  test('test page loads and shows mock mode indicator', async ({ page }) => {
    // Should show mock mode indicator
    await expect(page.getByTestId('mock-mode-indicator')).toBeVisible();
    await expect(page.getByTestId('mock-mode-indicator')).toContainText(
      'Mock Mode',
    );

    // Should show connection status
    await expect(page.getByTestId('connection-state')).toHaveText(
      'disconnected',
    );
    await expect(page.getByTestId('room-code')).toHaveText('N/A');
    await expect(page.getByTestId('peer-count')).toHaveText('0');
  });

  test('can create a room in mock mode', async ({ page }) => {
    // Click create room
    await page.getByTestId('create-room-btn').click({ force: true });

    // Should transition to connected
    await waitForConnectionState(page, 'connected');

    // Should have a room code
    const roomCode = await page.getByTestId('room-code').textContent();
    expect(roomCode).not.toBe('N/A');
    expect(roomCode?.replace('-', '').length).toBe(6);
  });

  test('can add items when connected', async ({ page }) => {
    // Create room
    await page.getByTestId('create-room-btn').click({ force: true });
    await waitForConnectionState(page, 'connected');

    // Add an item
    await addItem(page, 'Test Unit Alpha');
    await waitForItemCount(page, 1);

    // Verify item appears in list
    const itemsList = page.getByTestId('items-list');
    await expect(itemsList).toContainText('Test Unit Alpha');
  });

  test('can update items', async ({ page }) => {
    // Create room and add item
    await page.getByTestId('create-room-btn').click({ force: true });
    await waitForConnectionState(page, 'connected');
    await addItem(page, 'Upgradeable Unit');
    await waitForItemCount(page, 1);

    // Get initial value
    const itemElement = page.locator('[data-item-name="Upgradeable Unit"]');
    const initialValue = await itemElement.getAttribute('data-item-value');
    const itemId = await itemElement.getAttribute('data-item-id');

    // Click update button
    await page.getByTestId(`update-${itemId}`).click({ force: true });

    // Value should increment
    await expect(async () => {
      const newValue = await itemElement.getAttribute('data-item-value');
      expect(parseInt(newValue ?? '0')).toBe(parseInt(initialValue ?? '0') + 1);
    }).toPass({ timeout: 2000 });
  });

  test('can delete items', async ({ page }) => {
    // Create room and add items
    await page.getByTestId('create-room-btn').click({ force: true });
    await waitForConnectionState(page, 'connected');
    await addItem(page, 'Item to Keep');
    await addItem(page, 'Item to Delete');
    await waitForItemCount(page, 2);

    // Get the item to delete
    const itemElement = page.locator('[data-item-name="Item to Delete"]');
    const itemId = await itemElement.getAttribute('data-item-id');

    // Delete it
    await page.getByTestId(`delete-${itemId}`).click({ force: true });

    // Should have one item left
    await waitForItemCount(page, 1);
    await expect(page.getByTestId('items-list')).not.toContainText(
      'Item to Delete',
    );
    await expect(page.getByTestId('items-list')).toContainText('Item to Keep');
  });

  test('can leave room', async ({ page }) => {
    // Create room
    await page.getByTestId('create-room-btn').click({ force: true });
    await waitForConnectionState(page, 'connected');

    // Leave room
    await page.getByTestId('leave-room-btn').click({ force: true });
    await waitForConnectionState(page, 'disconnected');

    // Room code should be cleared
    await expect(page.getByTestId('room-code')).toHaveText('N/A');
  });

  test('add button is disabled when disconnected', async ({ page }) => {
    // Fill in item name
    await page.getByTestId('new-item-input').fill('Test Item');

    // Add button should be disabled
    await expect(page.getByTestId('add-item-btn')).toBeDisabled();
  });

  test('join button is disabled without room code', async ({ page }) => {
    // Join button should be disabled with empty input
    await expect(page.getByTestId('join-room-btn')).toBeDisabled();

    // Type a room code
    await page.getByTestId('room-code-input').fill('ABCDEF');

    // Join button should now be enabled
    await expect(page.getByTestId('join-room-btn')).toBeEnabled();
  });

  test('displays events in log', async ({ page }) => {
    // Create room
    await page.getByTestId('create-room-btn').click({ force: true });
    await waitForConnectionState(page, 'connected');

    // Event log should show connected event
    const eventLog = page.getByTestId('event-log');
    await expect(eventLog).toContainText('connected');
  });
});

test.describe('P2P Sync - Room Code Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('accepts valid room codes', async ({ page }) => {
    // Enter a valid room code
    await page.getByTestId('room-code-input').fill('ABC-DEF');
    await page.getByTestId('join-room-btn').click({ force: true });

    // Should connect
    await waitForConnectionState(page, 'connected');
  });

  test('normalizes room code input', async ({ page }) => {
    // Enter lowercase with extra characters
    await page.getByTestId('room-code-input').fill('abc-def');
    await page.getByTestId('join-room-btn').click({ force: true });

    // Should connect with normalized code
    await waitForConnectionState(page, 'connected');
    const roomCode = await page.getByTestId('room-code').textContent();
    expect(roomCode?.replace('-', '')).toBe('ABCDEF');
  });
});

test.describe('P2P Sync - Multiple Items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('can manage multiple items', async ({ page }) => {
    // Create room
    await page.getByTestId('create-room-btn').click({ force: true });
    await waitForConnectionState(page, 'connected');

    // Add several items
    await addItem(page, 'Atlas AS7-D');
    await addItem(page, 'Madcat Prime');
    await addItem(page, 'Locust LCT-1V');
    await waitForItemCount(page, 3);

    // All items should be visible
    const itemsList = page.getByTestId('items-list');
    await expect(itemsList).toContainText('Atlas AS7-D');
    await expect(itemsList).toContainText('Madcat Prime');
    await expect(itemsList).toContainText('Locust LCT-1V');
  });
});

// =============================================================================
// Multi-Peer Tests (Require Real WebRTC - Informational)
// =============================================================================

test.describe('P2P Sync - Multi-Peer Flow', () => {
  // These tests document the expected multi-peer behavior.
  // They are skipped because BroadcastChannel doesn't work across
  // Playwright's isolated browser contexts.
  //
  // The underlying sync logic is tested in unit tests:
  // - src/lib/p2p/__tests__/useSyncedVaultStore.test.ts

  test.skip('two peers can connect via room code', async () => {
    // This test would:
    // 1. Create two browser contexts
    // 2. Peer A creates room
    // 3. Peer B joins with room code
    // 4. Both see peer count = 1
  });

  test.skip('data syncs between connected peers', async () => {
    // This test would:
    // 1. Connect two peers
    // 2. Peer A adds item
    // 3. Peer B sees item appear
  });

  test.skip('peer reconnects after network interruption', async () => {
    // This test would:
    // 1. Connect two peers
    // 2. Simulate network interruption for Peer B
    // 3. Peer A adds items while B offline
    // 4. Peer B reconnects and receives missed items
  });
});
