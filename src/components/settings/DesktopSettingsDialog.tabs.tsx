import React from 'react';

import { Button } from '@/components/ui';

import type { IDesktopSettings, UpdateChannel } from './useElectron';
import type { IElectronAPI } from './useElectron';

export interface TabContentProps {
  localSettings: IDesktopSettings;
  updateLocalSetting: <K extends keyof IDesktopSettings>(
    key: K,
    value: IDesktopSettings[K],
  ) => void;
  handleSelectDirectory: (
    key: 'defaultSaveDirectory' | 'backupDirectory' | 'dataDirectory',
  ) => Promise<void>;
  handleReset: () => Promise<void>;
  api: IElectronAPI | null;
}

export function GeneralTab({
  localSettings,
  updateLocalSetting,
  handleSelectDirectory,
}: TabContentProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">
        General Settings
      </h3>

      <div className="space-y-3">
        <h4 className="text-text-theme-secondary text-sm font-medium">
          Startup
        </h4>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.launchAtLogin}
            onChange={(e) =>
              updateLocalSetting('launchAtLogin', e.target.checked)
            }
            className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
          />
          <span className="text-text-theme-secondary text-sm">
            Launch at login
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.startMinimized}
            onChange={(e) =>
              updateLocalSetting('startMinimized', e.target.checked)
            }
            className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
          />
          <span className="text-text-theme-secondary text-sm">
            Start minimized to system tray
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.reopenLastUnit}
            onChange={(e) =>
              updateLocalSetting('reopenLastUnit', e.target.checked)
            }
            className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
          />
          <span className="text-text-theme-secondary text-sm">
            Reopen last unit on startup
          </span>
        </label>
      </div>

      <div className="border-border-theme-subtle space-y-3 border-t pt-4">
        <h4 className="text-text-theme-secondary text-sm font-medium">
          Window
        </h4>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.rememberWindowState}
            onChange={(e) =>
              updateLocalSetting('rememberWindowState', e.target.checked)
            }
            className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
          />
          <span className="text-text-theme-secondary text-sm">
            Remember window position and size
          </span>
        </label>
      </div>

      <div className="border-border-theme-subtle space-y-2 border-t pt-4">
        <h4 className="text-text-theme-secondary text-sm font-medium">
          Default Save Directory
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.defaultSaveDirectory}
            onChange={(e) =>
              updateLocalSetting('defaultSaveDirectory', e.target.value)
            }
            placeholder="Default save location"
            className="bg-surface-raised border-border-theme placeholder-text-theme-secondary flex-1 rounded border px-3 py-2 text-sm text-white"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSelectDirectory('defaultSaveDirectory')}
          >
            Browse
          </Button>
        </div>
        <p className="text-text-theme-secondary text-xs">
          Leave empty to use system default
        </p>
      </div>
    </div>
  );
}

export function BackupsTab({
  localSettings,
  updateLocalSetting,
  handleSelectDirectory,
}: TabContentProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Backup Settings</h3>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={localSettings.enableAutoBackup}
          onChange={(e) =>
            updateLocalSetting('enableAutoBackup', e.target.checked)
          }
          className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
        />
        <span className="text-text-theme-secondary text-sm">
          Enable automatic backups
        </span>
      </label>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Backup interval (minutes)
        </label>
        <input
          type="number"
          min={1}
          max={1440}
          value={localSettings.backupIntervalMinutes}
          onChange={(e) =>
            updateLocalSetting(
              'backupIntervalMinutes',
              parseInt(e.target.value) || 5,
            )
          }
          disabled={!localSettings.enableAutoBackup}
          className="bg-surface-raised border-border-theme w-24 rounded border px-3 py-2 text-sm text-white disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Maximum backups to keep
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={localSettings.maxBackupCount}
          onChange={(e) =>
            updateLocalSetting('maxBackupCount', parseInt(e.target.value) || 10)
          }
          className="bg-surface-raised border-border-theme w-24 rounded border px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="border-border-theme-subtle space-y-2 border-t pt-4">
        <label className="text-text-theme-secondary text-sm font-medium">
          Backup Directory
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.backupDirectory}
            onChange={(e) =>
              updateLocalSetting('backupDirectory', e.target.value)
            }
            placeholder="Default backup location"
            className="bg-surface-raised border-border-theme placeholder-text-theme-secondary flex-1 rounded border px-3 py-2 text-sm text-white"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSelectDirectory('backupDirectory')}
          >
            Browse
          </Button>
        </div>
        <p className="text-text-theme-secondary text-xs">
          Leave empty to use default location
        </p>
      </div>
    </div>
  );
}

