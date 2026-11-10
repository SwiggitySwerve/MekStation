import { useCallback, useMemo, useState, type ChangeEvent } from 'react';

import type { IProtoMechArmorAllocation } from '@/stores/protoMechState';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  computeProtoArmorLimits,
  effectiveJumpMP,
  getProtoArmorErrors,
  getProtoWeightClass,
  hasProtoPartialWing,
  protoChassisCanJump,
  protoJumpLimit,
  protoMaxWalkMP,
  protoMinWalkMP,
  protoTonnageChangeError,
  protoMaxJumpMP,
  findProtoJumpJetType,
  PROTO_JUMP_JET_TYPE,
  PROTO_MAX_TONNAGE,
  PROTO_MIN_TONNAGE,
  type ProtoEditableJumpJetType,
  type ProtoJumpJetType,
} from '@/utils/construction/protomech';
import {
  PROTO_ARMOR_TYPES,
  getProtoArmorDefinition,
} from '@/utils/construction/protomech/armorType';
import { getProtoArmorSlotErrors } from '@/utils/construction/protomech/mainGun';
import { computeProtoArmorWeight } from '@/utils/construction/protomech/weight';

/** One tonnage list, 2–15 t, for every motive (PMChassisView.java:79). */
export const TONNAGE_OPTIONS: readonly number[] = Array.from(
  { length: PROTO_MAX_TONNAGE - PROTO_MIN_TONNAGE + 1 },
  (_, index) => PROTO_MIN_TONNAGE + index,
);

/** The motives MML offers (PMChassisView.java:75-77,135-139); ultraheavy is a mass. */
export const CHASSIS_LABELS: Partial<Record<ProtoChassis, string>> = {
  [ProtoChassis.BIPED]: 'Biped',
  [ProtoChassis.QUAD]: 'Quad',
  [ProtoChassis.GLIDER]: 'Glider',
};

const CHASSIS_OPTIONS: readonly ProtoChassis[] = [
  ProtoChassis.BIPED,
  ProtoChassis.QUAD,
  ProtoChassis.GLIDER,
];

export const LOCATION_LABELS: Record<ProtoMechLocation, string> = {
  [ProtoMechLocation.HEAD]: 'Head',
  [ProtoMechLocation.TORSO]: 'Torso',
  [ProtoMechLocation.LEFT_ARM]: 'Left Arm',
  [ProtoMechLocation.RIGHT_ARM]: 'Right Arm',
  [ProtoMechLocation.LEGS]: 'Legs',
  [ProtoMechLocation.MAIN_GUN]: 'Main Gun',
};

/** Tech filtering is deferred by O3; show both pinned ProtoMech armor types. */
export const PROTO_ARMOR_TYPE_OPTIONS = PROTO_ARMOR_TYPES.map((armor) => ({
  value: armor.code,
  label: armor.label,
}));

export interface ProtoMechIdentityControls {
  chassis: string;
  model: string;
  handleChassisNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleModelChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface ProtoMechChassisControls {
  chassisType: ProtoChassis;
  chassisOptions: readonly ProtoChassis[];
  handleChassisTypeChange: (newChassis: ProtoChassis) => void;
}

export interface ProtoMechTonnageControls {
  tonnage: number;
  weightClass: ReturnType<typeof getProtoWeightClass>;
  tonnageOptions: readonly number[];
  /** Why the last tonnage edit was refused (PMStructureTab.java:446-456), if it was. */
  tonnageError: string | undefined;
  handleTonnageChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export interface ProtoMechMovementControls {
  walkMP: number;
  jumpMP: number;
  runMP: number;
  /** The motive's minimum walk (MovementView.java:267,270,272). */
  walkMin: number;
  /** The engine bound: the fastest walk whose rating is a valid engine. */
  walkMax: number;
  /** TestProtoMek.maxJumpMP, or 0 for a glider. */
  jumpMax: number;
  effectiveWalk: number;
  /** Stored jump plus the Partial Wing bonus; shown when a wing is mounted. */
  effectiveJump: number;
  hasPartialWing: boolean;
  /** False for a Glider only (protoChassisCanJump). */
  canJump: boolean;
  /** The Jump Type combo: the mounted type, else the last choice (MovementView.java:216-222). */
  jumpJetType: ProtoJumpJetType;
  /** Why the jump type is not editable (a loaded UMU unit), if it is not. */
  jumpJetLockReason: string | undefined;
  handleJumpJetTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  isGliderChassis: boolean;
  hasMyomerBooster: boolean;
  handleWalkMPChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleJumpMPChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleMyomerBoosterChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface ProtoMechArmorControls {
  armorByLocation: IProtoMechArmorAllocation;
  structureByLocation: IProtoMechArmorAllocation;
  armorLocations: readonly ProtoMechLocation[];
  totalArmor: number;
  /** Maximum armor points per location (TestProtoMek.maxArmorFactor). */
  locationLimits: Readonly<Record<ProtoMechLocation, number>>;
  /** Maximum total armor points (TestProtoMek.maxArmorFactor by weight). */
  totalLimit: number;
  /** Construction diagnostics; never repaired or clamped. */
  errors: readonly string[];
  armorType: number;
  armorWeight: number | null;
  handleArmorTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  handleAutoAllocateArmor: () => void;
  handleClearAllArmor: () => void;
  handleLocationArmorChange: (
    location: ProtoMechLocation,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}

function getArmorLocations(hasMainGun: boolean): ProtoMechLocation[] {
  const locations = Object.values(ProtoMechLocation) as ProtoMechLocation[];
  if (hasMainGun) {
    return locations;
  }

  return locations.filter(
    (location) => location !== ProtoMechLocation.MAIN_GUN,
  );
}

function getTotalArmor(armorByLocation: Record<string, number>): number {
  return Object.values(armorByLocation).reduce(
    (sum, value) => sum + (value || 0),
    0,
  );
}

export function useProtoMechIdentityControls(
  readOnly: boolean,
): ProtoMechIdentityControls {
  const chassis = useProtoMechStore((s) => s.chassis);
  const model = useProtoMechStore((s) => s.model);
  const setChassis = useProtoMechStore((s) => s.setChassis);
  const setModel = useProtoMechStore((s) => s.setModel);

  const handleChassisNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setChassis(event.target.value);
      }
    },
    [readOnly, setChassis],
  );

