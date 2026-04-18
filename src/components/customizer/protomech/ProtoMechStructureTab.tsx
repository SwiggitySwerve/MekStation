/**
 * ProtoMech Structure Tab Component
 *
 * Exposes all construction fields: chassis type (radio), tonnage, weight class,
 * walk MP, jump MP, myomer booster, gliding wings, main gun weapon picker,
 * and per-location armor allocation.
 *
 * @spec openspec/changes/add-protomech-construction/tasks.md §10.2
 */

import React, { useCallback } from "react";

import { useProtoMechStore } from "@/stores/useProtoMechStore";
import { ProtoMechLocation } from "@/types/construction/UnitLocation";
import {
  ProtoChassis,
  PROTO_MAIN_GUN_APPROVED_WEAPON_IDS,
} from "@/types/unit/ProtoMechInterfaces";
import {
  effectiveJumpMP,
  effectiveWalkMP,
  getProtoWeightClass,
  getProtoMPCaps,
} from "@/utils/construction/protomech";

import { customizerStyles as cs } from "../styles";
import { ProtoMechArmorDiagram } from "./ProtoMechArmorDiagram";

// =============================================================================
// Constants
// =============================================================================

/** Standard (non-Ultraheavy) tonnage options */
const STANDARD_TONNAGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9];
/** Ultraheavy tonnage options */
const ULTRAHEAVY_TONNAGE_OPTIONS = [10, 11, 12, 13, 14, 15];

/** Human-readable chassis labels */
const CHASSIS_LABELS: Record<ProtoChassis, string> = {
  [ProtoChassis.BIPED]: "Biped",
  [ProtoChassis.QUAD]: "Quad",
  [ProtoChassis.GLIDER]: "Glider (Light only)",
  [ProtoChassis.ULTRAHEAVY]: "Ultraheavy (10–15 t)",
};

/** Armor location display labels */
const LOCATION_LABELS: Record<string, string> = {
  [ProtoMechLocation.HEAD]: "Head",
  [ProtoMechLocation.TORSO]: "Torso",
  [ProtoMechLocation.LEFT_ARM]: "Left Arm",
  [ProtoMechLocation.RIGHT_ARM]: "Right Arm",
  [ProtoMechLocation.LEGS]: "Legs",
  [ProtoMechLocation.MAIN_GUN]: "Main Gun",
};

/**
 * Approved main gun weapon options presented in the picker.
 * Order: lightest/most common first.
 */
const MAIN_GUN_WEAPON_OPTIONS = [
  { id: "clan-lrm-5", label: "LRM-5" },
  { id: "clan-lrm-10", label: "LRM-10" },
  { id: "clan-ac-2", label: "AC/2" },
  { id: "clan-ac-5", label: "AC/5" },
  { id: "clan-medium-pulse-laser", label: "Medium Pulse Laser" },
  { id: "clan-er-medium-laser", label: "ER Medium Laser" },
  { id: "clan-ppc", label: "PPC" },
  { id: "clan-er-ppc", label: "ER PPC" },
  { id: "clan-gauss-rifle", label: "Gauss Rifle" },
] as const;

// =============================================================================
// Types
// =============================================================================

interface ProtoMechStructureTabProps {
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Structure tab for the ProtoMech customizer.
 *
 * Displays and edits all construction-relevant fields:
 * - Identity (chassis name, variant)
 * - Chassis type (radio: Biped / Quad / Glider / Ultraheavy)
 * - Tonnage (weight class is derived and displayed read-only)
 * - Movement (walk MP, jump MP, myomer booster, gliding wings)
 * - Main gun mount and weapon selection
 * - Per-location armor allocation
 */
export function ProtoMechStructureTab({
  readOnly = false,
}: ProtoMechStructureTabProps): React.ReactElement {
  // ---- State ----
  const chassis = useProtoMechStore((s) => s.chassis);
  const model = useProtoMechStore((s) => s.model);
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const walkMP = useProtoMechStore((s) => s.walkMP);
  const jumpMP = useProtoMechStore((s) => s.jumpMP);
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const mainGunWeaponId = useProtoMechStore((s) => s.mainGunWeaponId);
  const hasMyomerBooster = useProtoMechStore((s) => s.hasMyomerBooster);
  const glidingWings = useProtoMechStore((s) => s.glidingWings);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);
  const structureByLocation = useProtoMechStore((s) => s.structureByLocation);

