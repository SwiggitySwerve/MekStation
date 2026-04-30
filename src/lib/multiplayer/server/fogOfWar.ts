import {
  GameEventType,
  GamePhase,
  GameSide,
  type GameEventPayload,
  type IAttackResolvedPayload,
  type IDamageAppliedPayload,
  type IGameEvent,
  type IGameState,
  type IRedactedAttackResolvedPayload,
  type IUnitGameState,
} from '@/types/gameplay';
import { canPlayerSeeUnit } from '@/utils/gameplay/visibility';

export type FogEventVisibility =
  | 'public'
  | 'actor-only'
  | 'observer-visible'
  | 'target-visible';

export interface IFogOfWarConfig {
  readonly fogOfWar?: boolean;
}

export interface IFogOfWarFilterOptions {
  readonly fogOfWar?: boolean;
  readonly config?: IFogOfWarConfig;
  readonly cache?: FogOfWarVisibilityCache;
  readonly canSeeUnit?: (
    playerId: string,
    unitId: string,
    state: IGameState,
  ) => boolean;
}

interface IVisibilitySideAssignment {
  readonly playerId: string;
  readonly side: string;
}

type FogState = IGameState & {
  readonly sideOwners?: Partial<Record<GameSide, string>> | null;
  readonly sideAssignments?: readonly IVisibilitySideAssignment[] | null;
};

interface ICacheEntry {
  readonly state: IGameState;
  readonly stateTurn: number;
  readonly statePhase: GamePhase;
  readonly value: boolean;
}

export class FogOfWarVisibilityCache {
  private readonly entries = new Map<string, ICacheEntry>();

  get(
    playerId: string,
    unitId: string,
    state: IGameState,
  ): boolean | undefined {
    const entry = this.entries.get(cacheKey(playerId, unitId));

    if (
      entry &&
      entry.state === state &&
      entry.stateTurn === state.turn &&
      entry.statePhase === state.phase
    ) {
      return entry.value;
    }

    return undefined;
  }

  set(
    playerId: string,
    unitId: string,
    state: IGameState,
    value: boolean,
  ): void {
    this.entries.set(cacheKey(playerId, unitId), {
      state,
      stateTurn: state.turn,
      statePhase: state.phase,
      value,
    });
  }

