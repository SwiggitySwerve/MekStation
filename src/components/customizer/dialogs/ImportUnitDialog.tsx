/**
 * Import Unit Dialog Component
 * 
 * Dialog for importing units from JSON files.
 * Handles file selection, validation, and conflict resolution.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import React, { useState, useCallback } from 'react';
import { ModalOverlay } from './ModalOverlay';
import { customUnitApiService, ISaveResult } from '@/services/units/CustomUnitApiService';
import { ISerializedUnitEnvelope } from '@/types/persistence/UnitPersistence';
import { customizerStyles as cs } from '../styles';

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

type ImportState = 'idle' | 'validating' | 'conflict' | 'importing' | 'success' | 'error';

interface ParsedUnit {
  chassis: string;
  variant: string;
  data: ISerializedUnitEnvelope | Record<string, unknown>;
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
      const text = await file.text();
      const data = JSON.parse(text) as ISerializedUnitEnvelope | Record<string, unknown>;
      
      // Extract unit data (handle envelope vs raw format)
      let unitData: Record<string, unknown>;
      if ('formatVersion' in data && 'unit' in data) {
        unitData = (data as ISerializedUnitEnvelope).unit;
      } else {
        unitData = data as Record<string, unknown>;
      }
      
      // Validate required fields
      const chassis = unitData.chassis as string | undefined;
      const variant = (unitData.variant || unitData.model) as string | undefined;
      
      if (!chassis) {
        throw new Error('Missing required field: chassis');
      }
      if (!variant) {
        throw new Error('Missing required field: variant or model');
      }
      
      setParsedUnit({ chassis, variant, data });
      setState('idle');
      
      return { chassis, variant, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      setError(message);
      setState('error');
      setParsedUnit(null);
      return null;
    }
  }, []);
  
  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await parseFile(file);
    
    // Reset input
    e.target.value = '';
  }, [parseFile]);
  
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
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
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
  }, [parseFile]);
  
  // Handle import
  const handleImport = useCallback(async () => {
    if (!parsedUnit) return;
    
    setState('importing');
    setError(null);
    
    try {
      let result: ISaveResult;
      
      if (useAlternateName && alternateName.trim()) {
        // Import with alternate variant name
        const data = parsedUnit.data as Record<string, unknown>;
        let modifiedData: Record<string, unknown>;
        
        if ('unit' in data && typeof data.unit === 'object' && data.unit !== null) {
          // Envelope format - modify the nested unit
          modifiedData = {
            ...data,
            unit: { ...(data.unit as Record<string, unknown>), variant: alternateName.trim() },
          };
        } else {
          // Direct unit format
          modifiedData = { ...data, variant: alternateName.trim() };
        }
        result = await customUnitApiService.importUnit(modifiedData);
      } else {
        result = await customUnitApiService.importUnit(parsedUnit.data);
      }
      
      if (result.success && result.id) {
        setState('success');
        const finalName = useAlternateName && alternateName.trim()
          ? `${parsedUnit.chassis} ${alternateName.trim()}`
          : `${parsedUnit.chassis} ${parsedUnit.variant}`;
        onImportSuccess(result.id, finalName);
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
      className="w-full max-w-lg mx-4"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h3 className={cs.dialog.headerTitle}>Import Unit</h3>
        <button onClick={onClose} className={cs.dialog.closeBtn}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className={cs.dialog.content}>
        {/* Drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`${cs.dialog.dropzone} ${dragActive ? cs.dialog.dropzoneActive : ''}`}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <svg className="w-10 h-10 mx-auto mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-slate-300">
            Drag and drop a JSON file here, or{' '}
            <span className="text-blue-400 underline">click to browse</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Supports .json files exported from this editor
          </p>
        </div>
        
        {/* Parsed unit info */}
        {parsedUnit && (
          <div className={cs.dialog.infoPanel}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">
                  {parsedUnit.chassis} {parsedUnit.variant}
                </div>
                <div className="text-sm text-text-theme-secondary">
                  Ready to import
                </div>
              </div>
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Conflict resolution */}
        {state === 'conflict' && suggestedName && (
          <div className={`${cs.dialog.warningPanel} space-y-3`}>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="text-accent font-medium">Name Conflict</div>
                <div className="text-sm text-accent/80">
                  A unit named &quot;{parsedUnit?.chassis} {parsedUnit?.variant}&quot; already exists.
                </div>
              </div>
            </div>
            
            <div className="pl-7">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAlternateName}
                  onChange={(e) => setUseAlternateName(e.target.checked)}
                  className="w-4 h-4 rounded border-border-theme bg-surface-raised text-blue-500 focus:ring-blue-500 focus:ring-offset-surface-base"
                />
                <span className="text-sm text-slate-300">
                  Import with alternate name
                </span>
              </label>
              
              {useAlternateName && (
                <input
                  type="text"
                  value={alternateName}
                  onChange={(e) => setAlternateName(e.target.value)}
                  placeholder="New variant name"
                  className={`mt-2 ${cs.dialog.input}`}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className={cs.dialog.errorPanel}>
            <div className="flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {/* Loading state */}
        {(state === 'validating' || state === 'importing') && (
          <div className="flex items-center justify-center gap-2 text-text-theme-secondary py-4">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {state === 'validating' ? 'Validating...' : 'Importing...'}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={cs.dialog.footer}>
        <button onClick={onClose} className={cs.dialog.btnGhost}>
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!parsedUnit || state === 'validating' || state === 'importing'}
          className={`min-w-[100px] ${cs.dialog.btnPrimary}`}
        >
          Import
        </button>
      </div>
    </ModalOverlay>
  );
}

