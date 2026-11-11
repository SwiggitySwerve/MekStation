import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';
import type { ISerializedEquipmentInput } from '@/types/unit/UnitSerialization';

import { equipmentNameResolver } from '@/services/conversion/EquipmentNameResolver';
import { getEquipmentCalculatorService } from '@/services/equipment/EquipmentCalculatorService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import {
  createMountedEquipment,
  IMountedEquipmentInstance,
} from '@/types/equipment/MountedEquipment';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';
import {
  getEquipmentCritEntries,
  isSuperHeavy,
} from '@/utils/construction/constructionRules/tonnage';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { isLegacyEquipmentId } from '@/utils/construction/equipmentBVCatalogData';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import {
  isSplittable,
  splitPartners,
} from '@/utils/construction/slotOperations/splitAllocation';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';
import { createHeatSinkEquipmentList } from '@/utils/equipment/heatSinkEquipmentUtils';

import type {
  CriticalEntryKind,
  CriticalSlotSystemContext,
  ICriticalSlotRecognitionInput,
  ICriticalSlotRecognitionResult,
  ICriticalSlotRecoveryInput,
  IRecognizedCriticalEntry,
  UnitCriticalSlots,
} from './criticalSlotRecognitionTypes';

import { mapMechLocation } from './componentMappers';
import { classifyCriticalSlotRecoveryKind } from './criticalSlotNoticeEffects';
export type {
  CriticalEntryEffect,
  CriticalEntryKind,
  CriticalSlotSystemContext,
  ICriticalSlotRecognitionInput,
  ICriticalSlotRecognitionResult,
  ICriticalSlotRecoveryInput,
  IRecognizedCriticalEntry,
  UnitCriticalSlots,
} from './criticalSlotRecognitionTypes';
import {
  parseCriticalSlotToken,
  resolveEquipmentId,
} from './equipmentResolution';
import { mountedDefinitionFields } from './mountedDefinitionFields';
import { recoveredMountInstanceId } from './mountInstanceId';
import {
  compareSourceCriticalLocations,
  type ISourceCriticalWeapon,
  isSourcePhysicalWeapon,
  sourceCriticalWeapons,
  sourceWeaponSummaryMatches,
  sourceWeaponIdentity as criticalEquipmentId,
  takeSourceWeaponSlots as takeMatchingSlots,
} from './sourceWeaponMounts';

export type ISerializedEquipmentPlacement = Pick<
  ISerializedEquipmentInput,
  | 'id'
  | 'isAmmo'
  | 'slots'
  | 'isRearMounted'
  | 'isRemovable'
  | 'isOmniPodMounted'
>;

interface IResolvedCriticalSlot {
  readonly index: number;
  readonly text?: string;
  readonly equipmentDef?: IEquipmentItem;
  readonly equipmentId?: string;
  readonly heatSinkType?: HeatSinkType;
  readonly isRearMounted: boolean;
  readonly parsedToken?: ReturnType<typeof parseCriticalSlotToken>;
}

const HEAT_SINK_TYPE_BY_ID: Readonly<Partial<Record<string, HeatSinkType>>> = {
  'single-heat-sink': HeatSinkType.SINGLE,
  'double-heat-sink': HeatSinkType.DOUBLE_IS,
  'clan-double-heat-sink': HeatSinkType.DOUBLE_CLAN,
  'compact-heat-sink': HeatSinkType.COMPACT,
  'laser-heat-sink': HeatSinkType.LASER,
};

function resolveRegistryEquipmentId(token: string): string | undefined {
  const separatorVariant = token.replaceAll('-', ' ');
  for (const candidate of [token, separatorVariant]) {
    const match = getEquipmentRegistry().lookup(candidate);
    if (
      match.found &&
      match.equipment &&
      (candidate === token || isLegacyEquipmentId(match.equipment.id))
    )
      return match.equipment.id;
  }
  return undefined;
}

