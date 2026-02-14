import type { IComponentDamageState } from '@/types/gameplay';

export const MAX_TURNS = 10;
export const DEFAULT_TONNAGE = 65;
export const DEFAULT_PILOTING = 5;
export const DEFAULT_GUNNERY = 4;
export const BASE_HEAT_SINKS = 10;
export const ENGINE_HEAT_PER_CRITICAL = 5;
export const HEAD_HIT_DAMAGE_CAP = 3;
export const DAMAGE_PSR_THRESHOLD = 20;
export const LETHAL_PILOT_WOUNDS = 6;
export const WALK_HEAT = 1;
export const RUN_HEAT = 2;
export const JUMP_HEAT = 3;
export const MEDIUM_LASER_HEAT = 3;
export const MEDIUM_LASER_DAMAGE = 5;
export const MEDIUM_LASER_SHORT_RANGE = 3;
export const MEDIUM_LASER_MEDIUM_RANGE = 6;
export const MEDIUM_LASER_LONG_RANGE = 9;

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
