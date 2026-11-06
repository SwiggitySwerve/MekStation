// NEVER MERGE: test-scoped observation only; base worker/browser fixtures stay intact.
import { test as base } from '@playwright/test';

import { record } from '../../scripts/playwright/g6-042-state.mjs';
export { expect, type APIResponse, type Page } from '@playwright/test';

const observed = base.extend<{ g6CausalState: void }>({
  g6CausalState: [
    async ({ browser, context }, use, info) => {
      const identity = {
        testId: info.testId,
        workerIndex: info.workerIndex,
        file: info.file,
        title: info.title,
      };
      const emit = (kind: string, data: object = {}) =>
        record(kind, data, identity);
      let pageOrdinal = 0;
      const pages: Promise<void>[] = [];
      browser.on('disconnected', () =>
        emit('browser-disconnected', { connected: browser.isConnected() }),
      );
      context.on('close', () =>
        emit('context-close', { browserConnected: browser.isConnected() }),
      );
      context.on('page', (page) => {
        const ordinal = ++pageOrdinal;
        page.on('close', () => emit('page-close', { ordinal }));
        page.on('crash', () => emit('page-crash', { ordinal }));
        const task = (async () => {
          const session = await context.newCDPSession(page);
          session.on('Inspector.detached', (data) =>
            emit('inspector-detached', { ordinal, ...data }),
          );
          const { targetInfo } = await session.send('Target.getTargetInfo');
          emit('page-target', { ordinal, ...targetInfo });
        })().catch((error) =>
          emit('unknown', {
            operation: 'page-target',
            ordinal,
            error: String(error),
          }),
        );
        pages.push(task);
      });
      let snapshot = async () => {};
      try {
        const session = await browser.newBrowserCDPSession();
        session.on('Target.targetCreated', (data) =>
          emit('target-created', data),
        );
        session.on('Target.targetInfoChanged', (data) =>
          emit('target-info-changed', data),
        );
        session.on('Target.targetDestroyed', (data) =>
          emit('target-destroyed', data),
        );
        session.on('Target.detachedFromTarget', (data) =>
          emit('target-detached', data),
        );
        await session.send('Target.setDiscoverTargets', { discover: true });
        snapshot = async () => {
          const targets = await session.send('Target.getTargets');
          const processes = await session.send('SystemInfo.getProcessInfo');
          emit('cdp-state', {
            ...targets,
            ...processes,
            targetToPidMapping: 'UNKNOWN',
          });
        };
        await snapshot();
        emit('fixture-ready', { browserConnected: browser.isConnected() });
      } catch (error) {
        emit('unknown', {
          operation: 'browser-CDP-setup',
          error: String(error),
        });
      }
      try {
        await use();
      } finally {
        // Keep event listeners alive through base context/browser teardown.
        emit('fixture-body-complete', {
          browserConnected: browser.isConnected(),
        });
        try {
          await Promise.all(pages);
          await snapshot();
        } catch (error) {
          emit('unknown', {
            operation: 'preclose-state',
            error: String(error),
          });
        }
      }
    },
    { auto: true },
  ],
});
export const test = process.env.MEKSTATION_G6_042 === '1' ? observed : base;
