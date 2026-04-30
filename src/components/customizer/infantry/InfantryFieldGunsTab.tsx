/**
 * Infantry Field Guns Tab
 *
 * Focused editor for the optional field-gun construction state.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import React, { useCallback, useMemo } from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';
import {
  FIELD_GUN_CATALOG,
  buildFieldGun,
} from '@/utils/construction/infantry/fieldGuns';
import { FIELD_GUN_ALLOWED_MOTIVES } from '@/utils/construction/infantry/platoonComposition';

import { customizerStyles as cs } from '../styles';

export interface InfantryFieldGunsTabProps {
  readOnly?: boolean;
  className?: string;
}

export function InfantryFieldGunsTab({
  readOnly = false,
  className = '',
}: InfantryFieldGunsTabProps): React.ReactElement {
  const infantryMotive = useInfantryStore((s) => s.infantryMotive);
  const fieldGuns = useInfantryStore((s) => s.fieldGuns);
  const addFieldGun = useInfantryStore((s) => s.addFieldGun);
  const removeFieldGun = useInfantryStore((s) => s.removeFieldGun);
  const setFieldGunAmmo = useInfantryStore((s) => s.setFieldGunAmmo);

  const canUseFieldGuns = FIELD_GUN_ALLOWED_MOTIVES.has(infantryMotive);
  const addedFieldGunIds = useMemo(
    () => new Set(fieldGuns.map((gun) => gun.equipmentId)),
    [fieldGuns],
  );

  const handleAddFieldGun = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (readOnly || !canUseFieldGuns || !event.target.value) return;
      const entry = FIELD_GUN_CATALOG.find(
        (gun) => gun.id === event.target.value,
      );
      if (!entry || addedFieldGunIds.has(entry.id)) return;
      addFieldGun(buildFieldGun(entry));
      event.target.value = '';
    },
    [addFieldGun, addedFieldGunIds, canUseFieldGuns, readOnly],
  );

  const handleAmmoChange = useCallback(
    (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
      if (readOnly) return;
      setFieldGunAmmo(index, Number(event.target.value));
    },
    [readOnly, setFieldGunAmmo],
  );

  return (
    <div
      className={`space-y-4 ${className}`}
      data-testid="infantry-field-guns-tab"
    >
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Field Guns</h3>

        {!canUseFieldGuns && (
          <p className="mb-4 text-xs text-amber-400">
            Field guns require Foot or Motorized motive.
          </p>
        )}

        {fieldGuns.length > 0 ? (
          <div className="space-y-2">
            {fieldGuns.map((gun, index) => (
              <div
                key={gun.equipmentId}
                className="bg-surface-raised border-border-theme flex flex-wrap items-center gap-3 rounded border px-3 py-2"
              >
                <div className="min-w-48 flex-1">
                  <div className="text-sm font-medium text-white">
                    {gun.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Crew {gun.crewCount}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-400">
                  Ammo
                  <input
                    type="number"
                    value={gun.ammoRounds}
                    min={0}
                    disabled={readOnly}
                    onChange={(event) => handleAmmoChange(index, event)}
                    className="bg-surface-base border-border-theme w-20 rounded border px-2 py-1 text-sm text-white"
                  />
                </label>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeFieldGun(gun.equipmentId)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No field guns assigned.</p>
        )}

        {!readOnly && (
          <div className="mt-4">
            <label className={cs.text.label}>Add Field Gun</label>
            <select
              className={cs.select.full}
              defaultValue=""
              disabled={!canUseFieldGuns}
              onChange={handleAddFieldGun}
            >
              <option value="">Select field gun to add...</option>
              {FIELD_GUN_CATALOG.map((gun) => (
                <option
                  key={gun.id}
                  value={gun.id}
                  disabled={addedFieldGunIds.has(gun.id)}
                >
                  {gun.name} (crew {gun.crewRequired}, ammo{' '}
                  {gun.defaultAmmoRounds})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default InfantryFieldGunsTab;
