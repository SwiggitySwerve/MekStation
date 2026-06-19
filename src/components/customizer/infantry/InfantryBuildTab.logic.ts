import { useCallback, useMemo, type ChangeEvent } from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';
import { TechBase } from '@/types/enums/TechBase';
import {
  InfantryMotive,
  SNEAK_ELIGIBLE_MOTIVES,
  type IFieldGunCatalogEntry,
  type IInfantryFieldGun,
  type IInfantryWeaponEntry,
  type IPlatoonComposition,
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

export const MOTIVE_OPTIONS = Object.values(InfantryMotive);
export const SPECIALIZATION_OPTIONS = Object.values(InfantrySpecialization);

const ALL_ARMOR_KIT_OPTIONS = Object.values(InfantryArmorKit);
const SNEAK_KIT_VALUES = new Set<string>([
  InfantryArmorKit.SNEAK_CAMO,
  InfantryArmorKit.SNEAK_IR,
  InfantryArmorKit.SNEAK_ECM,
  InfantryArmorKit.SNEAK_CAMO_IR,
  InfantryArmorKit.SNEAK_IR_ECM,
  InfantryArmorKit.SNEAK_COMPLETE,
]);

export interface InfantryIdentityControls {
  chassis: string;
  model: string;
  techBase: TechBase;
  handleChassisChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleModelChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleTechBaseChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export interface InfantryPlatoonControls {
  infantryMotive: InfantryMotive;
  platoonComposition: IPlatoonComposition;
  platoonStrength: number;
  groundMP: number;
  jumpMP: number;
  allowHeavyPrimary: boolean;
  handleMotiveChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  handleSquadsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleTroopersPerSquadChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface InfantryWeaponControls {
  primaryWeapon: string;
  primaryWeaponId: string | undefined;
  primaryWeaponOptions: readonly IInfantryWeaponEntry[];
  secondaryWeapon: string | undefined;
  secondaryWeaponId: string | undefined;
  secondaryWeaponCount: number;
  secondaryWeaponOptions: readonly IInfantryWeaponEntry[];
  handlePrimaryWeaponChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  handleSecondaryWeaponChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export interface InfantryProtectionControls {
  armorKit: InfantryArmorKit;
  armorKitOptions: readonly InfantryArmorKit[];
  specialization: InfantrySpecialization;
  specializationOptions: readonly InfantrySpecialization[];
  hasAntiMechTraining: boolean;
  showSneakSuitError: boolean;
  setArmorKit: (kit: InfantryArmorKit) => void;
  setSpecialization: (specialization: InfantrySpecialization) => void;
  setAntiMechTraining: (enabled: boolean) => void;
}

export interface InfantryFieldGunControls {
  canUseFieldGuns: boolean;
  fieldGuns: readonly IInfantryFieldGun[];
  addedFieldGunIds: ReadonlySet<string>;
  catalog: readonly IFieldGunCatalogEntry[];
  handleAddFieldGun: (gunId: string) => void;
  handleRemoveFieldGun: (equipmentId: string) => void;
  handleFieldGunAmmo: (
    idx: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}

function clampPlatoonCount(value: number): number {
  return Math.max(1, Math.min(10, value));
}

function getArmorKitOptions(
  infantryMotive: InfantryMotive,
): InfantryArmorKit[] {
  const isSneakEligible = SNEAK_ELIGIBLE_MOTIVES.has(infantryMotive);
  return ALL_ARMOR_KIT_OPTIONS.filter(
    (kit) => isSneakEligible || !SNEAK_KIT_VALUES.has(kit),
  );
}

function getSecondaryWeaponCount(
  platoonStrength: number,
  secondaryRatio: number,
): number {
  if (secondaryRatio <= 0) {
    return 0;
  }

  return Math.floor(platoonStrength / secondaryRatio);
}

export function useInfantryIdentityControls(
  readOnly: boolean,
): InfantryIdentityControls {
  const chassis = useInfantryStore((s) => s.chassis);
  const model = useInfantryStore((s) => s.model);
  const techBase = useInfantryStore((s) => s.techBase);
  const setChassis = useInfantryStore((s) => s.setChassis);
  const setModel = useInfantryStore((s) => s.setModel);
  const setTechBase = useInfantryStore((s) => s.setTechBase);

  const handleChassisChange = useCallback(
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

  const handleTechBaseChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        setTechBase(event.target.value as TechBase);
      }
    },
    [readOnly, setTechBase],
  );

  return {
    chassis,
    model,
    techBase,
    handleChassisChange,
    handleModelChange,
    handleTechBaseChange,
  };
}

export function useInfantryPlatoonControls(
  readOnly: boolean,
): InfantryPlatoonControls {
  const infantryMotive = useInfantryStore((s) => s.infantryMotive);
  const platoonComposition = useInfantryStore((s) => s.platoonComposition);
  const groundMP = useInfantryStore((s) => s.groundMP);
  const jumpMP = useInfantryStore((s) => s.jumpMP);
  const setInfantryMotive = useInfantryStore((s) => s.setInfantryMotive);
  const setPlatoonComposition = useInfantryStore(
    (s) => s.setPlatoonComposition,
  );

  const platoonStrength = useMemo(
    () => totalTroopers(platoonComposition),
    [platoonComposition],
  );
  const allowHeavyPrimary = HEAVY_WEAPON_MOTIVES.has(infantryMotive);

  const handleMotiveChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (!readOnly) {
        setInfantryMotive(event.target.value as InfantryMotive);
      }
    },
    [readOnly, setInfantryMotive],
  );

  const handleSquadsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setPlatoonComposition({
          squads: clampPlatoonCount(Number(event.target.value)),
          troopersPerSquad: platoonComposition.troopersPerSquad,
        });
      }
    },
    [platoonComposition, readOnly, setPlatoonComposition],
  );

  const handleTroopersPerSquadChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setPlatoonComposition({
          squads: platoonComposition.squads,
          troopersPerSquad: clampPlatoonCount(Number(event.target.value)),
        });
      }
    },
    [platoonComposition, readOnly, setPlatoonComposition],
  );

  return {
    infantryMotive,
    platoonComposition,
    platoonStrength,
    groundMP,
    jumpMP,
    allowHeavyPrimary,
    handleMotiveChange,
    handleSquadsChange,
    handleTroopersPerSquadChange,
  };
}

