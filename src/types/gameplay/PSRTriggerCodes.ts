/**
 * Piloting Skill Roll trigger codes — canonical enum.
 *
 * Lives in `src/types/gameplay/` (the pure-types layer) so it can be
 * referenced by both `GameSessionInterfaces.ts` (event payloads carry
 * `reasonCode?: PSRTrigger`) and `src/utils/gameplay/pilotingSkillRolls/types.ts`
 * (factories populate `reasonCode`) without forming a cycle. Prior to PR E
 * (`structure-psr-reason-as-discriminated-code`) this enum lived in
 * `pilotingSkillRolls/types.ts`; back-compat is preserved via a re-export
 * from that module.
 *
 * The 27 canonical snake_case codes mirror MegaMek's
 * `Server.processPilotingRolls` and `MovePathHandler.checkSkid`
 * taxonomy. See the `piloting-skill-rolls` spec
 * (`Requirement: PSR Reason Code Discriminated Field`) for the
 * code → category mapping.
 *
 * @spec openspec/specs/piloting-skill-rolls/spec.md
 */
export enum PSRTrigger {
  // Damage triggers
  PhaseDamage20Plus = '20+_damage',
  LegDamage = 'leg_damage',

  // Component damage triggers
  HipActuatorDestroyed = 'hip_actuator_destroyed',
  GyroHit = 'gyro_hit',
  EngineHit = 'engine_hit',
  UpperLegActuatorHit = 'upper_leg_actuator_hit',
  LowerLegActuatorHit = 'lower_leg_actuator_hit',
  FootActuatorHit = 'foot_actuator_hit',

  // Physical attack triggers (target)
  Kicked = 'kicked',
  Charged = 'charged',
  DFATarget = 'dfa_target',
  Pushed = 'pushed',
  DominoEffect = 'domino_effect',

  // Physical attack miss triggers (attacker)
  KickMiss = 'kick_miss',
  ChargeMiss = 'charge_miss',
  DFAMiss = 'dfa_miss',

  // Shutdown/startup triggers
  Shutdown = 'heat_shutdown',
  StandingUp = 'standing_up',

  // Terrain triggers
  EnteringRubble = 'entering_rubble',
  RunningRoughTerrain = 'running_rough_terrain',
  MovingOnIce = 'moving_on_ice',
  EnteringWater = 'entering_water',
  ExitingWater = 'exiting_water',
  Skidding = 'skidding',
  SwampBogDown = 'swamp_bog_down',

  // Movement with damage triggers
  RunningDamagedHip = 'running_damaged_hip',
  RunningDamagedGyro = 'running_damaged_gyro',

  // Collapse/failure triggers
  BuildingCollapse = 'building_collapse',
  MASCFailure = 'masc_failure',
  SuperchargerFailure = 'supercharger_failure',
}
