/**
 * Vehicle Turret Tab Component
 *
 * Management of vehicle turret configuration and turret-mounted weapons.
 * Allows configuring turret type, viewing turret weight capacity,
 * and managing which weapons are mounted in the turret.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.4
 */

import React, { useCallback, useMemo } from 'react';

import { useVehicleStore } from '@/stores/useVehicleStore';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  ITurretConfiguration,
  IVehicleMountedEquipment,
  TurretType,
} from '@/types/unit/VehicleInterfaces';

import { customizerStyles as cs } from '../styles';

interface VehicleTurretTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type TurretOption = { value: TurretType; label: string; description: string };
type SelectHandler = (e: React.ChangeEvent<HTMLSelectElement>) => void;
type CheckboxHandler = (e: React.ChangeEvent<HTMLInputElement>) => void;
type EquipmentAction = (instanceId: string) => void;
type TurretStats = {
  equipmentCount: number;
  maxWeight: number;
  weightPercent: number;
  weightUsed: number;
};
type SelectProps = {
  disabled: boolean;
  onChange: SelectHandler;
  options: TurretOption[];
  testId?: string;
  value: TurretType;
};
type SecondaryProps = {
  hasSecondaryTurret: boolean;
  onSecondaryTurretToggle: CheckboxHandler;
  onSecondaryTurretTypeChange: SelectHandler;
  readOnly: boolean;
  secondaryTurret: ITurretConfiguration | null;
  secondaryTurretTypeOptions: TurretOption[];
};
type ConfigProps = SecondaryProps & {
  canHaveSecondaryTurret: boolean;
  onTurretTypeChange: SelectHandler;
  stats: TurretStats;
  tonnage: number;
  turret: ITurretConfiguration | null;
  turretOptions: TurretOption[];
};
type WeaponsProps = {
  hasTurret: boolean;
  nonTurretEquipment: IVehicleMountedEquipment[];
  onAddToTurret: EquipmentAction;
  onRemoveFromTurret: EquipmentAction;
  readOnly: boolean;
  turretEquipment: IVehicleMountedEquipment[];
};
type RowProps = { item: IVehicleMountedEquipment; readOnly: boolean };

const TURRET_TYPE_OPTIONS: TurretOption[] = [
  {
    value: TurretType.NONE,
    label: 'No Turret',
    description: 'Fixed weapon mounts only',
  },
  {
    value: TurretType.SINGLE,
    label: 'Single Turret',
    description: '360\u00b0 rotation for weapons',
  },
  {
    value: TurretType.DUAL,
    label: 'Dual Turret',
    description: 'Two independent turrets',
  },
  {
    value: TurretType.CHIN,
    label: 'Chin Turret (VTOL)',
    description: 'Forward-facing VTOL turret',
  },
];

function getTurretOptions(isVTOL: boolean): TurretOption[] {
  if (isVTOL)
    return TURRET_TYPE_OPTIONS.filter(
      (opt) => opt.value === TurretType.NONE || opt.value === TurretType.CHIN,
    );
  return TURRET_TYPE_OPTIONS.filter((opt) => opt.value !== TurretType.CHIN);
}

function getSecondaryTurretTypeOptions(): TurretOption[] {
  return TURRET_TYPE_OPTIONS.filter(
    (opt) => opt.value !== TurretType.CHIN && opt.value !== TurretType.NONE,
  );
}

function getTurretCapacityBarClass(percent: number): string {
  if (percent > 100) return 'bg-red-500';
  if (percent > 75) return 'bg-amber-500';
  return 'bg-cyan-500';
}

