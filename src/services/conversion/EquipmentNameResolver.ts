import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';
import { nativeIdentityId } from '@/utils/construction/equipmentBV/sourceLookupAliases';
import {
  isLegacyEquipmentId,
  resolveRegistryId,
  preferRegistryEquipment,
} from '@/utils/construction/equipmentBVCatalogData';

import { getAllEquipmentItemsForResolver } from './EquipmentNameResolverData';
import {
  MEGAMEKLAB_TYPE_MAP,
  normalizeName,
  normalizeNameWithTechBase,
  stripQuantityPrefix,
} from './EquipmentNameResolverMappings';
import { isMTFCriticalSlotSystemName } from './MTFVocabulary';

export interface EquipmentResolution {
  readonly found: boolean;
  readonly equipmentId: string | null;
  readonly equipment: IEquipmentItem | null;
  readonly confidence: 'exact' | 'fuzzy' | 'none';
  readonly originalName: string;
  readonly originalType: string;
}

export class EquipmentNameResolver {
  private equipmentByName: Map<string, IEquipmentItem> = new Map();
  private equipmentById: Map<string, IEquipmentItem> = new Map();
  private normalizedNameMap: Map<string, Map<TechBase, IEquipmentItem>> =
    new Map();
  private initialized = false;

  initialize = (): void => {
    if (this.initialized) return;

    const allEquipment = getAllEquipmentItemsForResolver();
    for (const item of allEquipment) {
      this.equipmentById.set(item.id, item);
      if (!isLegacyEquipmentId(item.id)) continue;
      this.equipmentByName.set(item.name.toLowerCase(), item);
      const name = normalizeName(item.name);
      const candidates = this.normalizedNameMap.get(name) ?? new Map();
      candidates.set(item.techBase, item);
      this.normalizedNameMap.set(name, candidates);
    }

    this.initialized = true;
  };

  resolve = (
    itemType: string,
    itemName: string,
    techBase?: TechBase,
  ): EquipmentResolution => {
    const previous = this.resolveLegacy(itemType, itemName, techBase);
    const id = resolveRegistryId(itemType) ?? resolveRegistryId(itemName);
    const equipment = preferRegistryEquipment(
      previous.equipment,
      id ? this.equipmentById.get(id) : undefined,
      itemType,
    );
    return equipment && equipment !== previous.equipment
      ? {
          ...previous,
          found: true,
          equipment,
          equipmentId: equipment.id,
          confidence: 'exact',
        }
      : previous;
  };
  private resolveLegacy = (
    itemType: string,
    itemName: string,
    techBase?: TechBase,
  ): EquipmentResolution => {
    this.initialize();

    const { cleanType } = stripQuantityPrefix(itemType);
    const typeToLookup = cleanType || itemType;

    let directId: string | undefined =
      nativeIdentityId(typeToLookup) ?? MEGAMEKLAB_TYPE_MAP[itemType];
    if (!directId && typeToLookup !== itemType) {
      directId = MEGAMEKLAB_TYPE_MAP[typeToLookup];
    }

    directId ??= nativeIdentityId(itemName);

    if (directId) {
      const equipment = this.equipmentById.get(directId);
      if (equipment && isLegacyEquipmentId(equipment.id)) {
        return {
          found: true,
          equipmentId: directId,
          equipment,
          confidence: 'exact',
          originalName: itemName,
          originalType: itemType,
        };
      }
    }

    const byName = this.equipmentByName.get(itemName.toLowerCase());
    if (byName) {
      return {
        found: true,
        equipmentId: byName.id,
        equipment: byName,
        confidence: 'exact',
        originalName: itemName,
        originalType: itemType,
      };
    }

    const byNormalizedType = this.resolveNormalizedName(typeToLookup, techBase);
    if (byNormalizedType) {
      return {
        found: true,
        equipmentId: byNormalizedType.id,
        equipment: byNormalizedType,
        confidence: 'fuzzy',
        originalName: itemName,
        originalType: itemType,
      };
    }

    const byNormalizedName = this.resolveNormalizedName(itemName, techBase);
    if (byNormalizedName) {
      return {
        found: true,
        equipmentId: byNormalizedName.id,
        equipment: byNormalizedName,
        confidence: 'fuzzy',
        originalName: itemName,
        originalType: itemType,
      };
    }

    if (techBase) {
      const techPrefix = techBase === TechBase.CLAN ? 'clan-' : '';
      const techSuffixedId = techPrefix + normalizeName(itemName);
      const byTechId = this.equipmentById.get(techSuffixedId);
      if (byTechId && isLegacyEquipmentId(byTechId.id)) {
        return {
          found: true,
          equipmentId: byTechId.id,
          equipment: byTechId,
          confidence: 'fuzzy',
          originalName: itemName,
          originalType: itemType,
        };
      }
    }

    return {
      found: false,
      equipmentId: null,
      equipment: null,
      confidence: 'none',
      originalName: itemName,
      originalType: itemType,
    };
  };

  private resolveNormalizedName = (
    name: string,
    techBase?: TechBase,
  ): IEquipmentItem | undefined => {
    const normalized = normalizeNameWithTechBase(name);
    const candidates = this.normalizedNameMap.get(normalized.normalizedName);
    if (!candidates) return undefined;

    // A native marker wins over chassis tech; unqualified names retain the IS
    // default. A sole legacy candidate keeps its existing compatibility fallback.
    const side = normalized.techBase ?? techBase ?? TechBase.INNER_SPHERE;
    return (
      candidates.get(side) ??
      candidates.get(TechBase.INNER_SPHERE) ??
      candidates.values().next().value
    );
  };

  getById = (id: string): IEquipmentItem | undefined => {
    this.initialize();
    return this.equipmentById.get(id);
  };

  isSystemComponent = (itemType: string): boolean => {
    return isMTFCriticalSlotSystemName(itemType);
  };

  isHeatSink = (itemType: string): boolean => {
    return (
      itemType.toLowerCase().includes('heat sink') ||
      itemType.toLowerCase().includes('heatsink')
    );
  };

  getMappings = (): Record<string, string> => {
    return { ...MEGAMEKLAB_TYPE_MAP };
  };
}

export const equipmentNameResolver = new EquipmentNameResolver();
