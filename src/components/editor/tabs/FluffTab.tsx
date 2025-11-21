/**
 * FluffTabV2 - Unit background and description tab
 * 
 * Extracted from CustomizerV2Content as part of Phase 2 refactoring
 * Handles unit fluff text, background information, and descriptive content
 * 
 * @see IMPLEMENTATION_REFERENCE.md for tab component patterns
 */

import React from 'react';
import { useUnit } from '../../multiUnit/MultiUnitProvider';

/**
 * Props for FluffTabV2 component
 */
export interface FluffTabProps {
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * FluffTabV2 Component
 * 
 * Manages unit background and fluff content including:
 * - Unit background and history
 * - Descriptive text and lore
 * - Pilot information and notes
 * - Campaign-specific details
 * - Export/import of unit descriptions
 * 
 * Note: This is currently a placeholder implementation.
 * Future versions will include rich text editing, template systems,
 * and integration with campaign management tools.
 */
export const FluffTab: React.FC<FluffTabProps> = ({ readOnly = false }) => {
  const { unit } = useUnit();
  const config = unit.getConfiguration();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Unit Background & Fluff</h2>
          <p className="text-slate-400">
            Descriptive content and background information for {config.tonnage}-ton BattleMech
          </p>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          <div className="mb-6">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📖</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">Coming Soon</h3>
            <p className="text-slate-400 text-lg">
              Unit background and description features are in development
            </p>
          </div>

          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-300 mb-2">📝 Rich Text Editor</h4>
              <p className="text-sm text-slate-400">
                Full-featured text editor for unit descriptions, background stories, and campaign notes
              </p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-300 mb-2">👨‍✈️ Pilot Information</h4>
              <p className="text-sm text-slate-400">
                Pilot profiles, skills, backgrounds, and character development tracking
              </p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-300 mb-2">🏛️ Unit History</h4>
              <p className="text-sm text-slate-400">
                Battle history, service records, and significant events timeline
              </p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-300 mb-2">🌌 Campaign Integration</h4>
              <p className="text-sm text-slate-400">
                Campaign-specific details, faction affiliations, and custom scenarios
              </p>
            </div>
          </div>

          {/* Temporary Note */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> This tab is part of the ongoing Phase 2 refactoring. 
              The full fluff system will be implemented in future updates with rich editing capabilities.
            </p>
          </div>
        </div>

        {/* Unit Summary for Context */}
        <div className="mt-8 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <h4 className="font-medium text-slate-300 mb-2">Current Unit Summary</h4>
          <div className="text-sm text-slate-400 space-y-1">
            <p><strong>Designation:</strong> {config.tonnage}-ton {config.techBase} BattleMech</p>
            <p><strong>Engine:</strong> {config.engineType} {config.engineRating}</p>
            <p><strong>Structure:</strong> {config.structureType || 'Standard'}</p>
            <p><strong>Armor:</strong> {config.armorType || 'Standard'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
