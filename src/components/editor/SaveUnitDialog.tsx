import React, { useState, useEffect } from 'react';

interface SaveUnitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chassis: string, model: string, notes?: string) => void;
  originalChassis: string;
  originalModel: string;
  isStandardUnit: boolean;
}

const SaveUnitDialog: React.FC<SaveUnitDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  originalChassis,
  originalModel,
  isStandardUnit,
}) => {
  const [chassis, setChassis] = useState(originalChassis);
  const [model, setModel] = useState(originalModel);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ chassis?: string; model?: string }>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setChassis(originalChassis);
      setModel(isStandardUnit ? `${originalModel}-Custom` : originalModel);
      setNotes('');
      setErrors({});
    }
  }, [isOpen, originalChassis, originalModel, isStandardUnit]);

  const validate = () => {
    const newErrors: { chassis?: string; model?: string } = {};
    
    if (!chassis.trim()) {
      newErrors.chassis = 'Chassis name is required';
    }
    
    if (!model.trim()) {
      newErrors.model = 'Model designation is required';
    }
    
    // Check if trying to save with same name as standard unit
    if (isStandardUnit && 
        chassis.trim() === originalChassis && 
        model.trim() === originalModel) {
      newErrors.model = 'Custom units must have a different model designation than the original';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(chassis.trim(), model.trim(), notes.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isStandardUnit ? 'Save Custom Variant' : 'Save Unit'}
            </h3>
            {isStandardUnit && (
              <p className="mt-1 text-sm text-gray-600">
                You are creating a custom variant of the {originalChassis} {originalModel}.
                Please provide a unique model designation.
              </p>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Chassis Name */}
            <div>
              <label htmlFor="chassis" className="block text-sm font-medium text-gray-700">
                Chassis Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="chassis"
                value={chassis}
                onChange={(e) => setChassis(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.chassis 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="e.g., Atlas"
                autoFocus
              />
              {errors.chassis && (
                <p className="mt-1 text-sm text-red-600">{errors.chassis}</p>
              )}
            </div>

            {/* Model Designation */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                Model Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.model 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="e.g., AS7-D-DC"
              />
              {errors.model && (
                <p className="mt-1 text-sm text-red-600">{errors.model}</p>
              )}
            </div>

            {/* Notes (Optional) */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Any additional notes about this custom variant..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Unit
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveUnitDialog;
