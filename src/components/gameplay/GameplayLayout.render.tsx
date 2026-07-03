import React from 'react';

import type { InteractivePhase } from '@/stores/useGameplayStore';
import type {
  GameSide,
  IGameEvent,
  IGameSession,
  IHexTerrain,
  ILayoutConfig,
  IMovementRangeHex,
  IPilotSpaSummary,
  ITacticalCommandContext,
  IUnitToken,
  IWeaponStatus,
  TacticalActionHandler,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import type { IAttackComposerContext } from './AttackIntentComposer';
import type { GameplayLayoutControls } from './GameplayLayout.controls';
import type { SelectedUnitModel } from './GameplayLayout.selection';
import type { IntentComposerMapProps } from './GameplayLayout.types';
import type {
  MapMovementKind,
  MapMovementPointLegendState,
} from './HexMapDisplay/HexMapDisplay.types';
import type { MapInteractionState } from './HexMapDisplay/useMapInteraction';
import type { IMovementComposerContext } from './MovementIntentComposer';
import type { PhysicalAttackIntent } from './PhysicalAttackPanel';
import type {
  ICommandPreviewInputs,
  IGmTacticalInterventionSurface,
} from './TacticalActionDock';

import { GameplayActionDockSlot } from './GameplayLayout.actionDockSlot';
import {
  GameplayEventLogSlot,
  GameplayMobileRecordSheetDrawer,
} from './GameplayLayout.drawerAndFeed';
import {
  GameplayMainContentArea,
  type GameplayLayoutLensState,
} from './GameplayLayout.mainContent';
import { RecordSheetBody } from './GameplayLayout.sections';
import { GameplayMoraleBand, GameplayTopBand } from './GameplayLayout.topBand';
import { TacticalCommandShell } from './TacticalCommandShell';
import { TacticalTurnRail } from './TacticalTurnRail';

type PhaseQueueProjection = React.ComponentProps<
  typeof TacticalTurnRail
>['projection'];

interface GameplayLayoutViewProps {
  readonly className: string;
  readonly session: IGameSession;
  readonly phaseQueueProjection: PhaseQueueProjection;
  readonly shellMode: ShellMode;
  readonly gmIntervention: IGmTacticalInterventionSurface | undefined;
  readonly localFogPlayerId: string;
  readonly playerSide: GameSide;
  readonly selectedUnitId: string | null;
  readonly onUnitSelect: (unitId: string | null) => void;
  readonly isNarrow: boolean;
  readonly drawerOpen: boolean;
  readonly onToggleDrawer: () => void;
  readonly layout: ILayoutConfig;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly onStartDragging: () => void;
  readonly lensState: GameplayLayoutLensState;
  readonly tokens: readonly IUnitToken[];
  readonly visibleEvents: readonly IGameEvent[];
  readonly eventActorLookup: Record<string, string>;
  readonly eventWeaponLookup: Record<string, string>;
  readonly selectedUnitModel: SelectedUnitModel;
  readonly hexTerrain: readonly IHexTerrain[];
  readonly tacticalProjectionFrame: ITacticalMapProjectionFrame;
  readonly movementRange: readonly IMovementRangeHex[];
  readonly activeTargetId: string | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly selectedWeaponIds?: readonly string[];
  readonly highlightPath: readonly { readonly q: number; readonly r: number }[];
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
  readonly mpLegend: MapMovementPointLegendState | undefined;
  readonly onMovementModeSelect: ((mode: MapMovementKind) => void) | undefined;
  readonly onHexHover:
    | ((hex: { readonly q: number; readonly r: number } | null) => void)
    | undefined;
  readonly intentComposer: IntentComposerMapProps | undefined;
  readonly onInteractionReady: (interaction: MapInteractionState) => void;
  readonly controls: GameplayLayoutControls;
  readonly physicalAttackIntent: PhysicalAttackIntent | null | undefined;
  readonly interactivePhase: InteractivePhase | undefined;
  readonly hitChance: number | null | undefined;
  readonly maxArmor: Record<string, Record<string, number>>;
  readonly maxStructure: Record<string, Record<string, number>>;
  readonly pilotNames: Record<string, string>;
  readonly heatSinks: Record<string, number>;
  readonly unitSpas: Record<string, readonly IPilotSpaSummary[]>;
  readonly actionContext: ITacticalCommandContext;
  readonly canUndo: boolean;
  readonly isPlayerTurn: boolean;
  readonly onAction: TacticalActionHandler;
  readonly commandPreviewInputs: ICommandPreviewInputs;
  readonly composerDockContext: IMovementComposerContext | undefined;
  readonly attackComposerContext: IAttackComposerContext | undefined;
  readonly onEventLogCollapsedChange: (collapsed: boolean) => void;
}

export function GameplayLayoutView({
  className,
  session,
  phaseQueueProjection,
  shellMode,
  gmIntervention,
  localFogPlayerId,
  playerSide,
  selectedUnitId,
  onUnitSelect,
  isNarrow,
  drawerOpen,
  onToggleDrawer,
  layout,
  containerRef,
  onStartDragging,
  lensState,
  tokens,
  visibleEvents,
  eventActorLookup,
  eventWeaponLookup,
  selectedUnitModel,
  hexTerrain,
  tacticalProjectionFrame,
  movementRange,
  activeTargetId,
  unitWeapons,
  selectedWeaponIds,
  highlightPath,
  hoverMpCost,
  hoverUnreachable,
  mpLegend,
  onMovementModeSelect,
  onHexHover,
  intentComposer,
  onInteractionReady,
  controls,
  physicalAttackIntent,
  interactivePhase,
  hitChance,
  maxArmor,
  maxStructure,
  pilotNames,
  heatSinks,
  unitSpas,
  actionContext,
  canUndo,
  isPlayerTurn,
  onAction,
  commandPreviewInputs,
  composerDockContext,
  attackComposerContext,
  onEventLogCollapsedChange,
}: GameplayLayoutViewProps): React.ReactElement {
  const recordSheetBody = (
    <RecordSheetBody
      selectedUnitId={selectedUnitId}
      selectedUnit={selectedUnitModel.selectedUnit}
      selectedUnitInfo={selectedUnitModel.selectedUnitInfo}
      selectedUnitFromSession={selectedUnitModel.selectedUnitFromSession}
      maxArmor={maxArmor}
      maxStructure={maxStructure}
      unitWeapons={unitWeapons}
      pilotNames={pilotNames}
      heatSinks={heatSinks}
      unitSpas={unitSpas}
      visibleEvents={visibleEvents}
    />
  );

  return (
    <TacticalCommandShell
      viewerPlayerId={localFogPlayerId}
      shellMode={shellMode}
      sessionId={session.id}
    >
      <div
        className={`flex h-full flex-col bg-gray-100 ${className}`}
        data-testid="gameplay-layout"
      >
        <GameplayTopBand
          projection={phaseQueueProjection}
          session={session}
          shellMode={shellMode}
          selectedUnitId={selectedUnitId}
          onUnitSelect={onUnitSelect}
          isNarrow={isNarrow}
          drawerOpen={drawerOpen}
          onToggleDrawer={onToggleDrawer}
        />
        <GameplayMoraleBand session={session} />
        <GameplayMainContentArea
          containerRef={containerRef}
          isNarrow={isNarrow}
          lensState={lensState}
          layout={layout}
          session={session}
          tokens={tokens}
          visibleEvents={visibleEvents}
          selectedUnit={selectedUnitModel.selectedUnit}
          hexTerrain={hexTerrain}
          tacticalProjectionFrame={tacticalProjectionFrame}
          movementRange={movementRange}
          activeTargetId={activeTargetId}
          unitWeapons={unitWeapons}
          selectedWeaponIds={selectedWeaponIds}
          playerSide={playerSide}
          highlightPath={highlightPath}
          hoverMpCost={hoverMpCost}
          hoverUnreachable={hoverUnreachable}
          mpLegend={mpLegend}
          onMovementModeSelect={onMovementModeSelect}
          onHexHover={onHexHover}
          intentComposer={intentComposer}
          onInteractionReady={onInteractionReady}
          controls={controls}
          physicalAttackIntent={physicalAttackIntent}
          interactivePhase={interactivePhase}
          hitChance={hitChance}
          onStartDragging={onStartDragging}
          selectedUnitId={selectedUnitId}
          localFogPlayerId={localFogPlayerId}
          recordSheetBody={recordSheetBody}
          maxArmor={maxArmor}
          maxStructure={maxStructure}
          pilotNames={pilotNames}
          heatSinks={heatSinks}
        />
        <GameplayMobileRecordSheetDrawer
          isNarrow={isNarrow}
          drawerOpen={drawerOpen}
          onToggleDrawer={onToggleDrawer}
        >
          {recordSheetBody}
        </GameplayMobileRecordSheetDrawer>
        <GameplayActionDockSlot
          actionContext={actionContext}
          shellMode={shellMode}
          gmIntervention={gmIntervention}
          onAction={onAction}
          commandPreviewInputs={commandPreviewInputs}
          composerDockContext={composerDockContext}
          attackComposerContext={attackComposerContext}
          interactivePhase={interactivePhase}
          isPlayerTurn={isPlayerTurn}
          canUndo={canUndo}
        />
        <GameplayEventLogSlot
          visibleEvents={visibleEvents}
          collapsed={layout.eventLogCollapsed}
          onCollapsedChange={onEventLogCollapsedChange}
          actorLookup={eventActorLookup}
          weaponLookup={eventWeaponLookup}
        />
      </div>
    </TacticalCommandShell>
  );
}
