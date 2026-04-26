/**
 * Aerospace Structure Tab — Validation Panel
 *
 * Renders construction-rule errors for the aerospace unit being edited.
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 */

import React from 'react';

interface ValidationPanelProps {
  errors: { ruleId: string; message: string }[];
}

export function ValidationPanel({
  errors,
}: ValidationPanelProps): React.ReactElement | null {
  if (errors.length === 0) return null;

  return (
    <div
      className="mt-4 rounded border border-red-500/40 bg-red-900/20 p-3"
      data-testid="aerospace-validation-errors"
    >
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-red-400 uppercase">
        Construction Errors
      </h4>
      <ul className="space-y-1">
        {errors.map((err) => (
          <li
            key={err.ruleId}
            className="flex items-start gap-2 text-xs text-red-300"
          >
            <span className="shrink-0 font-mono text-red-500">
              [{err.ruleId}]
            </span>
            <span>{err.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
