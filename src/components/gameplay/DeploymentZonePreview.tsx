/**
 * DeploymentZonePreview
 *
 * Non-interactive hex grid preview for the pre-battle setup screen.
 * Renders all hexes within the chosen radius, applies a uniform terrain
 * color from the selected preset, and overlays per-side deployment
 * zones (Player = west edge band in blue, Opponent = east edge band in
 * red) with semi-transparent tints.
 *
 * The preview is intentionally simple: it does not load tokens, does
 * not respond to clicks, and uses a self-contained SVG so it can sit
 * beside the main `HexMapDisplay` without sharing interactive state.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/specs/tactical-map-interface/spec.md
 */

import { useMemo, useState } from 'react';

import type { IHexCoordinate } from '@/types/gameplay';

import { Card } from '@/components/ui';
import { TERRAIN_COLORS } from '@/constants/terrain';
import { TerrainPreset } from '@/types/encounter';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

// =============================================================================
// Public Props
// =============================================================================

export interface DeploymentZonePreviewProps {
  /** Map radius in hexes (5/8/12/17 per `MAP_RADIUS_OPTIONS`). */
  radius: number;
  /** Terrain preset selected by the user. */
  preset: TerrainPreset;
}

// =============================================================================
// Constants
// =============================================================================

/** Pixel size for the preview hexes (smaller than the main map). */
const HEX_SIZE = 14;

/** Width of the deployment-zone band on each edge (in hex columns). */
const ZONE_BAND_WIDTH = 2;

/** Player overlay color (blue) per spec § Zone Overlay. */
const PLAYER_OVERLAY = 'rgba(59, 130, 246, 0.35)';
/** Opponent overlay color (red) per spec § Zone Overlay. */
const OPPONENT_OVERLAY = 'rgba(239, 68, 68, 0.35)';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map a terrain preset to its primary `TerrainType`. Mixed presets
 * (Woods, Urban, Mountains) use the dominant feature for visualization;
 * the engine renders per-hex variation at game start.
 */
function presetToTerrainType(preset: TerrainPreset): TerrainType {
  switch (preset) {
    case TerrainPreset.LightWoods:
      return TerrainType.LightWoods;
    case TerrainPreset.HeavyWoods:
      return TerrainType.HeavyWoods;
    case TerrainPreset.Urban:
      return TerrainType.Building;
    case TerrainPreset.Rough:
      return TerrainType.Rough;
    case TerrainPreset.Clear:
    default:
      return TerrainType.Clear;
  }
}

/**
 * Generate every axial hex coordinate within `radius` of origin.
 * Mirrors `generateHexesInRadius` in HexMapDisplay/renderHelpers but
 * inlined here to keep this preview component self-contained.
 */