  // ---- Actions ----
  const setChassis = useProtoMechStore((s) => s.setChassis);
  const setModel = useProtoMechStore((s) => s.setModel);
  const setTonnage = useProtoMechStore((s) => s.setTonnage);
  const setChassisType = useProtoMechStore((s) => s.setChassisType);
  const setWalkMP = useProtoMechStore((s) => s.setWalkMP);
  const setJumpMP = useProtoMechStore((s) => s.setJumpMP);
  const setMainGun = useProtoMechStore((s) => s.setMainGun);
  const setMainGunWeaponId = useProtoMechStore((s) => s.setMainGunWeaponId);
  const setMyomerBooster = useProtoMechStore((s) => s.setMyomerBooster);
  const setGlidingWings = useProtoMechStore((s) => s.setGlidingWings);
  const setLocationArmor = useProtoMechStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useProtoMechStore((s) => s.autoAllocateArmor);
  const clearAllArmor = useProtoMechStore((s) => s.clearAllArmor);

  // ---- Derived display values ----
  const weightClass = getProtoWeightClass(tonnage);
  const mpCaps = getProtoMPCaps(weightClass);
  const effWalk = effectiveWalkMP(walkMP, hasMyomerBooster);
  const runMP = effWalk + 1;
  const effJump = effectiveJumpMP(jumpMP, chassisType);

  const isUltraheavy = chassisType === ProtoChassis.ULTRAHEAVY;
  const isGliderChassis = chassisType === ProtoChassis.GLIDER;

  // Choose tonnage option list based on chassis
  const tonnageOptions = isUltraheavy
    ? ULTRAHEAVY_TONNAGE_OPTIONS
    : STANDARD_TONNAGE_OPTIONS;

  // Armor locations (exclude main gun location when mount is not equipped)
  const armorLocations = hasMainGun
    ? Object.values(ProtoMechLocation)
    : Object.values(ProtoMechLocation).filter(
        (l) => l !== ProtoMechLocation.MAIN_GUN,
      );

  const totalArmor = Object.values(armorByLocation).reduce(
    (sum, v) => sum + (v || 0),
    0,
  );