  invalidateUnit(unitId: string): void {
    for (const key of Array.from(this.entries.keys())) {
      if (key.endsWith(`\u0000${unitId}`)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

const stateCaches = new WeakMap<IGameState, FogOfWarVisibilityCache>();

const PUBLIC_EVENTS = new Set<GameEventType>([
  GameEventType.GameCreated,
  GameEventType.GameStarted,
  GameEventType.GameEnded,
  GameEventType.TurnStarted,
  GameEventType.TurnEnded,
  GameEventType.PhaseChanged,
  GameEventType.InitiativeRolled,
  GameEventType.InitiativeOrderSet,
]);

const ACTOR_ONLY_EVENTS = new Set<GameEventType>([
  GameEventType.MovementDeclared,
  GameEventType.AttackDeclared,
  GameEventType.AttackLocked,
  GameEventType.PhysicalAttackDeclared,
]);

const TARGET_VISIBLE_EVENTS = new Set<GameEventType>([
  GameEventType.AttackResolved,
  GameEventType.DamageApplied,
  GameEventType.PhysicalAttackResolved,
]);

export function classifyEventVisibility(
  event: Pick<IGameEvent, 'type'>,
): FogEventVisibility {
  if (PUBLIC_EVENTS.has(event.type)) {
    return 'public';
  }

  if (ACTOR_ONLY_EVENTS.has(event.type)) {
    return 'actor-only';
  }

  if (TARGET_VISIBLE_EVENTS.has(event.type)) {
    return 'target-visible';
  }

  return 'observer-visible';
}

export function filterEventForPlayer(
  event: IGameEvent,
  playerId: string,
  state: IGameState,
  options: IFogOfWarFilterOptions = {},
): IGameEvent | null {
  if (!isFogEnabled(options)) {
    return event;
  }

  const cache = options.cache ?? getStateCache(state);
  invalidateCacheForEvent(event, cache);

  const context: IFilterContext = {
    playerId,
    state,
    cache,
    canSeeUnit: options.canSeeUnit ?? canPlayerSeeUnit,
  };

  switch (classifyEventVisibility(event)) {
    case 'public':
      return event;
    case 'actor-only':
      return isEventActorOwnedByPlayer(event, context) ? event : null;
    case 'observer-visible':
      return filterObserverVisibleEvent(event, context);
    case 'target-visible':
      return filterTargetVisibleEvent(event, context);
  }
}

interface IFilterContext {
  readonly playerId: string;
  readonly state: IGameState;
  readonly cache: FogOfWarVisibilityCache;
  readonly canSeeUnit: (
    playerId: string,
    unitId: string,
    state: IGameState,
  ) => boolean;
}

function filterObserverVisibleEvent(
  event: IGameEvent,
  context: IFilterContext,
): IGameEvent | null {
  const unitId = getPrimaryUnitId(event);

  if (!unitId) {
    return event;
  }

  if (event.type === GameEventType.UnitDestroyed) {
    if (isUnitOwnedByPlayer(context.playerId, unitId, context.state)) {
      return event;
    }

    if (canSeeUnitCached(context, unitId)) {
      return event;
    }

    return {
      ...event,
      payload: { unitId },
    };
  }

  return canSeeUnitCached(context, unitId) ? event : null;
}

function filterTargetVisibleEvent(
  event: IGameEvent,
  context: IFilterContext,
): IGameEvent | null {
  if (event.type === GameEventType.AttackResolved) {
    return filterAttackResolvedEvent(event, context);
  }

  if (event.type === GameEventType.DamageApplied) {
    return filterDamageAppliedEvent(event, context);
  }

  const unitId = getPrimaryUnitId(event);

  if (!unitId) {
    return event;
  }

  return canSeeUnitCached(context, unitId) ? event : null;
}

function filterAttackResolvedEvent(
  event: IGameEvent,
  context: IFilterContext,
): IGameEvent | null {
  const payload = event.payload as IAttackResolvedPayload;
  const targetOwnerCanReceive = isUnitOwnedByPlayer(
    context.playerId,
    payload.targetId,
    context.state,
  );

  if (
    isUnitOwnedByPlayer(context.playerId, payload.attackerId, context.state)
  ) {
    return event;
  }

  const attackerVisible = canSeeUnitCached(context, payload.attackerId);
  const targetVisible = canSeeUnitCached(context, payload.targetId);

  if (targetOwnerCanReceive && !attackerVisible) {
    return {
      ...event,
      actorId: undefined,
      payload: redactAttackResolvedPayload(payload),
    };
  }

  if (attackerVisible || targetVisible) {
    return event;
  }

  return null;
}

function filterDamageAppliedEvent(
  event: IGameEvent,
  context: IFilterContext,
): IGameEvent | null {
  const payload = event.payload as IDamageAppliedPayload;

  if (isUnitOwnedByPlayer(context.playerId, payload.unitId, context.state)) {
    return event;
  }

  if (canSeeUnitCached(context, payload.unitId)) {
    return event;
  }

  if (payload.sourceUnitId && canSeeUnitCached(context, payload.sourceUnitId)) {
    return event;
  }

  return null;
}

function redactAttackResolvedPayload(
  payload: IAttackResolvedPayload,
): IRedactedAttackResolvedPayload {
  return {
    targetId: payload.targetId,
    roll: payload.roll,
    toHitNumber: payload.toHitNumber,
    hit: payload.hit,
    ...(payload.location !== undefined ? { location: payload.location } : {}),
    ...(payload.damage !== undefined ? { damage: payload.damage } : {}),
    ...(payload.rolls !== undefined ? { rolls: payload.rolls } : {}),
  };
}

function invalidateCacheForEvent(
  event: IGameEvent,
  cache: FogOfWarVisibilityCache,
): void {
  if (
    event.type === GameEventType.MovementDeclared ||
    event.type === GameEventType.MovementLocked
  ) {
    const unitId = getUnitIdFromPayload(event.payload);
    if (unitId) {
      cache.invalidateUnit(unitId);
    }
  }
}

function canSeeUnitCached(context: IFilterContext, unitId: string): boolean {
  const cached = context.cache.get(context.playerId, unitId, context.state);

  if (cached !== undefined) {
    return cached;
  }

  const value = context.canSeeUnit(context.playerId, unitId, context.state);
  context.cache.set(context.playerId, unitId, context.state, value);

  return value;
}

function isEventActorOwnedByPlayer(
  event: IGameEvent,
  context: IFilterContext,
): boolean {
  const actorId = event.actorId ?? getPrimaryUnitId(event);

  if (!actorId) {
    return false;
  }

  return isUnitOwnedByPlayer(context.playerId, actorId, context.state);
}

function getPrimaryUnitId(event: IGameEvent): string | null {
  if (event.actorId) {
    return event.actorId;
  }

  return getCombatUnitIdFromPayload(event.payload);
}

function getUnitIdFromPayload(payload: GameEventPayload): string | null {
  if (isPayloadWithStringField(payload, 'unitId')) {
    return payload.unitId;
  }

  return null;
}

function getCombatUnitIdFromPayload(payload: GameEventPayload): string | null {
  if (isPayloadWithStringField(payload, 'attackerId')) {
    return payload.attackerId;
  }

  if (isPayloadWithStringField(payload, 'unitId')) {
    return payload.unitId;
  }

  return null;
}

function isPayloadWithStringField<TField extends string>(
  payload: GameEventPayload,
  field: TField,
): payload is GameEventPayload & Record<TField, string> {
  const record = payload as Readonly<Record<string, unknown>>;
  return field in record && typeof record[field] === 'string';
}

function isUnitOwnedByPlayer(
  playerId: string,
  unitId: string,
  state: IGameState,
): boolean {
  const unit = state.units[unitId];

  if (!unit) {
    return false;
  }

  return ownerIdForUnit(unit, state as FogState) === playerId;
}

function ownerIdForUnit(unit: IUnitGameState, state: FogState): string {
  const ownerFromSideMap = state.sideOwners?.[unit.side];

  if (ownerFromSideMap !== undefined) {
    return ownerFromSideMap;
  }

  const assignment = state.sideAssignments?.find((candidate) => {
    return candidate.side === unit.side;
  });

  return assignment?.playerId ?? unit.side;
}

function isFogEnabled(options: IFogOfWarFilterOptions): boolean {
  return options.fogOfWar ?? options.config?.fogOfWar ?? false;
}

function getStateCache(state: IGameState): FogOfWarVisibilityCache {
  const existing = stateCaches.get(state);

  if (existing) {
    return existing;
  }

  const cache = new FogOfWarVisibilityCache();
  stateCaches.set(state, cache);
  return cache;
}

function cacheKey(playerId: string, unitId: string): string {
  return `${playerId}\u0000${unitId}`;
}