function resolveSlotIdentity(
  token: string,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  entries: ReadonlyArray<string | null>,
): Pick<IResolvedCriticalSlot, 'equipmentDef' | 'equipmentId'> {
  // A crit token names its own mount (MtfFile.java:1052, 48fcb2f6), so its own
  // Clan/IS marker comes before a neighbour's: ISERMediumLaser beside
  // CLERMediumLaser stays IS. Unmarked tokens still read the location.
  const resolved = resolveEquipmentId(token, unitTechBase, unitTechBaseMode, [
    token,
    ...entries,
  ]);
  const registryId = resolveRegistryEquipmentId(token);
  const equipmentDef =
    resolved.equipmentDef ??
    (registryId
      ? getEquipmentLookupService().getMountedById(
          registryId,
          isAmmunitionEquipmentId(token),
        )
      : undefined);
  return { equipmentDef, equipmentId: equipmentDef?.id ?? registryId };
}

export function getCriticalSlotsForLocation(
  criticalSlots: UnitCriticalSlots | undefined,
  location: MechLocation | undefined,
): ReadonlyArray<string | null> | undefined {
  if (!criticalSlots || !location) return undefined;
  return Object.entries(criticalSlots).find(
    ([locationKey]) => mapMechLocation(locationKey) === location,
  )?.[1];
}

function resolveCriticalSlots(
  criticalSlots: UnitCriticalSlots | undefined,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
): ReadonlyMap<MechLocation, readonly IResolvedCriticalSlot[]> {
  const result = new Map<MechLocation, readonly IResolvedCriticalSlot[]>();
  if (!criticalSlots) return result;

  for (const [locationKey, entries] of Object.entries(criticalSlots)) {
    const location = mapMechLocation(locationKey);
    if (!location || result.has(location)) continue;

    result.set(
      location,
      entries.map((entry, index) => {
        if (typeof entry !== 'string') return { index, isRearMounted: false };

        const parsedToken = parseCriticalSlotToken(entry);
        const { lookupToken, isRearMounted } = parsedToken;
        const original = resolveSlotIdentity(
          entry,
          unitTechBase,
          unitTechBaseMode,
          entries,
        );
        // Preserve established decorated identities, including specialized ammo.
        const { equipmentDef, equipmentId } =
          original.equipmentId || lookupToken === entry
            ? original
            : resolveSlotIdentity(
                lookupToken,
                unitTechBase,
                unitTechBaseMode,
                entries,
              );
        const heatSinkType =
          equipmentId && HEAT_SINK_EQUIPMENT_IDS.includes(equipmentId)
            ? HEAT_SINK_TYPE_BY_ID[equipmentId]
            : undefined;

        return {
          index,
          text: entry,
          equipmentDef,
          equipmentId,
          heatSinkType,
          isRearMounted,
          parsedToken,
        };
      }),
    );
  }
  return result;
}

function claimedSlotsFor(
  claimed: Map<MechLocation, Set<number>>,
  location: MechLocation,
): Set<number> {
  const existing = claimed.get(location);
  if (existing) return existing;
  const created = new Set<number>();
  claimed.set(location, created);
  return created;
}

function claim(
  claimed: Set<number>,
  slots: readonly IResolvedCriticalSlot[],
): void {
  slots.forEach((slot) => claimed.add(slot.index));
}

/**
 * A mixed-tech list entry whose own id has no free crit slot takes the free
 * slots of its other-tech twin (er-medium-laser / clan-er-medium-laser) and
 * that slot's identity: MegaMek builds the mount from the crit token.
 */
function takeTechTwinSlots(
  slots: readonly IResolvedCriticalSlot[],
  claimed: ReadonlySet<number>,
  equipmentId: string,
  entries: (count: number) => number,
): readonly IResolvedCriticalSlot[] {
  const twinId = equipmentId.startsWith('clan-')
    ? equipmentId.slice(5)
    : `clan-${equipmentId}`;
  const twinDef = slots.find(
    (slot) => slot.equipmentId === twinId,
  )?.equipmentDef;
  if (!twinDef) return [];
  const count = entries(twinDef.criticalSlots);
  const twin = takeMatchingSlots(slots, claimed, twinId, count);
  return twin.length === count ? twin : [];
}

