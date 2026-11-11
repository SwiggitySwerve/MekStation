import type { AddressInfo } from 'node:net';

import { createServer } from 'node:http';

// Bare audit fixture; owns only the independent HTTP arrival counter.
const worker = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Same non-GET fallthrough as the app's original fetch listener.
  if (request.method !== 'GET') return;
  event.respondWith(fetch(request));
});
`;

const html = `<!doctype html><meta charset="utf-8"><title>Unload positive control</title>
<body>Bare fetch-listener control
<script>
  navigator.serviceWorker.register('/sw.js');
  window.addEventListener('pagehide', () => {
    const trial = sessionStorage.getItem('armed-trial');
    if (!trial) return;
    sessionStorage.removeItem('armed-trial');
    fetch('/put?trial=' + encodeURIComponent(trial), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trial, pad: 'x'.repeat(5000) }),
      keepalive: true,
    }).catch(() => {});
  });
</script></body>`;

export interface ControlArrival {
  trial: string;
  bytes: number;
}

interface UnloadPositiveControl {
  origin: string;
  arrivals: ControlArrival[];
  close: () => Promise<void>;
}

/**
 * Starts only inside the executing test, never during --list. An ephemeral
 * loopback port gives the control its own origin: neither worker can control
 * the other origin, and the app's addRoutes fix cannot repair this fixture.
 * No Playwright routes (which disable HTTP cache) or request events are used.
 */
export async function startUnloadPositiveControl(): Promise<UnloadPositiveControl> {
  const arrivals: ControlArrival[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture');
    response.setHeader('cache-control', 'no-store');
    if (url.pathname === '/put' && request.method === 'PUT') {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        // Count a completed body at the server, never a browser dispatch.
        const body = Buffer.concat(chunks);
        const trial = url.searchParams.get('trial') ?? '';
        arrivals.push({ trial, bytes: body.length });
        response.writeHead(200).end('{}');
      });
      return;
    }
    if (url.pathname === '/sw.js') {
      response.setHeader('content-type', 'application/javascript');
      response.end(worker);
    } else if (url.pathname === '/warm-fetch') {
      response.end('worker fetch round trip');
    } else if (url.pathname === '/') {
      response.setHeader('content-type', 'text/html');
      response.end(html);
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    arrivals,
    close: (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
