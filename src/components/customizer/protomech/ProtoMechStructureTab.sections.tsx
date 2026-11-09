import React from 'react';

import { formatTons } from '@/utils/formatting';

import { customizerStyles as cs } from '../styles';
import {
  CHASSIS_LABELS,
  type useProtoMechChassisControls,
  type useProtoMechIdentityControls,
  type useProtoMechMovementControls,
  type useProtoMechTonnageControls,
} from './ProtoMechStructureTab.logic';

type IdentityControls = ReturnType<typeof useProtoMechIdentityControls>;
type ChassisControls = ReturnType<typeof useProtoMechChassisControls>;
type TonnageControls = ReturnType<typeof useProtoMechTonnageControls>;
type MovementControls = ReturnType<typeof useProtoMechMovementControls>;

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
            <span className="text-text-theme-primary text-sm">
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
                {formatTons(tonnage)}
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
  // Ultraheavy cannot jump, and MML pins a glider's jump spinner at 0
  // (MovementView.java:265-268); a glider flies on its walk MP.
  const noJump = !controls.canJump;
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
          <label className={cs.text.label}>Run MP</label>
          <div className="bg-surface-raised border-border-theme text-text-theme-primary rounded border px-3 py-2 text-sm">
            {controls.runMP}
          </div>
        </div>
        <div>
          <label className={cs.text.label}>
            Jump MP{' '}
            {controls.isUltraheavy ? (
              <span className="text-red-400">(Ultraheavy: 0)</span>
            ) : controls.isGliderChassis ? (
              <span className={cs.text.secondary}>(Glider: 0)</span>
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
            disabled={readOnly || noJump}
            min={0}
            max={noJump ? 0 : controls.mpCaps.jumpMax}
            className={cs.input.full}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className={cs.text.secondary}>
          Effective Walk:{' '}
          <span className="text-text-theme-primary">
            {controls.effectiveWalk}
          </span>
        </span>
        {controls.hasPartialWing && (
          <span className={cs.text.secondary}>
            Effective Jump:{' '}
            <span className="text-text-theme-primary">
              {controls.effectiveJump}
            </span>
            <span className="ml-1 text-blue-400">
              (+{controls.effectiveJump - controls.jumpMP} Partial Wing)
            </span>
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
          <span className="text-text-theme-primary text-sm">
            Myomer Booster{' '}
            <span className={cs.text.secondary}>(Light / Medium only)</span>
          </span>
        </label>
      </div>
    </div>
  );
}
