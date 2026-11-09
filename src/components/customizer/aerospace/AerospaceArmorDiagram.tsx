/**
 * AerospaceArmorDiagram
 *
 * Fighter and small-craft location diagrams with a separate SI bar.
 * The construction owner supplies small-craft available points; their Side
 * locations have no independent maximum. Auto-Allocate delegates to the store.
 *
 * Accessibility:
 *   - Per-arc inputs use the shared <ArmorAllocationInput> primitive which
 *     supports clamp + ArrowLeft/ArrowRight focus navigation between siblings
 *     in the 'aerospace-armor' group.
 *   - Auto-Allocate prompts an app dialog if the user has already
 *     manually allocated armor (any arc > 0).
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Aerospace Diagram Geometry
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { shallow } from 'zustand/vanilla/shallow';

import {
  useAerospaceStore,
  useAerospaceStoreApi,
} from '@/stores/useAerospaceStore';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { smallCraftArmor } from '@/utils/construction/aerospace/armor';
import { maxArcArmorPointsForLocation } from '@/utils/construction/aerospace/armorArcCalculations';

import { ArmorAllocationInput } from '../armor/ArmorAllocationInput';
import { ArmorLocationBlock } from '../armor/ArmorLocationBlock';
import { useCustomizerConfirmation } from '../dialogs/CustomizerConfirmationProvider';
import { getAerospaceArmorArcs } from './aerospaceLocationLabels';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Delegate to the family-aware bridge. Null means no independent location cap.
 */
function getArcMax(
  tonnage: number,
  subType: AerospaceSubType,
  arc: AerospaceLocation,
): number | null {
  return maxArcArmorPointsForLocation(arc, tonnage, subType);
}

// =============================================================================
// Types
// =============================================================================

interface AerospaceArmorDiagramProps {
  className?: string;
}

// Arc display order with labels matching aerospace-unit-system spec arc names

// =============================================================================
// Component
// =============================================================================

/**
 * Aerospace armor diagram showing 4 arcs + SI bar.
 *
 * The SI bar shows the store's structural integrity: derived for fighters,
 * explicit for small craft.
 */
