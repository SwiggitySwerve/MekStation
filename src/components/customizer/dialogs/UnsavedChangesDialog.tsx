/**
 * Unsaved Changes Dialog Component
 * 
 * Confirmation dialog for closing tabs with unsaved changes.
 * Matches MegaMekLab's "Save Unit Before Proceeding?" dialog style.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React from 'react';
import { ModalOverlay } from './ModalOverlay';
import { customizerStyles as cs } from '../styles';

interface UnsavedChangesDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Unit name */
  unitName: string;
  /** Called when dialog is closed (Cancel) */
  onClose: () => void;
  /** Called when user confirms discard (No - don't save) */
  onDiscard: () => void;
  /** Called when user chooses to save (Yes - save first) */
  onSave?: () => void;
}

/**
 * Unsaved changes warning dialog
 * 
 * Three options like MegaMekLab:
 * - Yes: Save the unit first, then proceed
 * - No: Discard changes and proceed
 * - Cancel: Go back, don't close
 */
export function UnsavedChangesDialog({
  isOpen,
  unitName,
  onClose,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-md mx-4"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h3 className={cs.dialog.headerTitle}>Save Unit Before Proceeding?</h3>
        <button onClick={onClose} className={cs.dialog.closeBtn}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Warning icon */}
          <div className={cs.dialog.warningIcon}>
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          {/* Message */}
          <div className="flex-1">
            <p className="text-slate-300">
              All unsaved changes in the current unit will be discarded.
            </p>
            <p className="text-slate-400 mt-1">
              Save the unit first?
            </p>
            {unitName && (
              <p className="text-slate-500 text-sm mt-2 font-mono">
                Unit: {unitName}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer - Yes/No/Cancel buttons like MegaMekLab */}
      <div className={cs.dialog.footer}>
        {onSave && (
          <button onClick={onSave} className={`min-w-[80px] ${cs.dialog.btnPrimary}`}>
            Yes
          </button>
        )}
        <button onClick={onDiscard} className={`min-w-[80px] ${cs.dialog.btnSecondary}`}>
          No
        </button>
        <button onClick={onClose} className={`min-w-[80px] ${cs.dialog.btnGhost} bg-slate-700 hover:bg-slate-600 rounded`}>
          Cancel
        </button>
      </div>
    </ModalOverlay>
  );
}