function generateHexes(radius: number): IHexCoordinate[] {
  const hexes: IHexCoordinate[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/** Convert axial coords to flat-top SVG pixel position. */
function hexToPixel(hex: IHexCoordinate): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * hex.q;
  const y = HEX_SIZE * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

/** Generate the SVG `points` attribute for a flat-top hexagon. */
function hexPolygonPoints(cx: number, cy: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i);
    const x = cx + HEX_SIZE * Math.cos(angleRad);
    const y = cy + HEX_SIZE * Math.sin(angleRad);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * Compute deployment zones from radius. Player = westernmost
 * `ZONE_BAND_WIDTH` columns, Opponent = easternmost. Returns coordinate
 * sets keyed for fast lookup during render.
 */
function computeZones(radius: number): {
  player: Set<string>;
  opponent: Set<string>;
} {
  const player = new Set<string>();
  const opponent = new Set<string>();
  const minQ = -radius;
  const maxQ = radius;

  for (let q = minQ; q <= maxQ; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const key = `${q},${r}`;
      if (q <= minQ + ZONE_BAND_WIDTH - 1) {
        player.add(key);
      } else if (q >= maxQ - ZONE_BAND_WIDTH + 1) {
        opponent.add(key);
      }
    }
  }
  return { player, opponent };
}

// =============================================================================
// Component
// =============================================================================

export function DeploymentZonePreview({
  radius,
  preset,
}: DeploymentZonePreviewProps): React.ReactElement {
  // Recompute everything when radius or preset changes — this guarantees
  // the spec's "preview updates within the same frame" requirement holds.
  const hexes = useMemo(() => generateHexes(radius), [radius]);
  const zones = useMemo(() => computeZones(radius), [radius]);
  const baseTerrain = presetToTerrainType(preset);
  const baseColor = TERRAIN_COLORS[baseTerrain];

  const [hoveredZone, setHoveredZone] = useState<'player' | 'opponent' | null>(
    null,
  );

  // Compute viewport bounds to frame the entire grid with padding.
  const { viewBox, width, height } = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const hex of hexes) {
      const { x, y } = hexToPixel(hex);
      minX = Math.min(minX, x - HEX_SIZE);
      minY = Math.min(minY, y - HEX_SIZE);
      maxX = Math.max(maxX, x + HEX_SIZE);
      maxY = Math.max(maxY, y + HEX_SIZE);
    }
    const padding = HEX_SIZE;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    return {
      viewBox: `${minX - padding} ${minY - padding} ${w} ${h}`,
      width: w,
      height: h,
    };
  }, [hexes]);

  const playerHexCount = zones.player.size;
  const opponentHexCount = zones.opponent.size;

  // Spec § "Empty zones handled" — flag if either side ends up with no
  // valid deployment hexes (only possible at very small radii).
  const playerEmpty = playerHexCount === 0;
  const opponentEmpty = opponentHexCount === 0;

  // Build the legend list — only include the terrain types actually
  // present in the preview (currently a single dominant terrain).
  const legendEntries = useMemo(() => {
    const entries: Array<{
      label: string;
      color: string;
      key: string;
    }> = [];
    entries.push({
      label: prettyTerrainLabel(baseTerrain),
      color: baseColor,
      key: `terrain-${baseTerrain}`,
    });
    if (playerHexCount > 0) {
      entries.push({
        label: 'Player deployment',
        color: PLAYER_OVERLAY,
        key: 'zone-player',
      });
    }
    if (opponentHexCount > 0) {
      entries.push({
        label: 'Opponent deployment',
        color: OPPONENT_OVERLAY,
        key: 'zone-opponent',
      });
    }
    return entries;
  }, [baseTerrain, baseColor, playerHexCount, opponentHexCount]);

  return (
    <Card className="mb-6" data-testid="deployment-zone-preview">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-text-theme-secondary text-sm font-medium">
            Deployment Preview
          </h3>
          <span className="text-text-theme-muted text-xs">
            r={radius} · {hexes.length} hexes
          </span>
        </div>

        {(playerEmpty || opponentEmpty) && (
          <p
            className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-300"
            data-testid="deployment-zone-warning"
          >
            No valid deployment hexes for {playerEmpty ? 'Player' : 'Opponent'}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <div
            className="bg-surface-raised relative w-full overflow-hidden rounded border border-gray-700"
            data-testid="deployment-zone-svg-container"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <svg
              viewBox={viewBox}
              role="img"
              aria-label="Deployment zone preview"
              className="h-full w-full"
              data-testid="deployment-zone-svg"
            >
              {hexes.map((hex) => {
                const { x, y } = hexToPixel(hex);
                const key = `${hex.q},${hex.r}`;
                const inPlayerZone = zones.player.has(key);
                const inOpponentZone = zones.opponent.has(key);
                const overlayColor = inPlayerZone
                  ? PLAYER_OVERLAY
                  : inOpponentZone
                    ? OPPONENT_OVERLAY
                    : null;
                const tooltip = inPlayerZone
                  ? `Player deployment (${playerHexCount} hexes)`
                  : inOpponentZone
                    ? `Opponent deployment (${opponentHexCount} hexes)`
                    : `Hex (${hex.q}, ${hex.r})`;

                return (
                  <g
                    key={key}
                    onMouseEnter={() =>
                      setHoveredZone(
                        inPlayerZone
                          ? 'player'
                          : inOpponentZone
                            ? 'opponent'
                            : null,
                      )
                    }
                    onMouseLeave={() => setHoveredZone(null)}
                    data-testid={`hex-${hex.q}-${hex.r}`}
                  >
                    <polygon
                      points={hexPolygonPoints(x, y)}
                      fill={baseColor}
                      stroke="#374151"
                      strokeWidth={0.5}
                    >
                      <title>{tooltip}</title>
                    </polygon>
                    {overlayColor && (
                      <polygon
                        points={hexPolygonPoints(x, y)}
                        fill={overlayColor}
                        stroke="none"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <aside
            className="text-text-theme-secondary text-xs"
            data-testid="deployment-zone-legend"
          >
            <p className="text-text-theme-muted mb-2 font-medium uppercase">
              Legend
            </p>
            <ul className="space-y-1">
              {legendEntries.map((entry) => (
                <li
                  key={entry.key}
                  className="flex items-center gap-2"
                  data-testid={`legend-${entry.key}`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-gray-600"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.label}</span>
                </li>
              ))}
            </ul>
            {hoveredZone && (
              <p
                className="mt-3 rounded border border-gray-700 bg-gray-800 p-2"
                data-testid="deployment-zone-tooltip"
              >
                {hoveredZone === 'player'
                  ? `Player deployment · ${playerHexCount} hexes`
                  : `Opponent deployment · ${opponentHexCount} hexes`}
              </p>
            )}
          </aside>
        </div>
      </div>
    </Card>
  );
}

/**
 * Convert a `TerrainType` to a human-readable legend label.
 */
function prettyTerrainLabel(terrain: TerrainType): string {
  switch (terrain) {
    case TerrainType.Clear:
      return 'Clear';
    case TerrainType.LightWoods:
      return 'Light Woods';
    case TerrainType.HeavyWoods:
      return 'Heavy Woods';
    case TerrainType.Building:
      return 'Urban / Buildings';
    case TerrainType.Rough:
      return 'Rough';
    default:
      return terrain;
  }
}
