/**
 * Desktop Settings Dialog
 *
 * Modal dialog for managing desktop application settings.
 * Organized into tabs: General, Backups, Updates, Advanced.
 *
 * @spec openspec/changes/add-desktop-qol-features/specs/desktop-experience/spec.md
 */

import React, { useState, useEffect, useCallback } from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button } from '@/components/ui';
import { logger } from '@/utils/logger';

import { useDesktopSettings } from './useDesktopSettings';
import { useElectron, IDesktopSettings, UpdateChannel } from './useElectron';

// Tab type
type SettingsTab = 'general' | 'backups' | 'updates' | 'advanced';

interface DesktopSettingsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog is closed */
  onClose: () => void;
}

/**
 * Desktop Settings Dialog Component
 */
export function DesktopSettingsDialog({
  isOpen,
  onClose,
}: DesktopSettingsDialogProps): React.ReactElement | null {
  const api = useElectron();
  const { settings, isLoading, updateSettings, resetSettings, isElectron } =
    useDesktopSettings();

  // Local form state (allows editing before saving)
  const [localSettings, setLocalSettings] = useState<IDesktopSettings | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings when dialog opens
  useEffect(() => {
    if (isOpen && settings) {
      setLocalSettings({ ...settings });
      setHasChanges(false);
    }
  }, [isOpen, settings]);

  // Update local setting
  const updateLocalSetting = useCallback(
    <K extends keyof IDesktopSettings>(key: K, value: IDesktopSettings[K]) => {
      setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
      setHasChanges(true);
    },
    [],
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!localSettings) return;

    setIsSaving(true);
    try {
      const result = await updateSettings(localSettings);
      if (result.success) {
        setHasChanges(false);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, updateSettings, onClose]);

  // Handle apply
  const handleApply = useCallback(async () => {
    if (!localSettings) return;

    setIsSaving(true);
    try {
      const result = await updateSettings(localSettings);
      if (result.success) {
        setHasChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, updateSettings]);

  // Handle reset
  const handleReset = useCallback(async () => {
    if (
      !confirm('Are you sure you want to reset all settings to their defaults?')
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await resetSettings();
      if (result.success) {
        setHasChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [resetSettings]);

  // Handle close with unsaved changes
  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (
        !confirm('You have unsaved changes. Are you sure you want to close?')
      ) {
        return;
      }
    }
    onClose();
  }, [hasChanges, onClose]);

  // Handle directory selection
  const handleSelectDirectory = useCallback(
    async (
      key: 'defaultSaveDirectory' | 'backupDirectory' | 'dataDirectory',
    ) => {
      if (!api) return;

      try {
        const result = await api.selectDirectory();
        if (!result.canceled && result.filePaths.length > 0) {
          updateLocalSetting(key, result.filePaths[0]);
        }
      } catch (error) {
        logger.error('Failed to select directory:', error);
      }
    },
    [api, updateLocalSetting],
  );

  // Don't render if not in Electron or no settings
  if (!isElectron || !localSettings) {
    return null;
  }

  // Tab content renderers
  const renderGeneralTab = () => (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">
        General Settings
      </h3>

      {/* Startup Settings */}
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

      {/* Window Settings */}
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

      {/* Default Directory */}
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

  const renderBackupsTab = () => (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Backup Settings</h3>

      {/* Auto-backup Toggle */}
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

      {/* Backup Interval */}
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

      {/* Max Backups */}
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

      {/* Backup Directory */}
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

  const renderUpdatesTab = () => (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Update Settings</h3>

      {/* Auto-update Toggle */}
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

      {/* Update Channel */}
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

      {/* Check Now Button */}
      <div className="border-border-theme-subtle border-t pt-4">
        <Button
          variant="secondary"
          onClick={async () => {
            if (api) {
              // Note: This triggers the update check in the main process
              await api.serviceCall('checkForUpdates');
            }
          }}
        >
          Check for Updates Now
        </Button>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Advanced Settings
      </h3>

      {/* Data Directory */}
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

      {/* Max Recent Files */}
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

      {/* Developer Tools */}
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

      {/* Cache Management */}
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

      {/* Danger Zone */}
      <div className="mt-4 border-t border-red-900/50 pt-4">
        <h4 className="mb-3 text-sm font-medium text-red-400">Danger Zone</h4>
        <Button variant="danger" onClick={handleReset}>
          Reset All Settings
        </Button>
      </div>
    </div>
  );

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'backups', label: 'Backups' },
    { id: 'updates', label: 'Updates' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={handleClose}
      preventClose={isSaving}
      className="max-h-[80vh] w-[600px] overflow-hidden"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-border-theme-subtle flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Preferences</h2>
          <button
            onClick={handleClose}
            className="text-text-theme-secondary rounded p-1 hover:text-white"
            disabled={isSaving}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-surface-deep/50 border-border-theme-subtle w-40 border-r py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent/20 text-accent border-accent border-r-2'
                    : 'text-text-theme-secondary hover:bg-surface-base hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-text-theme-secondary">
                  Loading settings...
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'general' && renderGeneralTab()}
                {activeTab === 'backups' && renderBackupsTab()}
                {activeTab === 'updates' && renderUpdatesTab()}
                {activeTab === 'advanced' && renderAdvancedTab()}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border-theme-subtle flex items-center justify-end gap-3 border-t px-6 py-4">
          {hasChanges && (
            <span className="text-accent mr-auto text-xs">Unsaved changes</span>
          )}
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleApply}
            disabled={isSaving || !hasChanges}
          >
            Apply
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
