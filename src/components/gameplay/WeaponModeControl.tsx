import React from 'react';

import type { WeaponFireMode } from '@/types/gameplay';

import { isIndirectFireCapable } from '@/utils/gameplay/indirectFire';

export interface WeaponModeControlProps {
  readonly weaponId: string;
  readonly weaponName: string;
  readonly mode: WeaponFireMode;
  readonly onModeChange: (mode: WeaponFireMode) => void;
}

function modeButtonClasses(active: boolean, eligible = true): string {
  if (active) {
    return 'border-blue-600 bg-blue-600 text-white';
  }
  if (!eligible) {
    return 'border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200';
  }
  return 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700';
}

export function WeaponModeControl({
  weaponId,
  weaponName,
  mode,
  onModeChange,
}: WeaponModeControlProps): React.ReactElement {
  const indirectEligible = isIndirectFireCapable(weaponId);

  return (
    <div
      className="ml-6 inline-flex w-fit overflow-hidden rounded border border-gray-300 text-xs"
      role="group"
      aria-label={`${weaponName} fire mode`}
      data-testid={`weapon-mode-control-${weaponId}`}
      data-fire-mode={mode}
      data-indirect-eligible={indirectEligible}
    >
      <button
        type="button"
        aria-pressed={mode === 'Direct'}
        className={`min-h-[28px] px-2 font-semibold ${modeButtonClasses(
          mode === 'Direct',
        )}`}
        data-testid={`weapon-mode-direct-${weaponId}`}
        onClick={() => onModeChange('Direct')}
      >
        Direct
      </button>
      <button
        type="button"
        aria-pressed={mode === 'Indirect'}
        className={`min-h-[28px] border-l px-2 font-semibold ${modeButtonClasses(
          mode === 'Indirect',
          indirectEligible,
        )}`}
        data-testid={`weapon-mode-indirect-${weaponId}`}
        onClick={() => onModeChange('Indirect')}
      >
        Indirect
      </button>
    </div>
  );
}
