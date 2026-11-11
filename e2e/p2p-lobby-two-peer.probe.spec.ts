import type { WebSocketRoute } from '@playwright/test';

import { expect, test, type Page, type TestInfo } from '@playwright/test';

import { assertPreviewAccessibility } from './helpers/multiplayerPreviewAccessibility';

// Permit loopback ICE candidates on this one-machine, two-context probe.
test.use({
  launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] },
});

// Only public rendezvous signalling is relayed. SDP/ICE and encrypted
// payloads pass through unchanged; lobby updates still cross the real
// WebRTC data channel. This never copies a Y.Doc, board or game event.
function signalingRelay(log: string[]) {
  const subscriptions = new Map<WebSocketRoute, Set<string>>();
  return (socket: WebSocketRoute) => {
    log.push(`open ${socket.url()}`);
    subscriptions.set(socket, new Set());
    socket.onClose(() => {
      subscriptions.delete(socket);
    });
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as {
        type: string;
        topics?: string[];
        topic?: string;
      };
      log.push(`${socket.url()} ${String(raw).slice(0, 180)}`);
      const topics = subscriptions.get(socket)!;
      if (message.type === 'subscribe')
        for (const topic of message.topics ?? []) topics.add(topic);
      if (message.type === 'unsubscribe')
        for (const topic of message.topics ?? []) topics.delete(topic);
      if (message.type === 'ping')
        socket.send(JSON.stringify({ type: 'pong' }));
      if (message.type === 'publish') {
        const peers = [...subscriptions].filter(
          ([peer, set]) =>
            peer.url() === socket.url() && set.has(message.topic ?? ''),
        );
        const payload = JSON.stringify({ ...message, clients: peers.length });
        for (const [peer] of peers) peer.send(payload);
      }
    });
  };
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
  await info.attach(name, {
    path: info.outputPath(`${name}.png`),
    contentType: 'image/png',
  });
}

// Two independent peers use production lobby setup and the real WebRTC data channel.
// The BEFORE variant and its board observations are retained in the audit record.
// No tactical state injection or replacement for the production data channel.
test('P2P two-peer lobby and launch policy @game', async ({
  browser,
  baseURL,
  request,
}, info) => {
  test.setTimeout(180_000);
  const hostContext = await browser.newContext({ baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const diagnostics: string[] = [];
  const relay = signalingRelay(diagnostics);
  for (const context of [hostContext, guestContext]) {
    await context.routeWebSocket(
      /wss:\/\/(signaling\.yjs\.dev|y-webrtc-signaling-.*\.herokuapp\.com)/,
      relay,
    );
  }
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  for (const [name, page] of [
    ['host', host],
    ['guest', guest],
  ] as const) {
    page.on('pageerror', (error) =>
      diagnostics.push(`${name}: ${error.message}`),
    );
    page.on('console', (entry) => {
      if (entry.type() === 'error')
        diagnostics.push(`${name}: ${entry.text()}`);
    });
  }
  const pilotIds: string[] = [];
  try {
    for (const side of ['host', 'guest']) {
      const response = await request.post('/api/pilots', {
        data: {
          mode: 'random',
          identity: { name: `P2P probe ${side} ${info.workerIndex}` },
          skills: { gunnery: 4, piloting: 5 },
        },
      });
      expect(response.ok()).toBeTruthy();
      const result = (await response.json()) as { pilot: { id: string } };
      pilotIds.push(result.pilot.id);
    }
    await host.goto('/gameplay/games');
    await host.getByRole('button', { name: 'Create Lobby' }).click();
    await expect(host).toHaveURL(/\/gameplay\/lobby\/[A-Z0-9]+\?host=1/);
    const code = new URL(host.url()).pathname.split('/').at(-1);
    expect(code).toBeTruthy();
    if (!code) throw new Error('Host did not receive a room code');
    await guest.goto('/gameplay/games');
    await guest
      .getByRole('textbox', { name: 'Networked 1v1 room code' })
      .fill(code);
    await guest.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(
      guest.getByRole('heading', { name: `Room ${code}`, exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    for (const [index, page] of [host, guest].entries()) {
      const side = index === 0 ? 'Host' : 'Guest';
      const unit = page.getByRole('combobox', {
        name: `Add unit to ${side} loadout`,
      });
      await expect(unit.locator('option[value="atlas-as7-d"]')).toHaveCount(1);
      await unit.selectOption('atlas-as7-d');
      await page
        .getByRole('combobox', { name: new RegExp(`^${side} pilot for`) })
        .selectOption(pilotIds[index]);
      await page.getByRole('button', { name: 'Ready', exact: true }).click();
    }
    const launch = host.getByRole('button', {
      name: 'Launch Match',
      exact: true,
    });
    const reason =
      "Match launch is unavailable because the two players' battles do not stay in sync.";
    await expect(launch).toBeDisabled();
    await expect(launch).toHaveAccessibleDescription(reason);
    await expect(host.getByText(reason, { exact: true })).toBeVisible();
    await expect(guest.getByText(reason, { exact: true })).toBeVisible();
    await expect(host).toHaveURL(/\/gameplay\/lobby\//);
    await expect(guest).toHaveURL(/\/gameplay\/lobby\//);
    await assertPreviewAccessibility(host);
    await assertPreviewAccessibility(guest);
    await capture(host, info, 'host-disabled');
    await capture(guest, info, 'guest-disabled');
  } finally {
    await info.attach('signaling-diagnostics', {
      body: diagnostics.join('\n'),
      contentType: 'text/plain',
    });
    await hostContext.close();
    await guestContext.close();
    for (const id of pilotIds)
      await request.delete(`/api/pilots/${encodeURIComponent(id)}`);
  }
});
