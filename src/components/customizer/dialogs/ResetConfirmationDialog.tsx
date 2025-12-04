/**
 * Reset Confirmation Dialog Component
 * 
 * Multi-step confirmation dialog for reset operations.
 * 
 * @spec openspec/specs/confirmation-dialogs/spec.md
 */

import React, { useState } from 'react';
import { ModalOverlay } from './ModalOverlay';
import { customizerStyles as cs } from '../styles';

/**
 * Reset option configuration
 */
export interface ResetOption {
  /** Option identifier */
  id: string;
  /** Option title */
  title: string;
  /** Option description */
  description: string;
  /** What will be removed */
  removes: string[];
  /** What will be preserved */
  preserves: string[];
}

/**
 * Default reset options
 */
export const DEFAULT_RESET_OPTIONS: ResetOption[] = [
  {
    id: 'equipment',
    title: 'Reset Equipment Only',
    description: 'Remove all mounted equipment and return to unallocated pool',
    removes: ['Weapon placements', 'Equipment placements', 'Ammunition placements'],
    preserves: ['Structure type', 'Armor allocation', 'Engine and gyro', 'Heat sinks'],
  },
  {
    id: 'armor',
    title: 'Reset Armor & Equipment',
    description: 'Reset armor allocation and all equipment',
    removes: ['All equipment', 'Armor allocation'],
    preserves: ['Structure type', 'Engine and gyro', 'Base configuration'],
  },
  {
    id: 'full',
    title: 'Full Reset',
    description: 'Reset to base chassis with no equipment',
    removes: ['All equipment', 'Armor', 'Heat sinks', 'All modifications'],
    preserves: ['Tonnage', 'Tech base', 'Basic chassis'],
  },
];

type DialogStep = 'select' | 'confirm' | 'progress' | 'result';

interface ResetConfirmationDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when dialog is closed */
  onClose: () => void;
  /** Called when reset is confirmed */
  onConfirm: (optionId: string) => Promise<void>;
  /** Reset options */
  options?: ResetOption[];
}

/**
 * Reset confirmation dialog with multiple options
 */
export function ResetConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  options = DEFAULT_RESET_OPTIONS,
}: ResetConfirmationDialogProps): React.ReactElement {
  const [step, setStep] = useState<DialogStep>('select');
  const [selectedOption, setSelectedOption] = useState<ResetOption>(options[0]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const handleClose = () => {
    if (step !== 'progress') {
      setStep('select');
      setProgress(0);
      setError(null);
      onClose();
    }
  };
  
  const handleContinue = () => {
    setStep('confirm');
  };
  
  const handleConfirm = async () => {
    setStep('progress');
    setProgress(0);
    setError(null);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);
      
      await onConfirm(selectedOption.id);
      
      clearInterval(progressInterval);
      setProgress(100);
      setStep('result');
      
      // Auto-close on success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      setStep('result');
    }
  };
  
  const handleBack = () => {
    setStep('select');
  };
  
  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={handleClose}
      preventClose={step === 'progress'}
      className="w-full max-w-lg mx-4"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h2 className={cs.dialog.headerTitle}>Reset Configuration</h2>
        {step !== 'progress' && (
          <button onClick={handleClose} className={cs.dialog.closeBtn}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Step: Select Option */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Choose what to reset:</p>
            
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option)}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedOption.id === option.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="font-medium text-white">{option.title}</div>
                <div className="text-sm text-slate-400 mt-1">{option.description}</div>
              </button>
            ))}
            
            {/* Impact preview */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-2">What Gets Removed</h4>
                <ul className="space-y-1">
                  {selectedOption.removes.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="text-red-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2">What Gets Preserved</h4>
                <ul className="space-y-1">
                  {selectedOption.preserves.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="text-green-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="py-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-white mb-2">Are you sure?</h3>
            <p className="text-slate-400">
              This will {selectedOption.title.toLowerCase()}. This action cannot be undone.
            </p>
          </div>
        )}
        
        {/* Step: Progress */}
        {step === 'progress' && (
          <div className="py-6">
            <div className="text-center mb-4">
              <div className="text-slate-400">Resetting...</div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center mt-2 text-sm text-slate-400">
              {progress}%
            </div>
          </div>
        )}
        
        {/* Step: Result */}
        {step === 'result' && (
          <div className="py-6 text-center">
            {error ? (
              <>
                <div className="text-4xl mb-4">❌</div>
                <h3 className="text-lg font-medium text-red-400 mb-2">Reset Failed</h3>
                <p className="text-slate-400">{error}</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-green-400 mb-2">Reset Complete</h3>
                <p className="text-slate-400">Configuration has been reset successfully.</p>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={cs.dialog.footer}>
        {step === 'select' && (
          <>
            <button onClick={handleClose} className={cs.dialog.btnGhost}>
              Cancel
            </button>
            <button onClick={handleContinue} className={cs.dialog.btnDanger}>
              Continue with Reset
            </button>
          </>
        )}
        
        {step === 'confirm' && (
          <>
            <button onClick={handleBack} className={cs.dialog.btnGhost}>
              Back
            </button>
            <button onClick={handleConfirm} className={cs.dialog.btnDanger}>
              Confirm Reset
            </button>
          </>
        )}
        
        {step === 'result' && error && (
          <button onClick={handleClose} className={cs.dialog.btnGhost}>
            Close
          </button>
        )}
      </div>
    </ModalOverlay>
  );
}