  // ---- Handlers ----
  const handleChassisNameChange = useCallback(
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

  const handleChassisTypeChange = useCallback(
    (newChassis: ProtoChassis) => {
      if (!readOnly) setChassisType(newChassis);
    },
    [setChassisType, readOnly],
  );

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={cs.text.label}>Chassis Name</label>
            <input
              type="text"
              value={chassis}
              onChange={handleChassisNameChange}
              disabled={readOnly}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>Model / Variant</label>
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

      {/* Chassis Type */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Chassis Type</h3>
        <div className="flex flex-wrap gap-4">
          {Object.values(ProtoChassis).map((ct) => (
            <label key={ct} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="chassisType"
                value={ct}
                checked={chassisType === ct}
                onChange={() => handleChassisTypeChange(ct)}
                disabled={readOnly}
                className="accent-accent"
              />
              <span className="text-sm text-white">{CHASSIS_LABELS[ct]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tonnage & Weight Class */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Tonnage &amp; Weight Class</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={cs.text.label}>Tonnage</label>
            <select
              value={tonnage}
              onChange={(e) => !readOnly && setTonnage(Number(e.target.value))}
              disabled={readOnly}
              className={cs.select.full}
            >
              {tonnageOptions.map((t) => (
                <option key={t} value={t}>
                  {t} tons
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={cs.text.label}>Weight Class</label>
            {/* Derived read-only display */}
            <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm font-semibold text-accent">
              {weightClass}
            </div>
          </div>
        </div>
      </div>

      {/* Movement */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Movement</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={cs.text.label}>
              Walk MP{" "}
              <span className={cs.text.secondary}>(cap: {mpCaps.walkMax})</span>
            </label>
            <input
              type="number"
              value={walkMP}
              onChange={(e) => !readOnly && setWalkMP(Number(e.target.value))}
              disabled={readOnly}
              min={1}
              max={mpCaps.walkMax}
              className={cs.input.full}
            />
          </div>
          <div>
            <label className={cs.text.label}>
              Run MP <span className={cs.text.secondary}>(walk + 1)</span>
            </label>
            <div className="bg-surface-raised border-border-theme rounded border px-3 py-2 text-sm text-white">
              {runMP}
            </div>
          </div>
          <div>
            <label className={cs.text.label}>
              Jump MP{" "}
              {isUltraheavy ? (
                <span className="text-red-400">(Ultraheavy: 0)</span>
              ) : (
                <span className={cs.text.secondary}>
                  (cap: {mpCaps.jumpMax})
                </span>
              )}
            </label>
            <input
              type="number"
              value={jumpMP}
              onChange={(e) => !readOnly && setJumpMP(Number(e.target.value))}
              disabled={readOnly || isUltraheavy}
              min={0}
              max={isUltraheavy ? 0 : mpCaps.jumpMax}
              className={cs.input.full}
            />
          </div>
        </div>

        {/* Derived MP summary row */}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className={cs.text.secondary}>
            Effective Walk: <span className="text-white">{effWalk}</span>
            {hasMyomerBooster && (
              <span className="ml-1 text-green-400">(+1 booster)</span>
            )}
          </span>
          {isGliderChassis && (
            <span className={cs.text.secondary}>
              Effective Jump: <span className="text-white">{effJump}</span>
              <span className="ml-1 text-blue-400">(+2 glider wings)</span>
            </span>
          )}
        </div>

        {/* Myomer Booster */}
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={hasMyomerBooster}
              onChange={(e) => !readOnly && setMyomerBooster(e.target.checked)}
              disabled={readOnly}
              className="border-border-theme bg-surface-raised rounded"
            />
            <span className="text-sm text-white">
              Myomer Booster{" "}
              <span className={cs.text.secondary}>
                (Light / Medium only; +1 walk)
              </span>
            </span>
          </label>

          {/* Gliding Wings — only shown for Glider chassis */}
          {isGliderChassis && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={glidingWings}
                onChange={(e) => !readOnly && setGlidingWings(e.target.checked)}
                disabled={readOnly}
                className="border-border-theme bg-surface-raised rounded"
              />
              <span className="text-sm text-white">
                Gliding Wings{" "}
                <span className={cs.text.secondary}>(+2 jump MP)</span>
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Main Gun */}
      <div className={cs.panel.main}>
        <h3 className={cs.text.sectionTitle}>Main Gun</h3>
        <label className="mb-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasMainGun}
            onChange={(e) => !readOnly && setMainGun(e.target.checked)}
            disabled={readOnly}
            className="border-border-theme bg-surface-raised rounded"
          />
          <span className="text-sm text-white">Main Gun Mount</span>
        </label>

        {hasMainGun && (
          <div>
            <label className={cs.text.label}>Weapon</label>
            <select
              value={mainGunWeaponId ?? ""}
              onChange={(e) => {
                if (!readOnly) {
                  const val = e.target.value;
                  setMainGunWeaponId(val === "" ? null : val);
                }
              }}
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
            {mainGunWeaponId &&
              !PROTO_MAIN_GUN_APPROVED_WEAPON_IDS.has(mainGunWeaponId) && (
                <p className="mt-1 text-xs text-red-400">
                  This weapon is not in the approved main-gun list
                  (VAL-PROTO-MAIN-GUN).
                </p>
              )}
          </div>
        )}
      </div>

      {/* Armor Allocation */}
      <div className={cs.panel.main}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className={cs.text.sectionTitle.replace("mb-4", "mb-0")}>
            Armor Allocation
          </h3>
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {armorLocations.map((location) => (
            <div key={location}>
              <label className={cs.text.label}>
                {LOCATION_LABELS[location]}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={armorByLocation[location] ?? 0}
                  onChange={(e) =>
                    !readOnly &&
                    setLocationArmor(location, Number(e.target.value))
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

      {/* Compact armor diagram */}
      <div className="flex justify-center">
        <ProtoMechArmorDiagram />
      </div>
    </div>
  );
}

export default ProtoMechStructureTab;
