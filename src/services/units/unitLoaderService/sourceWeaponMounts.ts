import { getEquipmentCalculatorService } from '@/services/equipment/EquipmentCalculatorService';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import {
  createMountedEquipment,
  IMountedEquipmentInstance,
} from '@/types/equipment/MountedEquipment';
import profiles from '@/types/equipment/sourceWeaponMountProfiles.json';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  getEquipmentCritEntries,
  isSuperHeavy,
} from '@/utils/construction/constructionRules/tonnage';
import {
  isAmmunitionEquipmentId,
  loadEquipmentCatalog,
} from '@/utils/construction/equipmentBV/catalogLoader';
import {
  normalizeEquipmentId,
  normalizeNativeEquipmentName,
} from '@/utils/construction/equipmentBV/normalization';
import { techRouteId } from '@/utils/construction/equipmentBVCatalogData';
import {
  isSplittable,
  splitPartners,
} from '@/utils/construction/slotOperations/splitAllocation';
import { weaponCategoryToEquipmentCategory } from '@/utils/equipment/categoryRegistry';

import { mapMechLocation } from './componentMappers';
import { parseCriticalSlotToken } from './equipmentResolution';

interface ISourceWeaponSlot {
  readonly index: number;
  readonly equipmentId?: string;
  readonly equipmentDef?: Pick<IEquipmentItem, 'category'>;
}

const mountProfiles: Readonly<
  Record<
    string,
    { grouping: string; recover: boolean; aliases?: readonly string[] }
  >
> = profiles;
const identityAliases = new Map(
  Object.entries(mountProfiles).flatMap(([id, profile]) =>
    (profile.aliases ?? []).map((alias) => [alias, id] as const),
  ),
);

/** Native and legacy Claw records join as one Java type; mounted IDs stay intact. */
export function sourceWeaponIdentity(equipmentId: string): string {
  return identityAliases.get(equipmentId) ?? equipmentId;
}

export function isSourcePhysicalWeapon(equipmentId: string): boolean {
  return mountProfiles[sourceWeaponIdentity(equipmentId)] !== undefined;
}

// Mek location constants, reversed as MtfFile.java:545-548 (48fcb2f64).
const nativeOrder = [
  MechLocation.CENTER_LEG,
  MechLocation.LEFT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.RIGHT_LEG,
  MechLocation.REAR_RIGHT_LEG,
  MechLocation.LEFT_ARM,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.RIGHT_ARM,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.CENTER_TORSO,
  MechLocation.HEAD,
];

export interface ISourceCriticalWeapon extends Pick<
  IMountedEquipmentInstance,
  | 'equipmentId'
  | 'location'
  | 'slots'
  | 'splitSlots'
  | 'spreadSlots'
  | 'weight'
  | 'criticalSlots'
  | 'isRearMounted'
  | 'isOmniPodMounted'
> {
  readonly location: MechLocation;
  readonly slots: readonly number[];
  readonly summaryIds: readonly string[];
}

const summaryNames = new Intl.Collator('en', {
  sensitivity: 'base',
  ignorePunctuation: true,
});

/** Summary locations can name either half of a split native mount. */
export function sourceWeaponSummaryMatches(
  mount: ISourceCriticalWeapon,
  id: string,
  location: string,
  slots?: readonly number[],
): boolean {
  const where = mapMechLocation(location);
  const part = [mount, mount.splitSlots, ...(mount.spreadSlots ?? [])].find(
    (p) => p?.location === where,
  );
  return (
    where !== undefined &&
    part !== undefined &&
    (!slots?.length || slots.every((index) => part.slots.includes(index))) &&
    mount.summaryIds.some((alias) =>
      [id, sourceWeaponIdentity(normalizeEquipmentId(id))].some(
        (candidate) => summaryNames.compare(alias, candidate) === 0,
      ),
    )
  );
}

