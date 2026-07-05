export interface IStarSystem {
  id: string;
  name: string;
  position: { x: number; y: number };
  faction: string;
  population?: number;
}

export interface StarmapDisplayProps {
  systems: IStarSystem[];
  selectedSystem?: string;
  systemAnnotations?: Readonly<Record<string, IStarmapSystemAnnotation>>;
  onSystemClick?: (id: string) => void;
  onSystemHover?: (id: string | null) => void;
  className?: string;
}

export interface IStarmapSystemAnnotation {
  readonly label: string;
  readonly tone: 'safe' | 'warn' | 'risk';
}

export type LODLevel = 'far' | 'medium' | 'close';

export const FACTION_COLORS: Record<string, string> = {
  Lyran: '#1e40af',
  // Davion gold keeps House Davion distinct from Kurita's Dragon red.
  Davion: '#eab308',
  Liao: '#15803d',
  Kurita: '#dc2626',
  Marik: '#7c3aed',
  Steiner: '#2563eb',
  Periphery: '#a16207',
  ComStar: '#f5f5f5',
  Clan: '#059669',
  Independent: '#6b7280',
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 1.1;
export const INITIAL_POSITION = { x: 160, y: 64 };

const LOD_THRESHOLDS = { FAR: 0.3, MEDIUM: 0.7 };
const DOT_SIZES = { FAR: 5, MEDIUM: 8, CLOSE: 12 };
const MAJOR_SYSTEM_POPULATION = 1_000_000_000;
const FIT_PADDING = 90;
const FIT_MAX_ZOOM = 1.25;
const FIT_MIN_ZOOM = 0.7;
const FIT_TRIM = 0.05;

export function getLODLevel(zoom: number): LODLevel {
  if (zoom < LOD_THRESHOLDS.FAR) return 'far';
  if (zoom < LOD_THRESHOLDS.MEDIUM) return 'medium';
  return 'close';
}

export function getDotSize(lod: LODLevel): number {
  switch (lod) {
    case 'far':
      return DOT_SIZES.FAR;
    case 'medium':
      return DOT_SIZES.MEDIUM;
    case 'close':
      return DOT_SIZES.CLOSE;
  }
}

export function isMajorSystem(system: IStarSystem): boolean {
  return (system.population ?? 0) >= MAJOR_SYSTEM_POPULATION;
}

export function getFactionColor(faction: string): string {
  return FACTION_COLORS[faction] ?? FACTION_COLORS.Independent;
}

export function computeFitView(
  systems: readonly IStarSystem[],
  stageSize: { width: number; height: number },
): { zoom: number; position: { x: number; y: number } } {
  if (systems.length === 0 || stageSize.width <= 0 || stageSize.height <= 0) {
    return { zoom: 1, position: INITIAL_POSITION };
  }

  const xExtent = trimmedExtent(systems.map((system) => system.position.x));
  const yExtent = trimmedExtent(systems.map((system) => system.position.y));
  const spanX = Math.max(xExtent.max - xExtent.min, 1);
  const spanY = Math.max(yExtent.max - yExtent.min, 1);

  const usableWidth = Math.max(stageSize.width - FIT_PADDING * 2, 1);
  const usableHeight = Math.max(stageSize.height - FIT_PADDING * 2, 1);
  const zoom = Math.min(
    Math.max(Math.min(usableWidth / spanX, usableHeight / spanY), FIT_MIN_ZOOM),
    FIT_MAX_ZOOM,
  );

  return {
    zoom,
    position: {
      x: FIT_PADDING - xExtent.min * zoom + (usableWidth - spanX * zoom) / 2,
      y: FIT_PADDING - yExtent.min * zoom + (usableHeight - spanY * zoom) / 2,
    },
  };
}

export function panToInclude(
  view: { zoom: number; position: { x: number; y: number } },
  points: readonly { x: number; y: number }[],
  stageSize: { width: number; height: number },
): { zoom: number; position: { x: number; y: number } } {
  const { zoom } = view;
  const position = { ...view.position };
  for (const point of points) {
    const screenX = point.x * zoom + position.x;
    const screenY = point.y * zoom + position.y;
    if (screenX < FIT_PADDING) {
      position.x += FIT_PADDING - screenX;
    } else if (screenX > stageSize.width - FIT_PADDING) {
      position.x -= screenX - (stageSize.width - FIT_PADDING);
    }
    if (screenY < FIT_PADDING) {
      position.y += FIT_PADDING - screenY;
    } else if (screenY > stageSize.height - FIT_PADDING) {
      position.y -= screenY - (stageSize.height - FIT_PADDING);
    }
  }
  return { zoom, position };
}

export function annotationToneGlyph(
  tone: IStarmapSystemAnnotation['tone'],
): string {
  switch (tone) {
    case 'risk':
      return '! ';
    case 'warn':
      return '^ ';
    case 'safe':
      return '+ ';
  }
}

function trimmedExtent(values: readonly number[]): {
  min: number;
  max: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const lo = Math.floor(sorted.length * FIT_TRIM);
  const hi = Math.ceil(sorted.length * (1 - FIT_TRIM)) - 1;
  return { min: sorted[lo], max: sorted[Math.max(hi, lo)] };
}
