import { TechBase, RulesLevel } from '../TechBase';

export interface IUnitConfigurationData {
  readonly tonnage?: number;
  readonly engineType?: string;
  readonly gyroType?: string;
  readonly structureType?: string;
  readonly armorType?: string;
  readonly techBase?: TechBase | string;
  readonly rulesLevel?: RulesLevel | string | number;
  readonly era?: string;
  readonly mass?: number;
  readonly [key: string]: unknown;
}

export function isUnitConfigurationData(value: unknown): value is IUnitConfigurationData {
  return typeof value === 'object' && value !== null;
}

export interface IRangeData {
  readonly short?: number;
  readonly medium?: number;
  readonly long?: number;
  readonly extreme?: number;
  readonly minimum?: number;
  readonly [key: string]: unknown;
}

export interface IEquipmentItemData {
  readonly item_name?: string;
  readonly item_type?: string;
  readonly location?: string;
  readonly category?: string;
  readonly type?: string;
  readonly tech_base?: string;
  readonly damage?: number | string;
  readonly heat?: number;
  readonly slots?: number;
  readonly space?: number;
  readonly weight?: number;
  readonly tonnage?: number;
  readonly range?: IRangeData;
  readonly ammo_per_shot?: number;
  readonly rear_facing?: boolean;
  readonly turret_mounted?: boolean;
  readonly [key: string]: unknown;
}

export function isEquipmentItemData(value: unknown): value is IEquipmentItemData {
  return typeof value === 'object' && value !== null;
}

export function isRangeData(value: unknown): value is IRangeData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const numericProps = ['short', 'medium', 'long', 'extreme', 'minimum'];
  return numericProps.every(
    (prop) =>
      !(prop in record) ||
      typeof record[prop] === 'number' ||
      typeof record[prop] === 'undefined',
  );
}

export interface IEquipmentData {
  readonly heat?: number;
  readonly damage?: number | string;
  readonly slots?: number;
  readonly space?: number;
  readonly weight?: number;
  readonly tonnage?: number;
  readonly range?: IRangeData;
  readonly tech_base?: string;
  readonly item_name?: string;
  readonly item_type?: string;
  readonly [key: string]: unknown;
}

export function isEquipmentData(value: unknown): value is IEquipmentData {
  return typeof value === 'object' && value !== null;
}

export interface ICriticalSlotSections {
  readonly [location: string]: {
    readonly slots: Array<{
      readonly slot: unknown;
      readonly location: string;
      readonly index: number;
    }>;
    readonly [key: string]: unknown;
  };
}

export function isCriticalSlotSections(value: unknown): value is ICriticalSlotSections {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).every((section) => {
    if (typeof section !== 'object' || section === null) {
      return false;
    }
    return Array.isArray((section as { slots?: unknown }).slots);
  });
}

export function getConfigurationProperty<T>(
  config: IUnitConfigurationData,
  property: string,
  defaultValue?: T,
): T | undefined {
  const value = config[property];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

export function getEquipmentItemProperty<T>(
  item: IEquipmentItemData,
  property: string,
  defaultValue?: T,
): T | undefined {
  const value = item[property];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

export function getEquipmentDataProperty<T>(
  data: IEquipmentData,
  property: string,
  defaultValue?: T,
): T | undefined {
  const value = data[property];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}


