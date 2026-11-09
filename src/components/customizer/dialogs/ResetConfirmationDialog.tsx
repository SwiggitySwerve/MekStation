/**
 * Reset Confirmation Dialog Component
 *
 * Multi-step confirmation dialog for reset operations.
 *
 * @spec openspec/specs/confirmation-dialogs/spec.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import { customizerStyles as cs } from '../styles';
import { ModalOverlay } from './ModalOverlay';

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
    removes: [
      'Weapon placements',
      'Equipment placements',
      'Ammunition placements',
    ],
    preserves: [
      'Structure type',
      'Armor allocation',
      'Engine and gyro',
      'Heat sinks',
    ],
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
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openingRef = useRef(0);

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    stopProgress();
    if (autoCloseTimeoutRef.current !== null) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, [stopProgress]);

  const resetDialog = useCallback(() => {
    setStep('select');
    setProgress(0);
    setError(null);
  }, []);

  useEffect(() => {
    const opening = openingRef;
    opening.current++;
    resetDialog();
    return () => {
      opening.current++;
      clearTimers();
    };
  }, [isOpen, clearTimers, resetDialog]);

  const handleClose = () => {
    if (step !== 'progress') {
      openingRef.current++;
      clearTimers();
      resetDialog();
      onClose();
    }
  };

  const handleContinue = () => {
    setStep('confirm');
  };

  const handleConfirm = async () => {
    const opening = openingRef.current;
    setStep('progress');
    setProgress(0);
    setError(null);

    try {
      // Simulate progress
      progressIntervalRef.current = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);

      await onConfirm(selectedOption.id);

      if (opening !== openingRef.current) return;
      setProgress(100);
      setStep('result');

      // Auto-close on success
      autoCloseTimeoutRef.current = setTimeout(() => {
        autoCloseTimeoutRef.current = null;
        if (opening === openingRef.current) handleClose();
      }, 2000);
    } catch (err) {
      if (opening !== openingRef.current) return;
      setError(err instanceof Error ? err.message : 'Reset failed');
      setStep('result');
    } finally {
      // An older completion must not stop a newer opening's interval.
      if (opening === openingRef.current) stopProgress();
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
      className="mx-4 w-full max-w-lg"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <h2 className={cs.dialog.headerTitle}>Reset Configuration</h2>
        {step !== 'progress' && (
          <button onClick={handleClose} className={cs.dialog.closeBtn}>
            <AppIcon name="close" size="control" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Step: Select Option */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-text-theme-secondary text-sm">
              Choose what to reset:
            </p>

            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedOption.id === option.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-border-theme hover:border-border-theme-subtle'
                }`}
              >
                <div className="text-text-theme-primary font-medium">
                  {option.title}
                </div>
                <div className="text-text-theme-secondary mt-1 text-sm">
                  {option.description}
                </div>
              </button>
            ))}

            {/* Impact preview */}
            <div className="border-border-theme-subtle mt-4 grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-red-400">
                  What Gets Removed
                </h4>
                <ul className="space-y-1">
                  {selectedOption.removes.map((item, i) => (
                    <li
                      key={i}
                      className="text-text-theme-secondary flex items-center gap-2 text-sm"
                    >
                      <span className="text-red-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-green-400">
                  What Gets Preserved
                </h4>
                <ul className="space-y-1">
                  {selectedOption.preserves.map((item, i) => (
                    <li
                      key={i}
                      className="text-text-theme-secondary flex items-center gap-2 text-sm"
                    >
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
            <AppIcon name="warning" size="feature" aria-hidden="true" />
            <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
              Are you sure?
            </h3>
            <p className="text-text-theme-secondary">
              This will {selectedOption.title.toLowerCase()}. This action cannot
              be undone.
            </p>
          </div>
        )}

        {/* Step: Progress */}
        {step === 'progress' && (
          <div className="py-6">
            <div className="mb-4 text-center">
              <div className="text-text-theme-secondary">Resetting...</div>
            </div>
            <div className="bg-surface-raised h-2 w-full rounded-full">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-text-theme-secondary mt-2 text-center text-sm">
              {progress}%
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && (
          <div className="py-6 text-center">
            {error ? (
              <>
                <AppIcon name="close" size="feature" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-medium text-red-400">
                  Reset Failed
                </h3>
                <p className="text-text-theme-secondary">{error}</p>
              </>
            ) : (
              <>
                <AppIcon name="check" size="feature" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-medium text-green-400">
                  Reset Complete
                </h3>
                <p className="text-text-theme-secondary">
                  Configuration has been reset successfully.
                </p>
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