function restoreSerializedHeatSink(
  source: ISerializedEquipmentPlacement,
  item: IMountedEquipmentInstance,
): IMountedEquipmentInstance {
  const equipmentId = resolveRegistryEquipmentId(source.id) ?? item.equipmentId;
  const heatSinkType = HEAT_SINK_TYPE_BY_ID[equipmentId];
  if (!heatSinkType) return item;

  const heatSink = createHeatSinkEquipmentList(heatSinkType, 1)[0];
  return heatSink
    ? {
        ...heatSink,
        // Keep the mount's own (content-derived) id; the fresh heat sink's is random.
        instanceId: item.instanceId,
        location: item.location,
        slots: item.slots,
        isRearMounted: item.isRearMounted,
        linkedAmmoId: item.linkedAmmoId,
        isRemovable: source.isRemovable ?? heatSink.isRemovable,
        isOmniPodMounted: item.isOmniPodMounted,
      }
    : item;
}

function restoreSerializedCategory(
  source: ISerializedEquipmentPlacement,
  item: IMountedEquipmentInstance,
  resolvedByLocation: ReadonlyMap<
    MechLocation,
    readonly IResolvedCriticalSlot[]
  >,
  entries: (count: number) => number,
): IMountedEquipmentInstance {
  let isAmmo = source.isAmmo;
  const explicit = isAmmo !== undefined;
  if (isAmmo === undefined) {
    if (
      !item.location ||
      !source.slots?.length ||
      new Set(source.slots).size !== source.slots.length
    )
      return item;
    const locationSlots = resolvedByLocation.get(item.location);
    const ownSlots = source.slots.map((index) =>
      Number.isInteger(index) && index >= 0
        ? locationSlots?.[index]
        : undefined,
    );
    const first = ownSlots[0]?.equipmentDef;
    if (
      !first ||
      !ownSlots.every(
        (slot) =>
          slot?.equipmentDef &&
          criticalEquipmentId(slot.equipmentId ?? '') ===
            criticalEquipmentId(source.id) &&
          (slot.equipmentDef.category === EquipmentCategory.AMMUNITION) ===
            (first.category === EquipmentCategory.AMMUNITION),
      )
    )
      return item;
    isAmmo = first.category === EquipmentCategory.AMMUNITION;
  }
  const lookup = getEquipmentLookupService();
  // Saved IDs can carry opposite-tech ammo even on a pure-tech definition.
  // Only unresolved source aliases use the already resolved ID as a fallback.
  const identity = lookup.getById(source.id) ? source.id : item.equipmentId;
  const definition = lookup.getMountedById(identity, isAmmo);
  if (
    !definition ||
    (definition.category === EquipmentCategory.AMMUNITION) !== isAmmo
  ) {
    if (explicit)
      throw new Error(
        `Equipment ${source.id} has no ${isAmmo ? 'ammunition' : 'non-ammunition'} definition`,
      );
    return item;
  }
  if (!explicit && entries(definition.criticalSlots) !== source.slots?.length)
    return item;
  return { ...item, ...mountedDefinitionFields(definition) };
}

export interface ICriticalSlotEquipmentResult {
  readonly equipment: IMountedEquipmentInstance[];
  readonly unrecoveredCriticalSlots: readonly IUnrecoveredCriticalSlot[];
}

const criticalSlotMarkers = new Map(
  Object.entries(vocabulary.criticalSlotMarkers).map(([name, marker]) => [
    name.toLowerCase(),
    marker,
  ]),
);

function representedCriticalSlots(
  equipment: readonly IMountedEquipmentInstance[],
): ReadonlyMap<MechLocation, ReadonlySet<number>> {
  const represented = new Map<MechLocation, Set<number>>();
  for (const item of equipment) {
    for (const part of getSlotParts(item)) {
      const slots = claimedSlotsFor(represented, part.location);
      part.slots.forEach((slot) => slots.add(slot));
    }
  }
  return represented;
}

function refreshCriticalSlotCoverage(
  cells: readonly IRecognizedCriticalEntry[],
  equipment: readonly IMountedEquipmentInstance[],
): ICriticalSlotRecognitionResult {
  const represented = representedCriticalSlots(equipment);
  const refreshed = cells.map((cell) => ({
    ...cell,
    represented: represented.get(cell.location)?.has(cell.slot) ?? false,
  }));
  return {
    cells: refreshed,
    missing: refreshed.filter((cell) => !cell.represented),
  };
}

