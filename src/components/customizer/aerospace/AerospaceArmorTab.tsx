/**
 * Aerospace Armor Tab Component
 *
 * Configuration of aerospace armor type, tonnage, and per-arc allocation.
 * Aerospace fighters have 4 arcs: Nose, Left Wing, Right Wing, Aft.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.2.2
 */

import React, { useCallback, useMemo } from 'react';
import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { getTotalAerospaceArmor } from '@/stores/aerospaceState';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const ARMOR_TYPE_OPTIONS: { value: ArmorTypeEnum; label: string }[] = [
  { value: ArmorTypeEnum.STANDARD, label: 'Standard' },
  { value: ArmorTypeEnum.FERRO_FIBROUS_IS, label: 'Ferro-Fibrous (IS)' },
  { value: ArmorTypeEnum.FERRO_FIBROUS_CLAN, label: 'Ferro-Fibrous (Clan)' },
  { value: ArmorTypeEnum.LIGHT_FERRO, label: 'Light Ferro-Fibrous' },
  { value: ArmorTypeEnum.HEAVY_FERRO, label: 'Heavy Ferro-Fibrous' },
  { value: ArmorTypeEnum.STEALTH, label: 'Stealth' },
];

const AEROSPACE_ARCS: { arc: AerospaceLocation; label: string }[] = [
  { arc: AerospaceLocation.NOSE, label: 'Nose' },
  { arc: AerospaceLocation.LEFT_WING, label: 'Left Wing' },
  { arc: AerospaceLocation.RIGHT_WING, label: 'Right Wing' },
  { arc: AerospaceLocation.AFT, label: 'Aft' },
];

// =============================================================================
// Types
// =============================================================================

interface AerospaceArmorTabProps {
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateArmorPoints(tonnage: number, armorType: ArmorTypeEnum): number {
  const def = getArmorDefinition(armorType);
  const pointsPerTon = def?.pointsPerTon ?? 16;
  return Math.floor(tonnage * pointsPerTon);
}

function getMaxAerospaceArmorForArc(tonnage: number, arc: AerospaceLocation): number {
  // Aerospace armor maximums are based on tonnage and arc
  const baseArmor = Math.floor(tonnage * 0.8); // Max ~80% of tonnage in armor points
  
  switch (arc) {
    case AerospaceLocation.NOSE:
      return Math.floor(baseArmor * 0.35); // Nose gets most
    case AerospaceLocation.LEFT_WING:
    case AerospaceLocation.RIGHT_WING:
      return Math.floor(baseArmor * 0.25); // Wings get equal
    case AerospaceLocation.AFT:
      return Math.floor(baseArmor * 0.15); // Aft gets least
    default:
      return 0;
  }
}

function getMaxTotalAerospaceArmor(tonnage: number): number {
  return Math.floor(tonnage * 0.8); // Simplified max armor
}

// =============================================================================
// Component
// =============================================================================

export function AerospaceArmorTab({
  readOnly = false,
  className = '',
}: AerospaceArmorTabProps): React.ReactElement {
  // Get state from store
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const armorType = useAerospaceStore((s) => s.armorType);
  const armorTonnage = useAerospaceStore((s) => s.armorTonnage);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);

  // Get actions
  const setArmorType = useAerospaceStore((s) => s.setArmorType);
  const setArmorTonnage = useAerospaceStore((s) => s.setArmorTonnage);
  const setArcArmor = useAerospaceStore((s) => s.setArcArmor);
  const autoAllocateArmor = useAerospaceStore((s) => s.autoAllocateArmor);
  const clearAllArmor = useAerospaceStore((s) => s.clearAllArmor);

  // Calculate derived values
  const armorDef = useMemo(() => getArmorDefinition(armorType), [armorType]);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const availablePoints = useMemo(
    () => calculateArmorPoints(armorTonnage, armorType),
    [armorTonnage, armorType]
  );
  const allocatedPoints = useMemo(
    () => getTotalAerospaceArmor(armorAllocation),
    [armorAllocation]
  );
  const maxTotalArmor = useMemo(
    () => getMaxTotalAerospaceArmor(tonnage),
    [tonnage]
  );
  const maxUsefulTonnage = useMemo(
    () => ceilToHalfTon(maxTotalArmor / pointsPerTon),
    [maxTotalArmor, pointsPerTon]
  );

  const unallocatedPoints = availablePoints - allocatedPoints;

