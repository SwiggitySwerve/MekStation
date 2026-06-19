import {
  formatCriticalEntry,
  formatDamageEntry,
  formatPilotHitEntry,
  formatUnitDestroyedEntry,
} from '@/components/gameplay/damageFeedback';
import { formatRuntimeMovementStateChangedEvent } from '@/components/gameplay/EventLogDisplay.runtimeMovement';
import {
  GameEventType,
  GamePhase,
  type GameSide,
  type ICriticalHitResolvedPayload,
  type IDamageAppliedPayload,
  type IFormattedEvent,
  type IGameEvent,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
  type IPilotHitPayload,
  type IUnitDestroyedPayload,
} from '@/types/gameplay';

interface IEventFormatContext {
  readonly weaponLookup: Record<string, string>;
}

interface IEventFormatParts {
  readonly text: string;
  readonly unitId?: string;
  readonly side?: GameSide;
}

type EventFormatter = (
  event: IGameEvent,
  context: IEventFormatContext,
) => IEventFormatParts;

const EVENT_ICON_BY_TYPE: Partial<
  Record<GameEventType, IFormattedEvent['icon']>
> = {
  [GameEventType.MovementDeclared]: 'movement',
  [GameEventType.MovementInvalid]: 'movement',
  [GameEventType.MovementLocked]: 'movement',
  [GameEventType.FacingChanged]: 'movement',
  [GameEventType.RuntimeMovementStateChanged]: 'movement',
  [GameEventType.AttackDeclared]: 'attack',
  [GameEventType.AttackLocked]: 'attack',
  [GameEventType.AttacksRevealed]: 'attack',
  [GameEventType.AttackResolved]: 'attack',
  [GameEventType.PhysicalAttackDeclared]: 'attack',
  [GameEventType.PhysicalAttackResolved]: 'attack',
  [GameEventType.DamageApplied]: 'damage',
  [GameEventType.HeatGenerated]: 'heat',
  [GameEventType.HeatDissipated]: 'heat',
  [GameEventType.HeatEffectApplied]: 'heat',
  [GameEventType.CriticalHit]: 'critical',
  [GameEventType.AmmoExplosion]: 'critical',
  [GameEventType.PhaseChanged]: 'phase',
  [GameEventType.TurnStarted]: 'phase',
  [GameEventType.TurnEnded]: 'phase',
};

const ICON_COLOR_BY_ICON: Record<IFormattedEvent['icon'], string> = {
  movement: 'text-green-600',
  attack: 'text-red-600',
  damage: 'text-orange-600',
  heat: 'text-yellow-600',
  critical: 'text-purple-600',
  phase: 'text-blue-600',
  status: 'text-gray-600',
};

export function getEventIcon(type: GameEventType): IFormattedEvent['icon'] {
  return EVENT_ICON_BY_TYPE[type] ?? 'status';
}

export function getIconColor(icon: IFormattedEvent['icon']): string {
  return ICON_COLOR_BY_ICON[icon];
}

function formatTurnStarted(event: IGameEvent): IEventFormatParts {
  return { text: `Turn ${event.turn} started` };
}

function formatPhaseChanged(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as { fromPhase: GamePhase; toPhase: GamePhase };
  return { text: `Phase: ${payload.toPhase.replace('_', ' ')}` };
}

function formatInitiativeRolled(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    playerRoll: number;
    opponentRoll: number;
    winner: GameSide;
  };
  return {
    text: `Initiative: Player ${payload.playerRoll} vs Opponent ${payload.opponentRoll}. ${payload.winner} wins.`,
  };
}

function formatMovementDeclared(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    unitId: string;
    movementType: string;
    mpUsed: number;
  };
  return {
    unitId: payload.unitId,
    text: `Unit moved (${payload.movementType}, ${payload.mpUsed} MP)`,
  };
}

function formatMovementInvalid(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    unitId: string;
    reason: string;
    details?: string;
  };
  return {
    unitId: payload.unitId,
    text: `Movement blocked: ${payload.details ?? payload.reason}`,
  };
}