function recognizeResolvedCriticalSlotEntries(
  input: ICriticalSlotRecognitionInput,
  resolvedByLocation: ReadonlyMap<
    MechLocation,
    readonly IResolvedCriticalSlot[]
  >,
): ICriticalSlotRecognitionResult {
  const cells: IRecognizedCriticalEntry[] = [];
  for (const [location, slots] of resolvedByLocation) {
    const systems = input.systems;
    const fixed = systems
      ? getFixedSlotNames(
          location,
          systems.engineType,
          systems.gyroType,
          systems.armActuators,
          systems.cockpitType,
        )
      : undefined;
    for (const slot of slots) {
      const { text, parsedToken, index } = slot;
      if (
        !text ||
        !parsedToken ||
        equipmentNameResolver.isSystemComponent(parsedToken.lookupToken) ||
        text === fixed?.get(index)
      )
        continue;
      const kind = classifyCriticalSlotRecoveryKind({
        markerKind: criticalSlotMarkers.get(
          parsedToken.lookupToken.toLowerCase(),
        )?.kind,
        heatSink: !!slot.heatSinkType,
        equipmentCategory: slot.equipmentDef?.category,
        equipmentId: slot.equipmentId,
        physicalWeapon: isSourcePhysicalWeapon(slot.equipmentId ?? ''),
      });
      cells.push({
        text,
        location,
        slot: index,
        parsedToken,
        lookupToken: parsedToken.lookupToken,
        equipmentId: slot.equipmentId,
        definition: slot.equipmentDef,
        kind,
        effect:
          kind === 'armor-marker' || kind === 'structure-marker'
            ? 'placement-only'
            : kind === 'unclassified'
              ? 'unknown'
              : 'equipment-or-ability',
        isRearMounted: parsedToken.isRearMounted,
        isOmniPodMounted: parsedToken.isOmniPodMounted,
        represented: false,
      });
    }
  }
  return refreshCriticalSlotCoverage(cells, input.equipment);
}

/** The sole source-cell recogniser; kind recognition does not imply recovery. */
export function recognizeCriticalSlotEntries(
  input: ICriticalSlotRecognitionInput,
): ICriticalSlotRecognitionResult {
  return recognizeResolvedCriticalSlotEntries(
    input,
    resolveCriticalSlots(
      input.criticalSlots,
      input.unitTechBase,
      input.unitTechBaseMode,
    ),
  );
}

function criticalEntryCount(
  count: number,
  tonnage: number | undefined,
): number {
  return getEquipmentCritEntries(
    count,
    tonnage !== undefined && isSuperHeavy(tonnage),
  );
}