export function useInfantryWeaponControls(
  readOnly: boolean,
  platoonStrength: number,
  allowHeavyPrimary: boolean,
): InfantryWeaponControls {
  const primaryWeapon = useInfantryStore((s) => s.primaryWeapon);
  const primaryWeaponId = useInfantryStore((s) => s.primaryWeaponId);
  const secondaryWeapon = useInfantryStore((s) => s.secondaryWeapon);
  const secondaryWeaponId = useInfantryStore((s) => s.secondaryWeaponId);
  const secondaryWeaponCount = useInfantryStore((s) => s.secondaryWeaponCount);
  const setPrimaryWeapon = useInfantryStore((s) => s.setPrimaryWeapon);
  const setSecondaryWeapon = useInfantryStore((s) => s.setSecondaryWeapon);
  const setSecondaryWeaponCount = useInfantryStore(
    (s) => s.setSecondaryWeaponCount,
  );

  const primaryWeaponOptions = useMemo(
    () => getPrimaryWeaponOptions(allowHeavyPrimary),
    [allowHeavyPrimary],
  );

  const handlePrimaryWeaponChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (readOnly) {
        return;
      }

      const entry = INFANTRY_WEAPON_TABLE.find(
        (weapon) => weapon.id === event.target.value,
      );
      if (entry) {
        setPrimaryWeapon(entry.name, entry.id);
      }
    },
    [readOnly, setPrimaryWeapon],
  );

  const handleSecondaryWeaponChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (readOnly) {
        return;
      }

      const selectedId = event.target.value;
      if (!selectedId) {
        setSecondaryWeapon(undefined, undefined);
        setSecondaryWeaponCount(0);
        return;
      }

      const entry = INFANTRY_WEAPON_TABLE.find(
        (weapon) => weapon.id === selectedId,
      );
      if (entry) {
        setSecondaryWeapon(entry.name, entry.id);
        setSecondaryWeaponCount(
          getSecondaryWeaponCount(platoonStrength, entry.secondaryRatio),
        );
      }
    },
    [platoonStrength, readOnly, setSecondaryWeapon, setSecondaryWeaponCount],
  );

  return {
    primaryWeapon,
    primaryWeaponId,
    primaryWeaponOptions,
    secondaryWeapon,
    secondaryWeaponId,
    secondaryWeaponCount,
    secondaryWeaponOptions: INFANTRY_WEAPON_TABLE,
    handlePrimaryWeaponChange,
    handleSecondaryWeaponChange,
  };
}

