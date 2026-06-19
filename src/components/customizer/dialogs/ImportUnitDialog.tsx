/**
 * Import Unit Dialog Component
 *
 * Dialog for importing units from JSON files.
 * Handles file selection, validation, and conflict resolution.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import React, { useState, useCallback } from 'react';

import { ISaveResult } from '@/services/units/CustomUnitApiService';

import { customizerStyles as cs } from '../styles';
import { DialogCloseButton } from './dialogPresentation';
import {
  getImportedUnitName,
  ImportDialogContent,
  ImportState,
  importParsedUnit,
  ParsedUnit,
  parseImportedFile,
} from './ImportUnitDialog.parts';
import { ModalOverlay } from './ModalOverlay';

// =============================================================================
// Types
// =============================================================================

export interface ImportUnitDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when import succeeds */
  onImportSuccess: (unitId: string, unitName: string) => void;
  /** Called when dialog is closed */
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ImportUnitDialog({
  isOpen,
  onImportSuccess,
  onClose,
}: ImportUnitDialogProps): React.ReactElement {
  // State
  const [state, setState] = useState<ImportState>('idle');
  const [parsedUnit, setParsedUnit] = useState<ParsedUnit | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [useAlternateName, setUseAlternateName] = useState(false);
  const [alternateName, setAlternateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setState('idle');
      setParsedUnit(null);
      setSuggestedName(null);
      setUseAlternateName(false);
      setAlternateName('');
      setError(null);
    }
  }, [isOpen]);

  // Parse and validate file
  const parseFile = useCallback(async (file: File) => {
    setState('validating');
    setError(null);

    try {
      const importedUnit = await parseImportedFile(file);
      setParsedUnit(importedUnit);
      setState('idle');
      return importedUnit;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to parse file';
      setError(message);
      setState('error');
      setParsedUnit(null);
      return null;
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      await parseFile(file);

      // Reset input
      e.target.value = '';
    },
    [parseFile],
  );

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        setError('Please drop a JSON file');
        return;
      }

      await parseFile(file);
    },
    [parseFile],
  );

  // Handle import
  const handleImport = useCallback(async () => {
    if (!parsedUnit) return;

    setState('importing');
    setError(null);

    try {
      const result: ISaveResult = await importParsedUnit(
        parsedUnit,
        useAlternateName,
        alternateName,
      );

      if (result.success && result.id) {
        setState('success');
        onImportSuccess(
          result.id,
          getImportedUnitName(parsedUnit, useAlternateName, alternateName),
        );
      } else if (result.requiresRename && result.suggestedName) {
        setState('conflict');
        setSuggestedName(result.suggestedName.suggestedVariant);
        setAlternateName(result.suggestedName.suggestedVariant);
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      setState('error');
    }
  }, [parsedUnit, useAlternateName, alternateName, onImportSuccess]);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 w-full max-w-lg"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h3 className={cs.dialog.headerTitle}>Import Unit</h3>
        <DialogCloseButton onClose={onClose} />
      </div>

      <ImportDialogContent
        alternateName={alternateName}
        dragActive={dragActive}
        error={error}
        handleDrag={handleDrag}
        handleDrop={handleDrop}
        handleFileSelect={handleFileSelect}
        parsedUnit={parsedUnit}
        setAlternateName={setAlternateName}
        setUseAlternateName={setUseAlternateName}
        state={state}
        suggestedName={suggestedName}
        useAlternateName={useAlternateName}
      />

      {/* Footer */}
      <div className={cs.dialog.footer}>
        <button onClick={onClose} className={cs.dialog.btnGhost}>
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={
            !parsedUnit || state === 'validating' || state === 'importing'
          }
          className={`min-w-[100px] ${cs.dialog.btnPrimary}`}
        >
          Import
        </button>
      </div>
    </ModalOverlay>
  );
}