export function UpdatesTab({
  localSettings,
  updateLocalSetting,
  api,
}: TabContentProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Update Settings</h3>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={localSettings.checkForUpdatesAutomatically}
          onChange={(e) =>
            updateLocalSetting('checkForUpdatesAutomatically', e.target.checked)
          }
          className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
        />
        <span className="text-text-theme-secondary text-sm">
          Check for updates automatically
        </span>
      </label>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Update Channel
        </label>
        <select
          value={localSettings.updateChannel}
          onChange={(e) =>
            updateLocalSetting('updateChannel', e.target.value as UpdateChannel)
          }
          className="bg-surface-raised border-border-theme w-40 rounded border px-3 py-2 text-sm text-white"
        >
          <option value="stable">Stable</option>
          <option value="beta">Beta</option>
        </select>
        <p className="text-text-theme-secondary text-xs">
          Beta channel receives updates earlier but may be less stable
        </p>
      </div>

      <div className="border-border-theme-subtle border-t pt-4">
        <Button
          variant="secondary"
          onClick={async () => {
            if (api) {
              await api.serviceCall('checkForUpdates');
            }
          }}
        >
          Check for Updates Now
        </Button>
      </div>
    </div>
  );
}

export function AdvancedTab({
  localSettings,
  updateLocalSetting,
  handleSelectDirectory,
  handleReset,
  api,
}: TabContentProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Advanced Settings
      </h3>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Data Directory
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.dataDirectory}
            onChange={(e) =>
              updateLocalSetting('dataDirectory', e.target.value)
            }
            placeholder="Default data location"
            className="bg-surface-raised border-border-theme placeholder-text-theme-secondary flex-1 rounded border px-3 py-2 text-sm text-white"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSelectDirectory('dataDirectory')}
          >
            Browse
          </Button>
        </div>
        <p className="text-text-theme-secondary text-xs">
          Leave empty to use default location
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Maximum recent files
        </label>
        <input
          type="number"
          min={5}
          max={50}
          value={localSettings.maxRecentFiles}
          onChange={(e) =>
            updateLocalSetting('maxRecentFiles', parseInt(e.target.value) || 15)
          }
          className="bg-surface-raised border-border-theme w-24 rounded border px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="border-border-theme-subtle border-t pt-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.enableDevTools}
            onChange={(e) =>
              updateLocalSetting('enableDevTools', e.target.checked)
            }
            className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
          />
          <span className="text-text-theme-secondary text-sm">
            Enable developer tools in production
          </span>
        </label>
      </div>

      <div className="border-border-theme-subtle space-y-3 border-t pt-4">
        <h4 className="text-text-theme-secondary text-sm font-medium">
          Cache Management
        </h4>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              if (
                !confirm(
                  'Are you sure you want to clear the application cache? This will remove temporary data but not your saved units.',
                )
              ) {
                return;
              }
              if (api) {
                try {
                  await api.serviceCall('clearCache');
                  alert('Cache cleared successfully.');
                } catch {
                  alert('Failed to clear cache.');
                }
              }
            }}
          >
            Clear Cache
          </Button>
          <span className="text-text-theme-secondary text-xs">
            Remove temporary files and cached data
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-red-900/50 pt-4">
        <h4 className="mb-3 text-sm font-medium text-red-400">Danger Zone</h4>
        <Button variant="danger" onClick={handleReset}>
          Reset All Settings
        </Button>
      </div>
    </div>
  );
}
