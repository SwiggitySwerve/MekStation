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

import {
  GeneralTab,
  BackupsTab,
  UpdatesTab,
  AdvancedTab,
} from './DesktopSettingsDialog.tabs';
import { useDesktopSettings } from './useDesktopSettings';
import { useElectron, IDesktopSettings } from './useElectron';

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

  const tabContentProps = {
    localSettings,
    updateLocalSetting,
    handleSelectDirectory,
    handleReset,
    api,
  };

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
                {activeTab === 'general' && <GeneralTab {...tabContentProps} />}
                {activeTab === 'backups' && <BackupsTab {...tabContentProps} />}
                {activeTab === 'updates' && <UpdatesTab {...tabContentProps} />}
                {activeTab === 'advanced' && (
                  <AdvancedTab {...tabContentProps} />
                )}
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
