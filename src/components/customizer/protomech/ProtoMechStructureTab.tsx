/**
 * ProtoMech Structure Tab Component
 *
 * Configuration of ProtoMech chassis, engine, movement, and armor.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3.2
 */

import React, { useCallback } from 'react';
import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const TONNAGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9];

const LOCATION_LABELS: Record<string, string> = {
  [ProtoMechLocation.HEAD]: 'Head',
  [ProtoMechLocation.TORSO]: 'Torso',
  [ProtoMechLocation.LEFT_ARM]: 'Left Arm',
  [ProtoMechLocation.RIGHT_ARM]: 'Right Arm',
  [ProtoMechLocation.LEGS]: 'Legs',
  [ProtoMechLocation.MAIN_GUN]: 'Main Gun',
};

// =============================================================================
// Types
// =============================================================================

interface ProtoMechStructureTabProps {
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ProtoMechStructureTab({
  readOnly = false,
}: ProtoMechStructureTabProps): React.ReactElement {
  // Get state from store
  const chassis = useProtoMechStore((s) => s.chassis);
  const model = useProtoMechStore((s) => s.model);
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const isQuad = useProtoMechStore((s) => s.isQuad);
  const isGlider = useProtoMechStore((s) => s.isGlider);
  const cruiseMP = useProtoMechStore((s) => s.cruiseMP);
  const flankMP = useProtoMechStore((s) => s.flankMP);
  const jumpMP = useProtoMechStore((s) => s.jumpMP);
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);
  const structureByLocation = useProtoMechStore((s) => s.structureByLocation);

  // Get actions
  const setChassis = useProtoMechStore((s) => s.setChassis);
  const setModel = useProtoMechStore((s) => s.setModel);
  const setTonnage = useProtoMechStore((s) => s.setTonnage);
  const setQuad = useProtoMechStore((s) => s.setQuad);
  const setGlider = useProtoMechStore((s) => s.setGlider);
  const setCruiseMP = useProtoMechStore((s) => s.setCruiseMP);
  const setJumpMP = useProtoMechStore((s) => s.setJumpMP);
  const setMainGun = useProtoMechStore((s) => s.setMainGun);
  const setLocationArmor = useProtoMechStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useProtoMechStore((s) => s.autoAllocateArmor);
  const clearAllArmor = useProtoMechStore((s) => s.clearAllArmor);

  // Handlers
  const handleChassisChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) setChassis(e.target.value);
    },
    [setChassis, readOnly]
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) setModel(e.target.value);
    },
    [setModel, readOnly]
  );

  // Armor locations (exclude main gun if not equipped)
  const armorLocations = hasMainGun
    ? Object.values(ProtoMechLocation)
    : Object.values(ProtoMechLocation).filter((l) => l !== ProtoMechLocation.MAIN_GUN);

  // Calculate total armor
  const totalArmor = Object.values(armorByLocation).reduce((sum, v) => sum + (v || 0), 0);

  return (
    <div className="space-y-6">
      {/* Identity Section */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={cs.text.label}>Chassis Name</label>
            <input
              type="text"
              value={chassis}
              onChange={handleChassisChange}
              disabled={readOnly}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Model/Variant</label>
            <input
              type="text"
              value={model}
              onChange={handleModelChange}
              disabled={readOnly}
              className={cs.input.full}
            />
          </div>
        </div>
      </div>

      {/* Chassis Configuration */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Chassis Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={cs.text.label}>Tonnage</label>
            <select
              value={tonnage}
              onChange={(e) => !readOnly && setTonnage(Number(e.target.value))}
              disabled={readOnly}
              className={cs.select.full}
            >
              {TONNAGE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t} tons</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={isQuad}
                onChange={(e) => !readOnly && setQuad(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className="text-white text-sm">Quad</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={isGlider}
                onChange={(e) => !readOnly && setGlider(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className="text-white text-sm">Glider</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={hasMainGun}
                onChange={(e) => !readOnly && setMainGun(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className="text-white text-sm">Main Gun Mount</span>
            </label>
          </div>
        </div>
      </div>

      {/* Movement */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Movement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={cs.text.label}>Cruise MP</label>
            <input
              type="number"
              value={cruiseMP}
              onChange={(e) => !readOnly && setCruiseMP(Number(e.target.value))}
              disabled={readOnly}
              min={1}
              max={10}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Flank MP</label>
            <div className="px-3 py-2 bg-surface-raised border border-border-theme rounded text-white text-sm">
              {flankMP}
            </div>
          </div>
          <div>
            <label className={cs.text.label}>Jump MP</label>
            <input
              type="number"
              value={jumpMP}
              onChange={(e) => !readOnly && setJumpMP(Number(e.target.value))}
              disabled={readOnly}
              min={0}
              max={cruiseMP}
              className={cs.input.full}
            />
          </div>
        </div>
      </div>

      {/* Armor */}
      <div className={cs.panel.main}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cs.text.sectionTitle.replace('mb-4', 'mb-0')}>Armor Allocation</h3>
          <div className="flex gap-2">
            <button
              onClick={() => !readOnly && autoAllocateArmor()}
              disabled={readOnly}
              className={cs.button.action}
            >
              Auto
            </button>
            <button
              onClick={() => !readOnly && clearAllArmor()}
              disabled={readOnly}
              className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mb-4">
          <span className={cs.text.secondary}>
            Total Armor: <span className="text-accent">{totalArmor}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {armorLocations.map((location) => (
            <div key={location}>
              <label className={cs.text.label}>{LOCATION_LABELS[location]}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={armorByLocation[location] ?? 0}
                  onChange={(e) =>
                    !readOnly && setLocationArmor(location, Number(e.target.value))
                  }
                  disabled={readOnly}
                  min={0}
                  className={cs.input.full}
                />
                <span className={cs.text.secondary}>
                  / {structureByLocation[location] ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProtoMechStructureTab;
