/**
 * Infantry Build Tab Component
 *
 * Configuration of infantry platoon settings, weapons, armor, and field guns.
 * Binds to InfantryMotive, IPlatoonComposition, weapon table, and field gun catalog.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import React, { useCallback, useMemo } from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';
import { TechBase } from '@/types/enums/TechBase';
import {
  InfantryMotive,
  SNEAK_ELIGIBLE_MOTIVES,
} from '@/types/unit/InfantryInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import {
  FIELD_GUN_CATALOG,
  buildFieldGun,
} from '@/utils/construction/infantry/fieldGuns';
import {
  FIELD_GUN_ALLOWED_MOTIVES,
  HEAVY_WEAPON_MOTIVES,
  totalTroopers,
} from '@/utils/construction/infantry/platoonComposition';
import {
  INFANTRY_WEAPON_TABLE,
  getPrimaryWeaponOptions,
} from '@/utils/construction/infantry/weaponTable';

import { customizerStyles as cs } from '../styles';
import { InfantryFieldGunsSection } from './InfantryFieldGunsSection';
import { InfantryPlatoonCounter } from './InfantryPlatoonCounter';
import { InfantryProtectionSection } from './InfantryProtectionSection';
import { InfantryStatusBar } from './InfantryStatusBar';

// =============================================================================
// Constants
// =============================================================================

/** All infantry motive options from the enum */
const MOTIVE_OPTIONS = Object.values(InfantryMotive);

/**
 * Armor kit variants that constitute sneak suits — must be gated on Foot motive.
 * Matched against InfantryArmorKit enum display labels.
 */
const SNEAK_KIT_VALUES = new Set<string>([
  InfantryArmorKit.SNEAK_CAMO,
  InfantryArmorKit.SNEAK_IR,
  InfantryArmorKit.SNEAK_ECM,
  InfantryArmorKit.SNEAK_CAMO_IR,
  InfantryArmorKit.SNEAK_IR_ECM,
  InfantryArmorKit.SNEAK_COMPLETE,
]);

