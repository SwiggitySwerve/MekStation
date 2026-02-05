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
      <div className="bg-surface-base border-border-theme rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Unit Identity</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Chassis Name
            </label>
            <input
              type="text"
              defaultValue={chassis}
              placeholder="e.g., Atlas"
              disabled={readOnly}
              className="bg-surface-raised border-border-theme-strong w-full rounded border px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Model/Variant
            </label>
            <input
              type="text"
              defaultValue={model}
              placeholder="e.g., AS7-D"
              disabled={readOnly}
              className="bg-surface-raised border-border-theme-strong w-full rounded border px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Manufacturing Info */}
      <div className="bg-surface-base border-border-theme rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Manufacturing</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Manufacturer
            </label>
            <input
              type="text"
              placeholder="e.g., Defiance Industries"
              disabled={readOnly}
              className="bg-surface-raised border-border-theme-strong w-full rounded border px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Primary Factory
            </label>
            <input
              type="text"
              placeholder="e.g., Hesperus II"
              disabled={readOnly}
              className="bg-surface-raised border-border-theme-strong w-full rounded border px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Introduction Year
            </label>
            <input
              type="number"
              placeholder="e.g., 3025"
              disabled={readOnly}
              className="bg-surface-raised border-border-theme-strong w-full rounded border px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Cost (C-Bills)
            </label>
            <input
              type="text"
              placeholder="Calculated automatically"
              disabled
              className="bg-surface-deep border-border-theme text-text-theme-secondary w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Role/Notes */}
      <div className="bg-surface-base border-border-theme rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Role & Description
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Combat Role
            </label>
            <select
              className="bg-surface-raised border-border-theme-strong w-full rounded border px-3 py-2 text-white"
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
            <label className="text-text-theme-secondary mb-1 block text-sm">
              Notes
            </label>
            <textarea
              rows={4}
              placeholder="Add notes about this unit variant..."
              disabled={readOnly}
              className="bg-surface-raised border-border-theme-strong w-full resize-none rounded border px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Quirks (placeholder) */}
      <div className="bg-surface-base border-border-theme rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-semibold text-white">Quirks</h3>

        <div className="text-text-theme-secondary py-6 text-center">
          <p>Quirks system coming soon</p>
          <p className="mt-2 text-sm">
            Positive and negative design quirks can be added here
          </p>
        </div>
      </div>
    </div>
  );
}
