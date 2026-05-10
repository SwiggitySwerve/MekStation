import React, { useState, useCallback, useMemo, useEffect } from 'react';

import type {
  IHexCoordinate,
  IUnitToken,
  IMovementRangeHex,
  IHexTerrain,
  IHexGrid,
  IHex,
  IGameEvent,
  IWeaponStatus,
} from '@/types/gameplay';

import { AttackEffectsLayer } from '@/components/gameplay/effects/AttackEffectsLayer';
import { PersistentEffectsLayer } from '@/components/gameplay/effects/PersistentEffectsLayer';
import { FiringArcOverlay } from '@/components/gameplay/overlays/FiringArcOverlay';
import { LineOfSightOverlay } from '@/components/gameplay/overlays/LineOfSightOverlay';
import { TerrainSymbolDefs } from '@/components/gameplay/terrain/TerrainSymbolDefs';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { GameSide, TerrainType } from '@/types/gameplay';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';

import { HexCell } from './HexCell';
import {
  MapControls,
  MapHtmlOverlays,
  SensorRingsLayer,
  TerrainOverlayLayers,
  UnitTokensLayer,
} from './HexMapDisplay.layers';
import { TerrainPatternDefs } from './Overlays';
import { generateHexesInRadius, hexEquals, hexInList } from './renderHelpers';
import {
  useMapInteraction,
  type MapInteractionState,
} from './useMapInteraction';

export interface HexMapDisplayProps {
  mapId?: string;
  radius: number;
  tokens: readonly IUnitToken[];
  events?: readonly IGameEvent[];
  selectedHex: IHexCoordinate | null;
  hexTerrain?: readonly IHexTerrain[];
  movementRange?: readonly IMovementRangeHex[];
  attackRange?: readonly IHexCoordinate[];
  unitWeapons?: Record<string, readonly IWeaponStatus[]>;
  friendlySide?: GameSide;
  highlightPath?: readonly IHexCoordinate[];
  /**
   * Per `add-movement-phase-ui` task 4.3: cumulative MP cost of the
   * currently-previewed path. When present (hovering a reachable
   * hex) the map shows an MP badge at the hovered destination.
   */
  hoverMpCost?: number;
  /**
   * Per § 4.4: `true` when the user hovers a hex outside the
   * reachable set during the Movement phase — drives the shared
   * "Unreachable" tooltip the map renders in its HTML overlay.
   */
  hoverUnreachable?: boolean;
  /**
   * Per task 10.1 / legend scenarios: when the host page is in the
   * Movement phase we also draw a small MP-type legend at the
   * bottom-left of the map. Each row lights up for the currently
   * active MP type so the player can tell at a glance what the
   * overlay colors mean.
   */
  mpLegend?: {
    readonly active: 'walk' | 'run' | 'jump';
    readonly jumpAvailable: boolean;
  };
  onHexClick?: (hex: IHexCoordinate) => void;
  onHexHover?: (hex: IHexCoordinate | null) => void;
  onTokenClick?: (unitId: string) => void;
  /**
   * Per `add-minimap-and-camera-controls` task 2.3 and task 7.x: the
   * host handles double-click on a unit token by centering the camera
   * on that unit and selecting it. Delegated up so the host (which
   * owns selection state) can do both in one dispatch.
   */
  onTokenDoubleClick?: (unitId: string) => void;
  /**
   * Optional — called once the map's internal `useMapInteraction`
   * state exists so the host can forward the camera controls to the
   * minimap and the hotkey layer. The map remains the single owner
   * of camera state; this is a read/action bridge, not a sync.
   */
  onInteractionReady?: (state: MapInteractionState) => void;
  /**
   * Host-supplied extras rendered inside the map's positioned
   * container (above the SVG, below the zoom/overlay controls).
   * Used by the GameplayLayout to mount the minimap + hotkey hint +
   * help overlay without having to duplicate the container
   * positioning logic.
   */
  overlayChildren?: React.ReactNode;
  showCoordinates?: boolean;
  className?: string;
}

function isOperationalWeapon(weapon: IWeaponStatus): boolean {
  if (weapon.destroyed || weapon.jammed) return false;
  if (weapon.ammoRemaining !== undefined && weapon.ammoRemaining <= 0) {
    return false;
  }
  return true;
}