function TurretOptionSelect({
  disabled,
  onChange,
  options,
  testId,
  value,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      data-testid={testId}
      className={`${cs.select.full} mt-1`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SecondaryTurretControl({
  hasSecondaryTurret,
  onSecondaryTurretToggle,
  onSecondaryTurretTypeChange,
  readOnly,
  secondaryTurret,
  secondaryTurretTypeOptions,
}: SecondaryProps) {
  return (
    <div className="mb-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
        <input
          type="checkbox"
          checked={hasSecondaryTurret}
          onChange={onSecondaryTurretToggle}
          disabled={readOnly}
          data-testid="vehicle-secondary-turret-toggle"
          aria-label="Enable secondary turret"
          className="h-4 w-4 rounded border-slate-500"
        />
        Secondary Turret
      </label>
      {hasSecondaryTurret && (
        <div className="mt-2">
          <label className={cs.text.label}>Secondary Turret Type</label>
          <TurretOptionSelect
            value={secondaryTurret?.type ?? TurretType.SINGLE}
            onChange={onSecondaryTurretTypeChange}
            disabled={readOnly}
            options={secondaryTurretTypeOptions}
            testId="vehicle-secondary-turret-type"
          />
        </div>
      )}
    </div>
  );
}

function TurretStat({
  children,
  label,
}: React.PropsWithChildren<{ label: string }>) {
  return (
    <div>
      <span className={cs.text.label}>{label}:</span>
      <span className={`${cs.text.value} ml-2`}>{children}</span>
    </div>
  );
}

function TurretStatsPanel({
  stats,
  turret,
}: {
  stats: TurretStats;
  turret: ITurretConfiguration;
}) {
  const usedClass =
    stats.weightUsed > stats.maxWeight ? cs.text.valueNegative : cs.text.value;
  return (
    <div className={`${cs.panel.summary} mb-4`}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <TurretStat label="Max Capacity">
          {stats.maxWeight.toFixed(1)} tons
        </TurretStat>
        <div>
          <span className={cs.text.label}>Weight Used:</span>
          <span className={`ml-2 ${usedClass}`}>
            {stats.weightUsed.toFixed(1)} tons
          </span>
        </div>
        <TurretStat label="Rotation Arc">
          {turret.rotationArc}
          {'\u00b0'}
        </TurretStat>
        <TurretStat label="Items Mounted">{stats.equipmentCount}</TurretStat>
      </div>
      <div className="mt-3">
        <div className="bg-surface-base h-2 overflow-hidden rounded-full">
          <div
            className={`h-full transition-all ${getTurretCapacityBarClass(stats.weightPercent)}`}
            style={{ width: `${Math.min(100, stats.weightPercent)}%` }}
          />
        </div>
        <p className="text-text-theme-secondary mt-1 text-right text-xs">
          {stats.weightPercent.toFixed(0)}% capacity used
        </p>
      </div>
    </div>
  );
}

function TurretWeightInfo({ tonnage }: { tonnage: number }) {
  return (
    <div className="text-text-theme-secondary bg-surface-raised/30 rounded p-2 text-xs">
      <p className="text-text-theme-primary mb-1 font-medium">
        Turret Capacity
      </p>
      <p>
        Maximum turret weight is typically 10% of vehicle tonnage (
        {(tonnage * 0.1).toFixed(1)} tons for this {tonnage}-ton vehicle).
      </p>
    </div>
  );
}

function TurretConfigurationSection({
  canHaveSecondaryTurret,
  hasSecondaryTurret,
  onSecondaryTurretToggle,
  onSecondaryTurretTypeChange,
  onTurretTypeChange,
  readOnly,
  secondaryTurret,
  secondaryTurretTypeOptions,
  stats,
  tonnage,
  turret,
  turretOptions,
}: ConfigProps) {
  return (
    <section>
      <h3 className={cs.text.sectionTitle}>Turret Configuration</h3>
      <div className="mb-4">
        <label className={cs.text.label}>Turret Type</label>
        <TurretOptionSelect
          value={turret?.type ?? TurretType.NONE}
          onChange={onTurretTypeChange}
          disabled={readOnly}
          options={turretOptions}
        />
        {turret && (
          <p className="text-text-theme-secondary mt-1 text-xs">
            {turretOptions.find((o) => o.value === turret.type)?.description}
          </p>
        )}
      </div>
      {canHaveSecondaryTurret && (
        <SecondaryTurretControl
          hasSecondaryTurret={hasSecondaryTurret}
          onSecondaryTurretToggle={onSecondaryTurretToggle}
          onSecondaryTurretTypeChange={onSecondaryTurretTypeChange}
          readOnly={readOnly}
          secondaryTurret={secondaryTurret}
          secondaryTurretTypeOptions={secondaryTurretTypeOptions}
        />
      )}
      {turret ? (
        <>
          <TurretStatsPanel turret={turret} stats={stats} />
          <TurretWeightInfo tonnage={tonnage} />
        </>
      ) : (
        <div className={cs.panel.empty}>
          <p className="text-text-theme-secondary">No turret configured</p>
          <p className="text-text-theme-secondary/70 mt-1 text-xs">
            Select a turret type above to enable turret weapon mounting
          </p>
        </div>
      )}
    </section>
  );
}

function TurretWeaponsSection({
  hasTurret,
  nonTurretEquipment,
  onAddToTurret,
  onRemoveFromTurret,
  readOnly,
  turretEquipment,
}: WeaponsProps) {
  const emptyMessage = hasTurret
    ? 'No weapons in turret'
    : 'Configure a turret first';
  return (
    <section>
      <h3 className={cs.text.sectionTitle}>Turret Weapons</h3>
      {!hasTurret || turretEquipment.length === 0 ? (
        <div className={cs.panel.empty}>
          <p className="text-text-theme-secondary">{emptyMessage}</p>
          {hasTurret && (
            <p className="text-text-theme-secondary/70 mt-1 text-xs">
              Move weapons from the list below or add equipment in the Equipment
              tab
            </p>
          )}
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          {turretEquipment.map((item) => (
            <TurretEquipmentRow
              key={item.id}
              item={item}
              readOnly={readOnly}
              onRemove={onRemoveFromTurret}
            />
          ))}
        </div>
      )}
      {hasTurret && nonTurretEquipment.length > 0 && (
        <div className="mt-4">
          <h4 className="text-text-theme-secondary mb-2 text-sm font-medium">
            Available Equipment
          </h4>
          <div className="max-h-40 space-y-1 overflow-auto">
            {nonTurretEquipment.map((item) => (
              <AvailableEquipmentRow
                key={item.id}
                item={item}
                readOnly={readOnly}
                onAddToTurret={onAddToTurret}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function VehicleTurretTab({
  readOnly = false,
  className = '',
}: VehicleTurretTabProps): React.ReactElement {
  const tonnage = useVehicleStore((s) => s.tonnage);
  const motionType = useVehicleStore((s) => s.motionType);
  const turret = useVehicleStore((s) => s.turret);
  const secondaryTurret = useVehicleStore((s) => s.secondaryTurret);
  const equipment = useVehicleStore((s) => s.equipment);
  const setTurretType = useVehicleStore((s) => s.setTurretType);
  const setHasSecondaryTurret = useVehicleStore((s) => s.setHasSecondaryTurret);
  const setSecondaryTurretType = useVehicleStore(
    (s) => s.setSecondaryTurretType,
  );
  const updateEquipmentLocation = useVehicleStore(
    (s) => s.updateEquipmentLocation,
  );

  const isVTOL = motionType === GroundMotionType.VTOL;
  const hasTurret = turret !== null;
  const hasSecondaryTurret = secondaryTurret !== null;
  const turretOptions = useMemo(() => getTurretOptions(isVTOL), [isVTOL]);
  const turretEquipment = useMemo(
    () => equipment.filter((e) => e.isTurretMounted),
    [equipment],
  );
  const nonTurretEquipment = useMemo(
    () => equipment.filter((e) => !e.isTurretMounted),
    [equipment],
  );
  const secondaryTurretTypeOptions = useMemo(getSecondaryTurretTypeOptions, []);
  const stats = useMemo<TurretStats>(() => {
    const weightUsed = turretEquipment.length * 0.5;
    const maxWeight = turret?.maxWeight ?? 0;
    return {
      equipmentCount: turretEquipment.length,
      maxWeight,
      weightPercent: maxWeight > 0 ? (weightUsed / maxWeight) * 100 : 0,
      weightUsed,
    };
  }, [turret, turretEquipment.length]);

  const handleTurretTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (readOnly) return;
      setTurretType(e.target.value as TurretType);
    },
    [setTurretType, readOnly],
  );
  const handleSecondaryTurretToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (readOnly) return;
      setHasSecondaryTurret(e.target.checked);
    },
    [setHasSecondaryTurret, readOnly],
  );
  const handleSecondaryTurretTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (readOnly) return;
      setSecondaryTurretType(e.target.value as TurretType);
    },
    [setSecondaryTurretType, readOnly],
  );
  const handleMoveToTurret = useCallback(
    (instanceId: string) => {
      if (readOnly || !hasTurret) return;
      updateEquipmentLocation(instanceId, VehicleLocation.TURRET, true);
    },
    [updateEquipmentLocation, readOnly, hasTurret],
  );
  const handleRemoveFromTurret = useCallback(
    (instanceId: string) => {
      if (readOnly) return;
      updateEquipmentLocation(instanceId, VehicleLocation.BODY, false);
    },
    [updateEquipmentLocation, readOnly],
  );

  return (
    <div className={`${cs.panel.main} ${className}`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TurretConfigurationSection
          canHaveSecondaryTurret={!isVTOL && hasTurret}
          hasSecondaryTurret={hasSecondaryTurret}
          onSecondaryTurretToggle={handleSecondaryTurretToggle}
          onSecondaryTurretTypeChange={handleSecondaryTurretTypeChange}
          onTurretTypeChange={handleTurretTypeChange}
          readOnly={readOnly}
          secondaryTurret={secondaryTurret}
          secondaryTurretTypeOptions={secondaryTurretTypeOptions}
          stats={stats}
          tonnage={tonnage}
          turret={turret}
          turretOptions={turretOptions}
        />
        <TurretWeaponsSection
          hasTurret={hasTurret}
          nonTurretEquipment={nonTurretEquipment}
          onAddToTurret={handleMoveToTurret}
          onRemoveFromTurret={handleRemoveFromTurret}
          readOnly={readOnly}
          turretEquipment={turretEquipment}
        />
      </div>
      {readOnly && (
        <div className={`${cs.panel.notice} mt-4`}>
          This vehicle is in read-only mode. Changes cannot be made.
        </div>
      )}
    </div>
  );
}

function TurretEquipmentRow({
  item,
  onRemove,
  readOnly,
}: RowProps & { onRemove: EquipmentAction }) {
  return (
    <div className="flex items-center gap-2 rounded border border-amber-700/50 bg-amber-900/20 p-2">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{item.name}</span>
        {item.isRearMounted && (
          <span className="text-xs text-cyan-400">Rear-facing</span>
        )}
      </div>
      <button
        onClick={() => onRemove(item.id)}
        disabled={readOnly}
        className={`${cs.button.action} bg-slate-600 hover:bg-slate-500`}
        title="Remove from turret"
      >
        Remove
      </button>
    </div>
  );
}

function AvailableEquipmentRow({
  item,
  onAddToTurret,
  readOnly,
}: RowProps & { onAddToTurret: EquipmentAction }) {
  return (
    <div className="bg-surface-raised/30 flex items-center gap-2 rounded p-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <span className="text-text-theme-secondary block truncate">
          {item.name}
        </span>
        <span className="text-text-theme-secondary/70 text-xs">
          {item.location}
        </span>
      </div>
      <button
        onClick={() => onAddToTurret(item.id)}
        disabled={readOnly}
        className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        title="Move to turret"
      >
        + Turret
      </button>
    </div>
  );
}

export default VehicleTurretTab;
