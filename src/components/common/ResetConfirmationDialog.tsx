/**
 * Reset Confirmation Dialog
 * 
 * Provides a user-friendly dialog for confirming reset actions with:
 * - Different reset options (equipment only, full reset, etc.)
 * - Progress tracking during reset
 * - Success/error feedback
 * - Detailed information about what will be reset
 */

import React, { useState } from 'react';
import { useCustomizerReset, ResetState } from '../../hooks/useCustomizerReset';

export interface ResetConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: (success: boolean) => void;
}

export type ResetType = 'equipment-only' | 'configuration' | 'full-reset';

interface ResetOption {
  type: ResetType;
  title: string;
  description: string;
  icon: string;
  whatGetsRemoved: string[];
  whatGetsPreserved: string[];
}

const RESET_OPTIONS: ResetOption[] = [
  {
    type: 'equipment-only',
    title: 'Reset Equipment Only',
    description: 'Remove all weapons and equipment while keeping unit configuration',
    icon: '🔧',
    whatGetsRemoved: [
      'All weapons and ammunition',
      'All equipment and electronics',
      'All allocated equipment',
      'All unallocated equipment'
    ],
    whatGetsPreserved: [
      'Unit tonnage and tech base',
      'Engine and movement configuration',
      'System components (engine, gyro, cockpit)',
      'Armor allocation',
      'Heat sink configuration',
      'Jump jet configuration'
    ]
  },
  {
    type: 'configuration',
    title: 'Reset Configuration',
    description: 'Reset unit configuration to defaults while keeping equipment',
    icon: '⚙️',
    whatGetsRemoved: [
      'Custom armor allocation',
      'Custom heat sink count',
      'Jump jet configuration',
      'Movement enhancements'
    ],
    whatGetsPreserved: [
      'All weapons and equipment',
      'Unit tonnage and tech base',
      'System components',
      'Equipment allocations'
    ]
  },
  {
    type: 'full-reset',
    title: 'Full Reset',
    description: 'Complete reset to default configuration with no equipment',
    icon: '🔄',
    whatGetsRemoved: [
      'All weapons and ammunition',
      'All equipment and electronics',
      'All allocated equipment',
      'All unallocated equipment',
      'Custom armor allocation',
      'Custom heat sink count',
      'Jump jet configuration',
      'Movement enhancements'
    ],
    whatGetsPreserved: [
      'Unit tonnage and tech base',
      'Engine and movement configuration',
      'System components (engine, gyro, cockpit, actuators)',
      'Basic unit structure'
    ]
  }
];

export const ResetConfirmationDialog: React.FC<ResetConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onResetComplete
}) => {
  const { resetState, resetToDefaults, resetEquipmentOnly, resetConfiguration, clearResetState } = useCustomizerReset();
  const [selectedOption, setSelectedOption] = useState<ResetType>('equipment-only');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReset = async () => {
    let result;
    
    switch (selectedOption) {
      case 'equipment-only':
        result = await resetEquipmentOnly();
        break;
      case 'configuration':
        result = await resetConfiguration();
        break;
      case 'full-reset':
        result = await resetToDefaults();
        break;
      default:
        result = await resetEquipmentOnly();
    }

    if (result.success) {
      onResetComplete?.(true);
      setTimeout(() => {
        setShowConfirmation(false);
        onClose();
        clearResetState();
      }, 2000);
    } else {
      onResetComplete?.(false);
    }
  };

  const handleClose = () => {
    if (!resetState.isResetting) {
      setShowConfirmation(false);
      onClose();
      clearResetState();
    }
  };

  const selectedResetOption = RESET_OPTIONS.find(option => option.type === selectedOption);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-100">Reset Customizer</h2>
          <button
            onClick={handleClose}
            disabled={resetState.isResetting}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar (during reset) */}
        {resetState.isResetting && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Progress</span>
              <span>{resetState.progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${resetState.progress}%` }}
              />
            </div>
            <div className="text-sm text-slate-400 mt-2">
              {resetState.currentStep}
            </div>
          </div>
        )}

        {/* Reset Options */}
        {!resetState.isResetting && !showConfirmation && (
          <div className="space-y-4">
            <p className="text-slate-300 mb-4">
              Choose what you want to reset. System components (engine, gyro, cockpit, actuators) will always be preserved.
            </p>

            {RESET_OPTIONS.map((option) => (
              <div
                key={option.type}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedOption === option.type
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => setSelectedOption(option.type)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{option.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-100">{option.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">{option.description}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Detailed Information */}
            {selectedResetOption && (
              <div className="mt-6 bg-slate-700/50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-red-400 mb-2">What Gets Removed:</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {selectedResetOption.whatGetsRemoved.map((item, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-red-400 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-400 mb-2">What Gets Preserved:</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {selectedResetOption.whatGetsPreserved.map((item, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-green-400 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Continue with Reset
              </button>
            </div>
          </div>
        )}

        {/* Final Confirmation */}
        {showConfirmation && !resetState.isResetting && (
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Final Confirmation
            </h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to perform a <strong>{selectedResetOption?.title.toLowerCase()}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Yes, Reset Now
              </button>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {resetState.result && !resetState.isResetting && (
          <div className={`mt-4 p-4 rounded-lg ${
            resetState.result.success 
              ? 'bg-green-900/20 border border-green-500/30' 
              : 'bg-red-900/20 border border-red-500/30'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-lg mr-2">
                {resetState.result.success ? '✅' : '❌'}
              </span>
              <span className={`font-medium ${
                resetState.result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {resetState.result.success ? 'Reset Completed Successfully' : 'Reset Failed'}
              </span>
            </div>
            
            {resetState.result.success && (
              <div className="text-sm text-green-300">
                <p>Removed {resetState.result.removedEquipment.length} equipment pieces</p>
                <p>Reset {resetState.result.resetSections.length} sections</p>
              </div>
            )}

            {resetState.result.errors.length > 0 && (
              <div className="text-sm text-red-300">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside">
                  {resetState.result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {resetState.result.warnings.length > 0 && (
              <div className="text-sm text-yellow-300 mt-2">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc list-inside">
                  {resetState.result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 