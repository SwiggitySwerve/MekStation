import React from 'react';

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

interface VehicleArmorDiagramSimpleProps {
  allocation: Record<string, number>;
  hasTurret: boolean;
  isVTOL: boolean;
}

export function VehicleArmorDiagramSimple({
  allocation,
  hasTurret,
  isVTOL,
}: VehicleArmorDiagramSimpleProps): React.ReactElement {
  return (
    <div className="text-center font-mono text-sm">
      <div className="mb-2">
        <span className="text-text-theme-secondary">FRONT</span>
        <div className="text-lg font-bold text-cyan-400">
          {allocation[VehicleLocation.FRONT] ?? 0}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-center gap-8">
        <div>
          <span className="text-text-theme-secondary">LEFT</span>
          <div className="text-lg font-bold text-cyan-400">
            {allocation[VehicleLocation.LEFT] ?? 0}
          </div>
        </div>

        {hasTurret && (
          <div className="border-border-theme rounded border px-4 py-2">
            <span className="text-text-theme-secondary">TURRET</span>
            <div className="text-lg font-bold text-amber-400">
              {allocation[VehicleLocation.TURRET] ?? 0}
            </div>
          </div>
        )}

        {isVTOL && (
          <div className="border-border-theme rounded border px-4 py-2">
            <span className="text-text-theme-secondary">ROTOR</span>
            <div className="text-lg font-bold text-sky-400">
              {allocation[VTOLLocation.ROTOR] ?? 0}
            </div>
          </div>
        )}

        <div>
          <span className="text-text-theme-secondary">RIGHT</span>
          <div className="text-lg font-bold text-cyan-400">
            {allocation[VehicleLocation.RIGHT] ?? 0}
          </div>
        </div>
      </div>

      <div>
        <span className="text-text-theme-secondary">REAR</span>
        <div className="text-lg font-bold text-cyan-400">
          {allocation[VehicleLocation.REAR] ?? 0}
        </div>
      </div>
    </div>
  );
}
