import React from 'react';

import type { getVehicleTurretMechanismFigures } from '@/utils/construction/vehicle/turret';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { computeVehicleMountedWeightFigures } from '@/utils/construction/vehicle/mountedWeight';

import { customizerStyles as cs } from '../styles';
import { formatVehicleWeight } from './VehicleStatusBar.utils';

interface TurretFigurePanelProps {
  title: string;
  installed: boolean;
  mounted: number | null;
  equipment: number | null;
  mechanism: number | null;
  summary: ReturnType<typeof getVehicleTurretMechanismFigures>;
  isOmni: boolean;
  overloaded: boolean | null;
  isReady: boolean;
}

/** Presentation only; every mass and overload decision comes from construction. */
export function TurretFigurePanel({
  title,
  installed,
  mounted,
  equipment,
  mechanism,
  summary,
  isOmni,
  overloaded,
  isReady,
}: TurretFigurePanelProps): React.ReactElement {
  const pending = !isReady && equipment === null && summary.issues.length === 0;
  const allowanceText = !isOmni
    ? 'Not applicable'
    : summary.allowance === null
      ? 'Unknown'
      : `${summary.allowance} t`;
  const figures = [
    ['Mounted Equipment', formatVehicleWeight(mounted, !isReady)],
    ['Qualifying Equipment', formatVehicleWeight(equipment, !isReady)],
    ['Mechanism Weight', formatVehicleWeight(mechanism, pending)],
    ['Omni Allowance', allowanceText],
    ...(isOmni
      ? [
          [
            'Required Mechanism Mass',
            formatVehicleWeight(
              summary.required,
              !isReady && equipment === null && summary.issues.length === 0,
            ),
          ],
          [
            'Remaining Allowance',
            formatVehicleWeight(
              summary.remaining,
              !isReady &&
                summary.required === null &&
                summary.allowance !== null &&
                summary.issues.length === 0,
            ),
          ],
        ]
      : []),
  ];
  return (
    <section
      aria-label={`${title} Figures`}
      className={`${cs.panel.summary} min-w-0`}
    >
      <h4 className={`${cs.text.label} mb-2 font-medium`}>{title} Figures</h4>
      <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {figures.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className={cs.text.label}>{label}</dt>
            <dd
              className={`${value === 'Unknown' || value === 'Loading' ? cs.text.valueWarning : overloaded ? cs.text.valueNegative : cs.text.value} min-w-0 break-words`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {!installed && (
        <p className={`${cs.text.label} mt-2`}>No turret installed.</p>
      )}
      {overloaded && (
        <p className={`${cs.text.valueNegative} mt-2 text-sm`}>
          Mechanism allowance exceeded.
        </p>
      )}
    </section>
  );
}

export function VehicleTurretFigures({
  isVTOL,
}: {
  isVTOL: boolean;
}): React.ReactElement {
  const unitType = useVehicleStore((s) => s.unitType);
  const turret = useVehicleStore((s) => s.turret);
  const secondaryTurret = useVehicleStore((s) => s.secondaryTurret);
  const equipment = useVehicleStore((s) => s.equipment);
  const isOmni = useVehicleStore((s) => s.isOmni);
  const baseChassisTurretWeight = useVehicleStore(
    (s) => s.baseChassisTurretWeight,
  );
  const baseChassisSecondaryTurretWeight = useVehicleStore(
    (s) => s.baseChassisSecondaryTurretWeight,
  );
  const { isReady } = useEquipmentRegistry();
  const lookup = getEquipmentLookupService();
  const weights = computeVehicleMountedWeightFigures(
    {
      unitType,
      turret,
      secondaryTurret,
      equipment,
      isOmni,
      baseChassisTurretWeight,
      baseChassisSecondaryTurretWeight,
    },
    (id) => (isReady ? lookup.getById(id) : undefined),
  );
  return (
    <div className="mt-4 min-w-0 space-y-3">
      <TurretFigurePanel
        title={isVTOL ? 'Chin Turret' : 'Primary Turret'}
        installed={turret !== null}
        mounted={weights.turretMounted}
        equipment={weights.turretEquipment}
        mechanism={weights.turret}
        summary={weights.primarySummary}
        isOmni={isOmni}
        overloaded={weights.primaryAllowanceOverloaded}
        isReady={isReady}
      />
      {!isVTOL && (
        <TurretFigurePanel
          title="Secondary Turret"
          installed={secondaryTurret !== null}
          mounted={weights.secondaryTurretMounted}
          equipment={weights.secondaryTurretEquipment}
          mechanism={weights.secondaryTurret}
          summary={weights.secondarySummary}
          isOmni={isOmni}
          overloaded={weights.secondaryAllowanceOverloaded}
          isReady={isReady}
        />
      )}
    </div>
  );
}
