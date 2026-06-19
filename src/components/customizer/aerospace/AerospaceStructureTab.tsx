/**
 * Aerospace Structure Tab Component
 *
 * Configuration of aerospace chassis, engine, thrust, and cockpit settings.
 * Includes sub-type selector, aerospace-canonical engine type, fuel tonnage,
 * crew editor (small craft), and live validation error display.
 *
 * The body is composed from focused sub-section components which each
 * subscribe to useAerospaceStore for the slice they own. This file orchestrates
 * the layout, the small-craft-only branches, and the validation pipeline.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.2.1
 */

import React, { useCallback, useMemo } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { makeSmallCraftCrew } from '@/utils/construction/aerospace/crewCalculations';
import { validateAerospaceUnit } from '@/utils/construction/aerospace/validationRules';

import { customizerStyles as cs } from '../styles';
import { ChassisSection } from './AerospaceStructureTab.ChassisSection';
import { CockpitSection } from './AerospaceStructureTab.CockpitSection';
import { CrewEditor } from './AerospaceStructureTab.CrewEditor';
import { EngineSection } from './AerospaceStructureTab.EngineSection';
import { HeatSection } from './AerospaceStructureTab.HeatSection';
import { ValidationPanel } from './AerospaceStructureTab.ValidationPanel';

interface AerospaceStructureTabProps {
  readOnly?: boolean;
  className?: string;
}

export function AerospaceStructureTab({
  readOnly = false,
  className = '',
}: AerospaceStructureTabProps): React.ReactElement {
  // Sub-type and validation inputs — pulled here because the orchestrator
  // owns the small-craft-only branches and the cross-section validation call.
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const aerospaceSubType = useAerospaceStore((s) => s.aerospaceSubType);
  const aerospaceEngineType = useAerospaceStore((s) => s.aerospaceEngineType);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const fuelTons = useAerospaceStore((s) => s.fuelTons);
  const structuralIntegrity = useAerospaceStore((s) => s.structuralIntegrity);
  const crew = useAerospaceStore((s) => s.crew);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const setCrew = useAerospaceStore((s) => s.setCrew);

  const isSmallCraft = aerospaceSubType === AerospaceSubType.SMALL_CRAFT;

  // Crew values with safe defaults for the sub-components
  const crewCount = crew?.crew ?? 0;
  const passengerCount = crew?.passengers ?? 0;
  const marineCount = crew?.marines ?? 0;
  const quartersTons = crew?.quartersTons ?? 0;

  // Build arc allocation map for validation (convert from AerospaceLocation to AerospaceArc)
  const arcAllocationForValidation = useMemo<
    Partial<Record<AerospaceArc, number>>
  >(
    () => ({
      [AerospaceArc.NOSE]: armorAllocation[AerospaceLocation.NOSE] ?? 0,
      [AerospaceArc.LEFT_WING]:
        armorAllocation[AerospaceLocation.LEFT_WING] ?? 0,
      [AerospaceArc.RIGHT_WING]:
        armorAllocation[AerospaceLocation.RIGHT_WING] ?? 0,
      [AerospaceArc.AFT]: armorAllocation[AerospaceLocation.AFT] ?? 0,
      [AerospaceArc.FUSELAGE]: armorAllocation[AerospaceLocation.FUSELAGE] ?? 0,
    }),
    [armorAllocation],
  );

  // Compute live validation errors for display
  const validationErrors = useMemo(
    () =>
      validateAerospaceUnit({
        tonnage,
        subType: aerospaceSubType,
        engineType: aerospaceEngineType,
        safeThrust,
        structuralIntegrity,
        fuelTons,
        arcArmor: arcAllocationForValidation,
        quartersTons,
        crewCount,
      }),
    [
      tonnage,
      aerospaceSubType,
      aerospaceEngineType,
      safeThrust,
      structuralIntegrity,
      fuelTons,
      arcAllocationForValidation,
      quartersTons,
      crewCount,
    ],
  );

  const handleCrewChange = useCallback(
    (newCrew: number, newPassengers: number, newMarines: number) => {
      setCrew(makeSmallCraftCrew(newCrew, newPassengers, newMarines));
    },
    [setCrew],
  );

  return (
    <div
      className={`${cs.panel.main} ${className}`}
      data-testid="aerospace-structure-tab"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChassisSection readOnly={readOnly} />
        <EngineSection readOnly={readOnly} />
        <CockpitSection readOnly={readOnly} />
        <HeatSection readOnly={readOnly} />

        {/* Crew Editor — small craft only */}
        {isSmallCraft && (
          <CrewEditor
            crewCount={crewCount}
            passengers={passengerCount}
            marines={marineCount}
            readOnly={readOnly}
            onCrewChange={handleCrewChange}
          />
        )}

        {/* Crew Quarters Summary — small craft only */}
        {isSmallCraft && quartersTons > 0 && (
          <div
            className={`${cs.panel.summary} col-span-1 lg:col-span-2`}
            data-testid="aerospace-quarters-summary"
          >
            <span className={cs.text.label}>Quarters Tonnage:</span>
            <span className={`${cs.text.value} ml-2`}>{quartersTons}t</span>
          </div>
        )}
      </div>

      {/* Validation Errors — spans full width */}
      <ValidationPanel errors={validationErrors} />
    </div>
  );
}

export default AerospaceStructureTab;
