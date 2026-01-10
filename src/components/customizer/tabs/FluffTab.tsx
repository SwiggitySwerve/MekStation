/**
 * Fluff Tab Component
 * 
 * Non-mechanical unit information (history, description, manufacturer).
 * 
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

interface FluffTabProps {
  /** Unit chassis name */
  chassis?: string;
  /** Unit model/variant */
  model?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Fluff (lore/description) configuration tab
 */
export function FluffTab({
  chassis = '',
  model = '',
  readOnly = false,
  className = '',
}: FluffTabProps): React.ReactElement {
  return (
    <div className={`space-y-6 p-4 ${className}`}>
      {/* Unit Identity */}
      <div className="bg-surface-base rounded-lg border border-border-theme p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Unit Identity</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Chassis Name</label>
            <input
              type="text"
              defaultValue={chassis}
              placeholder="e.g., Atlas"
              disabled={readOnly}
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Model/Variant</label>
            <input
              type="text"
              defaultValue={model}
              placeholder="e.g., AS7-D"
              disabled={readOnly}
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Manufacturing Info */}
      <div className="bg-surface-base rounded-lg border border-border-theme p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Manufacturing</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Manufacturer</label>
            <input
              type="text"
              placeholder="e.g., Defiance Industries"
              disabled={readOnly}
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Primary Factory</label>
            <input
              type="text"
              placeholder="e.g., Hesperus II"
              disabled={readOnly}
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Introduction Year</label>
            <input
              type="number"
              placeholder="e.g., 3025"
              disabled={readOnly}
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Cost (C-Bills)</label>
            <input
              type="text"
              placeholder="Calculated automatically"
              disabled
              className="w-full px-3 py-2 bg-surface-deep border border-border-theme rounded text-text-theme-secondary"
            />
          </div>
        </div>
      </div>

      {/* Role/Notes */}
      <div className="bg-surface-base rounded-lg border border-border-theme p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Role & Description</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Combat Role</label>
            <select
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white"
              disabled={readOnly}
            >
              <option value="">-- Select Role --</option>
              <option>Ambusher</option>
              <option>Brawler</option>
              <option>Fire Support</option>
              <option>Juggernaut</option>
              <option>Missile Boat</option>
              <option>Scout</option>
              <option>Skirmisher</option>
              <option>Sniper</option>
              <option>Striker</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-text-theme-secondary mb-1">Notes</label>
            <textarea
              rows={4}
              placeholder="Add notes about this unit variant..."
              disabled={readOnly}
              className="w-full px-3 py-2 bg-surface-raised border border-border-theme-strong rounded text-white placeholder-slate-500 disabled:opacity-50 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Quirks (placeholder) */}
      <div className="bg-surface-base rounded-lg border border-border-theme p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Quirks</h3>

        <div className="text-center py-6 text-text-theme-secondary">
          <p>Quirks system coming soon</p>
          <p className="text-sm mt-2">Positive and negative design quirks can be added here</p>
        </div>
      </div>
    </div>
  );
}

