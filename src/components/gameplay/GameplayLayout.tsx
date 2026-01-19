/**
 * Gameplay Layout Component
 * Main split-view layout for the gameplay interface.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  GamePhase,
  GameSide,
  IGameSession,
  IUnitGameState,
  IUnitToken,
  ILayoutConfig,
  IWeaponStatus,
  DEFAULT_LAYOUT_CONFIG,
  getLayoutForPhase,
} from '@/types/gameplay';
import { PhaseBanner } from './PhaseBanner';
import { ActionBar } from './ActionBar';
import { EventLogDisplay } from './EventLogDisplay';
import { HexMapDisplay } from './HexMapDisplay';
import { RecordSheetDisplay } from './RecordSheetDisplay';

// =============================================================================
// Types
// =============================================================================

export interface GameplayLayoutProps {
  /** Game session data */
  session: IGameSession;
  /** Currently selected unit ID */
  selectedUnitId: string | null;
  /** Callback when unit is selected */
  onUnitSelect: (unitId: string | null) => void;
  /** Callback when action is triggered */
  onAction: (actionId: string) => void;
  /** Callback when hex is clicked */
  onHexClick?: (hex: { q: number; r: number }) => void;
  /** Can the player undo? */
  canUndo?: boolean;
  /** Is it the player's turn? */
  isPlayerTurn?: boolean;
  /** Unit weapon data for record sheet */
  unitWeapons?: Record<string, readonly IWeaponStatus[]>;
  /** Max armor values per unit */
  maxArmor?: Record<string, Record<string, number>>;
  /** Max structure values per unit */
  maxStructure?: Record<string, Record<string, number>>;
  /** Pilot names per unit */
  pilotNames?: Record<string, string>;
  /** Heat sinks per unit */
  heatSinks?: Record<string, number>;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert unit state to display token.
 */
function unitStateToToken(
  unitId: string,
  state: IUnitGameState,
  unitInfo: { name: string; side: GameSide },
  isSelected: boolean,
  isValidTarget: boolean
): IUnitToken {
  // Generate a short designation from the unit name
  const designation = unitInfo.name
    .split(/[\s-]+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  return {
    unitId,
    name: unitInfo.name,
    side: unitInfo.side,
    position: state.position,
    facing: state.facing,
    isSelected,
    isValidTarget,
    isDestroyed: state.destroyed,
    designation,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Main gameplay layout with split view.
 */
export function GameplayLayout({
  session,
  selectedUnitId,
  onUnitSelect,
  onAction,
  onHexClick,
  canUndo = false,
  isPlayerTurn = true,
  unitWeapons = {},
  maxArmor = {},
  maxStructure = {},
  pilotNames = {},
  heatSinks = {},
  className = '',
}: GameplayLayoutProps): React.ReactElement {
  const { currentState, events, config, units } = session;
  const [layout, setLayout] = useState<ILayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update layout based on phase
  useEffect(() => {
    const phaseLayout = getLayoutForPhase(currentState.phase);
    setLayout((prev) => ({ ...prev, ...phaseLayout }));
  }, [currentState.phase]);

  // Build unit info lookup
  const unitInfoLookup = useMemo(() => {
    const lookup: Record<string, { name: string; side: GameSide }> = {};
    for (const unit of units) {
      lookup[unit.id] = { name: unit.name, side: unit.side };
    }
    return lookup;
  }, [units]);

  // Build tokens for map display
  const tokens = useMemo(() => {
    return Object.entries(currentState.units).map(([unitId, state]) => {
      const unitInfo = unitInfoLookup[unitId] || { name: 'Unknown', side: GameSide.Player };
      const isSelected = unitId === selectedUnitId;
      // In attack phase, opponent units are valid targets
      const isValidTarget =
        currentState.phase === GamePhase.WeaponAttack &&
        unitInfo.side === GameSide.Opponent &&
        !state.destroyed;

      return unitStateToToken(unitId, state, unitInfo, isSelected, isValidTarget);
    });
  }, [currentState, unitInfoLookup, selectedUnitId]);

  // Selected unit data
  const selectedUnit = selectedUnitId ? currentState.units[selectedUnitId] : null;
  const selectedUnitInfo = selectedUnitId ? unitInfoLookup[selectedUnitId] : null;
  const selectedUnitFromSession = selectedUnitId
    ? units.find((u) => u.id === selectedUnitId)
    : null;

  // Handle panel resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, percentage));

      setLayout((prev) => ({ ...prev, mapPanelWidth: clamped }));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle token click
  const handleTokenClick = useCallback(
    (unitId: string) => {
      onUnitSelect(unitId === selectedUnitId ? null : unitId);
    },
    [selectedUnitId, onUnitSelect]
  );

  // Handle hex click
  const handleHexClick = useCallback(
    (hex: { q: number; r: number }) => {
      onHexClick?.(hex);
    },
    [onHexClick]
  );

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`}>
      {/* Phase Banner */}
      <PhaseBanner
        phase={currentState.phase}
        turn={currentState.turn}
        activeSide={currentState.firstMover || GameSide.Player}
        isPlayerTurn={isPlayerTurn}
      />

      {/* Main Content Area */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Map Panel */}
        <div
          className="relative"
          style={{ width: `${layout.mapPanelWidth}%` }}
        >
          <HexMapDisplay
            radius={config.mapRadius}
            tokens={tokens}
            selectedHex={selectedUnit?.position || null}
            onHexClick={handleHexClick}
            onTokenClick={handleTokenClick}
            className="h-full"
          />
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-300 cursor-col-resize hover:bg-blue-400 transition-colors"
          onMouseDown={() => setIsDragging(true)}
        />

        {/* Record Sheet Panel */}
        <div
          className="flex-1 overflow-hidden"
          style={{ width: `${100 - layout.mapPanelWidth}%` }}
        >
          {selectedUnit && selectedUnitInfo && selectedUnitFromSession ? (
            <RecordSheetDisplay
              unitName={selectedUnitInfo.name}
              designation={selectedUnitFromSession.unitRef}
              state={selectedUnit}
              maxArmor={maxArmor[selectedUnitId!] || {}}
              maxStructure={maxStructure[selectedUnitId!] || {}}
              weapons={unitWeapons[selectedUnitId!] || []}
              pilotName={pilotNames[selectedUnitId!] || 'Unknown Pilot'}
              gunnery={selectedUnitFromSession.gunnery}
              piloting={selectedUnitFromSession.piloting}
              heatSinks={heatSinks[selectedUnitId!] || 10}
              className="h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p>Select a unit to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <ActionBar
        phase={currentState.phase}
        canUndo={canUndo}
        canAct={isPlayerTurn}
        onAction={onAction}
      />

      {/* Event Log */}
      <EventLogDisplay
        events={events}
        collapsed={layout.eventLogCollapsed}
        onCollapsedChange={(collapsed) =>
          setLayout((prev) => ({ ...prev, eventLogCollapsed: collapsed }))
        }
        maxHeight={150}
      />
    </div>
  );
}

export default GameplayLayout;
