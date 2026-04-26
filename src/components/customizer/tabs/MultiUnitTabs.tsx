import dynamic from "next/dynamic";
import React, { type ComponentType } from "react";

import { SaveUnitDialog } from "@/components/customizer/dialogs/SaveUnitDialog";
import { UnitLoadDialog } from "@/components/customizer/dialogs/UnitLoadDialog";
import { UnsavedChangesDialog } from "@/components/customizer/dialogs/UnsavedChangesDialog";
import { useToast } from "@/components/shared/Toast";
import type { ExportDialogProps } from "@/components/vault/ExportDialog";
import type { ImportDialogProps } from "@/components/vault/ImportDialog";
import type { IExportableUnit } from "@/types/vault";

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
  () => import("@/components/vault/ExportDialog").then((m) => m.ExportDialog),
  { ssr: false },
);
const ImportDialog: ComponentType<ImportDialogProps<IExportableUnit>> = dynamic(
  () =>
    import("@/components/vault/ImportDialog").then(
      (m) =>
        m.ImportDialog as ComponentType<ImportDialogProps<IExportableUnit>>,
    ),
  { ssr: false },
);

import { MultiUnitTabsEmptyState } from "./MultiUnitTabsEmptyState";
import { NewTabModal } from "./NewTabModal";
import { TabBar } from "./TabBar";
import { useMultiUnitTabsController } from "./useMultiUnitTabsController";

interface MultiUnitTabsProps {
  children: React.ReactNode;
  className?: string;
}

export function MultiUnitTabs({
  children,
  className = "",
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
              message: "Unit exported successfully",
              variant: "success",
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
