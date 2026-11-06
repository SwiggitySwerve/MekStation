/**
 * Aerospace Velocity tab. Shares the working engine and movement form with
 * Structure so both surfaces use the same store actions and domain results.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md
 */

import React from 'react';

import { EngineSection } from './AerospaceStructureTab.EngineSection';

export interface AerospaceVelocityTabProps {
  readOnly?: boolean;
  className?: string;
}

export function AerospaceVelocityTab({
  readOnly = false,
  className = '',
}: AerospaceVelocityTabProps): React.ReactElement {
  return (
    <div className={`p-4 ${className}`} data-testid="aerospace-velocity-tab">
      <EngineSection readOnly={readOnly} />
    </div>
  );
}

export default AerospaceVelocityTab;
