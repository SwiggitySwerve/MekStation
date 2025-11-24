'use client';

import React, { useState } from 'react';
import { CustomizerResetMode, ICustomizerResetResult } from '../../../services/CustomizerResetService';
import { useCustomizerStore } from '../store/useCustomizerStore';

interface ResetConfirmationDialogProps {
  isOpen: boolean;
  onClose(): void;
  onComplete?(result: ICustomizerResetResult): void;
}

export const ResetConfirmationDialog: React.FC<ResetConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [mode, setMode] = useState<CustomizerResetMode>('full');
  const resetUnit = useCustomizerStore(state => state.resetUnit);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    const result = resetUnit(mode);
    onComplete?.(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-100">Reset Customizer</h2>
        <p className="text-sm text-slate-400">
          Choose what you would like to reset. Equipment-only resets preserve chassis configuration
          while clearing all allocated gear.
        </p>

        <div className="space-y-3 text-sm text-slate-100">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="reset-mode"
              value="full"
              checked={mode === 'full'}
              onChange={() => setMode('full')}
            />
            <div>
              <p className="font-semibold">Full Reset</p>
              <p className="text-slate-400 text-xs">
                Restore all settings to defaults and clear every piece of equipment.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="reset-mode"
              value="equipment"
              checked={mode === 'equipment'}
              onChange={() => setMode('equipment')}
            />
            <div>
              <p className="font-semibold">Equipment Only</p>
              <p className="text-slate-400 text-xs">
                Remove all player-added equipment but keep chassis selections.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="reset-mode"
              value="configuration"
              checked={mode === 'configuration'}
              onChange={() => setMode('configuration')}
            />
            <div>
              <p className="font-semibold">Systems Configuration</p>
              <p className="text-slate-400 text-xs">
                Reset structure, armor, gyro, cockpit, and heat sink selections.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded"
            onClick={handleConfirm}
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
};

