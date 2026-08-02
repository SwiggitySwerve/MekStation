import React from 'react';

import { unitNameValidator } from '@/services/units/UnitNameValidator';

import { customizerStyles as cs } from '../styles';

export function SaveUnitDialogPreview({
  chassis,
  variant,
}: {
  chassis: string;
  variant: string;
}): React.ReactElement | null {
  if (!chassis.trim() || !variant.trim()) return null;

  return (
    <div className={cs.dialog.infoPanel}>
      <div className="mb-1 text-xs text-slate-400">Full Unit Name:</div>
      <div className="font-medium text-white">
        {unitNameValidator.buildFullName(chassis.trim(), variant.trim())}
      </div>
    </div>
  );
}
