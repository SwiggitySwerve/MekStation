import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { runCommand } from '../unit-bv-family-worker';

jest.mock('node:child_process', () => ({ spawn: jest.fn() }));

it('waits for the owned timed-out process to close before returning failure', async () => {
  jest.useFakeTimers();
  const child = Object.assign(new EventEmitter(), {
    pid: 123456,
    kill: jest.fn(),
  });
  const killer = Object.assign(new EventEmitter(), {
    pid: 123457,
    kill: jest.fn(),
  });
  jest
    .mocked(spawn)
    .mockImplementation(
      (exe) =>
        (exe === 'taskkill' ? killer : child) as ReturnType<typeof spawn>,
    );
  let settled = false;
  const result = runCommand('owned-command', [], 10).catch((error) => {
    settled = true;
    return error as Error;
  });
  try {
    jest.advanceTimersByTime(10);
    await Promise.resolve();
    expect(settled).toBe(false);
    child.emit('exit', 1, null);
    child.emit('close', 1, null);
    expect((await result).message).toContain('timed out');
    expect(settled).toBe(true);
  } finally {
    child.emit('exit', 1, null);
    child.emit('close', 1, null);
    jest.useRealTimers();
    jest.restoreAllMocks();
  }
});
