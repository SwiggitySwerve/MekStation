import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

interface InstallEvent {
  waitUntil: (work: Promise<unknown>) => void;
  addRoutes?: (routes: unknown) => void;
}

function installWorker(addRoutes?: InstallEvent['addRoutes']) {
  let install: ((event: InstallEvent) => void) | undefined;
  const work: Promise<unknown>[] = [];
  const addAll = jest.fn(async () => undefined);
  const open = jest.fn(async () => ({ addAll }));
  const skipWaiting = jest.fn();
  runInNewContext(
    readFileSync(resolve(process.cwd(), 'public/service-worker.js'), 'utf8'),
    {
      self: {
        addEventListener: (
          name: string,
          handler: (event: InstallEvent) => void,
        ) => {
          if (name === 'install') install = handler;
        },
        skipWaiting,
      },
      caches: { open },
    },
  );
  if (!install) throw new Error('Worker did not register an install handler');
  install({ addRoutes, waitUntil: (promise) => work.push(promise) });
  return { work: Promise.all(work), open, addAll, skipWaiting };
}

describe('service worker API write routing', () => {
  it('registers only API write methods directly to network during install', async () => {
    const addRoutes = jest.fn();
    const worker = installWorker(addRoutes);
    await worker.work;
    expect(addRoutes).toHaveBeenCalledTimes(1);
    expect(addRoutes).toHaveBeenCalledWith([
      {
        condition: {
          or: ['PUT', 'POST', 'PATCH', 'DELETE'].map((requestMethod) => ({
            urlPattern: '/api/*',
            requestMethod,
          })),
        },
        source: 'network',
      },
    ]);
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
    expect(worker.open).toHaveBeenCalledWith('mekstation-v1');
    expect(worker.addAll).toHaveBeenCalledTimes(1);
  });

  it('still installs static assets and skips waiting when addRoutes is absent', async () => {
    const worker = installWorker();
    await worker.work;
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
    expect(worker.open).toHaveBeenCalledWith('mekstation-v1');
    expect(worker.addAll).toHaveBeenCalledWith([
      '/',
      '/manifest.json',
      '/icons/icon.svg',
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
    ]);
  });
});