/** The sole recovery dispatcher. Recognition alone never admits recovery. */
export function recoverCriticalSlotEntries(
  input: ICriticalSlotRecoveryInput,
): readonly IMountedEquipmentInstance[] {
  const { entry, location } = input;
  const kind = entry.kind;
  const reservedSlots =
    input.reservedSlots ?? representedCriticalSlots(input.equipment);
  switch (kind) {
    case 'ammunition':
    // MiscType.java:12413-12420 (48fcb2f64): one native LAM bay is a 1t mount.
    case 'bomb-bay':
    case 'heat-sink': {
      if (
        input.physicalOnly ||
        !entry.equipmentId ||
        reservedSlots.get(location)?.has(entry.slot)
      )
        return [];
      const reserved = reservedSlots.get(location) ?? new Set<number>();
      const slots = input.locationEntries.map((cell) => ({
        ...cell,
        index: cell.slot,
        equipmentDef: cell.definition,
      }));
      if (entry.kind === 'heat-sink') {
        const sinkType = HEAT_SINK_TYPE_BY_ID[entry.equipmentId];
        const base = sinkType
          ? createHeatSinkEquipmentList(sinkType, 1)[0]
          : undefined;
        if (!base) return [];
        const sink = {
          ...base,
          criticalSlots: criticalEntryCount(base.criticalSlots, input.tonnage),
        };
        const matching = takeMatchingSlots(
          slots,
          reserved,
          entry.equipmentId,
          sink.criticalSlots,
        );
        return matching.length === sink.criticalSlots
          ? [
              {
                ...sink,
                instanceId: recoveredMountInstanceId(sink.equipmentId, [
                  { location, slots: matching.map((cell) => cell.index) },
                ]),
                location,
                slots: matching.map((cell) => cell.index),
              },
            ]
          : [];
      }
      const definition = entry.definition;
      if (!definition || definition.criticalSlots <= 0) return [];
      const count = criticalEntryCount(definition.criticalSlots, input.tonnage);
      // Bomb bays are misc, not ammo: keep the established category join.
      const matching = takeMatchingSlots(
        slots,
        reserved,
        entry.equipmentId,
        count,
        definition.category === EquipmentCategory.AMMUNITION,
      );
      return matching.length === count
        ? [
            {
              ...createMountedEquipment(
                { ...definition, criticalSlots: count },
                recoveredMountInstanceId(definition.id, [
                  { location, slots: matching.map((cell) => cell.index) },
                ]),
              ),
              location,
              slots: matching.map((cell) => cell.index),
              isRearMounted: matching.some((cell) => cell.isRearMounted),
            },
          ]
        : [];
    }
    case 'weapon': {
      const mount = input.sourceWeapon;
      if (!mount || !entry.definition) return [];
      // Preserve invalid legacy reservations instead of inventing extra mounts.
      if (
        getSlotParts(mount).some((part) =>
          part.slots.some((index) =>
            reservedSlots.get(part.location)?.has(index),
          ),
        )
      )
        return [];
      const { summaryIds: _summaryIds, ...placement } = mount;
      return [
        {
          ...createMountedEquipment(
            entry.definition,
            recoveredMountInstanceId(entry.definition.id, getSlotParts(mount)),
          ),
          ...placement,
        },
      ];
    }
    case 'armor-marker':
    case 'structure-marker':
      // Marker cells stay in the residual and notice exactly as on main until
      // the marker PR. Recognition does not grant recovery or hydration.
      return [];
    case 'mobility':
    case 'configuration-system':
    case 'unclassified':
      return [];
  }
  const unhandled: never = kind;
  throw new Error('Unhandled critical-entry kind: ' + unhandled);
}

