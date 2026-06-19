import {
  booleanField,
  normalizedKey,
  normalizedStringFields,
  numberField,
  recordField,
  stringField,
} from './CompendiumAdapter.fields';

const UNIT_TYPE_IDENTITY_FIELDS = [
  'unitType',
  'blkUnitType',
  'rawUnitType',
  'sourceUnitType',
  'megamekUnitType',
  'entityType',
  'configuration',
  'mechConfiguration',
  'mekConfiguration',
  'chassisConfiguration',
  'chassisType',
] as const;

const MEK_UNIT_TYPES = new Set([
  'battlemech',
  'battlemek',
  'mech',
  'mek',
  'omnimech',
  'omnimek',
  'industrialmech',
  'industrialmek',
]);

export function normalizedUnitTypeKeys(
  unitData: Record<string, unknown>,
): readonly string[] {
  const movement = recordField(unitData.movement);
  return Array.from(
    new Set([
      ...normalizedStringFields(unitData, ...UNIT_TYPE_IDENTITY_FIELDS),
      ...normalizedStringFields(movement, ...UNIT_TYPE_IDENTITY_FIELDS),
    ]),
  );
}

export function isMekUnitType(unitType: string): boolean {
  return MEK_UNIT_TYPES.has(unitType);
}

export function isLamUnitType(unitType: string): boolean {
  return (
    unitType === 'lam' ||
    unitType === 'landairmek' ||
    unitType === 'landairmech'
  );
}

export function isQuadVeeUnitType(unitType: string): boolean {
  return unitType === 'quadvee';
}

export function isQuadMekStandUpUnitType(unitType: string): boolean {
  switch (unitType) {
    case 'quad':
    case 'quadmech':
    case 'quadmek':
    case 'quadomnimech':
    case 'quadomnimek':
      return true;
    default:
      return false;
  }
}

export function isConventionalInfantryUnitType(unitType: string): boolean {
  return unitType === 'infantry' || unitType === 'conventionalinfantry';
}

export function isVtolUnitType(unitType: string): boolean {
  return unitType === 'vtol' || unitType === 'supportvtol';
}

export function isSmallCraftUnitType(unitType: string): boolean {
  return unitType === 'smallcraft' || unitType === 'smallcrafts';
}

export function isDropshipUnitType(unitType: string): boolean {
  return unitType === 'dropship' || unitType === 'dropships';
}

export function isSuperHeavyRepresentedUnit(
  unitData: Record<string, unknown>,
): boolean {
  const tonnage = numberField(unitData, 'tonnage', 'mass');
  const weightClass = normalizedKey(
    stringField(unitData, 'weightClass', 'weight_class'),
  );
  return (
    booleanField(unitData, 'isSuperheavy', 'isSuperHeavy', 'superheavy') ||
    weightClass === 'superheavy' ||
    (tonnage !== undefined && tonnage > 100)
  );
}

export function isSuperHeavyVtolRepresentedUnit(
  unitData: Record<string, unknown>,
): boolean {
  const tonnage = numberField(unitData, 'tonnage', 'mass');
  const weightClass = normalizedKey(
    stringField(unitData, 'weightClass', 'weight_class'),
  );
  return (
    booleanField(unitData, 'isSuperheavy', 'isSuperHeavy', 'superheavy') ||
    weightClass === 'superheavy' ||
    (tonnage !== undefined && tonnage > 30)
  );
}

export function isAirborneRepresentedUnit(
  unitData: Record<string, unknown>,
): boolean {
  const movement = recordField(unitData.movement);
  const combatState = recordField(unitData.combatState);
  const aerospaceState = recordField(unitData.aerospaceState);
  const altitude =
    numberField(unitData, 'altitude') ??
    numberField(movement, 'altitude') ??
    numberField(combatState, 'altitude') ??
    numberField(aerospaceState, 'altitude');

  return (
    booleanField(unitData, 'isAirborne', 'airborne') ||
    booleanField(movement, 'isAirborne', 'airborne') ||
    booleanField(combatState, 'isAirborne', 'airborne') ||
    booleanField(aerospaceState, 'isAirborne', 'airborne') ||
    (altitude !== undefined && altitude > 0)
  );
}

export function aerospaceShapeFromUnitData(
  unitData: Record<string, unknown>,
): 'aerodyne' | 'spheroid' | undefined {
  const movement = recordField(unitData.movement);
  const shapeKeys = [
    ...normalizedStringFields(
      unitData,
      'motionType',
      'configuration',
      'aerospaceMotionType',
      'shape',
      'aeroShape',
    ),
    ...normalizedStringFields(
      movement,
      'motionType',
      'configuration',
      'aerospaceMotionType',
      'shape',
      'aeroShape',
    ),
  ];
  if (shapeKeys.some((key) => key.includes('spheroid'))) {
    return 'spheroid';
  }
  if (shapeKeys.some((key) => key.includes('aerodyne'))) {
    return 'aerodyne';
  }
  return undefined;
}