  // Handlers
  const handleArmorTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setArmorType(e.target.value as ArmorTypeEnum);
    },
    [setArmorType]
  );

  const handleArmorTonnageChange = useCallback(
    (newTonnage: number) => {
      const clamped = Math.max(0, Math.min(maxUsefulTonnage, newTonnage));
      setArmorTonnage(clamped);
    },
    [setArmorTonnage, maxUsefulTonnage]
  );

  const handleArcArmorChange = useCallback(
    (arc: AerospaceLocation, points: number) => {
      const max = getMaxAerospaceArmorForArc(tonnage, arc);
      const clamped = Math.max(0, Math.min(max, points));
      setArcArmor(arc, clamped);
    },
    [setArcArmor, tonnage]
  );

  const handleMaximizeArmor = useCallback(() => {
    setArmorTonnage(maxUsefulTonnage);
  }, [setArmorTonnage, maxUsefulTonnage]);

  return (
    <div className={`${cs.panel.main} ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Armor Configuration Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Armor Configuration</h3>

          {/* Armor Type */}
          <div className="mb-4">
            <label className={cs.text.label}>Armor Type</label>
            <select
              value={armorType}
              onChange={handleArmorTypeChange}
              disabled={readOnly}
              className={`${cs.select.full} mt-1`}
            >
              {ARMOR_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Armor Tonnage */}
          <div className="mb-4">
            <label className={cs.text.label}>Armor Tonnage</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={armorTonnage}
                onChange={(e) => handleArmorTonnageChange(Number(e.target.value))}
                min={0}
                max={maxUsefulTonnage}
                step={0.5}
                disabled={readOnly}
                className={`${cs.input.number} w-20`}
              />
              <span className={cs.text.secondary}>/ {maxUsefulTonnage} tons max</span>
            </div>
          </div>

          {/* Points Summary */}
          <div className={`${cs.panel.summary} mb-4`}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className={cs.text.label}>Available Points:</span>
                <span className={`${cs.text.value} ml-2`}>{availablePoints}</span>
              </div>
              <div>
                <span className={cs.text.label}>Allocated:</span>
                <span
                  className={`ml-2 ${
                    allocatedPoints > availablePoints
                      ? cs.text.valueNegative
                      : cs.text.value
                  }`}
                >
                  {allocatedPoints}
                </span>
              </div>
              <div>
                <span className={cs.text.label}>Unallocated:</span>
                <span
                  className={`ml-2 ${
                    unallocatedPoints < 0
                      ? cs.text.valueNegative
                      : unallocatedPoints > 0
                      ? cs.text.valueWarning
                      : cs.text.value
                  }`}
                >
                  {unallocatedPoints}
                </span>
              </div>
              <div>
                <span className={cs.text.label}>Points/Ton:</span>
                <span className={`${cs.text.value} ml-2`}>{pointsPerTon}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={autoAllocateArmor}
              disabled={readOnly || availablePoints === 0}
              className={cs.button.action}
            >
              Auto-Allocate
            </button>
            <button
              onClick={handleMaximizeArmor}
              disabled={readOnly}
              className={cs.button.action}
            >
              Maximize
            </button>
            <button
              onClick={clearAllArmor}
              disabled={readOnly}
              className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
            >
              Clear
            </button>
          </div>
        </section>

        {/* Arc Allocation Section */}
        <section>
          <h3 className={cs.text.sectionTitle}>Arc Allocation</h3>

          <div className="space-y-3">
            {AEROSPACE_ARCS.map(({ arc, label }) => {
              const currentValue = armorAllocation[arc] ?? 0;
              const maxValue = getMaxAerospaceArmorForArc(tonnage, arc);

              return (
                <div key={arc} className="flex items-center gap-3">
                  <span className={`${cs.text.label} w-24`}>{label}</span>
                  <input
                    type="range"
                    value={currentValue}
                    onChange={(e) => handleArcArmorChange(arc, Number(e.target.value))}
                    min={0}
                    max={maxValue}
                    disabled={readOnly || maxValue === 0}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 w-20">
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => handleArcArmorChange(arc, Number(e.target.value))}
                      min={0}
                      max={maxValue}
                      disabled={readOnly || maxValue === 0}
                      className={`${cs.input.number} w-12`}
                    />
                    <span className={cs.text.secondary}>/{maxValue}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Arc Diagram */}
          <div className="mt-6 p-4 bg-surface-raised/30 rounded-lg">
            <AerospaceArmorDiagramSimple allocation={armorAllocation} />
          </div>
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Simple Aerospace Armor Diagram
// =============================================================================

interface AerospaceArmorDiagramSimpleProps {
  allocation: Record<string, number>;
}

function AerospaceArmorDiagramSimple({
  allocation,
}: AerospaceArmorDiagramSimpleProps): React.ReactElement {
  return (
    <div className="text-center text-sm font-mono">
      {/* Nose */}
      <div className="mb-4">
        <span className="text-text-theme-secondary">NOSE</span>
        <div className="text-lg font-bold text-cyan-400">
          {allocation[AerospaceLocation.NOSE] ?? 0}
        </div>
      </div>

      {/* Wings */}
      <div className="flex justify-center items-center gap-12 mb-4">
        <div>
          <span className="text-text-theme-secondary">L.WING</span>
          <div className="text-lg font-bold text-cyan-400">
            {allocation[AerospaceLocation.LEFT_WING] ?? 0}
          </div>
        </div>
        <div className="w-8 h-8 border-2 border-border-theme rounded-full" />
        <div>
          <span className="text-text-theme-secondary">R.WING</span>
          <div className="text-lg font-bold text-cyan-400">
            {allocation[AerospaceLocation.RIGHT_WING] ?? 0}
          </div>
        </div>
      </div>

      {/* Aft */}
      <div>
        <span className="text-text-theme-secondary">AFT</span>
        <div className="text-lg font-bold text-cyan-400">
          {allocation[AerospaceLocation.AFT] ?? 0}
        </div>
      </div>
    </div>
  );
}

export default AerospaceArmorTab;