export function restoreCriticalSlotEquipmentWithDiagnostics(
  serialized: readonly ISerializedEquipmentPlacement[],
  mapped: readonly IMountedEquipmentInstance[],
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  criticalSlots: UnitCriticalSlots | undefined,
  tonnage?: number,
  physicalOnly = false,
  isOmni = false,
  systems?: CriticalSlotSystemContext,
): ICriticalSlotEquipmentResult {
  // Mek.java:3484-3492: a superheavy entry holds two ordinary criticals.
  const entries = (count: number): number => criticalEntryCount(count, tonnage);
  const resolvedByLocation = resolveCriticalSlots(
    criticalSlots,
    unitTechBase,
    unitTechBaseMode,
  );
  const normalizedMapped = mapped.map((item, index) => {
    const categorized = restoreSerializedCategory(
      serialized[index],
      item,
      resolvedByLocation,
      entries,
    );
    const restored = restoreSerializedHeatSink(serialized[index], categorized);
    const sizing =
      isSourcePhysicalWeapon(restored.equipmentId) &&
      getEquipmentCalculatorService().isVariable(
        criticalEquipmentId(restored.equipmentId),
      ) &&
      tonnage !== undefined
        ? getEquipmentCalculatorService().calculateProperties(
            criticalEquipmentId(restored.equipmentId),
            {
              tonnage,
            },
          )
        : undefined;
    return {
      ...restored,
      ...(sizing ? { weight: sizing.weight } : {}),
      criticalSlots: entries(sizing?.criticalSlots ?? restored.criticalSlots),
    };
  });
  if (!criticalSlots)
    return { equipment: normalizedMapped, unrecoveredCriticalSlots: [] };

  const claimed = new Map<MechLocation, Set<number>>();

  serialized.forEach((source, index) => {
    const location = normalizedMapped[index]?.location;
    if (location && source.slots !== undefined) {
      source.slots.forEach((slot) =>
        claimedSlotsFor(claimed, location).add(slot),
      );
    }
  });

  const placed = normalizedMapped.map((item, index) => {
    const source = serialized[index];
    if (
      source.slots !== undefined ||
      !item.location ||
      item.criticalSlots <= 0
    ) {
      return item;
    }

    const claimedAtLocation = claimedSlotsFor(claimed, item.location);
    const matching = takeMatchingSlots(
      resolvedByLocation.get(item.location) ?? [],
      claimedAtLocation,
      item.equipmentId,
      item.criticalSlots,
      item.category === EquipmentCategory.AMMUNITION,
    );
    if (matching.length > 0 && matching.length < item.criticalSlots) {
      if (!isSplittable(item)) return item;
      for (const partner of splitPartners(item.location)) {
        const claimedAtPartner = claimedSlotsFor(claimed, partner);
        const rest = takeMatchingSlots(
          resolvedByLocation.get(partner) ?? [],
          claimedAtPartner,
          item.equipmentId,
          item.criticalSlots - matching.length,
          item.category === EquipmentCategory.AMMUNITION,
        );
        if (matching.length + rest.length !== item.criticalSlots) continue;
        claim(claimedAtLocation, matching);
        claim(claimedAtPartner, rest);
        return {
          ...item,
          slots: matching.map((slot) => slot.index),
          splitSlots: {
            location: partner,
            slots: rest.map((slot) => slot.index),
          },
          isRearMounted:
            source.isRearMounted ??
            [...matching, ...rest].some((slot) => slot.isRearMounted),
        };
      }
      return item;
    }
    const twin =
      matching.length === 0 && unitTechBaseMode === TechBaseMode.MIXED
        ? takeTechTwinSlots(
            resolvedByLocation.get(item.location) ?? [],
            claimedAtLocation,
            item.equipmentId,
            entries,
          )
        : [];
    const twinDef = twin[0]?.equipmentDef;
    if (twinDef) {
      claim(claimedAtLocation, twin);
      return {
        ...item,
        ...mountedDefinitionFields(twinDef),
        criticalSlots: twin.length,
        slots: twin.map((slot) => slot.index),
        isRearMounted:
          source.isRearMounted ?? twin.some((slot) => slot.isRearMounted),
      };
    }
    if (matching.length !== item.criticalSlots) return item;

    claim(claimedAtLocation, matching);
    return {
      ...item,
      slots: matching.map((slot) => slot.index),
      isRearMounted:
        source.isRearMounted ?? matching.some((slot) => slot.isRearMounted),
    };
  });

  const recovered: IMountedEquipmentInstance[] = [];
  const recognitionInput: ICriticalSlotRecognitionInput = {
    criticalSlots,
    equipment: placed,
    unitTechBase,
    unitTechBaseMode,
    tonnage,
    isOmni,
    systems,
  };
  const sourceCells = recognizeResolvedCriticalSlotEntries(
    recognitionInput,
    resolvedByLocation,
  ).cells;
  const recoveryInputFor = (
    entry: IRecognizedCriticalEntry,
    equipment: readonly IMountedEquipmentInstance[],
    sourceWeapon?: ISourceCriticalWeapon,
  ): ICriticalSlotRecoveryInput => {
    const cells = refreshCriticalSlotCoverage(sourceCells, equipment).cells;
    const current =
      cells.find(
        (cell) => cell.location === entry.location && cell.slot === entry.slot,
      ) ?? entry;
    return {
      ...recognitionInput,
      equipment,
      entry: current,
      location: current.location,
      locationEntries: cells.filter(
        (cell) => cell.location === current.location,
      ),
      physicalOnly,
      reservedSlots: claimed,
      sourceWeapon,
    };
  };
  // Preserve the established stage order. Admission and creation live only in
  // recoverCriticalSlotEntries; future kinds run after source weapon recovery.
  const summaryComponentKinds: ReadonlySet<CriticalEntryKind> = new Set([
    'ammunition',
    'bomb-bay',
    'heat-sink',
  ]);
  for (const entry of sourceCells) {
    if (!summaryComponentKinds.has(entry.kind)) continue;
    for (const mount of recoverCriticalSlotEntries(
      recoveryInputFor(entry, [...placed, ...recovered]),
    )) {
      for (const part of getSlotParts(mount)) {
        const reserved = claimedSlotsFor(claimed, part.location);
        part.slots.forEach((index) => reserved.add(index));
      }
      recovered.push(mount);
    }
  }

  if (tonnage !== undefined) {
    const consumed = new Set<number>();
    for (const mount of sourceCriticalWeapons(
      criticalSlots,
      tonnage,
      unitTechBase === TechBase.CLAN,
    )) {
      const { summaryIds: _summaryIds, ...placement } = mount;
      const index = placed.findIndex(
        (item, i) =>
          !consumed.has(i) &&
          (sourceWeaponSummaryMatches(
            mount,
            item.equipmentId,
            item.location ?? '',
            serialized[i].slots,
          ) ||
            sourceWeaponSummaryMatches(
              mount,
              serialized[i].id,
              item.location ?? '',
              serialized[i].slots,
            )),
      );
      if (index >= 0) {
        consumed.add(index);
        if (
          isSourcePhysicalWeapon(mount.equipmentId) ||
          (serialized[index].slots !== undefined && mount.splitSlots)
        ) {
          placed[index] = {
            ...placed[index],
            ...placement,
            equipmentId: placed[index].equipmentId,
            isRearMounted:
              serialized[index].isRearMounted ?? mount.isRearMounted,
            isOmniPodMounted:
              serialized[index].isOmniPodMounted ?? mount.isOmniPodMounted,
          };
        }
        continue;
      }
      const entry = sourceCells.find(
        (cell) =>
          cell.location === mount.location &&
          criticalEquipmentId(cell.equipmentId ?? '') === mount.equipmentId,
      );
      if (entry)
        recovered.push(
          ...recoverCriticalSlotEntries(
            recoveryInputFor(entry, [...placed, ...recovered], mount),
          ),
        );
    }
  }

  const equipment = [...placed, ...recovered];
  for (const entry of sourceCells) {
    if (summaryComponentKinds.has(entry.kind)) continue;
    for (const mount of recoverCriticalSlotEntries(
      recoveryInputFor(entry, equipment),
    )) {
      const existing = equipment.findIndex(
        (item) => item.instanceId === mount.instanceId,
      );
      if (existing >= 0) equipment[existing] = mount;
      else equipment.push(mount);
    }
  }
  const restoredEquipment = !isOmni
    ? equipment
    : equipment.map((item, index) => {
        const tokens = [...getSlotParts(item)]
          .sort((a, b) =>
            compareSourceCriticalLocations(a.location, b.location),
          )
          .flatMap((part) =>
            [...part.slots]
              .sort((a, b) => a - b)
              .map(
                (slot) =>
                  getCriticalSlotsForLocation(criticalSlots, part.location)?.[
                    slot
                  ],
              ),
          )
          .filter((token): token is string => typeof token === 'string');
        // Ordinary/spreadable mounts keep their creation token. Java's split
        // branch updates the flag on every visited crit (MtfFile.java:1127).
        const definition = getEquipmentLookupService().getMountedById(
          item.equipmentId,
          item.category === EquipmentCategory.AMMUNITION,
        );
        const split =
          item.splitSlots !== undefined ||
          isSplittable(
            definition
              ? { ...item, criticalSlots: definition.criticalSlots }
              : item,
          );
        return {
          ...item,
          isOmniPodMounted:
            serialized[index]?.isOmniPodMounted ??
            parseCriticalSlotToken((split ? tokens.at(-1) : tokens[0]) ?? '')
              .isOmniPodMounted,
        };
      });

  const { missing } = recognizeResolvedCriticalSlotEntries(
    {
      criticalSlots,
      equipment: restoredEquipment,
      unitTechBase,
      unitTechBaseMode,
      tonnage,
      isOmni,
      systems,
    },
    resolvedByLocation,
  );
  const unrecoveredCriticalSlots = missing.map(({ text, location, slot }) => ({
    text,
    location,
    slot,
  }));
  return { equipment: restoredEquipment, unrecoveredCriticalSlots };
}

/** Compatibility facade: recovery and its residual always have one owner. */
export function restoreCriticalSlotEquipment(
  ...args: Parameters<typeof restoreCriticalSlotEquipmentWithDiagnostics>
): IMountedEquipmentInstance[] {
  return restoreCriticalSlotEquipmentWithDiagnostics(...args).equipment;
}
