import dynamic from 'next/dynamic';
import React, { useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';

import type { ExportDialogProps } from '@/components/vault/ExportDialog';
import type { ImportDialogProps } from '@/components/vault/ImportDialog';
import type { IExportableUnit } from '@/types/vault';

import {
  SaveUnitDialog,
  type SaveUnitDialogProps,
} from '@/components/customizer/dialogs/SaveUnitDialog';
import { UnitLoadDialog } from '@/components/customizer/dialogs/UnitLoadDialog';
import { UnsavedChangesDialog } from '@/components/customizer/dialogs/UnsavedChangesDialog';
import { useToast } from '@/components/shared/Toast';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { UnitStoreContext } from '@/stores/useUnitStore';

import { CustomizerCommandBar } from '../CustomizerCommandBar';
import { UnitEditControls } from '../shared/UnitEditControls';
import { UnitEditStatusSlotContext } from '../shared/UnitEditStatusSlot';
import { UnitSaveAction, UnitSaveSummary } from '../shared/UnitSaveSummary';

// Lazy-load the two heaviest vault dialogs (~360 + ~300 LOC pulling
// CSV/JSON parsers, Zod, and Toast plumbing). They only mount when
// the user opens the Export / Import flow, so deferring their bundle
// until then trims the customizer's initial JS without changing
// behavior. `ssr: false` because the dialogs are client-only React
// surfaces that depend on the toast portal.
//
// `next/dynamic` erases generics, so the ImportDialog wrapper is cast
// to the concrete `ImportDialogProps<IExportableUnit>` shape used at
// the single call site below. If a future caller needs a different
// `T`, lift the dynamic import to that caller's module.
const ExportDialog: ComponentType<ExportDialogProps> = dynamic(
  () => import('@/components/vault/ExportDialog').then((m) => m.ExportDialog),
  { ssr: false },
);
const ImportDialog: ComponentType<ImportDialogProps<IExportableUnit>> = dynamic(
  () =>
    import('@/components/vault/ImportDialog').then(
      (m) =>
        m.ImportDialog as ComponentType<ImportDialogProps<IExportableUnit>>,
    ),
  { ssr: false },
);

import { MultiUnitTabsEmptyState } from './MultiUnitTabsEmptyState';
import { NewTabModal } from './NewTabModal';
import { SavedHistoryDialog } from './SavedHistoryDialog';
import { TabBar } from './TabBar';
import { useMultiUnitTabsController } from './useMultiUnitTabsController';

interface MultiUnitTabsProps {
  children: React.ReactNode;
  className?: string;
}

type TargetedSaveUnitDialogProps = Omit<
  SaveUnitDialogProps,
  'constructionValidation'
>;

function StoreValidatedSaveUnitDialog(
  props: TargetedSaveUnitDialogProps,
): React.ReactElement {
  const constructionValidation = useUnitValidation();
  return (
    <SaveUnitDialog
      {...props}
      constructionValidation={constructionValidation}
    />
  );
}

export function TargetedSaveUnitDialog(
  props: TargetedSaveUnitDialogProps,
): React.ReactElement {
  const targetStore = props.currentUnitId
    ? getUnitStore(props.currentUnitId)
    : undefined;

  if (!targetStore) {
    return (
      <SaveUnitDialog
        {...props}
        constructionValidation={{
          isValid: false,
          isLoading: false,
          isValidating: false,
          errorCount: 1,
        }}
      />
    );
  }

  return (
    <UnitStoreContext.Provider value={targetStore}>
      <StoreValidatedSaveUnitDialog {...props} />
    </UnitStoreContext.Provider>
  );
}

export function MultiUnitTabs({
  children,
  className = '',
}: MultiUnitTabsProps): React.ReactElement {
  const { showToast } = useToast();
  const [editStatusHost, setEditStatusHost] = useState<HTMLElement | null>(
    null,
  );
  const {
    tabs,
    activeTabId,
    isLoading,
    isNewTabModalOpen,
    closeDialog,
    saveDialog,
    librarySaveDisabledReason,
    savedHistoryDisabledReason,
    isLoadDialogOpen,
    isLoadingUnit,
    cancelPendingLoad,
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
    openSaveDialog,
    openSavedHistory,
    createNewUnit,
    handleLoadUnit,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    handleImportComplete,
    historyDialog,
    closeHistoryDialog,
    restoreHistoryVersion,
  } = useMultiUnitTabsController();

  const createBlankUnit = (): void => {
    createNewUnit(50);
    closeLoadDialog();
  };
  const configureNewUnit = (): void => {
    closeLoadDialog();
    openNewTabModal();
  };

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
        onOpenNewTabModal={configureNewUnit}
        onCreateBlankUnit={createBlankUnit}
        onOpenLoadDialog={openLoadDialog}
        isNewTabModalOpen={isNewTabModalOpen}
        onCloseNewTabModal={closeNewTabModal}
        onCreateUnit={createNewUnit}
        isLoadDialogOpen={isLoadDialogOpen}
        isLoadingUnit={isLoadingUnit}
        onSelectionChange={cancelPendingLoad}
        onLoadUnit={handleLoadUnit}
        onCloseLoadDialog={closeLoadDialog}
      />
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <CustomizerCommandBar>
        <TabBar
          className="min-w-0 flex-1"
          tabs={tabBarTabs}
          activeTabId={activeTabId}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onRenameTab={renameTab}
          onLoadUnit={openLoadDialog}
          onExport={openExportDialog}
          onImport={openImportDialog}
          canExport={!!activeUnitExportData}
          onOpenSavedHistory={openSavedHistory}
          savedHistoryDisabledReason={savedHistoryDisabledReason}
        />
        <div className="bg-surface-base flex min-w-0 shrink-0 items-center pr-1 pl-3 max-sm:pl-0">
          <UnitSaveAction
            unitId={activeTabId}
            disabledReason={librarySaveDisabledReason}
            onSave={openSaveDialog}
          />
        </div>
      </CustomizerCommandBar>

      {activeTabId &&
        (editStatusHost ? (
          // The hosting editor shows save state beside its validation status.
          createPortal(
            <UnitEditControls unitId={activeTabId} compact />,
            editStatusHost,
          )
        ) : (
          <div className="border-border-theme-subtle bg-surface-base flex min-h-11 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-2 py-1">
            <UnitEditControls unitId={activeTabId} />
            <UnitSaveSummary unitId={activeTabId} />
          </div>
        ))}

      <UnitEditStatusSlotContext.Provider value={setEditStatusHost}>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </UnitEditStatusSlotContext.Provider>

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

      <TargetedSaveUnitDialog
        isOpen={saveDialog.isOpen}
        initialChassis={saveDialog.chassis}
        initialVariant={saveDialog.variant}
        currentUnitId={saveDialog.tabId ?? undefined}
        onSave={handleSaveDialogSave}
        onCancel={handleSaveDialogCancel}
      />

      <SavedHistoryDialog
        isOpen={historyDialog.isOpen}
        libraryId={historyDialog.libraryId}
        unitName={historyDialog.unitName}
        currentVersion={historyDialog.currentVersion}
        onClose={closeHistoryDialog}
        onRestoreDraft={restoreHistoryVersion}
      />

      <UnitLoadDialog
        onCreateBlankUnit={createBlankUnit}
        onConfigureNewUnit={configureNewUnit}
        isOpen={isLoadDialogOpen}
        isLoadingUnit={isLoadingUnit}
        onSelectionChange={cancelPendingLoad}
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
