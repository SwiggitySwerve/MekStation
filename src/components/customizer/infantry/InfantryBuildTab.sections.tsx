import React from 'react';

import { TechBase } from '@/types/enums/TechBase';

import { customizerStyles as cs } from '../styles';
import {
  MOTIVE_OPTIONS,
  type useInfantryIdentityControls,
  type useInfantryPlatoonControls,
  type useInfantryWeaponControls,
} from './InfantryBuildTab.logic';

type IdentityControls = ReturnType<typeof useInfantryIdentityControls>;
type PlatoonControls = ReturnType<typeof useInfantryPlatoonControls>;
type WeaponControls = ReturnType<typeof useInfantryWeaponControls>;

interface ReadOnlyProps {
  readOnly: boolean;
}

export function InfantryIdentitySection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: IdentityControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Identity</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={cs.text.label}>Unit Name</label>
          <input
            type="text"
            value={controls.chassis}
            onChange={controls.handleChassisChange}
            disabled={readOnly}
            className={cs.input.full}
          />
        </div>
        <div>
          <label className={cs.text.label}>Variant</label>
          <input
            type="text"
            value={controls.model}
            onChange={controls.handleModelChange}
            disabled={readOnly}
            className={cs.input.full}
          />
        </div>
        <div>
          <label className={cs.text.label}>Tech Base</label>
          <select
            value={controls.techBase}
            onChange={controls.handleTechBaseChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            <option value={TechBase.INNER_SPHERE}>Inner Sphere</option>
            <option value={TechBase.CLAN}>Clan</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function InfantryPlatoonConfigurationSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: PlatoonControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Platoon Configuration</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className={cs.text.label}>Motive Type</label>
          <select
            value={controls.infantryMotive}
            onChange={controls.handleMotiveChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            {MOTIVE_OPTIONS.map((motive) => (
              <option key={motive} value={motive}>
                {motive}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={cs.text.label}>Squads</label>
          <input
            type="number"
            value={controls.platoonComposition.squads}
            onChange={controls.handleSquadsChange}
            disabled={readOnly}
            min={1}
            max={10}
            className={cs.input.full}
          />
        </div>
        <div>
          <label className={cs.text.label}>Troopers / Squad</label>
          <input
            type="number"
            value={controls.platoonComposition.troopersPerSquad}
            onChange={controls.handleTroopersPerSquadChange}
            disabled={readOnly}
            min={1}
            max={10}
            className={cs.input.full}
          />
        </div>
        <div>
          <label className={cs.text.label}>Platoon Strength</label>
          <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
            {controls.platoonStrength} soldiers
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={cs.text.label}>Ground MP</label>
          <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
            {controls.groundMP}
          </div>
        </div>
        <div>
          <label className={cs.text.label}>Jump MP</label>
          <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
            {controls.jumpMP}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InfantryWeaponsSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: WeaponControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Weapons</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={cs.text.label}>Primary Weapon</label>
          <select
            value={controls.primaryWeaponId ?? ''}
            onChange={controls.handlePrimaryWeaponChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            <option value="">Select primary weapon...</option>
            {controls.primaryWeaponOptions.map((weapon) => (
              <option key={weapon.id} value={weapon.id}>
                {weapon.name}
                {weapon.isHeavy ? ' (Heavy)' : ''}
              </option>
            ))}
          </select>
          {controls.primaryWeapon && (
            <p className="mt-1 text-xs text-gray-400">
              Selected: {controls.primaryWeapon}
            </p>
          )}
        </div>
        <div>
          <label className={cs.text.label}>Secondary Weapon (optional)</label>
          <select
            value={controls.secondaryWeaponId ?? ''}
            onChange={controls.handleSecondaryWeaponChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            <option value="">None</option>
            {controls.secondaryWeaponOptions.map((weapon) => (
              <option key={weapon.id} value={weapon.id}>
                {weapon.name}
                {weapon.isHeavy ? ' (Heavy)' : ''}
              </option>
            ))}
          </select>
          {controls.secondaryWeapon && (
            <p className="mt-1 text-xs text-gray-400">
              {controls.secondaryWeaponCount} troopers carry{' '}
              {controls.secondaryWeapon}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
