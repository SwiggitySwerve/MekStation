/**
 * Desktop Settings Dialog
 *
 * Modal dialog for managing desktop application settings.
 * Organized into tabs: General, Backups, Updates, Advanced.
 *
 * @spec openspec/changes/add-desktop-qol-features/specs/desktop-experience/spec.md
 */

import React from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button } from '@/components/ui';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
import { SvgIcon } from '@/components/ui/SvgIcon';

import type {
  DesktopSettingsDialogProps,
  DesktopSettingsDialogState,
  SettingsTab,
} from './DesktopSettingsDialog.state';
import type { TabContentProps } from './DesktopSettingsDialog.tabs';

import { useDesktopSettingsDialogState } from './DesktopSettingsDialog.state';
import {
  AdvancedTab,
  BackupsTab,
  GeneralTab,
  UpdatesTab,
} from './DesktopSettingsDialog.tabs';

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
    <>
      <ModalOverlay
        isOpen={dialog.isOpen}
        onClose={dialog.handleClose}
        preventClose={dialog.isSaving}
        ariaLabelledBy="desktop-settings-title"
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

            <fieldset
              disabled={dialog.isSaving}
              className="min-w-0 flex-1 overflow-y-auto border-0 p-6"
            >
              <DesktopSettingsTabContent
                activeTab={dialog.activeTab}
                isLoading={dialog.isLoading}
                tabContentProps={tabContentProps}
              />
            </fieldset>
          </div>

          {dialog.resetStatus && (
            <p
              role={dialog.resetStatus.error ? 'alert' : 'status'}
              className="text-text-theme-primary px-6 py-2 text-sm"
            >
              {dialog.resetStatus.message}
            </p>
          )}
          <DesktopSettingsFooter
            hasChanges={dialog.hasChanges}
            isSaving={dialog.isSaving}
            onApply={dialog.handleApply}
            onClose={dialog.handleClose}
            onSave={dialog.handleSave}
          />
        </div>
      </ModalOverlay>
      <DialogTemplate
        topLayer
        isOpen={dialog.isOpen && dialog.decision !== null}
        onClose={dialog.dismissDecision}
        preventClose={dialog.isSaving}
        title={
          dialog.decision?.action === 'reset'
            ? 'Reset desktop settings?'
            : 'Discard unsaved changes?'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={dialog.dismissDecision}
              disabled={dialog.isSaving}
            >
              {dialog.decision?.action === 'reset' ? 'Cancel' : 'Keep editing'}
            </Button>
            <Button
              variant="danger"
              onClick={dialog.approveDecision}
              disabled={dialog.isSaving}
            >
              {dialog.decision?.action === 'reset'
                ? 'Reset settings'
                : 'Discard changes'}
            </Button>
          </>
        }
      >
        {dialog.decision?.action === 'reset'
          ? 'Restore all desktop settings to their defaults?'
          : 'Your unsaved settings changes will be lost.'}
      </DialogTemplate>
    </>
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
      <h2
        id="desktop-settings-title"
        className="text-text-theme-primary text-xl font-semibold"
      >
        Preferences
      </h2>
      <button
        aria-label="Close preferences"
        onClick={onClose}
        className="text-text-theme-secondary hover:text-text-theme-primary rounded p-1"
        disabled={isSaving}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function CloseIcon(): React.ReactElement {
  return (
    <SvgIcon
      size="control"
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
    </SvgIcon>
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
              : 'text-text-theme-secondary hover:bg-surface-base hover:text-text-theme-primary'
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