const ALL_ARMOR_KIT_OPTIONS = Object.values(InfantryArmorKit);
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
  // --------------------------------------------------------------------------
  // Identity state
  // --------------------------------------------------------------------------
  const chassis = useInfantryStore((s) => s.chassis);
  const model = useInfantryStore((s) => s.model);
  const techBase = useInfantryStore((s) => s.techBase);

  // --------------------------------------------------------------------------
  // Motive + composition state
  // --------------------------------------------------------------------------
  const infantryMotive = useInfantryStore((s) => s.infantryMotive);
  const platoonComposition = useInfantryStore((s) => s.platoonComposition);
  const groundMP = useInfantryStore((s) => s.groundMP);
  const jumpMP = useInfantryStore((s) => s.jumpMP);

  // --------------------------------------------------------------------------
  // Weapon state
  // --------------------------------------------------------------------------
  const primaryWeapon = useInfantryStore((s) => s.primaryWeapon);
  const primaryWeaponId = useInfantryStore((s) => s.primaryWeaponId);
  const secondaryWeapon = useInfantryStore((s) => s.secondaryWeapon);
  const secondaryWeaponId = useInfantryStore((s) => s.secondaryWeaponId);
  const secondaryWeaponCount = useInfantryStore((s) => s.secondaryWeaponCount);

  // --------------------------------------------------------------------------
  // Protection state
  // --------------------------------------------------------------------------
  const armorKit = useInfantryStore((s) => s.armorKit);

  // --------------------------------------------------------------------------
  // Specialization state
  // --------------------------------------------------------------------------
  const specialization = useInfantryStore((s) => s.specialization);
  const hasAntiMechTraining = useInfantryStore((s) => s.hasAntiMechTraining);

  // --------------------------------------------------------------------------
  // Field gun state
  // --------------------------------------------------------------------------
  const fieldGuns = useInfantryStore((s) => s.fieldGuns);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const setChassis = useInfantryStore((s) => s.setChassis);
  const setModel = useInfantryStore((s) => s.setModel);
  const setTechBase = useInfantryStore((s) => s.setTechBase);
  const setInfantryMotive = useInfantryStore((s) => s.setInfantryMotive);
  const setPlatoonComposition = useInfantryStore(
    (s) => s.setPlatoonComposition,
  );
  const setPrimaryWeapon = useInfantryStore((s) => s.setPrimaryWeapon);
  const setSecondaryWeapon = useInfantryStore((s) => s.setSecondaryWeapon);
  const setSecondaryWeaponCount = useInfantryStore(
    (s) => s.setSecondaryWeaponCount,
  );
  const setArmorKit = useInfantryStore((s) => s.setArmorKit);
  const setSpecialization = useInfantryStore((s) => s.setSpecialization);
  const setAntiMechTraining = useInfantryStore((s) => s.setAntiMechTraining);
  const addFieldGun = useInfantryStore((s) => s.addFieldGun);
  const removeFieldGun = useInfantryStore((s) => s.removeFieldGun);
  const setFieldGunAmmo = useInfantryStore((s) => s.setFieldGunAmmo);

  // --------------------------------------------------------------------------
  // Derived / computed values
  // --------------------------------------------------------------------------

  /** Total trooper count from the canonical composition */
  const platoonStrength = useMemo(
    () => totalTroopers(platoonComposition),
    [platoonComposition],
  );

  /** Whether the current motive allows heavy primary weapons */
  const allowHeavyPrimary = HEAVY_WEAPON_MOTIVES.has(infantryMotive);

  /** Primary weapon list filtered by heavy-weapon eligibility */
  const primaryWeaponOptions = useMemo(
    () => getPrimaryWeaponOptions(allowHeavyPrimary),
    [allowHeavyPrimary],
  );

  /** Armor kit options — sneak suits hidden unless motive is Foot */
  const armorKitOptions = useMemo(() => {
    const isSneakEligible = SNEAK_ELIGIBLE_MOTIVES.has(infantryMotive);
    return ALL_ARMOR_KIT_OPTIONS.filter(
      (kit) => isSneakEligible || !SNEAK_KIT_VALUES.has(kit),
    );
  }, [infantryMotive]);

  /** Equipment IDs of field guns already added (to prevent duplicates) */
  const addedFieldGunIds = useMemo(
    () => new Set(fieldGuns.map((g) => g.equipmentId)),
    [fieldGuns],
  );
  const canUseFieldGuns = FIELD_GUN_ALLOWED_MOTIVES.has(infantryMotive);

  // --------------------------------------------------------------------------
  // Handlers — identity
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Handlers — motive + composition
  // --------------------------------------------------------------------------

  const handleMotiveChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) setInfantryMotive(e.target.value as InfantryMotive);
    },
    [setInfantryMotive, readOnly],
  );

  const handleSquadsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        const squads = Math.max(1, Math.min(10, Number(e.target.value)));
        setPlatoonComposition({
          squads,
          troopersPerSquad: platoonComposition.troopersPerSquad,
        });
      }
    },
    [setPlatoonComposition, platoonComposition, readOnly],
  );

  const handleTroopersPerSquadChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        const troopersPerSquad = Math.max(
          1,
          Math.min(10, Number(e.target.value)),
        );
        setPlatoonComposition({
          squads: platoonComposition.squads,
          troopersPerSquad,
        });
      }
    },
    [setPlatoonComposition, platoonComposition, readOnly],
  );

  // --------------------------------------------------------------------------
  // Handlers — weapons
  // --------------------------------------------------------------------------

  const handlePrimaryWeaponChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        const selectedId = e.target.value;
        const entry = INFANTRY_WEAPON_TABLE.find((w) => w.id === selectedId);
        if (entry) {
          setPrimaryWeapon(entry.name, entry.id);
        }
      }
    },
    [setPrimaryWeapon, readOnly],
  );

  const handleSecondaryWeaponChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        const selectedId = e.target.value;
        if (!selectedId) {
          setSecondaryWeapon(undefined, undefined);
          setSecondaryWeaponCount(0);
          return;
        }
        const entry = INFANTRY_WEAPON_TABLE.find((w) => w.id === selectedId);
        if (entry) {
          setSecondaryWeapon(entry.name, entry.id);
          // Auto-derive secondary count from the ratio in the weapon table
          const count =
            entry.secondaryRatio > 0
              ? Math.floor(platoonStrength / entry.secondaryRatio)
              : 0;
          setSecondaryWeaponCount(count);
        }
      }
    },
    [setSecondaryWeapon, setSecondaryWeaponCount, platoonStrength, readOnly],
  );

  // --------------------------------------------------------------------------
  // Handlers — field guns
  // --------------------------------------------------------------------------

  const handleAddFieldGun = useCallback(
    (gunId: string) => {
      if (readOnly || !canUseFieldGuns) return;
      const entry = FIELD_GUN_CATALOG.find((g) => g.id === gunId);
      if (!entry || addedFieldGunIds.has(gunId)) return;
      addFieldGun(buildFieldGun(entry));
    },
    [addFieldGun, addedFieldGunIds, canUseFieldGuns, readOnly],
  );

  const handleRemoveFieldGun = useCallback(
    (equipmentId: string) => {
      if (!readOnly) removeFieldGun(equipmentId);
    },
    [removeFieldGun, readOnly],
  );

  const handleFieldGunAmmo = useCallback(
    (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) setFieldGunAmmo(idx, Number(e.target.value));
    },
    [setFieldGunAmmo, readOnly],
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Identity Section */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

      {/* Platoon Configuration — motive drives defaults; squads/troopers are overridable */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Platoon Configuration</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className={cs.text.label}>Motive Type</label>
            <select
              value={infantryMotive}
              onChange={handleMotiveChange}
              disabled={readOnly}
              className={cs.select.full}
            >
              {MOTIVE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={cs.text.label}>Squads</label>
            <input
              type="number"
              value={platoonComposition.squads}
              onChange={handleSquadsChange}
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
              value={platoonComposition.troopersPerSquad}
              onChange={handleTroopersPerSquadChange}
              disabled={readOnly}
              min={1}
              max={10}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Platoon Strength</label>
            {/* Read-only derived value — squads × troopers/squad */}
            <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
              {platoonStrength} soldiers
            </div>
          </div>
        </div>

        {/* MP display — derived from motive, shown read-only for awareness */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={cs.text.label}>Ground MP</label>
            <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
              {groundMP}
            </div>
          </div>
          <div>
            <label className={cs.text.label}>Jump MP</label>
            <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
              {jumpMP}
            </div>
          </div>
        </div>
      </div>

      {/* Weapons */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Weapons</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={cs.text.label}>Primary Weapon</label>
            {/* Dropdown from weapon table; heavy weapons hidden unless motive allows */}
            <select
              value={primaryWeaponId ?? ''}
              onChange={handlePrimaryWeaponChange}
              disabled={readOnly}
              className={cs.select.full}
            >
              <option value="">Select primary weapon...</option>
              {primaryWeaponOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.isHeavy ? ' (Heavy)' : ''}
                </option>
              ))}
            </select>
            {primaryWeapon && (
              <p className="mt-1 text-xs text-gray-400">
                Selected: {primaryWeapon}
              </p>
            )}
          </div>
          <div>
            <label className={cs.text.label}>Secondary Weapon (optional)</label>
            <select
              value={secondaryWeaponId ?? ''}
              onChange={handleSecondaryWeaponChange}
              disabled={readOnly}
              className={cs.select.full}
            >
              <option value="">None</option>
              {INFANTRY_WEAPON_TABLE.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.isHeavy ? ' (Heavy)' : ''}
                </option>
              ))}
            </select>
            {secondaryWeapon && (
              <p className="mt-1 text-xs text-gray-400">
                {secondaryWeaponCount} troopers carry {secondaryWeapon}
              </p>
            )}
          </div>
        </div>
      </div>

      <InfantryProtectionSection
        readOnly={readOnly}
        armorKit={armorKit}
        armorKitOptions={armorKitOptions}
        specialization={specialization}
        specializationOptions={SPECIALIZATION_OPTIONS}
        hasAntiMechTraining={hasAntiMechTraining}
        showSneakSuitError={
          SNEAK_KIT_VALUES.has(armorKit) &&
          !SNEAK_ELIGIBLE_MOTIVES.has(infantryMotive)
        }
        setArmorKit={setArmorKit}
        setSpecialization={setSpecialization}
        setAntiMechTraining={setAntiMechTraining}
      />

      <InfantryFieldGunsSection
        readOnly={readOnly}
        canUseFieldGuns={canUseFieldGuns}
        fieldGuns={fieldGuns}
        addedFieldGunIds={addedFieldGunIds}
        catalog={FIELD_GUN_CATALOG}
        onAddFieldGun={handleAddFieldGun}
        onRemoveFieldGun={handleRemoveFieldGun}
        onFieldGunAmmo={handleFieldGunAmmo}
      />

      <InfantryStatusBar
        platoonStrength={platoonStrength}
        groundMP={groundMP}
        jumpMP={jumpMP}
        fieldGuns={fieldGuns}
        armorKit={armorKit}
      />
      <InfantryPlatoonCounter />
    </div>
  );
}

export default InfantryBuildTab;
