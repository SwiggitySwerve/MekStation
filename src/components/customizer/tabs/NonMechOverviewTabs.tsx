/**
 * NonMechOverviewTabs — per-type Overview wrappers for non-mech customizers
 *
 * Each non-mech unit type gets a thin wrapper here: it reads the unit-identity
 * fields from that type's contextual store and renders the shared, store-free
 * `NonMechIdentityPanel`. This replaces `NonMechOverviewPlaceholder` ("Overview
 * editor not yet available") with a real, working Overview editor.
 *
 * The wrappers are deliberately tiny and near-identical — the editing surface
 * lives entirely in `NonMechIdentityPanel`. The only per-type variation is
 * which store hook is used and whether the type carries a `tonnage` field
 * (Vehicle / Aerospace / ProtoMech do; BattleArmor / Infantry do not).
 *
 * Every wrapper keeps the store's `name` field in sync with `chassis` + `model`
 * so the persisted unit name tracks identity edits.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useCallback } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { useInfantryStore } from '@/stores/useInfantryStore';
import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { useVehicleStore } from '@/stores/useVehicleStore';

import { NonMechIdentityPanel } from './NonMechIdentityPanel';

// =============================================================================
// Types
// =============================================================================

/**
 * Props each per-type Overview wrapper accepts. `unitType` is intentionally
 * absent — every wrapper is already bound to its family — so the wrapper is
 * still structurally assignable to the registry's
 * `ComponentType<DispatchedOverviewProps>` slot (the extra `unitType` prop the
 * dispatcher passes is simply ignored).
 */