export function HexMapDisplay({
  mapId = 'default-map',
  radius,
  tokens,
  events = [],
  selectedHex,
  hexTerrain = [],
  movementRange = [],
  attackRange = [],
  unitWeapons = {},
  friendlySide = GameSide.Player,
  highlightPath = [],
  hoverMpCost,
  hoverUnreachable = false,
  mpLegend,
  onHexClick,
  onHexHover,
  onTokenClick,
  onTokenDoubleClick,
  onInteractionReady,
  overlayChildren,
  showCoordinates = false,
  className = '',
}: HexMapDisplayProps): React.ReactElement {
  const [hoveredHex, setHoveredHex] = useState<IHexCoordinate | null>(null);
  const activeAnimations = useAnimationQueue((s) => s.active);
  const screenShake = useScreenShake({ events });

  const interaction = useMapInteraction(radius);

  const hexes = useMemo(() => generateHexesInRadius(radius), [radius]);

  const terrainLookup = useMemo(() => {
    const map = new Map<string, IHexTerrain>();
    for (const t of hexTerrain) {
      map.set(`${t.coordinate.q},${t.coordinate.r}`, t);
    }
    return map;
  }, [hexTerrain]);

  const movementRangeLookup = useMemo(() => {
    const map = new Map<string, IMovementRangeHex>();
    for (const m of movementRange) {
      map.set(`${m.hex.q},${m.hex.r}`, m);
    }
    return map;
  }, [movementRange]);

  const hexGrid = useMemo((): IHexGrid => {
    const hexMap = new Map<string, IHex>();
    for (const t of hexTerrain) {
      const key = coordToKey(t.coordinate);
      const terrainType = t.features[0]?.type ?? TerrainType.Clear;
      hexMap.set(key, {
        coord: t.coordinate,
        occupantId: null,
        terrain: terrainType,
        elevation: t.elevation,
      });
    }
    for (const hex of hexes) {
      const key = coordToKey(hex);
      if (!hexMap.has(key)) {
        hexMap.set(key, {
          coord: hex,
          occupantId: null,
          terrain: TerrainType.Clear,
          elevation: 0,
        });
      }
    }
    return { config: { radius }, hexes: hexMap };
  }, [hexTerrain, hexes, radius]);

  const selectedToken = useMemo(
    () => tokens.find((t) => t.isSelected) ?? null,
    [tokens],
  );

  const selectedUnitPosition = selectedToken?.position ?? null;

  const movementAnimationsByUnit = useMemo(() => {
    const lookup = new Map<string, (typeof activeAnimations)[number]>();
    for (const animation of activeAnimations) {
      if (
        animation.mapId === mapId &&
        animation.kind === 'movement' &&
        animation.unitId
      ) {
        lookup.set(animation.unitId, animation);
      }
    }
    return lookup;
  }, [activeAnimations, mapId]);

  const orderedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const aAnimating = movementAnimationsByUnit.has(a.unitId);
      const bAnimating = movementAnimationsByUnit.has(b.unitId);
      if (aAnimating === bAnimating) return 0;
      return aAnimating ? 1 : -1;
    });
  }, [movementAnimationsByUnit, tokens]);

  const hasActiveMovementAnimation = useMemo(
    () =>
      activeAnimations.some(
        (animation) =>
          animation.mapId === mapId && animation.kind === 'movement',
      ),
    [activeAnimations, mapId],
  );

  const selectedUnitWeapons = useMemo(() => {
    if (!selectedToken) return [];
    return unitWeapons[selectedToken.unitId] ?? [];
  }, [selectedToken, unitWeapons]);

  const hasConfiguredWeaponList =
    selectedToken !== null &&
    Object.prototype.hasOwnProperty.call(unitWeapons, selectedToken.unitId);

  const operationalWeapons = useMemo(
    () => selectedUnitWeapons.filter(isOperationalWeapon),
    [selectedUnitWeapons],
  );

  const selectedWeaponMaxRange = useMemo(() => {
    if (hasConfiguredWeaponList) {
      if (operationalWeapons.length === 0) return radius;
      return Math.max(
        0,
        ...operationalWeapons.map((weapon) => weapon.ranges.long),
      );
    }

    if (!selectedUnitPosition || attackRange.length === 0) return radius;
    return Math.max(
      0,
      ...attackRange.map((hex) => hexDistance(selectedUnitPosition, hex)),
    );
  }, [
    attackRange,
    hasConfiguredWeaponList,
    operationalWeapons,
    radius,
    selectedUnitPosition,
  ]);

  const visibleFiringArcs = useMemo(() => {
    if (!hasConfiguredWeaponList || operationalWeapons.length > 0)
      return undefined;
    return ['rear'] as const;
  }, [hasConfiguredWeaponList, operationalWeapons.length]);

  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      setHoveredHex(null);
      onHexHover?.(null);
      onHexClick?.(hex);
    },
    [onHexClick, onHexHover],
  );

  const handleHexHover = useCallback(
    (hex: IHexCoordinate | null) => {
      setHoveredHex(hex);
      onHexHover?.(hex);
    },
    [onHexHover],
  );

  const handleTokenClick = useCallback(
    (unitId: string) => {
      onTokenClick?.(unitId);
    },
    [onTokenClick],
  );

  const handleTokenDoubleClick = useCallback(
    (unitId: string) => {
      onTokenDoubleClick?.(unitId);
    },
    [onTokenDoubleClick],
  );

  // Publish the interaction bridge once mounted (and whenever the
  // underlying callable surface changes). The host uses this to wire
  // the minimap + hotkey layer without owning camera state itself.
  useEffect(() => {
    onInteractionReady?.(interaction);
  }, [onInteractionReady, interaction]);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      data-testid="hex-map-container"
      data-screen-shake-active={screenShake.isShaking ? 'true' : undefined}
      data-screen-shake-transform={screenShake.transform}
      style={screenShake.style}
    >
      <svg
        ref={interaction.svgRef}
        viewBox={interaction.transformedViewBox}
        className="h-full w-full touch-manipulation"
        onWheel={interaction.handleWheel}
        onMouseDown={interaction.handleMouseDown}
        onMouseMove={interaction.handleMouseMove}
        onMouseUp={interaction.handleMouseUp}
        onMouseLeave={interaction.handleMouseUp}
        onTouchStart={interaction.handleTouchStart}
        onTouchMove={interaction.handleTouchMove}
        onTouchEnd={interaction.handleTouchEnd}
        data-testid="hex-grid"
      >
        <TerrainPatternDefs />
        {/*
          Per `add-terrain-rendering` task 9.1: terrain art is emitted
          once as `<symbol>` nodes in the SVG defs so each HexCell can
          reference it via `<use>`. Keeps per-hex render cost O(1).
        */}
        <defs>
          <TerrainSymbolDefs />
        </defs>
        <g>
          {hexes.map((hex) => {
            const key = `${hex.q},${hex.r}`;
            const terrain = terrainLookup.get(key);
            const isSelected = selectedHex
              ? hexEquals(hex, selectedHex)
              : false;
            const isHovered = hoveredHex ? hexEquals(hex, hoveredHex) : false;
            const movementInfo = movementRangeLookup.get(key);
            const isInAttackRange = hexInList(hex, attackRange);
            const isInPath = hexInList(hex, highlightPath);

            // Per add-movement-phase-ui § 4.3: only the currently
            // hovered reachable hex gets the MP cost badge.
            const cellHoverMpCost =
              isHovered && hoverMpCost !== undefined && movementInfo?.reachable
                ? hoverMpCost
                : undefined;
            // Per § 4.4: flag the hovered cell when it's outside the
            // reachable envelope so the tooltip layer keys off it.
            const cellIsUnreachableHover =
              isHovered && hoverUnreachable && !movementInfo?.reachable;

            return (
              <HexCell
                key={key}
                hex={hex}
                terrain={terrain}
                terrainLookup={terrainLookup}
                isSelected={isSelected}
                isHovered={isHovered}
                movementInfo={movementInfo}
                isInAttackRange={isInAttackRange}
                isInPath={isInPath}
                showCoordinate={showCoordinates}
                hoverMpCost={cellHoverMpCost}
                isUnreachableHover={cellIsUnreachableHover}
                onClick={() => handleHexClick(hex)}
                onMouseEnter={() => handleHexHover(hex)}
                onMouseLeave={() => handleHexHover(null)}
              />
            );
          })}
        </g>

        {interaction.showFiringArcOverlay &&
          selectedToken &&
          selectedToken.side === friendlySide &&
          !hasActiveMovementAnimation && (
            <FiringArcOverlay
              unit={{
                coord: selectedToken.position,
                facing: selectedToken.facing,
                unitId: selectedToken.unitId,
              }}
              hexes={hexes}
              maxRange={selectedWeaponMaxRange}
              visibleArcs={visibleFiringArcs}
              enabled
              testId="firing-arc-overlay"
            />
          )}

        {interaction.showLOSOverlay &&
          selectedUnitPosition &&
          hoveredHex &&
          !hasActiveMovementAnimation && (
            <LineOfSightOverlay
              origin={selectedUnitPosition}
              target={hoveredHex}
              grid={hexGrid}
              tokens={tokens}
              testId="los-overlay"
            />
          )}

        <SensorRingsLayer orderedTokens={orderedTokens} />

        <UnitTokensLayer
          orderedTokens={orderedTokens}
          movementAnimationsByUnit={movementAnimationsByUnit}
          events={events}
          tokens={tokens}
          onTokenClick={handleTokenClick}
          onTokenDoubleClick={handleTokenDoubleClick}
        />

        <PersistentEffectsLayer tokens={tokens} events={events} />
        <AttackEffectsLayer events={events} tokens={tokens} mapId={mapId} />

        <TerrainOverlayLayers
          interaction={interaction}
          hexes={hexes}
          terrainLookup={terrainLookup}
        />
      </svg>
      <div className="sr-only" aria-live="polite">
        {screenShake.liveMessage}
      </div>

      {/*
        Per add-movement-phase-ui § 4.4 "Hover unreachable hex shows
        tooltip": when the consumer flags the currently-hovered hex as
        unreachable we render a single shared "Unreachable" tooltip in
        HTML above the SVG rather than duplicating DOM per cell.
      */}
      <MapHtmlOverlays
        hoverUnreachable={hoverUnreachable}
        mpLegend={mpLegend}
      />

      {/*
        Per add-movement-phase-ui task 10.1 / scenarios "Legend
        reflects current MP type" + "Jump unavailable dims Jump row":
        draw a small legend so the player knows what the walk/run/jump
        tints mean. Active row bolded + outlined; inactive rows dim;
        Jump row dims further and shows a tooltip when the unit has no
        jump capability.
      */}
      <MapControls interaction={interaction} />

      {/* Host-supplied overlays (minimap, hotkey help, hint badge).
          Rendered inside the positioned container so they share the
          map's coordinate space. Per add-minimap-and-camera-controls. */}
      {overlayChildren}
    </div>
  );
}

export default HexMapDisplay;
