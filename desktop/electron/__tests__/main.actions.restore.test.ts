import { dialog } from 'electron';

import {
  BackupService,
  type IRestoreResult,
} from '../../services/local/BackupService';
import { type ResultType } from '../../types/BaseTypes';
import { restoreBackup } from '../main.actions';

jest.mock('electron', () => ({ dialog: { showErrorBox: jest.fn() } }));
jest.mock('electron-updater', () => ({ autoUpdater: {} }));
jest.mock('../../services/local/BackupService');

describe('desktop restore action', () => {
  const backupPath = 'backups/restore.zip';
  let service: BackupService;
  let restore: jest.MockedFunction<BackupService['restoreBackup']>;
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BackupService({});
    restore = jest.mocked(service.restoreBackup);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const failures: [string, ResultType<IRestoreResult, string>, string][] = [
    [
      'outer Result error',
      { success: false, error: 'Backup metadata not found' },
      'Backup metadata not found',
    ],
    [
      'partial restore',
      {
        success: true,
        data: {
          success: false,
          errors: ['copy locked.db: EBUSY', 'copy settings.json: EACCES'],
          restoredFiles: ['mekstation.db'],
          duration: 1,
        },
      },
      'copy locked.db: EBUSY\ncopy settings.json: EACCES',
    ],
    [
      'inner failure without error details',
      {
        success: true,
        data: { success: false, errors: [], restoredFiles: [], duration: 1 },
      },
      'Backup restore did not complete.',
    ],
    [
      'inner success with file errors',
      {
        success: true,
        data: {
          success: true,
          errors: ['copy locked.db: EBUSY'],
          restoredFiles: ['mekstation.db'],
          duration: 1,
        },
      },
      'copy locked.db: EBUSY',
    ],
  ];

  it.each(failures)(
    'refuses %s and shows the failure',
    async (_name, result, message) => {
      restore.mockResolvedValue(result);

      expect(await restoreBackup(service, backupPath)).toBe(false);

      expect(restore).toHaveBeenCalledWith(backupPath);
      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'Backup restore failed',
        message,
      );
      expect(log).not.toHaveBeenCalled();
    },
  );

  it('accepts a complete restore', async () => {
    restore.mockResolvedValue({
      success: true,
      data: {
        success: true,
        errors: [],
        restoredFiles: ['mekstation.db'],
        duration: 1,
      },
    });

    expect(await restoreBackup(service, backupPath)).toBe(true);

    expect(restore).toHaveBeenCalledWith(backupPath);
    expect(dialog.showErrorBox).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Backup restored:', backupPath);
  });

  it('reports a rejected restore', async () => {
    restore.mockRejectedValue(new Error('Restore destination is locked'));

    expect(await restoreBackup(service, backupPath)).toBe(false);

    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'Backup restore failed',
      'Restore destination is locked',
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('reports an unknown thrown failure', async () => {
    restore.mockRejectedValue('unexpected rejection');

    expect(await restoreBackup(service, backupPath)).toBe(false);

    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'Backup restore failed',
      'Unknown error occurred while restoring backup.',
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('reports an unavailable backup service', async () => {
    expect(await restoreBackup(null, backupPath)).toBe(false);

    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'Backup restore failed',
      'Backup service is unavailable.',
    );
    expect(log).not.toHaveBeenCalled();
  });
});
