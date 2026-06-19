import React from 'react';

import { ProtoMechLocation } from '@/types/construction/UnitLocation';

import { customizerStyles as cs } from '../styles';
import {
  CHASSIS_LABELS,
  LOCATION_LABELS,
  MAIN_GUN_WEAPON_OPTIONS,
  type useProtoMechArmorControls,
  type useProtoMechChassisControls,
  type useProtoMechIdentityControls,
  type useProtoMechMainGunControls,
  type useProtoMechMovementControls,
  type useProtoMechTonnageControls,
} from './ProtoMechStructureTab.logic';

type IdentityControls = ReturnType<typeof useProtoMechIdentityControls>;
type ChassisControls = ReturnType<typeof useProtoMechChassisControls>;
type TonnageControls = ReturnType<typeof useProtoMechTonnageControls>;
type MovementControls = ReturnType<typeof useProtoMechMovementControls>;
type MainGunControls = ReturnType<typeof useProtoMechMainGunControls>;
type ArmorControls = ReturnType<typeof useProtoMechArmorControls>;

interface ReadOnlyProps {
  readOnly: boolean;
}

export function ProtoMechIdentitySection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: IdentityControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Identity</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={cs.text.label}>Chassis Name</label>
          <input
            type="text"
            value={controls.chassis}
            onChange={controls.handleChassisNameChange}
            disabled={readOnly}
            className={cs.input.full}
          />
        </div>
        <div>
          <label className={cs.text.label}>Model / Variant</label>
          <input
            type="text"
            value={controls.model}
            onChange={controls.handleModelChange}
            disabled={readOnly}
            className={cs.input.full}
          />
        </div>
      </div>
    </div>
  );
}

export function ProtoMechChassisTypeSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: ChassisControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Chassis Type</h3>
      <div className="flex flex-wrap gap-4">
        {controls.chassisOptions.map((chassisType) => (
          <label
            key={chassisType}
            className="flex cursor-pointer items-center gap-2"
          >
            <input
              type="radio"
              name="chassisType"
              value={chassisType}
              checked={controls.chassisType === chassisType}
              onChange={() => controls.handleChassisTypeChange(chassisType)}
              disabled={readOnly}
              className="accent-accent"
            />
            <span className="text-sm text-white">
              {CHASSIS_LABELS[chassisType]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ProtoMechTonnageSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: TonnageControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Tonnage &amp; Weight Class</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={cs.text.label}>Tonnage</label>
          <select
            value={controls.tonnage}
            onChange={controls.handleTonnageChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            {controls.tonnageOptions.map((tonnage) => (
              <option key={tonnage} value={tonnage}>
                {tonnage} tons
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={cs.text.label}>Weight Class</label>
          <div className="bg-surface-raised border-border-theme text-accent rounded border px-3 py-2 text-sm font-semibold">
            {controls.weightClass}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtoMechMovementSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: MovementControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Movement</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={cs.text.label}>
            Walk MP{' '}
            <span className={cs.text.secondary}>
              (cap: {controls.mpCaps.walkMax})
            </span>
          </label>
          <input
            type="number"
            value={controls.walkMP}
            onChange={controls.handleWalkMPChange}
            disabled={readOnly}
            min={1}
            max={controls.mpCaps.walkMax}
            className={cs.input.full}
          />
        </div>
        <div>
          <label className={cs.text.label}>
            Run MP <span className={cs.text.secondary}>(walk + 1)</span>
          </label>
          <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
            {controls.runMP}
          </div>
        </div>
        <div>
          <label className={cs.text.label}>
            Jump MP{' '}
            {controls.isUltraheavy ? (
              <span className="text-red-400">(Ultraheavy: 0)</span>
            ) : (
              <span className={cs.text.secondary}>
                (cap: {controls.mpCaps.jumpMax})
              </span>
            )}
          </label>
          <input
            type="number"
            value={controls.jumpMP}
            onChange={controls.handleJumpMPChange}
            disabled={readOnly || controls.isUltraheavy}
            min={0}
            max={controls.isUltraheavy ? 0 : controls.mpCaps.jumpMax}
            className={cs.input.full}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className={cs.text.secondary}>
          Effective Walk:{' '}
          <span className="text-white">{controls.effectiveWalk}</span>
          {controls.hasMyomerBooster && (
            <span className="ml-1 text-green-400">(+1 booster)</span>
          )}
        </span>
        {controls.isGliderChassis && (
          <span className={cs.text.secondary}>
            Effective Jump:{' '}
            <span className="text-white">{controls.effectiveJump}</span>
            <span className="ml-1 text-blue-400">(+2 glider wings)</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={controls.hasMyomerBooster}
            onChange={controls.handleMyomerBoosterChange}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className="text-sm text-white">
            Myomer Booster{' '}
            <span className={cs.text.secondary}>
              (Light / Medium only; +1 walk)
            </span>
          </span>
        </label>

        {controls.isGliderChassis && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={controls.glidingWings}
              onChange={controls.handleGlidingWingsChange}
              disabled={readOnly}
              className="border-border-theme bg-surface-raised rounded"
            />
            <span className="text-sm text-white">
              Gliding Wings{' '}
              <span className={cs.text.secondary}>(+2 jump MP)</span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

export function ProtoMechMainGunSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: MainGunControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Main Gun</h3>
      <label className="mb-4 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={controls.hasMainGun}
          onChange={controls.handleMainGunChange}
          disabled={readOnly}
          className="border-border-theme bg-surface-raised rounded"
        />
        <span className="text-sm text-white">Main Gun Mount</span>
      </label>

      {controls.hasMainGun && (
        <div>
          <label className={cs.text.label}>Weapon</label>
          <select
            value={controls.mainGunWeaponId ?? ''}
            onChange={controls.handleMainGunWeaponChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            <option value="">-- select weapon --</option>
            {MAIN_GUN_WEAPON_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          {controls.hasUnapprovedMainGunWeapon && (
            <p className="mt-1 text-xs text-red-400">
              This weapon is not in the approved main-gun list
              (VAL-PROTO-MAIN-GUN).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ProtoMechArmorAllocationSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: ArmorControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={cs.text.sectionTitle.replace('mb-4', 'mb-0')}>
          Armor Allocation
        </h3>
        <div className="flex gap-2">
          <button
            onClick={controls.handleAutoAllocateArmor}
            disabled={readOnly}
            className={cs.button.action}
          >
            Auto
          </button>
          <button
            onClick={controls.handleClearAllArmor}
            disabled={readOnly}
            className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mb-4">
        <span className={cs.text.secondary}>
          Total Armor:{' '}
          <span className="text-accent">{controls.totalArmor}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {controls.armorLocations.map((location: ProtoMechLocation) => (
          <div key={location}>
            <label className={cs.text.label}>{LOCATION_LABELS[location]}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={controls.armorByLocation[location] ?? 0}
                onChange={(event) =>
                  controls.handleLocationArmorChange(location, event)
                }
                disabled={readOnly}
                min={0}
                className={cs.input.full}
              />
              <span className={cs.text.secondary}>
                / {controls.structureByLocation[location] ?? 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
