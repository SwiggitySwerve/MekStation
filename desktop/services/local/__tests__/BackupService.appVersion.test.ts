/**
 * S1b restore refusal (matrix row M): a backup made by a NEWER app is never
 * restored into an older one.
 *
 * A newer app may have written campaigns the older one cannot read, and the
 * older one would then pay or settle them with the legacy rules. The check
 * comes right after the metadata is read, BEFORE the integrity work, the
 * pre-restore safety backup, or any copy, so a refused restore changes nothing.
 * It uses the app version, not file times. A backup with no recorded version
 * (made by an app that predates this check) is allowed: those apps cannot have
 * written the newer data.
 *
 * Real files, no mocks: the property is "the directory is unchanged".
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackupService } from '../BackupService';

describe('BackupService restore and the app version', () => {
  let root: string;
  let dataPath: string;
  let backupPath: string;
  let profilePath: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-appversion-'));
    dataPath = path.join(root, 'data');
    backupPath = path.join(root, 'backups');
    // The Electron profile's browser storage lives BESIDE the data directory,
    // outside what a backup carries and a restore writes.
    profilePath = path.join(root, 'Local Storage', 'leveldb');
    await fs.mkdir(dataPath, { recursive: true });
    await fs.mkdir(profilePath, { recursive: true });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  async function service(appVersion?: string): Promise<BackupService> {
    const created = new BackupService({
      dataPath,
      backupPath,
      ...(appVersion === undefined ? {} : { appVersion }),
    });
    await created.initialize();
    return created;
  }

  async function makeBackupBy(appVersion?: string): Promise<string> {
    await fs.writeFile(path.join(dataPath, 'mekstation.db'), 'BACKED-UP-DB');
    const made = await (await service(appVersion)).createBackup('full');
    if (!made.success) throw new Error(made.error);
    return made.data;
  }

  async function dataFiles(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const name of await fs.readdir(dataPath)) {
      out[name] = await fs.readFile(path.join(dataPath, name), 'utf8');
    }
    return out;
  }

  async function backupFileCount(): Promise<number> {
    return (await fs.readdir(backupPath)).filter((f) => f.endsWith('.tar.gz'))
      .length;
  }

  it('records the creating app version in the backup metadata', async () => {
    const backup = await makeBackupBy('0.3.0');
    const listed = await (await service('0.3.0')).listBackups();
    expect(listed.success && listed.data[0].appVersion).toBe('0.3.0');
    expect(backup).toContain('.tar.gz');
  });

  it('refuses a backup from a newer app: nothing is copied, no safety backup, directory unchanged', async () => {
    const backup = await makeBackupBy('0.3.0');
    await fs.writeFile(path.join(dataPath, 'mekstation.db'), 'CURRENT-DB');
    await fs.writeFile(path.join(profilePath, 'CURRENT'), 'PROFILE-STORAGE');
    const before = await dataFiles();
    const countBefore = await backupFileCount();

    const older = await service('0.2.4');
    const result = await older.restoreBackup(backup);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe(
      'This backup was made by MekStation 0.3.0 and cannot be restored into 0.2.4 safely, because it may contain campaigns this version cannot read. Update MekStation, then restore again. Nothing was changed.',
    );
    expect(await dataFiles()).toEqual(before);
    expect(await backupFileCount()).toBe(countBefore);
    await expect(fs.stat(path.join(backupPath, '.temp'))).rejects.toThrow();
    // The browser storage beside the data directory was never in play.
    expect(await fs.readFile(path.join(profilePath, 'CURRENT'), 'utf8')).toBe(
      'PROFILE-STORAGE',
    );
  });

  it.each([
    ['equal', '0.3.0', '0.3.0'],
    ['older', '0.2.9', '0.3.0'],
    ['older by patch', '0.3.0', '0.3.1'],
    ['a prerelease of the same release', '0.3.0-beta.1', '0.3.0'],
    ['numerically older (0.9 vs 0.10)', '0.9.0', '0.10.0'],
  ])('restores a backup made by an %s app', async (_name, made, running) => {
    const backup = await makeBackupBy(made);
    await fs.writeFile(path.join(dataPath, 'mekstation.db'), 'CURRENT-DB');
    const result = await (await service(running)).restoreBackup(backup);
    expect(result.success && result.data.success).toBe(true);
    expect(
      await fs.readFile(path.join(dataPath, 'mekstation.db'), 'utf8'),
    ).toBe('BACKED-UP-DB');
  });

  it.each([
    ['one patch newer', '0.3.1', '0.3.0'],
    ['numerically newer (0.10 vs 0.9)', '0.10.0', '0.9.0'],
    ['a release over its own prerelease', '0.3.0', '0.3.0-beta.1'],
  ])('refuses a backup made by %s', async (_name, made, running) => {
    const backup = await makeBackupBy(made);
    const result = await (await service(running)).restoreBackup(backup);
    expect(result.success).toBe(false);
  });

  it('restores a backup with no recorded version (made before this check)', async () => {
    const backup = await makeBackupBy(undefined);
    await fs.writeFile(path.join(dataPath, 'mekstation.db'), 'CURRENT-DB');
    const result = await (await service('0.2.4')).restoreBackup(backup);
    expect(result.success && result.data.success).toBe(true);
  });

  it('refuses a backup whose recorded version cannot be read', async () => {
    const backup = await makeBackupBy('0.3.0');
    const metadataFile = path.join(
      backupPath,
      '.metadata',
      `${path.basename(backup, '.tar.gz')}.json`,
    );
    const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    await fs.writeFile(
      metadataFile,
      JSON.stringify({ ...metadata, appVersion: 'newest' }),
    );
    const result = await (await service('0.2.4')).restoreBackup(backup);
    expect(result.success).toBe(false);
    if (result.success) return;
    // The raw recorded value is quoted as a value, not run into the sentence.
    expect(result.error).toBe(
      'This backup records the MekStation version "newest", which this copy cannot read, so it cannot be restored safely. Update MekStation, then restore again. Nothing was changed.',
    );
  });

  it.each([
    ['11.2.0', '10.9.9'],
    ['0.10.0', '0.9.0'],
    ['1.0.0', '1.0.0-rc.1'],
  ])(
    'the refusal names the backup version (%s) and the running version (%s) it was given, not fixed examples',
    async (made, running) => {
      const backup = await makeBackupBy(made);
      const result = await (await service(running)).restoreBackup(backup);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe(
        `This backup was made by MekStation ${made} and cannot be restored into ${running} safely, because it may contain campaigns this version cannot read. Update MekStation, then restore again. Nothing was changed.`,
      );
    },
  );

  it('quotes an unreadable recorded value with its own characters escaped', async () => {
    const backup = await makeBackupBy('0.3.0');
    const metadataFile = path.join(
      backupPath,
      '.metadata',
      `${path.basename(backup, '.tar.gz')}.json`,
    );
    const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    await fs.writeFile(
      metadataFile,
      JSON.stringify({ ...metadata, appVersion: 'v"2"\nbeta' }),
    );
    const result = await (await service('0.2.4')).restoreBackup(backup);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('version "v\\"2\\"\\nbeta", which');
    expect(result.error).not.toContain('\n');
  });

  it('applies no check when the running app version is not configured', async () => {
    const backup = await makeBackupBy('9.9.9');
    await fs.writeFile(path.join(dataPath, 'mekstation.db'), 'CURRENT-DB');
    const result = await (await service(undefined)).restoreBackup(backup);
    expect(result.success && result.data.success).toBe(true);
  });
});