function formatRuntimeMovementStateChanged(
  event: IGameEvent,
): IEventFormatParts {
  const formatted = formatRuntimeMovementStateChangedEvent(event);
  return { text: formatted.text, unitId: formatted.unitId };
}

function formatAttackDeclared(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    attackerId: string;
    targetId: string;
    weapons: readonly string[];
    toHitNumber: number;
  };
  return {
    unitId: payload.attackerId,
    text: `Attack declared: ${payload.weapons.length} weapon(s), TN ${payload.toHitNumber}`,
  };
}

function formatAttackResolved(
  event: IGameEvent,
  { weaponLookup }: IEventFormatContext,
): IEventFormatParts {
  const payload = event.payload as {
    attackerId: string;
    weaponId?: string;
    hit: boolean;
    roll: number;
    toHitNumber: number;
    damage?: number;
    location?: string;
    attackerArc?: 'front' | 'left' | 'right' | 'rear';
  };
  const weaponLabel = payload.weaponId
    ? (weaponLookup[payload.weaponId] ?? payload.weaponId)
    : 'Attack';
  const arcSuffix = payload.attackerArc ? ` [${payload.attackerArc} arc]` : '';
  const outcome = payload.hit
    ? `${weaponLabel} HIT (${payload.roll} vs ${payload.toHitNumber}): ${payload.damage} damage to ${payload.location}${arcSuffix}`
    : `${weaponLabel} MISSED (${payload.roll} vs ${payload.toHitNumber})${arcSuffix}`;

  return { unitId: payload.attackerId, text: outcome };
}

function formatPhysicalAttackDeclared(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as IPhysicalAttackDeclaredPayload;
  const limbSuffix = payload.limb ? ` (${payload.limb})` : '';
  return {
    unitId: payload.attackerId,
    text: `Physical attack declared: ${payload.attackType}${limbSuffix} vs ${payload.targetId}, TN ${payload.toHitNumber}+`,
  };
}

function formatPhysicalAttackResolved(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as IPhysicalAttackResolvedPayload;
  const text = payload.hit
    ? formatPhysicalAttackHit(payload)
    : `Physical ${payload.attackType} MISSED (${payload.roll} vs ${payload.toHitNumber})`;

  return { unitId: payload.attackerId, text };
}

function formatPhysicalAttackHit(
  payload: IPhysicalAttackResolvedPayload,
): string {
  const locationPart =
    payload.location && payload.damage !== undefined
      ? `: ${payload.damage} damage to ${payload.location}`
      : payload.damage !== undefined
        ? `: ${payload.damage} damage`
        : '';

  return `Physical ${payload.attackType} HIT (${payload.roll} vs ${payload.toHitNumber})${locationPart}`;
}

function formatDamageApplied(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as IDamageAppliedPayload;
  return {
    unitId: payload.unitId,
    text: formatDamageEntry(payload, (id) => id),
  };
}

function formatHeatGenerated(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    unitId: string;
    amount: number;
    newTotal: number;
  };
  return {
    unitId: payload.unitId,
    text: `Heat +${payload.amount} (total: ${payload.newTotal})`,
  };
}

function formatHeatDissipated(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    unitId: string;
    amount: number;
    newTotal: number;
  };
  return {
    unitId: payload.unitId,
    text: `Heat dissipated: ${Math.abs(payload.amount)} (total: ${payload.newTotal})`,
  };
}

function formatCriticalHit(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as { unitId: string };
  return { unitId: payload.unitId, text: 'âš  Critical hit!' };
}

function formatCriticalHitResolved(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as ICriticalHitResolvedPayload;
  return {
    unitId: payload.unitId,
    text: formatCriticalEntry(payload, (id) => id),
  };
}

function formatUnitDestroyed(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as IUnitDestroyedPayload;
  return {
    unitId: payload.unitId,
    text: formatUnitDestroyedEntry(payload, (id) => id),
  };
}

function formatPilotHit(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as IPilotHitPayload;
  return {
    unitId: payload.unitId,
    text: formatPilotHitEntry(payload, (id) => id),
  };
}

