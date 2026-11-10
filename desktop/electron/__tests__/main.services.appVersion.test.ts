/**
 * S1b: the version in the restore refusal is the running app's, not a literal.
 * `main.ts` passes `app.getVersion()` to `initializeDesktopServices`
 * (`appVersion` is a required string there); this proves that value is what a
 * backup is stamped with and what a restore compares against.
 */
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createDesktopAppConfig } from '../main.config';
import { initializeDesktopServices } from '../main.services';

type Services = Awaited<ReturnType<typeof initializeDesktopServices>>;

describe('the app version handed to the desktop services', () => {
  let userData: string;
  let started: Services[];

  async function servicesFor(appVersion: string) {
    const services = await initializeDesktopServices({
      config: createDesktopAppConfig(),
      onRecentFilesUpdate: () => undefined,
      onSettingsChange: () => undefined,
      userDataPath: userData,
      appVersion,
    });
    started.push(services);
    if (!services.backupService) throw new Error('backups are disabled');
    return services.backupService;
  }

  beforeEach(async () => {
    started = [];
    userData = await fs.mkdtemp(path.join(os.tmpdir(), 'services-version-'));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    // The storage service owns an interval timer; stop it as quitting does.
    for (const services of started) {
      await services.recentFilesService.cleanup();
      await services.settingsService.cleanup();
      await services.backupService?.cleanup();
      await services.localStorage.cleanup();
    }
    jest.restoreAllMocks();
    await fs.rm(userData, { recursive: true, force: true });
  });

  it('stamps backups with it and quotes it in the refusal when an older app restores', async () => {
    const newer = await servicesFor('12.4.1');
    await fs.writeFile(path.join(userData, 'data', 'mekstation.db'), 'DB');
    const made = await newer.createBackup('full');
    if (!made.success) throw new Error(made.error);

    const older = await servicesFor('12.3.9');
    const result = await older.restoreBackup(made.data);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('MekStation 12.4.1 ');
    expect(result.error).toContain('into 12.3.9 safely');
  });
});
