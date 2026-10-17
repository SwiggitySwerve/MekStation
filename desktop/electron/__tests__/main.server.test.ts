import { EventEmitter } from 'events';

const mockSpawn = jest.fn();
const mockSpawnSync = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
  spawnSync: (...args: unknown[]) => mockSpawnSync(...args),
}));

import { EmbeddedServer, SERVER_READY_MARKER } from '../main.server';

class FakeChild extends EventEmitter {
  readonly stdout = new EventEmitter();
  exitCode: number | null = null;
  signalCode: string | null = null;
  readonly kill = jest.fn();
  constructor(readonly pid: number) {
    super();
  }
}

let children: FakeChild[] = [];
const server = () =>
  new EmbeddedServer({ cwd: 'srv', env: {}, serverPath: 'srv/server.js' });
const say = (child: FakeChild, text: string) =>
  child.stdout.emit('data', Buffer.from(text));

describe('embedded server readiness', () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    children = [];
    mockSpawnSync.mockReset();
    mockSpawn.mockReset().mockImplementation(() => {
      children.push(new FakeChild(4242 + children.length));
      return children[children.length - 1];
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (platform) Object.defineProperty(process, 'platform', platform);
  });

  it('waits out a slow cold start until the ready marker (split across chunks)', async () => {
    const embedded = server();
    let ready = false;
    const wait = embedded.waitUntilReady(120_000).then(() => (ready = true));
    jest.advanceTimersByTime(20_000);
    say(children[0], '> booting\nMEKSTATION_LIS');
    await Promise.resolve();
    expect(ready).toBe(false);
    say(children[0], 'TENER_READY {"port":3001}\n');
    await wait;
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('times out with a clear error, and a later wait sees the late marker', async () => {
    const embedded = server();
    const first = embedded.waitUntilReady(120_000);
    jest.advanceTimersByTime(120_000);
    await expect(first).rejects.toThrow(/did not become ready within 120 s/);
    say(children[0], `${SERVER_READY_MARKER} {}\n`);
    await expect(embedded.waitUntilReady()).resolves.toBeUndefined();
    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('rejects when the server exits early and respawns on retry', async () => {
    const embedded = server();
    const first = embedded.waitUntilReady();
    children[0].emit('exit', 1, null);
    await expect(first).rejects.toThrow(/exited before it was ready/);
    const second = embedded.waitUntilReady();
    say(children[1], `${SERVER_READY_MARKER} {}\n`);
    await expect(second).resolves.toBeUndefined();
  });

  it('kills the whole process tree on stop, once', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const embedded = server();
    void embedded.waitUntilReady().catch(() => undefined);
    embedded.stop();
    embedded.stop();
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      'taskkill',
      ['/pid', '4242', '/T', '/F'],
      expect.objectContaining({ windowsHide: true }),
    );

    Object.defineProperty(process, 'platform', { value: 'linux' });
    const posix = server();
    void posix.waitUntilReady().catch(() => undefined);
    posix.stop();
    expect(children[1].kill).toHaveBeenCalledWith('SIGTERM');
  });
});
