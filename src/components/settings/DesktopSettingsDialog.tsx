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
  onClose
}: DesktopSettingsDialogProps): React.ReactElement | null {
  const api = useElectron();
  const { settings, isLoading, updateSettings, resetSettings, isElectron } = useDesktopSettings();
  
  // Local form state (allows editing before saving)
  const [localSettings, setLocalSettings] = useState<IDesktopSettings | null>(null);
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
  const updateLocalSetting = useCallback(<K extends keyof IDesktopSettings>(
    key: K,
    value: IDesktopSettings[K]
  ) => {
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  }, []);

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
    if (!confirm('Are you sure you want to reset all settings to their defaults?')) {
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
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  }, [hasChanges, onClose]);

  // Handle directory selection
  const handleSelectDirectory = useCallback(async (
    key: 'defaultSaveDirectory' | 'backupDirectory' | 'dataDirectory'
  ) => {
    if (!api) return;

    try {
      const result = await api.selectDirectory();
      if (!result.canceled && result.filePaths.length > 0) {
        updateLocalSetting(key, result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  }, [api, updateLocalSetting]);

  // Don't render if not in Electron or no settings
  if (!isElectron || !localSettings) {
    return null;
  }

  // Tab content renderers
  const renderGeneralTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
      
      {/* Startup Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Startup</h4>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.launchAtLogin}
            onChange={(e) => updateLocalSetting('launchAtLogin', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-300">Launch at login</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.startMinimized}
            onChange={(e) => updateLocalSetting('startMinimized', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-300">Start minimized to system tray</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.reopenLastUnit}
            onChange={(e) => updateLocalSetting('reopenLastUnit', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-300">Reopen last unit on startup</span>
        </label>
      </div>

      {/* Window Settings */}
      <div className="space-y-3 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-medium text-slate-300">Window</h4>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.rememberWindowState}
            onChange={(e) => updateLocalSetting('rememberWindowState', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-300">Remember window position and size</span>
        </label>
      </div>

      {/* Default Directory */}
      <div className="space-y-2 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-medium text-slate-300">Default Save Directory</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.defaultSaveDirectory}
            onChange={(e) => updateLocalSetting('defaultSaveDirectory', e.target.value)}
            placeholder="Default save location"
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400"
          />
          <Button variant="secondary" size="sm" onClick={() => handleSelectDirectory('defaultSaveDirectory')}>
            Browse
          </Button>
        </div>
        <p className="text-xs text-slate-400">Leave empty to use system default</p>
      </div>
    </div>
  );

  const renderBackupsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Backup Settings</h3>
      
      {/* Auto-backup Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={localSettings.enableAutoBackup}
          onChange={(e) => updateLocalSetting('enableAutoBackup', e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
        />
        <span className="text-sm text-slate-300">Enable automatic backups</span>
      </label>

      {/* Backup Interval */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Backup interval (minutes)
        </label>
        <input
          type="number"
          min={1}
          max={1440}
          value={localSettings.backupIntervalMinutes}
          onChange={(e) => updateLocalSetting('backupIntervalMinutes', parseInt(e.target.value) || 5)}
          disabled={!localSettings.enableAutoBackup}
          className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white disabled:opacity-50"
        />
      </div>

      {/* Max Backups */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Maximum backups to keep
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={localSettings.maxBackupCount}
          onChange={(e) => updateLocalSetting('maxBackupCount', parseInt(e.target.value) || 10)}
          className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
        />
      </div>

      {/* Backup Directory */}
      <div className="space-y-2 pt-4 border-t border-slate-700">
        <label className="text-sm font-medium text-slate-300">Backup Directory</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.backupDirectory}
            onChange={(e) => updateLocalSetting('backupDirectory', e.target.value)}
            placeholder="Default backup location"
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400"
          />
          <Button variant="secondary" size="sm" onClick={() => handleSelectDirectory('backupDirectory')}>
            Browse
          </Button>
        </div>
        <p className="text-xs text-slate-400">Leave empty to use default location</p>
      </div>
    </div>
  );

  const renderUpdatesTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Update Settings</h3>
      
      {/* Auto-update Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={localSettings.checkForUpdatesAutomatically}
          onChange={(e) => updateLocalSetting('checkForUpdatesAutomatically', e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
        />
        <span className="text-sm text-slate-300">Check for updates automatically</span>
      </label>

      {/* Update Channel */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Update Channel</label>
        <select
          value={localSettings.updateChannel}
          onChange={(e) => updateLocalSetting('updateChannel', e.target.value as UpdateChannel)}
          className="w-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
        >
          <option value="stable">Stable</option>
          <option value="beta">Beta</option>
        </select>
        <p className="text-xs text-slate-400">
          Beta channel receives updates earlier but may be less stable
        </p>
      </div>

      {/* Check Now Button */}
      <div className="pt-4 border-t border-slate-700">
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
      <h3 className="text-lg font-semibold text-white mb-4">Advanced Settings</h3>
      
      {/* Data Directory */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Data Directory</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.dataDirectory}
            onChange={(e) => updateLocalSetting('dataDirectory', e.target.value)}
            placeholder="Default data location"
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400"
          />
          <Button variant="secondary" size="sm" onClick={() => handleSelectDirectory('dataDirectory')}>
            Browse
          </Button>
        </div>
        <p className="text-xs text-slate-400">Leave empty to use default location</p>
      </div>

      {/* Max Recent Files */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Maximum recent files
        </label>
        <input
          type="number"
          min={5}
          max={50}
          value={localSettings.maxRecentFiles}
          onChange={(e) => updateLocalSetting('maxRecentFiles', parseInt(e.target.value) || 15)}
          className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
        />
      </div>

      {/* Developer Tools */}
      <div className="pt-4 border-t border-slate-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.enableDevTools}
            onChange={(e) => updateLocalSetting('enableDevTools', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
          />
          <span className="text-sm text-slate-300">Enable developer tools in production</span>
        </label>
      </div>

      {/* Cache Management */}
      <div className="pt-4 border-t border-slate-700 space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Cache Management</h4>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={async () => {
              if (!confirm('Are you sure you want to clear the application cache? This will remove temporary data but not your saved units.')) {
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
          <span className="text-xs text-slate-400">Remove temporary files and cached data</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 mt-4 border-t border-red-900/50">
        <h4 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h4>
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
    { id: 'advanced', label: 'Advanced' }
  ];

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={handleClose}
      preventClose={isSaving}
      className="w-[600px] max-h-[80vh] overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Preferences</h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white rounded"
            disabled={isSaving}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tab Navigation */}
          <div className="w-40 bg-slate-900/50 border-r border-slate-700 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-400 border-r-2 border-amber-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading settings...</div>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
          {hasChanges && (
            <span className="text-xs text-amber-400 mr-auto">Unsaved changes</span>
          )}
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleApply} disabled={isSaving || !hasChanges}>
            Apply
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
