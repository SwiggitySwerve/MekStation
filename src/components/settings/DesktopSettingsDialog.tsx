/**
 * Desktop Settings Dialog
 *
 * Modal dialog for managing desktop application settings.
 * Organized into tabs: General, Backups, Updates, Advanced.
 *
 * @spec openspec/changes/add-desktop-qol-features/specs/desktop-experience/spec.md
 */

import React, { useCallback, useEffect, useState } from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button } from '@/components/ui';
import { logger } from '@/utils/logger';

import type { TabContentProps } from './DesktopSettingsDialog.tabs';
import type { IDesktopSettings } from './useElectron';

import {
  AdvancedTab,
  BackupsTab,
  GeneralTab,
  UpdatesTab,
} from './DesktopSettingsDialog.tabs';
import { useDesktopSettings } from './useDesktopSettings';
import { useElectron } from './useElectron';

type SettingsTab = 'general' | 'backups' | 'updates' | 'advanced';

interface DesktopSettingsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog is closed */
  onClose: () => void;
}

interface DesktopSettingsDialogState {
  readonly api: ReturnType<typeof useElectron>;
  readonly activeTab: SettingsTab;
  readonly hasChanges: boolean;
  readonly isElectron: boolean;
  readonly isOpen: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly localSettings: IDesktopSettings | null;
  readonly setActiveTab: (tab: SettingsTab) => void;
  readonly updateLocalSetting: <K extends keyof IDesktopSettings>(
    key: K,
    value: IDesktopSettings[K],
  ) => void;
  readonly handleApply: () => Promise<void>;
  readonly handleClose: () => void;
  readonly handleReset: () => Promise<void>;
  readonly handleSave: () => Promise<void>;
  readonly handleSelectDirectory: (
    key: 'defaultSaveDirectory' | 'backupDirectory' | 'dataDirectory',
  ) => Promise<void>;
}

const TABS: ReadonlyArray<{
  readonly id: SettingsTab;
  readonly label: string;
}> = [
  { id: 'general', label: 'General' },
  { id: 'backups', label: 'Backups' },
  { id: 'updates', label: 'Updates' },
  { id: 'advanced', label: 'Advanced' },
];

/**
 * Desktop Settings Dialog Component
 */
export function DesktopSettingsDialog({
  isOpen,
  onClose,
}: DesktopSettingsDialogProps): React.ReactElement | null {
  const dialog = useDesktopSettingsDialogState({ isOpen, onClose });

  if (!dialog.isElectron || !dialog.localSettings) {
    return null;
  }

  return <DesktopSettingsDialogShell dialog={dialog} />;
}

function useDesktopSettingsDialogState({
  isOpen,
  onClose,
}: DesktopSettingsDialogProps): DesktopSettingsDialogState {
  const api = useElectron();
  const { settings, isLoading, updateSettings, resetSettings, isElectron } =
    useDesktopSettings();
  const [localSettings, setLocalSettings] = useState<IDesktopSettings | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && settings) {
      setLocalSettings({ ...settings });
      setHasChanges(false);
    }
  }, [isOpen, settings]);

  const updateLocalSetting = useCallback(
    <K extends keyof IDesktopSettings>(key: K, value: IDesktopSettings[K]) => {
      setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
      setHasChanges(true);
    },
    [],
  );

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

  return {
    api,
    activeTab,
    hasChanges,
    isElectron,
    isOpen,
    isLoading,
    isSaving,
    localSettings,
    setActiveTab,
    updateLocalSetting,
    handleApply,
    handleClose,
    handleReset,
    handleSave,
    handleSelectDirectory,
  };
}

function DesktopSettingsDialogShell({
  dialog,
}: {
  readonly dialog: DesktopSettingsDialogState;
}): React.ReactElement {
  const tabContentProps: TabContentProps = {
    localSettings: dialog.localSettings!,
    updateLocalSetting: dialog.updateLocalSetting,
    handleSelectDirectory: dialog.handleSelectDirectory,
    handleReset: dialog.handleReset,
    api: dialog.api,
  };

  return (
    <ModalOverlay
      isOpen={dialog.isOpen}
      onClose={dialog.handleClose}
      preventClose={dialog.isSaving}
      className="max-h-[80vh] w-[600px] overflow-hidden"
    >
      <div className="flex h-full flex-col">
        <DesktopSettingsHeader
          isSaving={dialog.isSaving}
          onClose={dialog.handleClose}
        />

        <div className="flex flex-1 overflow-hidden">
          <TabNavigation
            activeTab={dialog.activeTab}
            onTabChange={dialog.setActiveTab}
          />

          <div className="flex-1 overflow-y-auto p-6">
            <DesktopSettingsTabContent
              activeTab={dialog.activeTab}
              isLoading={dialog.isLoading}
              tabContentProps={tabContentProps}
            />
          </div>
        </div>

        <DesktopSettingsFooter
          hasChanges={dialog.hasChanges}
          isSaving={dialog.isSaving}
          onApply={dialog.handleApply}
          onClose={dialog.handleClose}
          onSave={dialog.handleSave}
        />
      </div>
    </ModalOverlay>
  );
}

function DesktopSettingsHeader({
  isSaving,
  onClose,
}: {
  readonly isSaving: boolean;
  readonly onClose: () => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle flex items-center justify-between border-b px-6 py-4">
      <h2 className="text-xl font-semibold text-white">Preferences</h2>
      <button
        onClick={onClose}
        className="text-text-theme-secondary rounded p-1 hover:text-white"
        disabled={isSaving}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function CloseIcon(): React.ReactElement {
  return (
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
  );
}

function TabNavigation({
  activeTab,
  onTabChange,
}: {
  readonly activeTab: SettingsTab;
  readonly onTabChange: (tab: SettingsTab) => void;
}): React.ReactElement {
  return (
    <div className="bg-surface-deep/50 border-border-theme-subtle w-40 border-r py-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
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
  );
}

function DesktopSettingsTabContent({
  activeTab,
  isLoading,
  tabContentProps,
}: {
  readonly activeTab: SettingsTab;
  readonly isLoading: boolean;
  readonly tabContentProps: TabContentProps;
}): React.ReactElement {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-text-theme-secondary">Loading settings...</div>
      </div>
    );
  }

  switch (activeTab) {
    case 'general':
      return <GeneralTab {...tabContentProps} />;
    case 'backups':
      return <BackupsTab {...tabContentProps} />;
    case 'updates':
      return <UpdatesTab {...tabContentProps} />;
    case 'advanced':
      return <AdvancedTab {...tabContentProps} />;
  }
}

function DesktopSettingsFooter({
  hasChanges,
  isSaving,
  onApply,
  onClose,
  onSave,
}: {
  readonly hasChanges: boolean;
  readonly isSaving: boolean;
  readonly onApply: () => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle flex items-center justify-end gap-3 border-t px-6 py-4">
      {hasChanges && (
        <span className="text-accent mr-auto text-xs">Unsaved changes</span>
      )}
      <Button variant="secondary" onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        variant="secondary"
        onClick={onApply}
        disabled={isSaving || !hasChanges}
      >
        Apply
      </Button>
      <Button
        variant="primary"
        onClick={onSave}
        disabled={isSaving || !hasChanges}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
