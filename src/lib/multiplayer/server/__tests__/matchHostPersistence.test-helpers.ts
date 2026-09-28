import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { ServerMatchHost } from '../ServerMatchHost';

interface IInitialPersistence {
  persistInitialEvents(events: readonly IGameEvent[]): Promise<void>;
}

/** Observe the constructor's entire persist/seed operation before creating it. */
export async function createPersistedHost(
  create: () => ServerMatchHost,
): Promise<ServerMatchHost> {
  // The factory is synchronous; its existing private promise is the exact
  // completion boundary. Preserve the real operation, including any failure.
  const prototype = ServerMatchHost.prototype as unknown as IInitialPersistence;
  const persist = prototype.persistInitialEvents;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const completed = new Promise<void>((resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error('initial match persistence did not complete')),
      2000,
    );
    prototype.persistInitialEvents = function (events) {
      const pending = persist.call(this, events);
      void pending.then(resolve, reject);
      return pending;
    };
  });
  try {
    const host = create();
    await completed;
    return host;
  } finally {
    clearTimeout(timeout);
    prototype.persistInitialEvents = persist;
  }
}
