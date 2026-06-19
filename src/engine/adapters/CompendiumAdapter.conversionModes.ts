import {
  normalizedKey,
  normalizedStringFields,
  numberField,
  recordField,
  stringField,
} from './CompendiumAdapter.fields';

const CONVERSION_MODE_FIELDS = [
  'conversionMode',
  'currentConversionMode',
  'entityConversionMode',
  'megamekConversionMode',
  'convertedMode',
  'mode',
] as const;

export function lamConversionModeFromUnitData(
  unitData: Record<string, unknown>,
): 'mek' | 'airmek' | 'fighter' {
  const explicitMode = explicitConversionModeFromUnitData(unitData, 'lam');
  if (explicitMode === 'airmek' || explicitMode === 'fighter') {
    return explicitMode;
  }
  if (explicitMode === 'mek') {
    return 'mek';
  }

  const movementMode = movementModeKeyFromUnitData(unitData);
  if (
    movementMode === 'aerodyne' ||
    movementMode === 'aerospace' ||
    movementMode === 'fighter' ||
    movementMode === 'wheeled'
  ) {
    return 'fighter';
  }
  if (movementMode === 'wige' || movementMode === 'airmek') {
    return 'airmek';
  }

  return 'mek';
}

export function quadVeeConversionModeFromUnitData(
  unitData: Record<string, unknown>,
): 'mek' | 'vehicle' {
  const explicitMode = explicitConversionModeFromUnitData(unitData, 'quadvee');
  if (explicitMode === 'vehicle') {
    return 'vehicle';
  }
  if (explicitMode === 'mek') {
    return 'mek';
  }

  const movementMode = movementModeKeyFromUnitData(unitData);
  if (movementMode === 'tracked' || movementMode === 'wheeled') {
    return 'vehicle';
  }

  return 'mek';
}

function explicitConversionModeFromUnitData(
  unitData: Record<string, unknown>,
  family: 'lam' | 'quadvee',
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  const movement = recordField(unitData.movement);
  const numericMode =
    numberField(unitData, ...CONVERSION_MODE_FIELDS) ??
    numberField(movement, ...CONVERSION_MODE_FIELDS);
  if (numericMode !== undefined) {
    return numericConversionMode(family, numericMode);
  }

  const modeKeys = [
    ...normalizedStringFields(unitData, ...CONVERSION_MODE_FIELDS),
    ...normalizedStringFields(movement, ...CONVERSION_MODE_FIELDS),
  ];
  for (const modeKey of modeKeys) {
    const converted = stringConversionMode(family, modeKey);
    if (converted !== undefined) {
      return converted;
    }
  }

  return undefined;
}

function numericConversionMode(
  family: 'lam' | 'quadvee',
  mode: number,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (mode === 0) {
    return 'mek';
  }
  if (family === 'lam') {
    if (mode === 1) return 'airmek';
    if (mode === 2) return 'fighter';
  }
  if (family === 'quadvee' && mode === 1) {
    return 'vehicle';
  }
  return undefined;
}

function stringConversionMode(
  family: 'lam' | 'quadvee',
  modeKey: string,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (modeKey === '0' || modeKey === 'mek' || modeKey === 'mech') {
    return 'mek';
  }
  if (modeKey === '1') {
    return family === 'quadvee' ? 'vehicle' : 'airmek';
  }
  if (modeKey.includes('airmek') || modeKey.includes('airmech')) {
    return 'airmek';
  }
  if (
    (family === 'lam' && modeKey === '2') ||
    modeKey.includes('fighter') ||
    modeKey.includes('aerodyne')
  ) {
    return 'fighter';
  }
  if (modeKey.includes('vehicle')) {
    return 'vehicle';
  }
  return undefined;
}

function movementModeKeyFromUnitData(
  unitData: Record<string, unknown>,
): string {
  const movement = recordField(unitData.movement);
  return (
    normalizedKey(
      stringField(unitData, 'motionType', 'motiveType', 'movementType'),
    ) ||
    normalizedKey(
      stringField(movement, 'motionType', 'motiveType', 'movementType'),
    )
  );
}