  const handleModelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setModel(event.target.value);
      }
    },
    [readOnly, setModel],
  );

  return {
    chassis,
    model,
    handleChassisNameChange,
    handleModelChange,
  };
}

export function useProtoMechChassisControls(
  readOnly: boolean,
): ProtoMechChassisControls {
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const setChassisType = useProtoMechStore((s) => s.setChassisType);

  const handleChassisTypeChange = useCallback(
    (newChassis: ProtoChassis) => {
      if (!readOnly) {
        setChassisType(newChassis);
      }
    },
    [readOnly, setChassisType],
  );

  return {
    chassisType,
    chassisOptions: CHASSIS_OPTIONS,
    handleChassisTypeChange,
  };
}

export function useProtoMechTonnageControls(
  readOnly: boolean,
): ProtoMechTonnageControls {
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const walkMP = useProtoMechStore((s) => s.walkMP);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const setTonnage = useProtoMechStore((s) => s.setTonnage);
  const [tonnageError, setTonnageError] = useState<string>();

  const weightClass = getProtoWeightClass(tonnage);
  const handleTonnageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (readOnly) return;
      const next = Number(event.target.value);
      // MML refuses a tonnage whose engine would be invalid and keeps the walk; show why
      // instead of changing anything (PMStructureTab.java:446-456).
      const refusal = protoTonnageChangeError(next, walkMP, chassisType);
      setTonnageError(refusal);
      if (refusal === undefined) setTonnage(next);
    },
    [readOnly, setTonnage, walkMP, chassisType],
  );

  return {
    tonnage,
    weightClass,
    tonnageOptions: TONNAGE_OPTIONS,
    tonnageError,
    handleTonnageChange,
  };
}

