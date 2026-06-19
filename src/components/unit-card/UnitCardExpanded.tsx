/**
 * UnitCardExpanded Component
 * Extended unit card with all available details.
 *
 * Includes everything from Standard plus: equipment list, critical slots,
 * quirks, notes.
 */
import React from 'react';

import { getHeatDisplay } from '@/utils/heatCalculation';
import { getTechBaseDisplay } from '@/utils/techBase';

import type {
  CriticalSlotSummary,
  EquipmentEntry,
  UnitCardExpandedProps,
} from './UnitCardExpanded.types';

import { Card } from '../ui/Card';
import {
  groupEquipmentByCategory,
  NotesSection,
  QuirksSection,
  UnitCardActions,
  UnitCardHeader,
  UnitOverview,
  WeaponTable,
} from './UnitCardExpandedDetails';
import {
  CoreStatsGrid,
  CriticalSlotsSummary,
  EquipmentList,
} from './UnitCardExpandedSections';

// Re-export leaf types so existing consumers keep their
// `from './UnitCardExpanded'` import paths working (e.g. unit-card/index.ts).
export type {
  CriticalSlotSummary,
  EquipmentEntry,
  UnitCardExpandedProps,
} from './UnitCardExpanded.types';

/**
 * Expanded unit card with full equipment and fluff details
 */
export function UnitCardExpanded({
  name,
  techBaseName,
  rulesLevelName,
  year,
  tonnage,
  weightClassName,
  battleValue,
  walkMP,
  runMP,
  jumpMP,
  totalArmor,
  maxArmor,
  armorType,
  structureType,
  weapons,
  heatGenerated,
  heatDissipation,
  equipment,
  criticalSlots,
  quirks,
  notes,
  overview,
  onEdit,
  onExport,
  onShare,
  onDuplicate,
  onDelete,
  className = '',
}: UnitCardExpandedProps): React.ReactElement {
  const { variant: techBadgeVariant, label: techLabel } =
    getTechBaseDisplay(techBaseName);
  const armorPercentage =
    maxArmor > 0 ? Math.round((totalArmor / maxArmor) * 100) : 0;
  const heat = getHeatDisplay(heatGenerated, heatDissipation);
  const equipmentByCategory = groupEquipmentByCategory(equipment);

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      <UnitCardHeader
        name={name}
        techBadgeVariant={techBadgeVariant}
        techLabel={techLabel}
        year={year}
        rulesLevelName={rulesLevelName}
        weightClassName={weightClassName}
        tonnage={tonnage}
        battleValue={battleValue}
      />

      <UnitOverview overview={overview} />

      <CoreStatsGrid
        walkMP={walkMP}
        runMP={runMP}
        jumpMP={jumpMP}
        totalArmor={totalArmor}
        maxArmor={maxArmor}
        armorPercentage={armorPercentage}
        armorType={armorType}
        structureType={structureType}
        heatGenerated={heatGenerated}
        heatDissipation={heatDissipation}
        heatDisplay={heat.display}
        heatClassName={heat.className}
      />

      <WeaponTable weapons={weapons} />
      {equipment.length > 0 && (
        <EquipmentList equipmentByCategory={equipmentByCategory} />
      )}
      {criticalSlots.length > 0 && (
        <CriticalSlotsSummary criticalSlots={criticalSlots} />
      )}
      <QuirksSection quirks={quirks} />
      <NotesSection notes={notes} />
      <UnitCardActions
        onEdit={onEdit}
        onExport={onExport}
        onShare={onShare}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </Card>
  );
}

export default UnitCardExpanded;
