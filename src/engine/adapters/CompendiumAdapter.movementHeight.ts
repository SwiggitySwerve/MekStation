import type { MovementUnitHeightProfile } from '@/types/gameplay/HexGridInterfaces';

import {
  lamConversionModeFromUnitData,
  quadVeeConversionModeFromUnitData,
} from './CompendiumAdapter.conversionModes';
import {
  normalizedKey,
  numberField,
  recordField,
} from './CompendiumAdapter.fields';
import { movementModeFromUnitData } from './CompendiumAdapter.movementProfiles';
import {
  aerospaceShapeFromUnitData,
  isAirborneRepresentedUnit,
  isConventionalInfantryUnitType,
  isDropshipUnitType,
  isLamUnitType,
  isMekUnitType,
  isQuadVeeUnitType,
  isSmallCraftUnitType,
  isSuperHeavyRepresentedUnit,
  isSuperHeavyVtolRepresentedUnit,
  isVtolUnitType,
  normalizedUnitTypeKeys,
} from './CompendiumAdapter.unitIdentity';

const UNIT_HEIGHT_FIELDS = [
  'unitHeight',
  'entityHeight',
  'megamekHeight',
  'megamekEntityHeight',
  'movementHeight',
  'bridgeClearanceHeight',
  'heightAboveElevation',
] as const;

const INFANTRY_MOUNT_HEIGHT_FIELDS = [
  'infantryMountHeight',
  'mountHeight',
  'beastMountHeight',
  'infantryMountSizeHeight',
  'mountSizeHeight',
  'beastSizeHeight',
] as const;

const INFANTRY_MOUNT_RECORD_FIELDS = [
  'infantryMount',
  'beastMount',
  'mount',
  'beast',
] as const;

const INFANTRY_MOUNT_SIZE_FIELDS = [
  'infantryMountSize',
  'mountSize',
  'beastSize',
] as const;

const INFANTRY_MOUNT_RECORD_SIZE_FIELDS = [
  ...INFANTRY_MOUNT_SIZE_FIELDS,
  'size',
] as const;

const INFANTRY_MOUNT_NAME_FIELDS = [
  'infantryMountName',
  'mountName',
  'beastMountName',
  'beastName',
] as const;

const INFANTRY_MOUNT_RECORD_NAME_FIELDS = [
  ...INFANTRY_MOUNT_NAME_FIELDS,
  'name',
] as const;

const MEGAMEK_INFANTRY_BEAST_SIZE_HEIGHT: Readonly<Record<string, number>> = {
  large: 0,
  verylarge: 1,
  monstrous: 1,
};

const MEGAMEK_SAMPLE_INFANTRY_MOUNT_SIZE: Readonly<Record<string, string>> = {
  donkey: 'large',
  coventrykangaroo: 'large',
  horse: 'large',
  camel: 'large',
  branth: 'large',
  odessanraxx: 'large',
  tabiranth: 'large',
  tariq: 'large',
  elephant: 'verylarge',
  orca: 'verylarge',
  hipposaur: 'monstrous',
};

export function unitHeightFromUnitData(
  unitData: Record<string, unknown>,
): number | undefined {
  const movement = recordField(unitData.movement);
  const explicitHeight =
    numberField(unitData, ...UNIT_HEIGHT_FIELDS) ??
    numberField(movement, ...UNIT_HEIGHT_FIELDS);
  if (explicitHeight !== undefined) {
    return normalizedUnitHeight(explicitHeight);
  }

  const unitTypeKeys = normalizedUnitTypeKeys(unitData);
  const convertibleHeight = convertibleUnitHeightFromUnitData(
    unitData,
    unitTypeKeys,
  );
  if (convertibleHeight !== undefined) {
    return convertibleHeight;
  }
  if (unitTypeKeys.some(isMekUnitType)) {
    return isSuperHeavyRepresentedUnit(unitData) ? 2 : 1;
  }

  const infantryMountHeight = infantryMountHeightFromUnitData(
    unitData,
    unitTypeKeys,
  );
  if (infantryMountHeight !== undefined) {
    return infantryMountHeight;
  }

  return nonMekUnitHeightFromUnitData(unitData, unitTypeKeys);
}

export function movementUnitHeightProfileFromUnitData(
  unitData: Record<string, unknown>,
): MovementUnitHeightProfile | undefined {
  const unitTypeKeys = normalizedUnitTypeKeys(unitData);
  if (unitTypeKeys.some(isLamUnitType)) {
    return { kind: 'lam', standingHeight: standingMekHeight(unitData) };
  }
  if (unitTypeKeys.some(isQuadVeeUnitType)) {
    return { kind: 'quadvee', standingHeight: standingMekHeight(unitData) };
  }

  const mountedHeight = infantryMountHeightFromUnitData(unitData, unitTypeKeys);
  if (
    unitTypeKeys.some(isConventionalInfantryUnitType) &&
    mountedHeight !== undefined
  ) {
    return { kind: 'infantry_mount', mountedHeight };
  }

  return undefined;
}

function normalizedUnitHeight(height: number): number {
  return Math.max(0, Math.floor(height));
}

function convertibleUnitHeightFromUnitData(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): number | undefined {
  if (unitTypeKeys.some(isLamUnitType)) {
    const mode = lamConversionModeFromUnitData(unitData);
    return mode === 'mek' ? standingMekHeight(unitData) : 0;
  }
  if (unitTypeKeys.some(isQuadVeeUnitType)) {
    const mode = quadVeeConversionModeFromUnitData(unitData);
    return mode === 'vehicle' ? 0 : standingMekHeight(unitData);
  }
  return undefined;
}

