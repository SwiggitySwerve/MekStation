import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

const mockIpcHandle = jest.fn();

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '0.0.0-test'),
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
  },
  ipcMain: {
    handle: mockIpcHandle,
  },
}));

import { setupIpcHandlers } from '../main.ipc';

type Handler = (
  _event: unknown,
  ...args: readonly unknown[]
) => Promise<unknown>;

const handlers = new Map<string, Handler>();

function settingsService(backupDirectory: string) {
  return {
    getAll: () => ({ backupDirectory }),
  };
}

function setupHandlers(userDataPath: string, backupDirectory: string): void {
  handlers.clear();
  mockIpcHandle.mockImplementation((channel: string, handler: Handler) => {
    handlers.set(channel, handler);
  });

  setupIpcHandlers({
    checkForUpdates: jest.fn(),
    createBackup: jest.fn(async () => true),
    developmentMode: false,
    getLocalStorage: jest.fn(() => null),
    getMainWindow: jest.fn(() => null),
    getMenuManager: jest.fn(() => null),
    getRecentFilesService: jest.fn(() => null),
    getSettingsService: jest.fn(
      () => settingsService(backupDirectory) as never,
    ),
    restoreBackup: jest.fn(async () => true),
    userDataPath,
  });
}

function handlerFor(channel: string): Handler {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`Missing IPC handler ${channel}`);
  return handler;
}

describe('desktop IPC file sandbox', () => {
  let tempRoot: string;
  let userDataPath: string;
  let dataRoot: string;
  let backupRoot: string;
  let outsideRoot: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mekstation-ipc-'));
    userDataPath = path.join(tempRoot, 'userData');
    dataRoot = path.join(userDataPath, 'data');
    backupRoot = path.join(userDataPath, 'backups');
    outsideRoot = path.join(tempRoot, 'outside');
    await fs.mkdir(dataRoot, { recursive: true });
    await fs.mkdir(backupRoot, { recursive: true });
    await fs.mkdir(outsideRoot, { recursive: true });
    setupHandlers(userDataPath, backupRoot);
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('allows reads inside the app data sandbox', async () => {
    const inRootFile = path.join(dataRoot, 'unit.mek.json');
    await fs.writeFile(inRootFile, '{"ok":true}', 'utf-8');

    const result = await handlerFor('read-file')(null, inRootFile);

    expect(result).toEqual({ success: true, data: '{"ok":true}' });
  });

  it('rejects out-of-root reads before reading the file', async () => {
    const outsideFile = path.join(outsideRoot, 'secrets.txt');
    await fs.writeFile(outsideFile, 'outside', 'utf-8');

    const result = await handlerFor('read-file')(null, outsideFile);

    expect(result).toEqual({
      success: false,
      error: 'Path outside sandbox root',
    });
  });

  it('allows writes inside the app data sandbox', async () => {
    const inRootFile = path.join(dataRoot, 'save.json');

    const result = await handlerFor('write-file')(
      null,
      inRootFile,
      '{"ok":true}',
    );

    expect(result).toEqual({ success: true });
    await expect(fs.readFile(inRootFile, 'utf-8')).resolves.toBe('{"ok":true}');
  });

  it('rejects out-of-root writes before writing the file', async () => {
    const outsideFile = path.join(outsideRoot, 'write.txt');

    const result = await handlerFor('write-file')(null, outsideFile, 'outside');

    expect(result).toEqual({
      success: false,
      error: 'Path outside sandbox root',
    });
    await expect(fs.access(outsideFile)).rejects.toThrow();
  });

  it('rejects traversal attempts that resolve outside the sandbox', async () => {
    const traversalFile = path.join(
      dataRoot,
      '..',
      '..',
      'outside',
      'walk.txt',
    );

    const result = await handlerFor('write-file')(
      null,
      traversalFile,
      'outside',
    );

    expect(result).toEqual({
      success: false,
      error: 'Path outside sandbox root',
    });
  });

  it('rejects symlink reads that point outside the sandbox', async () => {
    const outsideFile = path.join(outsideRoot, 'target.txt');
    const linkDir = path.join(dataRoot, 'linked-outside');
    const linkFile = path.join(linkDir, 'target.txt');
    await fs.writeFile(outsideFile, 'outside', 'utf-8');
    await fs.symlink(outsideRoot, linkDir, 'junction');

    const result = await handlerFor('read-file')(null, linkFile);

    expect(result).toEqual({
      success: false,
      error: 'Path outside sandbox root',
    });
  });

  it('rejects restore-backup calls outside the backup sandbox', async () => {
    const outsideBackup = path.join(outsideRoot, 'backup.zip');
    await fs.writeFile(outsideBackup, 'zip', 'utf-8');

    const result = await handlerFor('restore-backup')(null, outsideBackup);

    expect(result).toBe(false);
  });
});
