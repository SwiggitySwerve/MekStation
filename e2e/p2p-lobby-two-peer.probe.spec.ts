import { test, expect } from '@playwright/test';

import { assertPreviewAccessibility } from './helpers/multiplayerPreviewAccessibility';

// BEFORE real-connection probe, JSON and screenshots are retained in the audit report.
// Release policy now refuses entry before either context opens a signalling connection.
test('P2P create and join are unavailable on both peers @game', async ({
  browser,
  baseURL,
}, info) => {
  const contexts = await Promise.all([
    browser.newContext({ baseURL }),
    browser.newContext({ baseURL }),
  ]);
  const reason =
    "Peer-to-peer lobbies can't connect because the connection service they use is unavailable. Battles also do not yet stay in sync between two players.";
  const sockets: string[] = [];
  try {
    for (const [index, context] of contexts.entries()) {
      const page = await context.newPage();
      page.on('websocket', (socket) => sockets.push(socket.url()));
      await page.goto('/gameplay/games');
      await page
        .getByRole('textbox', { name: 'Networked 1v1 room code' })
        .fill('ROOT01');
      for (const name of ['Create Lobby', 'Join']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeDisabled();
        await expect(button).toHaveAccessibleDescription(reason);
      }
      await assertPreviewAccessibility(page);
      await page.screenshot({
        path: info.outputPath(`peer-${index}-entry-disabled.png`),
      });
      await page.goto(`/gameplay/lobby/ROOT01${index === 0 ? '?host=1' : ''}`);
      await expect(
        page.getByRole('heading', { name: 'Peer-to-Peer Lobby' }),
      ).toBeVisible();
      await expect(page.getByText(reason, { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Launch Match' }),
      ).toHaveCount(0);
      await assertPreviewAccessibility(page);
      await page.screenshot({
        path: info.outputPath(`peer-${index}-route-disabled.png`),
      });
    }
    expect(sockets.filter((url) => /signaling|y-webrtc/.test(url))).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
