import { useCallback, useMemo, type ChangeEvent } from 'react';

import type { IProtoMechArmorAllocation } from '@/stores/protoMechState';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import {
  ProtoChassis,
  PROTO_MAIN_GUN_APPROVED_WEAPON_IDS,
} from '@/types/unit/ProtoMechInterfaces';
import {
  effectiveJumpMP,
  effectiveWalkMP,
  getProtoMPCaps,
  getProtoWeightClass,
} from '@/utils/construction/protomech';

export const STANDARD_TONNAGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9];
export const ULTRAHEAVY_TONNAGE_OPTIONS = [10, 11, 12, 13, 14, 15];

export const CHASSIS_LABELS: Record<ProtoChassis, string> = {
  [ProtoChassis.BIPED]: 'Biped',
  [ProtoChassis.QUAD]: 'Quad',
  [ProtoChassis.GLIDER]: 'Glider (Light only)',
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

export const MAIN_GUN_WEAPON_OPTIONS = [
  { id: 'clan-lrm-5', label: 'LRM-5' },
  { id: 'clan-lrm-10', label: 'LRM-10' },
  { id: 'clan-ac-2', label: 'AC/2' },
  { id: 'clan-ac-5', label: 'AC/5' },
  { id: 'clan-medium-pulse-laser', label: 'Medium Pulse Laser' },
  { id: 'clan-er-medium-laser', label: 'ER Medium Laser' },
  { id: 'clan-ppc', label: 'PPC' },
  { id: 'clan-er-ppc', label: 'ER PPC' },
  { id: 'clan-gauss-rifle', label: 'Gauss Rifle' },
] as const;

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
  effectiveJump: number;
  isUltraheavy: boolean;
  isGliderChassis: boolean;
  hasMyomerBooster: boolean;
  glidingWings: boolean;
  handleWalkMPChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleJumpMPChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleMyomerBoosterChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleGlidingWingsChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface ProtoMechMainGunControls {
  hasMainGun: boolean;
  mainGunWeaponId: string | undefined;
  hasUnapprovedMainGunWeapon: boolean;
  handleMainGunChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleMainGunWeaponChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export interface ProtoMechArmorControls {
  armorByLocation: IProtoMechArmorAllocation;
  structureByLocation: IProtoMechArmorAllocation;
  armorLocations: readonly ProtoMechLocation[];
  totalArmor: number;
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
  const jumpMP = useProtoMechStore((s) => s.jumpMP);
  const hasMyomerBooster = useProtoMechStore((s) => s.hasMyomerBooster);
  const glidingWings = useProtoMechStore((s) => s.glidingWings);
  const setWalkMP = useProtoMechStore((s) => s.setWalkMP);
  const setJumpMP = useProtoMechStore((s) => s.setJumpMP);
  const setMyomerBooster = useProtoMechStore((s) => s.setMyomerBooster);
  const setGlidingWings = useProtoMechStore((s) => s.setGlidingWings);

  const weightClass = getProtoWeightClass(tonnage);
  const mpCaps = getProtoMPCaps(weightClass);
  const effectiveWalk = effectiveWalkMP(walkMP, hasMyomerBooster);
  const effectiveJump = effectiveJumpMP(jumpMP, chassisType);
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

  const handleGlidingWingsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setGlidingWings(event.target.checked);
      }
    },
    [readOnly, setGlidingWings],
  );

  return {
    walkMP,
    jumpMP,
    runMP: effectiveWalk + 1,
    mpCaps,
    effectiveWalk,
    effectiveJump,
    isUltraheavy,
    isGliderChassis,
    hasMyomerBooster,
    glidingWings,
    handleWalkMPChange,
    handleJumpMPChange,
    handleMyomerBoosterChange,
    handleGlidingWingsChange,
  };
}

export function useProtoMechMainGunControls(
  readOnly: boolean,
): ProtoMechMainGunControls {
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const mainGunWeaponId = useProtoMechStore((s) => s.mainGunWeaponId);
  const setMainGun = useProtoMechStore((s) => s.setMainGun);
  const setMainGunWeaponId = useProtoMechStore((s) => s.setMainGunWeaponId);

  const hasUnapprovedMainGunWeapon =
    mainGunWeaponId !== undefined &&
    !PROTO_MAIN_GUN_APPROVED_WEAPON_IDS.has(mainGunWeaponId);

  const handleMainGunChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setMainGun(event.target.checked);
      }
    },
    [readOnly, setMainGun],
  );

  const handleMainGunWeaponChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        const value = event.target.value;
        setMainGunWeaponId(value === '' ? null : value);
      }
    },
    [readOnly, setMainGunWeaponId],
  );

  return {
    hasMainGun,
    mainGunWeaponId,
    hasUnapprovedMainGunWeapon,
    handleMainGunChange,
    handleMainGunWeaponChange,
  };
}

export function useProtoMechArmorControls(
  readOnly: boolean,
): ProtoMechArmorControls {
  const hasMainGun = useProtoMechStore((s) => s.hasMainGun);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);
  const structureByLocation = useProtoMechStore((s) => s.structureByLocation);
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
    handleAutoAllocateArmor,
    handleClearAllArmor,
    handleLocationArmorChange,
  };
}
