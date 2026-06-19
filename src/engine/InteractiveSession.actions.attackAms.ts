import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { IAttackDeclaredPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { calculateFiringArc } from '@/utils/gameplay/firingArc';

import {
  findAvailableAmmoBin,
  isEnergyWeapon,
  normalizeAmmoWeaponType,
} from '@/utils/gameplay/ammoTracking';
import {
  isAMS,
  isMissileWeapon,
} from '@/utils/gameplay/specialWeaponMechanics';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

function mountBaseId(weaponId: string): string {
  const match = weaponId.match(/^(.+)-(\d+)$/);
  return match ? match[1] : weaponId;
}

function isMissileAttackWeapon(weapon: IWeaponAttack): boolean {
  return (
    isMissileWeapon(mountBaseId(weapon.weaponId)) ||
    isMissileWeapon(weapon.weaponName) ||
    /\bmml[\s-]?\d+/i.test(`${weapon.weaponId} ${weapon.weaponName}`)
  );
}

const PLAYTEST_3_AMS_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest-3',
  'playtest3',
  'tacops_playtest_3',
]);

function hasPlaytest3AMSRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_AMS_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
  );
}

function canSelectedAMSReuseWithinWeaponPhase(
  weapon: IWeapon,
  optionalRules: readonly string[] | undefined,
): boolean {
  return weapon.amsMultiUse === true || hasPlaytest3AMSRule(optionalRules);
}

function amsAmmoWeaponType(
  weapon: IWeapon,
  targetAmmoState: IGameSession['currentState']['units'][string]['ammoState'],
): string {
  const mountType = normalizeAmmoWeaponType(mountBaseId(weapon.id));
  if (
    targetAmmoState &&
    findAvailableAmmoBin(targetAmmoState, mountType) !== null
  ) {
    return mountType;
  }

  return normalizeAmmoWeaponType(weapon.name);
}

export function buildSelectedAMSWeaponMounts(input: {
  readonly selectedAMSWeaponIds?: IAttackDeclaredPayload['selectedAMSWeaponIds'];
  readonly incomingWeapons: readonly IWeaponAttack[];
  readonly targetWeapons: readonly IWeapon[];
  readonly targetState: IGameSession['currentState']['units'][string];
  readonly incomingAttackArc: ReturnType<typeof calculateFiringArc>;
  readonly optionalRules: readonly string[] | undefined;
}): {
  readonly mounts?: IAttackDeclaredPayload['selectedAMSWeaponMounts'];
  readonly invalid?: {
    readonly incomingWeaponId: string;
    readonly details: string;
  };
} {
  if (!input.selectedAMSWeaponIds) return {};

  type SelectedAMSMountSnapshot = NonNullable<
    IAttackDeclaredPayload['selectedAMSWeaponMounts']
  >[string];
  const snapshots: Record<string, SelectedAMSMountSnapshot> = {};

  for (const [incomingWeaponId, selectedAMSWeaponId] of Object.entries(
    input.selectedAMSWeaponIds,
  )) {
    const incomingWeapon = input.incomingWeapons.find(
      (weapon) => weapon.weaponId === incomingWeaponId,
    );
    if (!incomingWeapon || !isMissileAttackWeapon(incomingWeapon)) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' is not legal for incoming weapon '${incomingWeaponId}': incoming weapon is not a committed missile attack`,
        },
      };
    }

    const selectedWeapon = input.targetWeapons.find(
      (weapon) => weapon.id === selectedAMSWeaponId,
    );
    if (!selectedWeapon) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' is not mounted on defender '${input.targetState.id}'`,
        },
      };
    }
    if (selectedWeapon.destroyed) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' is destroyed`,
        },
      };
    }
    if (!isAMS(mountBaseId(selectedWeapon.id)) && !isAMS(selectedWeapon.name)) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' is not an AMS weapon`,
        },
      };
    }
    if (
      input.targetState.weaponsFiredThisTurn?.includes(selectedWeapon.id) &&
      !canSelectedAMSReuseWithinWeaponPhase(selectedWeapon, input.optionalRules)
    ) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' has already fired this weapon phase`,
        },
      };
    }
    if (!weaponMountCoversTargetArc(selectedWeapon, input.incomingAttackArc)) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' does not cover the incoming ${input.incomingAttackArc} arc`,
        },
      };
    }

    const ammoWeaponType = amsAmmoWeaponType(
      selectedWeapon,
      input.targetState.ammoState,
    );
    if (
      !isEnergyWeapon(selectedWeapon.name) &&
      (!input.targetState.ammoState ||
        findAvailableAmmoBin(input.targetState.ammoState, ammoWeaponType) ===
          null)
    ) {
      return {
        invalid: {
          incomingWeaponId,
          details: `Selected AMS '${selectedAMSWeaponId}' has no available AMS ammo`,
        },
      };
    }

    snapshots[incomingWeaponId] = {
      weaponId: selectedWeapon.id,
      weaponName: selectedWeapon.name,
      heat: selectedWeapon.heat,
      ammoWeaponType,
      ...(selectedWeapon.mountingArc !== undefined
        ? { mountingArc: selectedWeapon.mountingArc }
        : {}),
      ...(selectedWeapon.mountingArcs !== undefined
        ? { mountingArcs: selectedWeapon.mountingArcs }
        : {}),
      ...(selectedWeapon.amsMultiUse !== undefined
        ? { amsMultiUse: selectedWeapon.amsMultiUse }
        : {}),
    };
  }

  return {
    mounts: Object.keys(snapshots).length > 0 ? snapshots : undefined,
  };
}
