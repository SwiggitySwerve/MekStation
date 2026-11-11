/**
 * The one record-sheet read of the unit store, shared by `PreviewTab` and `RecordSheetPreview`.
 *
 * The BV-bearing fields come from the single owner of `projectEditableMech`'s input
 * (`useEditableMechProjectionInput`), so the sheet projects exactly what the status bar projects.
 * Only the fields the sheet needs beyond BV are read here.
 */
import { useMemo } from 'react';

import { useEditableMechProjectionInput } from '@/hooks/useEditableMechProjectionInput';
import { useUnitStore } from '@/stores/useUnitStore';

import type { PreviewUnitState } from '../tabs/PreviewTab.builders';

export function usePreviewUnitState(): PreviewUnitState {
  const projectionInput = useEditableMechProjectionInput();
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const role = useUnitStore((s) => s.role);
  const enhancement = useUnitStore((s) => s.enhancement);
  const armActuators = useUnitStore((s) => s.armActuators);
  const crewSeats = useUnitStore((s) => s.crewSeats);

  return useMemo<PreviewUnitState>(
    () => ({
      ...projectionInput,
      rulesLevel,
      year,
      role,
      enhancement,
      armActuators,
      crewSeats,
    }),
    [
      projectionInput,
      rulesLevel,
      year,
      role,
      enhancement,
      armActuators,
      crewSeats,
    ],
  );
}
