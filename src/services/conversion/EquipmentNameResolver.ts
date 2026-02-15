import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';

import { getAllEquipmentItemsForResolver } from './EquipmentNameResolverData';
import {
  MEGAMEKLAB_TYPE_MAP,
  SYSTEM_COMPONENTS,
  normalizeName,
  stripQuantityPrefix,
} from './EquipmentNameResolverMappings';

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
  private normalizedNameMap: Map<string, IEquipmentItem> = new Map();
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    const allEquipment = getAllEquipmentItemsForResolver();
    for (const item of allEquipment) {
      this.equipmentById.set(item.id, item);
      this.equipmentByName.set(item.name.toLowerCase(), item);
      this.normalizedNameMap.set(normalizeName(item.name), item);
    }

    this.initialized = true;
  }

  resolve(
    itemType: string,
    itemName: string,
    techBase?: TechBase,
  ): EquipmentResolution {
    this.initialize();

    const { cleanType } = stripQuantityPrefix(itemType);
    const typeToLookup = cleanType || itemType;

    let directId = MEGAMEKLAB_TYPE_MAP[itemType];
    if (!directId && typeToLookup !== itemType) {
      directId = MEGAMEKLAB_TYPE_MAP[typeToLookup];
    }

    if (directId) {
      const equipment = this.equipmentById.get(directId);
      if (equipment) {
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

    const normalizedType = normalizeName(typeToLookup);
    const byNormalizedType = this.normalizedNameMap.get(normalizedType);
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

    const normalizedName = normalizeName(itemName);
    const byNormalizedName = this.normalizedNameMap.get(normalizedName);
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
      if (byTechId) {
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
  }

  getById(id: string): IEquipmentItem | undefined {
    this.initialize();
    return this.equipmentById.get(id);
  }

  isSystemComponent(itemType: string): boolean {
    return SYSTEM_COMPONENTS.some((component) =>
      itemType.toLowerCase().includes(component.toLowerCase()),
    );
  }

  isHeatSink(itemType: string): boolean {
    return (
      itemType.toLowerCase().includes('heat sink') ||
      itemType.toLowerCase().includes('heatsink')
    );
  }

  getMappings(): Record<string, string> {
    return { ...MEGAMEKLAB_TYPE_MAP };
  }
}

export const equipmentNameResolver = new EquipmentNameResolver();
