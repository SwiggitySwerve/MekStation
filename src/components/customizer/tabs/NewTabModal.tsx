/**
 * New Tab Modal Component
 * 
 * Modal dialog for creating new unit tabs.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React, { useState } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { UNIT_TEMPLATES, UnitTemplate } from '@/stores/useMultiUnitStore';

type CreationMode = 'new' | 'copy' | 'import';

interface NewTabModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Called when modal is closed */
  onClose: () => void;
  /** Called when a unit is created */
  onCreateUnit: (tonnage: number, techBase?: TechBase) => string;
}

/**
 * New unit tab creation modal
 */
export function NewTabModal({
  isOpen,
  onClose,
  onCreateUnit,
}: NewTabModalProps): React.ReactElement | null {
  const [mode, setMode] = useState<CreationMode>('new');
  const [selectedTemplate, setSelectedTemplate] = useState<UnitTemplate>(UNIT_TEMPLATES[1]); // Medium
  const [techBase, setTechBase] = useState<TechBase>(TechBase.INNER_SPHERE);
  
  if (!isOpen) return null;
  
  const handleCreate = () => {
    onCreateUnit(selectedTemplate.tonnage, techBase);
    onClose();
  };
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Create New Unit</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Mode tabs */}
        <div className="flex border-b border-slate-700">
          {(['new', 'copy', 'import'] as CreationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {m === 'new' && 'New Unit'}
              {m === 'copy' && 'Copy Current'}
              {m === 'import' && 'Import Data'}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {mode === 'new' && (
            <div className="space-y-4">
              {/* Template selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {UNIT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedTemplate.id === template.id
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{template.name}</div>
                      <div className="text-xs text-slate-400">
                        {template.tonnage}t • {template.walkMP}/{Math.ceil(template.walkMP * 1.5)}/{template.jumpMP} MP
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Tech base selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tech Base
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTechBase(TechBase.INNER_SPHERE)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      techBase === TechBase.INNER_SPHERE
                        ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    Inner Sphere
                  </button>
                  <button
                    onClick={() => setTechBase(TechBase.CLAN)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      techBase === TechBase.CLAN
                        ? 'border-green-500 bg-green-900/30 text-green-300'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    Clan
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {mode === 'copy' && (
            <div className="py-8 text-center text-slate-400">
              <p>Creates a copy of the currently active unit.</p>
              <p className="text-sm mt-2">Select this option when you want to create a variant.</p>
            </div>
          )}
          
          {mode === 'import' && (
            <div className="py-8 text-center text-slate-400">
              <p>Import from MTF, SSW, or MegaMek formats.</p>
              <p className="text-sm mt-2">(Coming soon)</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={mode === 'import'}
            className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Unit
          </button>
        </div>
      </div>
    </div>
  );
}