function standingMekHeight(unitData: Record<string, unknown>): number {
  return isSuperHeavyRepresentedUnit(unitData) ? 2 : 1;
}

function infantryMountHeightFromUnitData(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): number | undefined {
  if (!unitTypeKeys.some(isConventionalInfantryUnitType)) {
    return undefined;
  }

  const movement = recordField(unitData.movement);
  const directHeight =
    numberField(unitData, ...INFANTRY_MOUNT_HEIGHT_FIELDS) ??
    numberField(movement, ...INFANTRY_MOUNT_HEIGHT_FIELDS);
  if (directHeight !== undefined) {
    return normalizedUnitHeight(directHeight);
  }

  for (const source of [unitData, movement]) {
    const heightFromSize =
      infantryMountHeightFromSizeFields(source) ??
      infantryMountHeightFromNameFields(source) ??
      infantryMountHeightFromRecordFields(source);
    if (heightFromSize !== undefined) {
      return heightFromSize;
    }
  }

  return undefined;
}

function infantryMountHeightFromRecordFields(
  source: Record<string, unknown> | undefined,
): number | undefined {
  for (const fieldName of INFANTRY_MOUNT_RECORD_FIELDS) {
    const value = source?.[fieldName];
    const record = recordField(value);
    if (record) {
      const directHeight = numberField(
        record,
        'height',
        ...INFANTRY_MOUNT_HEIGHT_FIELDS,
      );
      if (directHeight !== undefined) {
        return normalizedUnitHeight(directHeight);
      }

      const derivedHeight =
        infantryMountHeightFromSizeFields(
          record,
          INFANTRY_MOUNT_RECORD_SIZE_FIELDS,
        ) ??
        infantryMountHeightFromNameFields(
          record,
          INFANTRY_MOUNT_RECORD_NAME_FIELDS,
        );
      if (derivedHeight !== undefined) {
        return derivedHeight;
      }
    }

    const stringHeight = infantryMountHeightFromString(value);
    if (stringHeight !== undefined) {
      return stringHeight;
    }
  }

  return undefined;
}

function infantryMountHeightFromSizeFields(
  source: Record<string, unknown> | undefined,
  fieldNames: readonly string[] = INFANTRY_MOUNT_SIZE_FIELDS,
): number | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    const record = recordField(value);
    if (record) {
      const nestedHeight = numberField(record, 'height');
      if (nestedHeight !== undefined) {
        return normalizedUnitHeight(nestedHeight);
      }
    }

    const height = infantryMountHeightFromSizeValue(value);
    if (height !== undefined) {
      return height;
    }
  }

  return undefined;
}

function infantryMountHeightFromNameFields(
  source: Record<string, unknown> | undefined,
  fieldNames: readonly string[] = INFANTRY_MOUNT_NAME_FIELDS,
): number | undefined {
  for (const fieldName of fieldNames) {
    const height = infantryMountHeightFromString(source?.[fieldName]);
    if (height !== undefined) {
      return height;
    }
  }
  return undefined;
}

function infantryMountHeightFromString(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const customSize = value.match(/^Beast:Custom:[^,]*,([^,]+)/i)?.[1];
  if (customSize) {
    return infantryMountHeightFromSizeValue(customSize);
  }

  const withoutPrefix = value.trim().replace(/^Beast:/i, '');
  const sampleSize =
    MEGAMEK_SAMPLE_INFANTRY_MOUNT_SIZE[normalizedKey(withoutPrefix)];
  if (sampleSize) {
    return infantryMountHeightFromSizeValue(sampleSize);
  }

  return infantryMountHeightFromSizeValue(value);
}

function infantryMountHeightFromSizeValue(value: unknown): number | undefined {
  const key = normalizedKey(value);
  return key ? MEGAMEK_INFANTRY_BEAST_SIZE_HEIGHT[key] : undefined;
}

function nonMekUnitHeightFromUnitData(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): number | undefined {
  const movementMode = movementModeFromUnitData(unitData);
  if (movementMode === 'vtol' || unitTypeKeys.some(isVtolUnitType)) {
    return isSuperHeavyVtolRepresentedUnit(unitData) ? 1 : 0;
  }
  if (isSuperHeavyTankUnit(unitData, unitTypeKeys)) {
    return 1;
  }
  if (unitTypeKeys.some(isSmallCraftUnitType)) {
    return isAirborneRepresentedUnit(unitData) ? 0 : 1;
  }
  if (unitTypeKeys.some(isDropshipUnitType)) {
    if (isAirborneRepresentedUnit(unitData)) {
      return 0;
    }
    const dropshipShape = aerospaceShapeFromUnitData(unitData);
    if (dropshipShape === 'spheroid') {
      return 9;
    }
    if (dropshipShape === 'aerodyne') {
      return 4;
    }
  }
  return undefined;
}

function isSuperHeavyTankUnit(
  unitData: Record<string, unknown>,
  unitTypeKeys: readonly string[],
): boolean {
  if (
    unitTypeKeys.includes('superheavytank') ||
    unitTypeKeys.includes('largesupporttank')
  ) {
    return true;
  }

  if (
    unitTypeKeys.some((key) =>
      [
        'vehicle',
        'combatvehicle',
        'tank',
        'supportvehicle',
        'supporttank',
      ].includes(key),
    )
  ) {
    return isSuperHeavyRepresentedUnit(unitData);
  }

  return false;
}
