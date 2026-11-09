import { useCallback, useMemo, type ChangeEvent } from 'react';

import type { IProtoMechArmorAllocation } from '@/stores/protoMechState';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  computeProtoArmorLimits,
  effectiveJumpMP,
  getProtoArmorErrors,
  getProtoMPCaps,
  getProtoWeightClass,
  hasProtoPartialWing,
  protoChassisCanJump,
} from '@/utils/construction/protomech';
import {
  PROTO_ARMOR_TYPES,
  getProtoArmorDefinition,
} from '@/utils/construction/protomech/armorType';
import { getProtoArmorSlotErrors } from '@/utils/construction/protomech/mainGun';
import { computeProtoArmorWeight } from '@/utils/construction/protomech/weight';

export const STANDARD_TONNAGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9];
export const ULTRAHEAVY_TONNAGE_OPTIONS = [10, 11, 12, 13, 14, 15];

export const CHASSIS_LABELS: Record<ProtoChassis, string> = {
  [ProtoChassis.BIPED]: 'Biped',
  [ProtoChassis.QUAD]: 'Quad',
  [ProtoChassis.GLIDER]: 'Glider (Light Only)',
  [ProtoChassis.ULTRAHEAVY]: 'Ultraheavy (10-15 t)',
};

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
  handleTonnageChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export interface ProtoMechMovementControls {
  walkMP: number;
  jumpMP: number;
  runMP: number;
  mpCaps: ReturnType<typeof getProtoMPCaps>;
  effectiveWalk: number;
  /** Stored jump plus the Partial Wing bonus; shown when a wing is mounted. */
  effectiveJump: number;
  hasPartialWing: boolean;
  /** False for Ultraheavy and Glider (protoChassisCanJump). */
  canJump: boolean;
  isUltraheavy: boolean;
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

function getTonnageOptions(chassisType: ProtoChassis): readonly number[] {
  if (chassisType === ProtoChassis.ULTRAHEAVY) {
    return ULTRAHEAVY_TONNAGE_OPTIONS;
  }

  return STANDARD_TONNAGE_OPTIONS;
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
    chassisOptions: Object.values(ProtoChassis),
    handleChassisTypeChange,
  };
}

export function useProtoMechTonnageControls(
  readOnly: boolean,
): ProtoMechTonnageControls {
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const setTonnage = useProtoMechStore((s) => s.setTonnage);

  const weightClass = getProtoWeightClass(tonnage);
  const tonnageOptions = getTonnageOptions(chassisType);
  const handleTonnageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        setTonnage(Number(event.target.value));
      }
    },
    [readOnly, setTonnage],
  );

  return {
    tonnage,
    weightClass,
    tonnageOptions,
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
  const setJumpMP = useProtoMechStore((s) => s.setJumpMP);
  const setMyomerBooster = useProtoMechStore((s) => s.setMyomerBooster);

  const weightClass = getProtoWeightClass(tonnage);
  const mpCaps = getProtoMPCaps(weightClass);
  const effectiveWalk = walkMP;
  const hasPartialWing = useMemo(
    () => hasProtoPartialWing(equipment),
    [equipment],
  );
  const effectiveJump = effectiveJumpMP(jumpMP, hasPartialWing);
  const isUltraheavy = chassisType === ProtoChassis.ULTRAHEAVY;
  const isGliderChassis = chassisType === ProtoChassis.GLIDER;

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
      if (!readOnly) {
        setJumpMP(Number(event.target.value));
      }
    },
    [readOnly, setJumpMP],
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
    mpCaps,
    effectiveWalk,
    effectiveJump,
    hasPartialWing,
    canJump: protoChassisCanJump(chassisType),
    isUltraheavy,
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