/** Synchronous source facts: no registry initialization, generated output or IO. */
export function sourceCriticalWeapons(
  criticalSlots: Readonly<Record<string, readonly (string | null)[]>>,
  tonnage: number,
  clan: boolean,
  warnings: string[] = [],
): ISourceCriticalWeapon[] {
  const catalog = loadEquipmentCatalog();
  const locations = Object.entries(criticalSlots)
    .flatMap(([key, tokens]) => {
      const location = mapMechLocation(key);
      return location ? [{ location, tokens }] : [];
    })
    .sort(
      (a, b) =>
        nativeOrder.indexOf(a.location) - nativeOrder.indexOf(b.location),
    );
  const resolved = locations.map(({ location, tokens }) => ({
    location,
    slots: tokens.flatMap((token, index) => {
      if (!token || isAmmunitionEquipmentId(token)) return [];
      const { lookupToken, isRearMounted } = parseCriticalSlotToken(token);
      const id = sourceWeaponIdentity(
        techRouteId(lookupToken, clan) ??
          normalizeNativeEquipmentName(lookupToken),
      );
      const definition = catalog.get(id);
      const category = Object.values(WeaponCategory).find(
        (value) => value === definition?.category,
      );
      if (!definition || (!isSourcePhysicalWeapon(id) && !category)) return [];
      const calculator = getEquipmentCalculatorService();
      const formulaId = definition.variableEquipmentId ?? id;
      const sizing =
        isSourcePhysicalWeapon(id) && calculator.isVariable(formulaId)
          ? calculator.calculateProperties(formulaId, {
              tonnage,
              isQuad: locations.some(
                (l) => l.location === MechLocation.FRONT_LEFT_LEG,
              ),
            })
          : {
              weight: definition.weight ?? 0,
              criticalSlots: definition.criticalSlots ?? 0,
            };
      const count = getEquipmentCritEntries(
        sizing.criticalSlots,
        isSuperHeavy(tonnage),
      );
      const item = createMountedEquipment(
        {
          ...definition,
          ...sizing,
          criticalSlots: count,
          category: category
            ? weaponCategoryToEquipmentCategory(category)
            : EquipmentCategory.PHYSICAL_WEAPON,
          techBase:
            definition.techBase === 'CLAN'
              ? TechBase.CLAN
              : TechBase.INNER_SPHERE,
          rulesLevel: RulesLevel.STANDARD,
          introductionYear: definition.introductionYear ?? 0,
          costCBills: 0,
        },
        'source',
      );
      const summaryIds = [
        id,
        id.replace(/^clan-/, ''),
        lookupToken,
        definition.name,
        definition.name
          .replace(/\s*\((?:Clan|IS)\)/gi, '')
          .replace(/^Clan /, ''),
      ].flatMap((name) => [
        name,
        sourceWeaponIdentity(normalizeEquipmentId(name)),
      ]);
      return [
        {
          index,
          equipmentId: id,
          item,
          summaryIds,
          isRearMounted,
          isOmniPodMounted: /\(OMNIPOD\)/i.test(token),
        },
      ];
    }),
  }));
  const claimed = new Map<MechLocation, Set<number>>(
    resolved.map((l) => [l.location, new Set()]),
  );
  const mounts: ISourceCriticalWeapon[] = [];
  for (const { location, slots } of resolved) {
    for (const slot of slots) {
      const occupied = claimed.get(location);
      if (!occupied) continue;
      if (occupied.has(slot.index) || slot.item.criticalSlots <= 0) continue;
      const spread = mountProfiles[slot.equipmentId]?.grouping === 'spread';
      const parts = (
        spread ? resolved : resolved.filter((l) => l.location === location)
      )
        .map((l) => ({
          location: l.location,
          slots: takeSourceWeaponSlots(
            l.slots,
            claimed.get(l.location) ?? new Set(),
            slot.equipmentId,
            slot.item.criticalSlots,
          ),
        }))
        .filter((p) => p.slots.length);
      const first = parts[0];
      if (!first) continue;
      if (
        !spread &&
        first.slots.length < slot.item.criticalSlots &&
        isSplittable(slot.item)
      ) {
        for (const partner of splitPartners(location)) {
          const other = resolved.find((l) => l.location === partner);
          if (!other) continue;
          const rest = takeSourceWeaponSlots(
            other.slots,
            claimed.get(partner) ?? new Set(),
            slot.equipmentId,
            slot.item.criticalSlots - first.slots.length,
          );
          if (rest.length + first.slots.length === slot.item.criticalSlots) {
            parts.push({ location: partner, slots: rest });
            break;
          }
        }
      }
      if (
        parts.reduce((sum, p) => sum + p.slots.length, 0) !==
        slot.item.criticalSlots
      ) {
        warnings.push(
          `Incomplete source weapon allocation: ${slot.equipmentId} at ${location}`,
        );
        continue;
      }
      for (const part of parts)
        for (const s of part.slots) claimed.get(part.location)?.add(s.index);
      const positions = parts.map((p) => ({
        location: p.location,
        slots: p.slots.map((s) => s.index),
      }));
      mounts.push({
        equipmentId: slot.equipmentId,
        ...positions[0],
        weight: slot.item.weight,
        criticalSlots: slot.item.criticalSlots,
        isRearMounted: slot.isRearMounted,
        isOmniPodMounted: slot.isOmniPodMounted,
        summaryIds: slot.summaryIds,
        ...(spread
          ? { spreadSlots: positions.slice(1) }
          : positions.length > 1
            ? { splitSlots: positions[1] }
            : {}),
      });
    }
  }
  return mounts;
}

export function takeSourceWeaponSlots<T extends ISourceWeaponSlot>(
  slots: readonly T[],
  claimed: ReadonlySet<number>,
  equipmentId: string,
  count: number,
  isAmmo = false,
): readonly T[] {
  const identity = sourceWeaponIdentity(equipmentId);
  return slots
    .filter(
      (slot) =>
        !claimed.has(slot.index) &&
        sourceWeaponIdentity(slot.equipmentId ?? '') === identity &&
        (slot.equipmentDef?.category === EquipmentCategory.AMMUNITION) ===
          isAmmo,
    )
    .slice(0, count);
}
