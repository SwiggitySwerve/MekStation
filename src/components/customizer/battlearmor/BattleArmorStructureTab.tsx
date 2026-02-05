/**
 * Battle Armor Structure Tab Component
 *
 * Configuration of BA chassis, weight class, motion type, and manipulators.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1.2
 */

import React, { useCallback } from 'react';

import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { TechBase } from '@/types/enums/TechBase';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';

import { customizerStyles as cs } from '../styles';

// =============================================================================
// Constants
// =============================================================================

const CHASSIS_TYPE_OPTIONS = Object.values(BattleArmorChassisType);
const WEIGHT_CLASS_OPTIONS = Object.values(BattleArmorWeightClass);
const MANIPULATOR_OPTIONS = Object.values(ManipulatorType);
const MOTION_TYPE_OPTIONS = [
  SquadMotionType.FOOT,
  SquadMotionType.JUMP,
  SquadMotionType.VTOL,
  SquadMotionType.UMU,
];

// =============================================================================
// Types
// =============================================================================

interface BattleArmorStructureTabProps {
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function BattleArmorStructureTab({
  readOnly = false,
}: BattleArmorStructureTabProps): React.ReactElement {
  // Get state from store
  const chassis = useBattleArmorStore((s) => s.chassis);
  const model = useBattleArmorStore((s) => s.model);
  const techBase = useBattleArmorStore((s) => s.techBase);
  const chassisType = useBattleArmorStore((s) => s.chassisType);
  const weightClass = useBattleArmorStore((s) => s.weightClass);
  const weightPerTrooper = useBattleArmorStore((s) => s.weightPerTrooper);
  const motionType = useBattleArmorStore((s) => s.motionType);
  const groundMP = useBattleArmorStore((s) => s.groundMP);
  const jumpMP = useBattleArmorStore((s) => s.jumpMP);
  const leftManipulator = useBattleArmorStore((s) => s.leftManipulator);
  const rightManipulator = useBattleArmorStore((s) => s.rightManipulator);

  // Get actions
  const setChassis = useBattleArmorStore((s) => s.setChassis);
  const setModel = useBattleArmorStore((s) => s.setModel);
  const setTechBase = useBattleArmorStore((s) => s.setTechBase);
  const setChassisType = useBattleArmorStore((s) => s.setChassisType);
  const setWeightClass = useBattleArmorStore((s) => s.setWeightClass);
  const setWeightPerTrooper = useBattleArmorStore((s) => s.setWeightPerTrooper);
  const setMotionType = useBattleArmorStore((s) => s.setMotionType);
  const setGroundMP = useBattleArmorStore((s) => s.setGroundMP);
  const setJumpMP = useBattleArmorStore((s) => s.setJumpMP);
  const setLeftManipulator = useBattleArmorStore((s) => s.setLeftManipulator);
  const setRightManipulator = useBattleArmorStore((s) => s.setRightManipulator);

  // Handlers
  const handleChassisChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) setChassis(e.target.value);
    },
    [setChassis, readOnly],
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) setModel(e.target.value);
    },
    [setModel, readOnly],
  );

  return (
    <div className="space-y-6">
      {/* Identity Section */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div>
            <label className={cs.text.label}>Tech Base</label>
            <select
              value={techBase}
              onChange={(e) =>
                !readOnly && setTechBase(e.target.value as TechBase)
              }
              disabled={readOnly}
              className={cs.select.full}
            >
              <option value={TechBase.INNER_SPHERE}>Inner Sphere</option>
              <option value={TechBase.CLAN}>Clan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chassis Configuration */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Chassis Configuration</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={cs.text.label}>Chassis Type</label>
            <select
              value={chassisType}
              onChange={(e) =>
                !readOnly &&
                setChassisType(e.target.value as BattleArmorChassisType)
              }
              disabled={readOnly}
              className={cs.select.full}
            >
              {CHASSIS_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={cs.text.label}>Weight Class</label>
            <select
              value={weightClass}
              onChange={(e) =>
                !readOnly &&
                setWeightClass(e.target.value as BattleArmorWeightClass)
              }
              disabled={readOnly}
              className={cs.select.full}
            >
              {WEIGHT_CLASS_OPTIONS.map((wc) => (
                <option key={wc} value={wc}>
                  {wc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={cs.text.label}>Weight/Trooper (kg)</label>
            <input
              type="number"
              value={weightPerTrooper}
              onChange={(e) =>
                !readOnly && setWeightPerTrooper(Number(e.target.value))
              }
              disabled={readOnly}
              min={400}
              max={2000}
              step={50}
              className={cs.input.full}
            />
          </div>
        </div>
      </div>

      {/* Movement */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Movement</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={cs.text.label}>Motion Type</label>
            <select
              value={motionType}
              onChange={(e) =>
                !readOnly && setMotionType(e.target.value as SquadMotionType)
              }
              disabled={readOnly}
              className={cs.select.full}
            >
              {MOTION_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
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

      {/* Manipulators */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Manipulators</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={cs.text.label}>Left Manipulator</label>
            <select
              value={leftManipulator}
              onChange={(e) =>
                !readOnly &&
                setLeftManipulator(e.target.value as ManipulatorType)
              }
              disabled={readOnly}
              className={cs.select.full}
            >
              {MANIPULATOR_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={cs.text.label}>Right Manipulator</label>
            <select
              value={rightManipulator}
              onChange={(e) =>
                !readOnly &&
                setRightManipulator(e.target.value as ManipulatorType)
              }
              disabled={readOnly}
              className={cs.select.full}
            >
              {MANIPULATOR_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BattleArmorStructureTab;