function formatGameEnded(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    winner: GameSide | 'draw';
    reason: string;
  };
  const winner = payload.winner === 'draw' ? 'Draw' : `${payload.winner} wins`;
  return { text: `Game ended: ${winner} (${payload.reason})` };
}

function formatIndirectFireSpotterSelected(
  event: IGameEvent,
): IEventFormatParts {
  const payload = event.payload as {
    attackerId: string;
    spotterId: string;
    weaponId: string;
    toHitPenalty: number;
  };
  return {
    unitId: payload.attackerId,
    text: `Indirect fire: spotted by ${payload.spotterId} (+${payload.toHitPenalty} TN)`,
  };
}

function formatIndirectFireNarcOverride(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    attackerId: string;
    basis: 'narc' | 'inarc';
    toHitPenalty: number;
  };
  return {
    unitId: payload.attackerId,
    text: `Indirect fire: ${payload.basis} beacon override on target (+${payload.toHitPenalty} TN)`,
  };
}

function formatIndirectFireForwardObserver(
  event: IGameEvent,
): IEventFormatParts {
  const payload = event.payload as {
    attackerId: string;
    spotterId: string;
  };
  return {
    unitId: payload.attackerId,
    text: `Indirect fire: Forward Observer ${payload.spotterId} cancels walking penalty`,
  };
}

function formatIndirectFireSpotterLost(event: IGameEvent): IEventFormatParts {
  const payload = event.payload as {
    attackerId: string;
    spotterId: string;
    reason: string;
  };
  return {
    unitId: payload.attackerId,
    text: `Indirect fire: spotter ${payload.spotterId} lost â€” attack misses (${payload.reason})`,
  };
}

const EVENT_FORMATTERS: Partial<Record<GameEventType, EventFormatter>> = {
  [GameEventType.TurnStarted]: formatTurnStarted,
  [GameEventType.PhaseChanged]: formatPhaseChanged,
  [GameEventType.InitiativeRolled]: formatInitiativeRolled,
  [GameEventType.MovementDeclared]: formatMovementDeclared,
  [GameEventType.MovementInvalid]: formatMovementInvalid,
  [GameEventType.RuntimeMovementStateChanged]:
    formatRuntimeMovementStateChanged,
  [GameEventType.AttackDeclared]: formatAttackDeclared,
  [GameEventType.AttackResolved]: formatAttackResolved,
  [GameEventType.PhysicalAttackDeclared]: formatPhysicalAttackDeclared,
  [GameEventType.PhysicalAttackResolved]: formatPhysicalAttackResolved,
  [GameEventType.DamageApplied]: formatDamageApplied,
  [GameEventType.HeatGenerated]: formatHeatGenerated,
  [GameEventType.HeatDissipated]: formatHeatDissipated,
  [GameEventType.CriticalHit]: formatCriticalHit,
  [GameEventType.CriticalHitResolved]: formatCriticalHitResolved,
  [GameEventType.UnitDestroyed]: formatUnitDestroyed,
  [GameEventType.PilotHit]: formatPilotHit,
  [GameEventType.GameEnded]: formatGameEnded,
  [GameEventType.IndirectFireSpotterSelected]:
    formatIndirectFireSpotterSelected,
  [GameEventType.IndirectFireNarcOverride]: formatIndirectFireNarcOverride,
  [GameEventType.IndirectFireForwardObserver]:
    formatIndirectFireForwardObserver,
  [GameEventType.IndirectFireSpotterLost]: formatIndirectFireSpotterLost,
};

export function formatEvent(
  event: IGameEvent,
  weaponLookup: Record<string, string> = {},
): IFormattedEvent {
  const formatter = EVENT_FORMATTERS[event.type];
  const formatted = formatter
    ? formatter(event, { weaponLookup })
    : { text: event.type.replace(/_/g, ' ') };

  return {
    id: event.id,
    turn: event.turn,
    phase: event.phase,
    text: formatted.text,
    icon: getEventIcon(event.type),
    side: formatted.side,
    unitId: formatted.unitId,
    timestamp: event.timestamp,
  };
}