export function useProtoMechMovementControls(
  readOnly: boolean,
): ProtoMechMovementControls {
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const walkMP = useProtoMechStore((s) => s.walkMP);
  const flankMP = useProtoMechStore((s) => s.flankMP);
  const jumpMP = useProtoMechStore((s) => s.jumpMP);
  const hasMyomerBooster = useProtoMechStore((s) => s.hasMyomerBooster);
  const equipment = useProtoMechStore((s) => s.equipment);
  const setWalkMP = useProtoMechStore((s) => s.setWalkMP);
  const setJumpJets = useProtoMechStore((s) => s.setJumpJets);
  const setMyomerBooster = useProtoMechStore((s) => s.setMyomerBooster);

  // The combo shows the mounted type; at jump 0 there are no mounts, so it keeps the
  // last choice, as MML's combo does. A loaded UMU unit is shown, not edited, until
  // Battle Value has a UMU input.
  const mountedJetType = useMemo(
    () => findProtoJumpJetType(equipment),
    [equipment],
  );
  const [chosenJetType, setChosenJetType] = useState<ProtoEditableJumpJetType>(
    mountedJetType === PROTO_JUMP_JET_TYPE.EXTENDED
      ? PROTO_JUMP_JET_TYPE.EXTENDED
      : PROTO_JUMP_JET_TYPE.STANDARD,
  );
  const jumpJetType = mountedJetType ?? chosenJetType;
  const jumpJetLocked = jumpJetType === PROTO_JUMP_JET_TYPE.UMU;
  const editableJetType: ProtoEditableJumpJetType =
    jumpJetType === PROTO_JUMP_JET_TYPE.EXTENDED
      ? PROTO_JUMP_JET_TYPE.EXTENDED
      : PROTO_JUMP_JET_TYPE.STANDARD;

  const effectiveWalk = walkMP;
  const hasPartialWing = useMemo(
    () => hasProtoPartialWing(equipment),
    [equipment],
  );
  const effectiveJump = effectiveJumpMP(jumpMP, hasPartialWing);
  const isGliderChassis = chassisType === ProtoChassis.GLIDER;
  const walkMin = protoMinWalkMP(chassisType);
  const walkMax = useMemo(
    () => protoMaxWalkMP(tonnage, chassisType),
    [tonnage, chassisType],
  );
  const jumpMax = useMemo(
    () =>
      Math.max(
        protoJumpLimit(walkMP, chassisType, equipment),
        // Choosing Extended lifts the limit to 1.5 x walk before the first jet exists.
        jumpJetType === PROTO_JUMP_JET_TYPE.EXTENDED &&
          protoChassisCanJump(chassisType)
          ? protoMaxJumpMP(walkMP, true)
          : 0,
      ),
    [walkMP, chassisType, equipment, jumpJetType],
  );

  const handleWalkMPChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setWalkMP(Number(event.target.value));
      }
    },
    [readOnly, setWalkMP],
  );

  const handleJumpMPChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly && !jumpJetLocked) {
        setChosenJetType(editableJetType);
        setJumpJets({
          type: editableJetType,
          count: Number(event.target.value),
        });
      }
    },
    [readOnly, jumpJetLocked, editableJetType, setJumpJets],
  );

  const handleJumpJetTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (readOnly || jumpJetLocked) return;
      const type =
        event.target.value === PROTO_JUMP_JET_TYPE.EXTENDED
          ? PROTO_JUMP_JET_TYPE.EXTENDED
          : PROTO_JUMP_JET_TYPE.STANDARD;
      setChosenJetType(type);
      // At jump 0 there is nothing to re-create; only the choice is kept.
      if (jumpMP > 0) setJumpJets({ type, count: jumpMP });
    },
    [readOnly, jumpJetLocked, jumpMP, setJumpJets],
  );

  const handleMyomerBoosterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setMyomerBooster(event.target.checked);
      }
    },
    [readOnly, setMyomerBooster],
  );

  return {
    walkMP,
    jumpMP,
    runMP: flankMP,
    walkMin,
    walkMax,
    jumpMax,
    effectiveWalk,
    effectiveJump,
    hasPartialWing,
    canJump: protoChassisCanJump(chassisType),
    jumpJetType,
    jumpJetLockReason: jumpJetLocked
      ? 'UMU editing waits on Battle Value support, so the jump type is shown, not edited.'
      : undefined,
    handleJumpJetTypeChange,
    isGliderChassis,
    hasMyomerBooster,
    handleWalkMPChange,
    handleJumpMPChange,
    handleMyomerBoosterChange,
  };
}

export function useProtoMechArmorControls(
  readOnly: boolean,
): ProtoMechArmorControls {
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);
  const structureByLocation = useProtoMechStore((s) => s.structureByLocation);
  const storedArmorType = useProtoMechStore((s) => s.armorType);
  const armorType =
    getProtoArmorDefinition(storedArmorType)?.code ?? storedArmorType;
  const equipment = useProtoMechStore((s) => s.equipment);
  const setArmorType = useProtoMechStore((s) => s.setArmorType);
  const setLocationArmor = useProtoMechStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useProtoMechStore((s) => s.autoAllocateArmor);
  const clearAllArmor = useProtoMechStore((s) => s.clearAllArmor);

  const armorLocations = useMemo(
    () => getArmorLocations(hasMainGun),
    [hasMainGun],
  );
  const totalArmor = useMemo(
    () => getTotalArmor(armorByLocation),
    [armorByLocation],
  );
  const limits = useMemo(
    () =>
      computeProtoArmorLimits(
        tonnage,
        chassisType,
        hasMainGun,
        structureByLocation,
      ),
    [tonnage, chassisType, hasMainGun, structureByLocation],
  );
  const armorWeight = computeProtoArmorWeight(totalArmor, armorType);
  const errors = useMemo(
    () => [
      ...getProtoArmorErrors(
        tonnage,
        chassisType,
        hasMainGun,
        structureByLocation,
        armorByLocation,
      ),
      ...getProtoArmorSlotErrors(
        tonnage,
        chassisType === ProtoChassis.QUAD,
        armorType,
        equipment,
      ),
    ],
    [
      tonnage,
      chassisType,
      hasMainGun,
      structureByLocation,
      armorByLocation,
      armorType,
      equipment,
    ],
  );

  const handleArmorTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        setArmorType(Number(event.target.value));
      }
    },
    [readOnly, setArmorType],
  );

  const handleAutoAllocateArmor = useCallback(() => {
    if (!readOnly) {
      autoAllocateArmor();
    }
  }, [autoAllocateArmor, readOnly]);

  const handleClearAllArmor = useCallback(() => {
    if (!readOnly) {
      clearAllArmor();
    }
  }, [clearAllArmor, readOnly]);

  const handleLocationArmorChange = useCallback(
    (location: ProtoMechLocation, event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setLocationArmor(location, Number(event.target.value));
      }
    },
    [readOnly, setLocationArmor],
  );

  return {
    armorByLocation,
    structureByLocation,
    armorLocations,
    totalArmor,
    locationLimits: limits.byLocation,
    totalLimit: limits.total,
    errors,
    armorType,
    armorWeight,
    handleArmorTypeChange,
    handleAutoAllocateArmor,
    handleClearAllArmor,
    handleLocationArmorChange,
  };
}