export function useInfantryProtectionControls(
  infantryMotive: InfantryMotive,
): InfantryProtectionControls {
  const armorKit = useInfantryStore((s) => s.armorKit);
  const specialization = useInfantryStore((s) => s.specialization);
  const hasAntiMechTraining = useInfantryStore((s) => s.hasAntiMechTraining);
  const setArmorKit = useInfantryStore((s) => s.setArmorKit);
  const setSpecialization = useInfantryStore((s) => s.setSpecialization);
  const setAntiMechTraining = useInfantryStore((s) => s.setAntiMechTraining);

  const armorKitOptions = useMemo(
    () => getArmorKitOptions(infantryMotive),
    [infantryMotive],
  );
  const showSneakSuitError =
    SNEAK_KIT_VALUES.has(armorKit) &&
    !SNEAK_ELIGIBLE_MOTIVES.has(infantryMotive);

  return {
    armorKit,
    armorKitOptions,
    specialization,
    specializationOptions: SPECIALIZATION_OPTIONS,
    hasAntiMechTraining,
    showSneakSuitError,
    setArmorKit,
    setSpecialization,
    setAntiMechTraining,
  };
}

export function useInfantryFieldGunControls(
  readOnly: boolean,
  infantryMotive: InfantryMotive,
): InfantryFieldGunControls {
  const fieldGuns = useInfantryStore((s) => s.fieldGuns);
  const addFieldGun = useInfantryStore((s) => s.addFieldGun);
  const removeFieldGun = useInfantryStore((s) => s.removeFieldGun);
  const setFieldGunAmmo = useInfantryStore((s) => s.setFieldGunAmmo);

  const addedFieldGunIds = useMemo(
    () => new Set(fieldGuns.map((gun) => gun.equipmentId)),
    [fieldGuns],
  );
  const canUseFieldGuns = FIELD_GUN_ALLOWED_MOTIVES.has(infantryMotive);

  const handleAddFieldGun = useCallback(
    (gunId: string) => {
      if (readOnly || !canUseFieldGuns) {
        return;
      }

      const entry = FIELD_GUN_CATALOG.find((gun) => gun.id === gunId);
      if (!entry || addedFieldGunIds.has(gunId)) {
        return;
      }

      addFieldGun(buildFieldGun(entry));
    },
    [addFieldGun, addedFieldGunIds, canUseFieldGuns, readOnly],
  );

  const handleRemoveFieldGun = useCallback(
    (equipmentId: string) => {
      if (!readOnly) {
        removeFieldGun(equipmentId);
      }
    },
    [readOnly, removeFieldGun],
  );

  const handleFieldGunAmmo = useCallback(
    (idx: number, event: ChangeEvent<HTMLInputElement>) => {
      if (!readOnly) {
        setFieldGunAmmo(idx, Number(event.target.value));
      }
    },
    [readOnly, setFieldGunAmmo],
  );

  return {
    canUseFieldGuns,
    fieldGuns,
    addedFieldGunIds,
    catalog: FIELD_GUN_CATALOG,
    handleAddFieldGun,
    handleRemoveFieldGun,
    handleFieldGunAmmo,
  };
}
