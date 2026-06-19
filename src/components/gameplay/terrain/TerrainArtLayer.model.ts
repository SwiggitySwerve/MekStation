import type { ITerrainFeature } from '@/types/gameplay';

import { TERRAIN_COLORS } from '@/constants/terrain';
import { TerrainType } from '@/types/gameplay';
import {
  TerrainVisualKey,
  symbolIdFor,
  visualKeyFor,
} from '@/utils/terrain/terrainVisualMap';

export interface TerrainArtStack {
  readonly base: TerrainVisualKey | null;
  readonly secondary: TerrainVisualKey | null;
}

export interface TerrainSymbolState {
  readonly baseId: string | null;
  readonly secondaryId: string | null;
  readonly useBaseFallback: boolean;
  readonly useSecondaryFallback: boolean;
}

const EMPTY_STACK: TerrainArtStack = { base: null, secondary: null };

const SECONDARY_VISUAL_KEYS = new Set<TerrainVisualKey>([
  'light-woods',
  'heavy-woods',
  'light-building',
  'medium-building',
  'heavy-building',
  'hardened-building',
  'rubble',
]);

const BUILDING_VISUAL_KEYS = new Set<TerrainVisualKey>([
  'light-building',
  'medium-building',
  'heavy-building',
  'hardened-building',
]);

const warnedMissingKeys = new Set<string>();

function isSecondaryKey(key: TerrainVisualKey): boolean {
  return SECONDARY_VISUAL_KEYS.has(key);
}

function defaultBaseFor(secondary: TerrainVisualKey): TerrainVisualKey {
  return BUILDING_VISUAL_KEYS.has(secondary) ? 'pavement' : 'clear';
}

function resolveRubbleStack(
  features: readonly ITerrainFeature[],
  rubbleFeature: ITerrainFeature,
): TerrainArtStack {
  const pavementFeature = features.find(
    (feature) => feature.type === TerrainType.Pavement,
  );
  return {
    base: pavementFeature
      ? visualKeyFor(pavementFeature.type, pavementFeature.level)
      : null,
    secondary: visualKeyFor(rubbleFeature.type, rubbleFeature.level),
  };
}

export function resolveStack(
  features: readonly ITerrainFeature[],
): TerrainArtStack {
  const rubbleFeature = features.find(
    (feature) => feature.type === TerrainType.Rubble,
  );
  if (rubbleFeature) return resolveRubbleStack(features, rubbleFeature);

  let base: TerrainVisualKey | null = null;
  let secondary: TerrainVisualKey | null = null;

  for (const feature of features) {
    const key = visualKeyFor(feature.type, feature.level);
    if (!key) continue;
    if (isSecondaryKey(key)) {
      secondary = key;
    } else {
      base = key;
    }
  }

  return {
    base: secondary && !base ? defaultBaseFor(secondary) : base,
    secondary,
  };
}

export function resolveTerrainStack(
  features: readonly ITerrainFeature[] | undefined,
): TerrainArtStack {
  return features && features.length > 0 ? resolveStack(features) : EMPTY_STACK;
}

export function flatFillFor(
  feature: ITerrainFeature | undefined,
): string | null {
  if (!feature) return null;
  return TERRAIN_COLORS[feature.type] ?? null;
}

function warnMissingKey(key: string): void {
  if (warnedMissingKeys.has(key)) return;
  warnedMissingKeys.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[TerrainArtLayer] visual key "${key}" has no rendered symbol; falling back to flat color`,
  );
}

function isMissingSymbol(
  symbolId: string | null,
  missingSymbolIds: ReadonlySet<string> | undefined,
): boolean {
  return symbolId ? (missingSymbolIds?.has(symbolId) ?? false) : false;
}

export function terrainSymbolStateFor(
  stack: TerrainArtStack,
  firstFeature: ITerrainFeature | undefined,
  missingSymbolIds: ReadonlySet<string> | undefined,
): TerrainSymbolState {
  const baseId = stack.base ? symbolIdFor(stack.base) : null;
  const secondaryId = stack.secondary ? symbolIdFor(stack.secondary) : null;
  const baseMissing = isMissingSymbol(baseId, missingSymbolIds);
  const secondaryMissing = isMissingSymbol(secondaryId, missingSymbolIds);

  if (baseMissing && baseId) warnMissingKey(baseId);
  if (secondaryMissing && secondaryId) warnMissingKey(secondaryId);

  return {
    baseId,
    secondaryId,
    useBaseFallback: baseMissing || (!stack.base && !!firstFeature),
    useSecondaryFallback: secondaryMissing,
  };
}