export function AerospaceArmorDiagram({
  className = '',
}: AerospaceArmorDiagramProps): React.ReactElement {
  const storeApi = useAerospaceStoreApi();
  const committedStore = useRef(storeApi);
  useLayoutEffect(() => {
    committedStore.current = storeApi;
  }, [storeApi]);
  const { requestConfirmation } = useCustomizerConfirmation();
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const armorTonnage = useAerospaceStore((s) => s.armorTonnage);
  const armorType = useAerospaceStore((s) => s.armorType);
  const smallCraftArmorType = useAerospaceStore((s) => s.smallCraftArmorType);
  const techBase = useAerospaceStore((s) => s.techBase);
  const subType = useAerospaceStore((s) => s.aerospaceSubType);
  const motionType = useAerospaceStore((s) => s.motionType);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const setArcArmor = useAerospaceStore((s) => s.setArcArmor);

  const si = useAerospaceStore((s) => s.structuralIntegrity);
  const siMax = si; // structural integrity equals SI rating
  const craftArmor = useMemo(
    () =>
      subType === AerospaceSubType.SMALL_CRAFT
        ? smallCraftArmor({
            tonnage,
            armorType,
            armorTonnage,
            smallCraftArmorType,
            structuralIntegrity: si,
            motionType,
            techBase,
          })
        : undefined,
    [
      subType,
      tonnage,
      armorType,
      armorTonnage,
      smallCraftArmorType,
      si,
      motionType,
      techBase,
    ],
  );

  // Resolve points-per-ton for the configured armor type (defaults to 16).
  // Fighter display keeps its existing points-per-ton path.
  const pointsPerTon = useMemo(() => {
    const def = getArmorDefinition(armorType);
    return def?.pointsPerTon ?? 16;
  }, [armorType]);

  const handleChange = useCallback(
    (arc: AerospaceLocation, raw: number) => {
      const max = getArcMax(tonnage, subType, arc);
      setArcArmor(arc, Math.max(0, max === null ? raw : Math.min(max, raw)));
    },
    [setArcArmor, tonnage, subType],
  );

  const availablePoints =
    craftArmor?.availablePoints ?? Math.floor(armorTonnage * pointsPerTon);

  const handleAutoAllocate = useCallback(() => {
    const state = storeApi.getState();
    if (
      !Object.values(state.armorAllocation).some((value) => (value ?? 0) > 0)
    ) {
      state.autoAllocateArmor();
      return;
    }
    const requested = {
      id: state.id,
      unitType: state.unitType,
      tonnage: state.tonnage,
      subType: state.aerospaceSubType,
      armorType: state.armorType,
      smallCraftArmorType: state.smallCraftArmorType,
      armorTonnage: state.armorTonnage,
      allocation: { ...state.armorAllocation },
    };
    requestConfirmation({
      title: 'Auto-allocate armor?',
      message:
        'Auto-allocate will overwrite your current armor distribution. Continue?',
      confirmLabel: 'Auto-Allocate',
      isCurrent: () => {
        if (committedStore.current !== storeApi) return false;
        const current = committedStore.current.getState();
        return (
          current.id === requested.id &&
          current.unitType === requested.unitType &&
          current.tonnage === requested.tonnage &&
          current.aerospaceSubType === requested.subType &&
          current.armorType === requested.armorType &&
          current.smallCraftArmorType === requested.smallCraftArmorType &&
          current.armorTonnage === requested.armorTonnage &&
          shallow(current.armorAllocation, requested.allocation)
        );
      },
      onConfirm: () => committedStore.current.getState().autoAllocateArmor(),
    });
  }, [requestConfirmation, storeApi]);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-4 rounded-lg border p-4 ${className}`}
      data-testid="aerospace-armor-diagram"
    >
      {/* Header + Auto-Allocate */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Armor Diagram</h4>
        <button
          onClick={handleAutoAllocate}
          disabled={availablePoints === 0}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="aerospace-armor-auto-allocate"
        >
          Auto-Allocate
        </button>
      </div>

      {/* SI bar — rendered separately above the arc diagram per spec */}
      <div
        className="flex flex-col gap-1"
        aria-label={`Structural Integrity: ${si} of ${siMax}`}
        data-testid="aerospace-si-bar"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-text-theme-secondary text-[10px] font-medium tracking-wide uppercase">
            Structural Integrity
          </span>
          <span className="font-mono text-xs text-amber-400 tabular-nums">
            {si}
            <span className="text-text-theme-secondary">/{siMax}</span>
          </span>
        </div>
        {/* Horizontal progress bar */}
        <div className="h-2 w-full overflow-hidden rounded bg-slate-700">
          <div
            className="h-full rounded bg-amber-500 transition-all"
            style={{
              width: siMax > 0 ? `${(si / siMax) * 100}%` : '0%',
            }}
          />
        </div>
      </div>

      {/* Fighter silhouette */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 160 180"
          className="w-full max-w-[140px]"
          aria-hidden="true"
        >
          {subType === AerospaceSubType.SMALL_CRAFT ? (
            <g data-craft-shape={motionType}>
              {motionType === AerospaceMotionType.SPHEROID ? (
                <ellipse
                  cx="80"
                  cy="90"
                  rx="55"
                  ry="70"
                  className="fill-surface-raised stroke-border-theme"
                  strokeWidth="1.5"
                />
              ) : (
                <path
                  d="M80 15 L125 120 L110 155 L50 155 L35 120 Z"
                  className="fill-surface-raised stroke-border-theme"
                  strokeWidth="1.5"
                />
              )}
            </g>
          ) : (
            <g>
              {/* Fuselage */}
              <path
                d="M 80 15 L 95 55 L 95 145 L 80 160 L 65 145 L 65 55 Z"
                className="fill-surface-raised stroke-border-theme"
                strokeWidth="1.5"
              />
              {/* Left wing */}
              <path
                d="M 65 75 L 15 115 L 22 122 L 65 95"
                className="fill-surface-raised stroke-border-theme"
                strokeWidth="1.5"
              />
              {/* Right wing */}
              <path
                d="M 95 75 L 145 115 L 138 122 L 95 95"
                className="fill-surface-raised stroke-border-theme"
                strokeWidth="1.5"
              />
              {/* Nose highlight */}
              <circle
                cx="80"
                cy="30"
                r="6"
                className="fill-cyan-900/30 stroke-cyan-500"
                strokeWidth="1.5"
              />
              {/* Engine exhaust */}
              <ellipse
                cx="75"
                cy="152"
                rx="5"
                ry="3"
                className="fill-amber-900/30 stroke-amber-500"
                strokeWidth="1"
              />
              <ellipse
                cx="85"
                cy="152"
                rx="5"
                ry="3"
                className="fill-amber-900/30 stroke-amber-500"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Arc location blocks */}
      <div className="grid grid-cols-2 gap-3">
        {getAerospaceArmorArcs(subType).map(({ arc, label }) => {
          const current = (armorAllocation as Record<string, number>)[arc] ?? 0;
          const max = getArcMax(tonnage, subType, arc);
          return (
            <div key={arc} className="flex flex-col gap-1">
              <ArmorLocationBlock
                label={label}
                current={current}
                max={max}
                accentClass="text-cyan-400"
              />
              <ArmorAllocationInput
                label={label}
                value={current}
                max={max}
                groupId="aerospace-armor"
                data-testid={`aerospace-arc-diagram-input-${arc}`}
                onChange={(next) => handleChange(arc, next)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AerospaceArmorDiagram;
