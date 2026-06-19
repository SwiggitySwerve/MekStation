import type {
  MovementConversionMode,
  MovementUnitHeightProfile,
} from '@/types/gameplay';

const NUMERIC_LAM_CONVERSION_MODES = {
  1: 'airmek',
  2: 'fighter',
} as const;

const NUMERIC_QUADVEE_CONVERSION_MODES = {
  1: 'vehicle',
} as const;

const STRING_CONVERSION_MODES: Readonly<
  Record<string, 'mek' | 'airmek' | 'fighter' | 'vehicle'>
> = {
  mek: 'mek',
  mech: 'mek',
  airmek: 'airmek',
  airmech: 'airmek',
  fighter: 'fighter',
  vehicle: 'vehicle',
  tracked: 'vehicle',
  wheeled: 'vehicle',
};

export type RuntimeConversionMode = 'mek' | 'airmek' | 'fighter' | 'vehicle';

export function normalizedConversionMode(
  value: MovementConversionMode | number | undefined,
  profile: MovementUnitHeightProfile,
): RuntimeConversionMode | undefined {
  if (typeof value === 'number') {
    if (value === 0) return 'mek';
    if (profile.kind === 'lam') {
      return NUMERIC_LAM_CONVERSION_MODES[
        value as keyof typeof NUMERIC_LAM_CONVERSION_MODES
      ];
    }
    if (profile.kind === 'quadvee') {
      return NUMERIC_QUADVEE_CONVERSION_MODES[
        value as keyof typeof NUMERIC_QUADVEE_CONVERSION_MODES
      ];
    }
    return undefined;
  }

  return value === undefined ? undefined : STRING_CONVERSION_MODES[value];
}
