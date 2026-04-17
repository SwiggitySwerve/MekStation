import {
  Facing,
  GamePhase,
  GameStatus,
  IAmmoSlotState,
  IComponentDamageState,
  IGameState,
  IGameUnit,
  IHexCoordinate,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';

export const PLAYER_DEPLOY_ROW = 5;
export const OPPONENT_DEPLOY_ROW = -5;

export const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

export function createInitialUnitState(
  unit: IGameUnit,
  startPosition: IHexCoordinate,
  startFacing: Facing = Facing.North,
): IUnitGameState {
  // Seed ammo bins from the unit's construction data (per
  // `wire-ammo-consumption`). One bin per ton; each starts full. When
  // `unit.ammoConstruction` is absent, the unit has zero bins and any
  // ammo-consuming weapon fire will emit `AttackInvalid { OutOfAmmo }`.
  const ammoState: Record<string, IAmmoSlotState> = {};
  if (unit.ammoConstruction) {
    for (const bin of unit.ammoConstruction) {
      ammoState[bin.binId] = {
        binId: bin.binId,
        weaponType: bin.weaponType,
        location: bin.location,
        remainingRounds: bin.maxRounds,
        maxRounds: bin.maxRounds,
        isExplosive: bin.isExplosive,
      };
    }
  }

  return {
    id: unit.id,
    side: unit.side,
    position: startPosition,
    facing: startFacing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    ammoState,
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    jammedWeapons: [],
    narcedBy: [],
    tagDesignated: false,
  };
}

export function createInitialGameState(gameId: string): IGameState {
  return {
    gameId,
    status: GameStatus.Setup,
    turn: 0,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units: {},
    turnEvents: [],
  };
}