export interface NonMechOverviewWrapperProps {
  /** Read-only mode — forwarded to the identity panel. */
  readOnly?: boolean;
  /** Optional extra CSS classes. */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Compose the display name the way every non-mech store's factory does. */
function composeName(chassis: string, model: string): string {
  return `${chassis}${model ? ' ' + model : ''}`;
}

// =============================================================================
// Vehicle
// =============================================================================

/** Overview editor for Vehicle / VTOL / Support Vehicle units. */
export function VehicleOverviewTab({
  readOnly = false,
  className = '',
}: NonMechOverviewWrapperProps): React.ReactElement {
  const chassis = useVehicleStore((s) => s.chassis);
  const model = useVehicleStore((s) => s.model);
  const mulId = useVehicleStore((s) => s.mulId);
  const year = useVehicleStore((s) => s.year);
  const rulesLevel = useVehicleStore((s) => s.rulesLevel);
  const techBase = useVehicleStore((s) => s.techBase);
  const tonnage = useVehicleStore((s) => s.tonnage);
  const setChassis = useVehicleStore((s) => s.setChassis);
  const setModel = useVehicleStore((s) => s.setModel);
  const setMulId = useVehicleStore((s) => s.setMulId);
  const setYear = useVehicleStore((s) => s.setYear);
  const setRulesLevel = useVehicleStore((s) => s.setRulesLevel);
  const setTonnage = useVehicleStore((s) => s.setTonnage);
  const setName = useVehicleStore((s) => s.setName);

  const onChassisChange = useCallback(
    (next: string) => {
      setChassis(next);
      setName(composeName(next, model));
    },
    [setChassis, setName, model],
  );
  const onModelChange = useCallback(
    (next: string) => {
      setModel(next);
      setName(composeName(chassis, next));
    },
    [setModel, setName, chassis],
  );

  return (
    <NonMechIdentityPanel
      unitTypeLabel="Vehicle"
      chassis={chassis}
      model={model}
      mulId={mulId}
      year={year}
      rulesLevel={rulesLevel}
      techBase={techBase}
      tonnage={tonnage}
      onChassisChange={onChassisChange}
      onModelChange={onModelChange}
      onMulIdChange={setMulId}
      onYearChange={setYear}
      onRulesLevelChange={setRulesLevel}
      onTonnageChange={setTonnage}
      readOnly={readOnly}
      className={className}
    />
  );
}

// =============================================================================
// Aerospace
// =============================================================================

/** Overview editor for Aerospace Fighter / Conventional Fighter units. */
export function AerospaceOverviewTab({
  readOnly = false,
  className = '',
}: NonMechOverviewWrapperProps): React.ReactElement {
  const chassis = useAerospaceStore((s) => s.chassis);
  const model = useAerospaceStore((s) => s.model);
  const mulId = useAerospaceStore((s) => s.mulId);
  const year = useAerospaceStore((s) => s.year);
  const rulesLevel = useAerospaceStore((s) => s.rulesLevel);
  const techBase = useAerospaceStore((s) => s.techBase);
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const setChassis = useAerospaceStore((s) => s.setChassis);
  const setModel = useAerospaceStore((s) => s.setModel);
  const setMulId = useAerospaceStore((s) => s.setMulId);
  const setYear = useAerospaceStore((s) => s.setYear);
  const setRulesLevel = useAerospaceStore((s) => s.setRulesLevel);
  const setTonnage = useAerospaceStore((s) => s.setTonnage);
  const setName = useAerospaceStore((s) => s.setName);

  const onChassisChange = useCallback(
    (next: string) => {
      setChassis(next);
      setName(composeName(next, model));
    },
    [setChassis, setName, model],
  );
  const onModelChange = useCallback(
    (next: string) => {
      setModel(next);
      setName(composeName(chassis, next));
    },
    [setModel, setName, chassis],
  );

  return (
    <NonMechIdentityPanel
      unitTypeLabel="Aerospace Fighter"
      chassis={chassis}
      model={model}
      mulId={mulId}
      year={year}
      rulesLevel={rulesLevel}
      techBase={techBase}
      tonnage={tonnage}
      onChassisChange={onChassisChange}
      onModelChange={onModelChange}
      onMulIdChange={setMulId}
      onYearChange={setYear}
      onRulesLevelChange={setRulesLevel}
      onTonnageChange={setTonnage}
      readOnly={readOnly}
      className={className}
    />
  );
}

// =============================================================================
// BattleArmor (no tonnage)
// =============================================================================

/** Overview editor for Battle Armor units. */
export function BattleArmorOverviewTab({
  readOnly = false,
  className = '',
}: NonMechOverviewWrapperProps): React.ReactElement {
  const chassis = useBattleArmorStore((s) => s.chassis);
  const model = useBattleArmorStore((s) => s.model);
  const mulId = useBattleArmorStore((s) => s.mulId);
  const year = useBattleArmorStore((s) => s.year);
  const rulesLevel = useBattleArmorStore((s) => s.rulesLevel);
  const techBase = useBattleArmorStore((s) => s.techBase);
  const setChassis = useBattleArmorStore((s) => s.setChassis);
  const setModel = useBattleArmorStore((s) => s.setModel);
  const setMulId = useBattleArmorStore((s) => s.setMulId);
  const setYear = useBattleArmorStore((s) => s.setYear);
  const setRulesLevel = useBattleArmorStore((s) => s.setRulesLevel);
  const setName = useBattleArmorStore((s) => s.setName);

  const onChassisChange = useCallback(
    (next: string) => {
      setChassis(next);
      setName(composeName(next, model));
    },
    [setChassis, setName, model],
  );
  const onModelChange = useCallback(
    (next: string) => {
      setModel(next);
      setName(composeName(chassis, next));
    },
    [setModel, setName, chassis],
  );

  return (
    <NonMechIdentityPanel
      unitTypeLabel="Battle Armor"
      chassis={chassis}
      model={model}
      mulId={mulId}
      year={year}
      rulesLevel={rulesLevel}
      techBase={techBase}
      onChassisChange={onChassisChange}
      onModelChange={onModelChange}
      onMulIdChange={setMulId}
      onYearChange={setYear}
      onRulesLevelChange={setRulesLevel}
      readOnly={readOnly}
      className={className}
    />
  );
}

// =============================================================================
// Infantry (no tonnage)
// =============================================================================

/** Overview editor for conventional Infantry platoons. */
export function InfantryOverviewTab({
  readOnly = false,
  className = '',
}: NonMechOverviewWrapperProps): React.ReactElement {
  const chassis = useInfantryStore((s) => s.chassis);
  const model = useInfantryStore((s) => s.model);
  const mulId = useInfantryStore((s) => s.mulId);
  const year = useInfantryStore((s) => s.year);
  const rulesLevel = useInfantryStore((s) => s.rulesLevel);
  const techBase = useInfantryStore((s) => s.techBase);
  const setChassis = useInfantryStore((s) => s.setChassis);
  const setModel = useInfantryStore((s) => s.setModel);
  const setMulId = useInfantryStore((s) => s.setMulId);
  const setYear = useInfantryStore((s) => s.setYear);
  const setRulesLevel = useInfantryStore((s) => s.setRulesLevel);
  const setName = useInfantryStore((s) => s.setName);

  const onChassisChange = useCallback(
    (next: string) => {
      setChassis(next);
      setName(composeName(next, model));
    },
    [setChassis, setName, model],
  );
  const onModelChange = useCallback(
    (next: string) => {
      setModel(next);
      setName(composeName(chassis, next));
    },
    [setModel, setName, chassis],
  );

  return (
    <NonMechIdentityPanel
      unitTypeLabel="Infantry"
      chassis={chassis}
      model={model}
      mulId={mulId}
      year={year}
      rulesLevel={rulesLevel}
      techBase={techBase}
      onChassisChange={onChassisChange}
      onModelChange={onModelChange}
      onMulIdChange={setMulId}
      onYearChange={setYear}
      onRulesLevelChange={setRulesLevel}
      readOnly={readOnly}
      className={className}
    />
  );
}

// =============================================================================
// ProtoMech
// =============================================================================

/** Overview editor for ProtoMech units. */
export function ProtoMechOverviewTab({
  readOnly = false,
  className = '',
}: NonMechOverviewWrapperProps): React.ReactElement {
  const chassis = useProtoMechStore((s) => s.chassis);
  const model = useProtoMechStore((s) => s.model);
  const mulId = useProtoMechStore((s) => s.mulId);
  const year = useProtoMechStore((s) => s.year);
  const rulesLevel = useProtoMechStore((s) => s.rulesLevel);
  const techBase = useProtoMechStore((s) => s.techBase);
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const setChassis = useProtoMechStore((s) => s.setChassis);
  const setModel = useProtoMechStore((s) => s.setModel);
  const setMulId = useProtoMechStore((s) => s.setMulId);
  const setYear = useProtoMechStore((s) => s.setYear);
  const setRulesLevel = useProtoMechStore((s) => s.setRulesLevel);
  const setTonnage = useProtoMechStore((s) => s.setTonnage);
  const setName = useProtoMechStore((s) => s.setName);

  const onChassisChange = useCallback(
    (next: string) => {
      setChassis(next);
      setName(composeName(next, model));
    },
    [setChassis, setName, model],
  );
  const onModelChange = useCallback(
    (next: string) => {
      setModel(next);
      setName(composeName(chassis, next));
    },
    [setModel, setName, chassis],
  );

  return (
    <NonMechIdentityPanel
      unitTypeLabel="ProtoMech"
      chassis={chassis}
      model={model}
      mulId={mulId}
      year={year}
      rulesLevel={rulesLevel}
      techBase={techBase}
      tonnage={tonnage}
      onChassisChange={onChassisChange}
      onModelChange={onModelChange}
      onMulIdChange={setMulId}
      onYearChange={setYear}
      onRulesLevelChange={setRulesLevel}
      onTonnageChange={setTonnage}
      readOnly={readOnly}
      className={className}
    />
  );
}
