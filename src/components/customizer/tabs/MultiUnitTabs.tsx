import React from 'react';

import { SaveUnitDialog } from '@/components/customizer/dialogs/SaveUnitDialog';
import { UnitLoadDialog } from '@/components/customizer/dialogs/UnitLoadDialog';
import { UnsavedChangesDialog } from '@/components/customizer/dialogs/UnsavedChangesDialog';
import { useToast } from '@/components/shared/Toast';
import { ExportDialog } from '@/components/vault/ExportDialog';
import { ImportDialog } from '@/components/vault/ImportDialog';

import { MultiUnitTabsEmptyState } from './MultiUnitTabsEmptyState';
import { NewTabModal } from './NewTabModal';
import { TabBar } from './TabBar';
import { useMultiUnitTabsController } from './useMultiUnitTabsController';

interface MultiUnitTabsProps {
  children: React.ReactNode;
  className?: string;
}

export function MultiUnitTabs({
  children,
  className = '',
}: MultiUnitTabsProps): React.ReactElement {
  const { showToast } = useToast();
  const {
    tabs,
    activeTabId,
    isLoading,
    isNewTabModalOpen,
    closeDialog,
    saveDialog,
    isLoadDialogOpen,
    isExportDialogOpen,
    isImportDialogOpen,
    tabBarTabs,
    activeUnitExportData,
    unitImportHandlers,
    selectTab,
    closeTab,
    renameTab,
    openNewTabModal,
    closeNewTabModal,
    openLoadDialog,
    closeLoadDialog,
    openExportDialog,
    closeExportDialog,
    openImportDialog,
    closeImportDialog,
    createNewUnit,
    handleLoadUnit,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    handleImportComplete,
  } = useMultiUnitTabsController();

  if (isLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${className}`}>
        <div className="text-text-theme-secondary">Loading...</div>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <MultiUnitTabsEmptyState
        className={className}
        onOpenNewTabModal={openNewTabModal}
        onOpenLoadDialog={openLoadDialog}
        isNewTabModalOpen={isNewTabModalOpen}
        onCloseNewTabModal={closeNewTabModal}
        onCreateUnit={createNewUnit}
        isLoadDialogOpen={isLoadDialogOpen}
        onLoadUnit={handleLoadUnit}
        onCloseLoadDialog={closeLoadDialog}
      />
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <TabBar
        tabs={tabBarTabs}
        activeTabId={activeTabId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onRenameTab={renameTab}
        onNewTab={openNewTabModal}
        onLoadUnit={openLoadDialog}
        onExport={openExportDialog}
        onImport={openImportDialog}
        canExport={!!activeUnitExportData}
      />

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      <NewTabModal
        isOpen={isNewTabModalOpen}
        onClose={closeNewTabModal}
        onCreateUnit={createNewUnit}
      />

      <UnsavedChangesDialog
        isOpen={closeDialog.isOpen}
        unitName={closeDialog.tabName}
        onClose={handleCloseDialogCancel}
        onDiscard={handleCloseDialogDiscard}
        onSave={handleCloseDialogSave}
      />

      <SaveUnitDialog
        isOpen={saveDialog.isOpen}
        initialChassis={saveDialog.chassis}
        initialVariant={saveDialog.variant}
        currentUnitId={saveDialog.tabId ?? undefined}
        onSave={handleSaveDialogSave}
        onCancel={handleSaveDialogCancel}
      />

      <UnitLoadDialog
        isOpen={isLoadDialogOpen}
        onLoadUnit={handleLoadUnit}
        onCancel={closeLoadDialog}
      />

      {activeUnitExportData && (
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={closeExportDialog}
          contentType="unit"
          content={activeUnitExportData}
          onExportComplete={() => {
            showToast({
              message: 'Unit exported successfully',
              variant: 'success',
            });
          }}
        />
      )}

      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={closeImportDialog}
        handlers={unitImportHandlers}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
