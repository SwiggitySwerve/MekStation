/**
 * Infantry Build Tab Component
 *
 * Configuration of infantry platoon settings, weapons, armor, and specializations.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2.2
 */

import React, { useCallback } from 'react';
import { useInfantryStore } from '@/stores/useInfantryStore';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { TechBase } from '@/types/enums/TechBase';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const MOTION_TYPE_OPTIONS = [
  SquadMotionType.FOOT,
  SquadMotionType.MOTORIZED,
  SquadMotionType.MECHANIZED,
  SquadMotionType.JUMP,
];

const ARMOR_KIT_OPTIONS = Object.values(InfantryArmorKit);
const SPECIALIZATION_OPTIONS = Object.values(InfantrySpecialization);

// =============================================================================
// Types
// =============================================================================

interface InfantryBuildTabProps {
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function InfantryBuildTab({
  readOnly = false,
}: InfantryBuildTabProps): React.ReactElement {
  // Get state from store
  const chassis = useInfantryStore((s) => s.chassis);
  const model = useInfantryStore((s) => s.model);
  const techBase = useInfantryStore((s) => s.techBase);
  const squadSize = useInfantryStore((s) => s.squadSize);
  const numberOfSquads = useInfantryStore((s) => s.numberOfSquads);
  const motionType = useInfantryStore((s) => s.motionType);
  const groundMP = useInfantryStore((s) => s.groundMP);
  const jumpMP = useInfantryStore((s) => s.jumpMP);
  const primaryWeapon = useInfantryStore((s) => s.primaryWeapon);
  const secondaryWeapon = useInfantryStore((s) => s.secondaryWeapon);
  const secondaryWeaponCount = useInfantryStore((s) => s.secondaryWeaponCount);
  const armorKit = useInfantryStore((s) => s.armorKit);
  const specialization = useInfantryStore((s) => s.specialization);
  const hasAntiMechTraining = useInfantryStore((s) => s.hasAntiMechTraining);

  // Get actions
  const setChassis = useInfantryStore((s) => s.setChassis);
  const setModel = useInfantryStore((s) => s.setModel);
  const setTechBase = useInfantryStore((s) => s.setTechBase);
  const setSquadSize = useInfantryStore((s) => s.setSquadSize);
  const setNumberOfSquads = useInfantryStore((s) => s.setNumberOfSquads);
  const setMotionType = useInfantryStore((s) => s.setMotionType);
  const setGroundMP = useInfantryStore((s) => s.setGroundMP);
  const setJumpMP = useInfantryStore((s) => s.setJumpMP);
  const setPrimaryWeapon = useInfantryStore((s) => s.setPrimaryWeapon);
  const setSecondaryWeapon = useInfantryStore((s) => s.setSecondaryWeapon);
  const setSecondaryWeaponCount = useInfantryStore((s) => s.setSecondaryWeaponCount);
  const setArmorKit = useInfantryStore((s) => s.setArmorKit);
  const setSpecialization = useInfantryStore((s) => s.setSpecialization);
  const setAntiMechTraining = useInfantryStore((s) => s.setAntiMechTraining);

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

  // Calculated values
  const platoonStrength = squadSize * numberOfSquads;

  return (
    <div className="space-y-6">
      {/* Identity Section */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={cs.text.label}>Unit Name</label>
            <input
              type="text"
              value={chassis}
              onChange={handleChassisChange}
              disabled={readOnly}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Variant</label>
            <input
              type="text"
              value={model}
              onChange={handleModelChange}
              disabled={readOnly}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Tech Base</label>
            <select
              value={techBase}
              onChange={(e) => !readOnly && setTechBase(e.target.value as TechBase)}
              disabled={readOnly}
              className={cs.select.full}
            >
              <option value={TechBase.INNER_SPHERE}>Inner Sphere</option>
              <option value={TechBase.CLAN}>Clan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Platoon Configuration */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Platoon Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={cs.text.label}>Squad Size</label>
            <input
              type="number"
              value={squadSize}
              onChange={(e) => !readOnly && setSquadSize(Number(e.target.value))}
              disabled={readOnly}
              min={1}
              max={10}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Number of Squads</label>
            <input
              type="number"
              value={numberOfSquads}
              onChange={(e) => !readOnly && setNumberOfSquads(Number(e.target.value))}
              disabled={readOnly}
              min={1}
              max={10}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Platoon Strength</label>
            <div className="px-3 py-2 bg-surface-raised border border-border-theme rounded text-white text-sm">
              {platoonStrength} soldiers
            </div>
          </div>
          <div>
            <label className={cs.text.label}>Motion Type</label>
            <select
              value={motionType}
              onChange={(e) => !readOnly && setMotionType(e.target.value as SquadMotionType)}
              disabled={readOnly}
              className={cs.select.full}
            >
              {MOTION_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={cs.text.label}>Ground MP</label>
            <input
              type="number"
              value={groundMP}
              onChange={(e) => !readOnly && setGroundMP(Number(e.target.value))}
              disabled={readOnly}
              min={0}
              max={5}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Jump MP</label>
            <input
              type="number"
              value={jumpMP}
              onChange={(e) => !readOnly && setJumpMP(Number(e.target.value))}
              disabled={readOnly}
              min={0}
              max={5}
              className={cs.input.full}
            />
          </div>
        </div>
      </div>

      {/* Weapons */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Weapons</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={cs.text.label}>Primary Weapon</label>
            <input
              type="text"
              value={primaryWeapon}
              onChange={(e) => !readOnly && setPrimaryWeapon(e.target.value)}
              disabled={readOnly}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Secondary Weapon</label>
            <input
              type="text"
              value={secondaryWeapon ?? ''}
              onChange={(e) => !readOnly && setSecondaryWeapon(e.target.value || undefined)}
              disabled={readOnly}
              placeholder="None"
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Secondary Count</label>
            <input
              type="number"
              value={secondaryWeaponCount}
              onChange={(e) => !readOnly && setSecondaryWeaponCount(Number(e.target.value))}
              disabled={readOnly}
              min={0}
              className={cs.input.full}
            />
          </div>
        </div>
      </div>

      {/* Protection & Specialization */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Protection & Specialization</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={cs.text.label}>Armor Kit</label>
            <select
              value={armorKit}
              onChange={(e) => !readOnly && setArmorKit(e.target.value as InfantryArmorKit)}
              disabled={readOnly}
              className={cs.select.full}
            >
              {ARMOR_KIT_OPTIONS.map((kit) => (
                <option key={kit} value={kit}>{kit}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={cs.text.label}>Specialization</label>
            <select
              value={specialization}
              onChange={(e) => !readOnly && setSpecialization(e.target.value as InfantrySpecialization)}
              disabled={readOnly}
              className={cs.select.full}
            >
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={hasAntiMechTraining}
                onChange={(e) => !readOnly && setAntiMechTraining(e.target.checked)}
                disabled={readOnly}
                className="rounded border-border-theme bg-surface-raised"
              />
              <span className="text-white text-sm">Anti-Mech Training</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfantryBuildTab;
