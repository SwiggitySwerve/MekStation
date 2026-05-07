/**
 * Gameplay Types Index
 * Export barrel for all gameplay-related types.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 * @spec openspec/changes/add-game-session-core/specs/game-session-core/spec.md
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

// Ammo construction shape (single source-of-truth, PR6 collapse)
export * from './AmmoTypes';

// Hex Grid System
export * from './HexGridInterfaces';

// Terrain System
export * from './TerrainTypes';

export * from './EnvironmentalConditions';

// Game Session Core
export * from './GameSessionInterfaces';
export * from './GameLobbyInterfaces';

// PSR trigger codes (PR E: lifted to its own module to avoid cycle
// between GameSessionInterfaces and pilotingSkillRolls/types).
export * from './PSRTriggerCodes';

// Combat Resolution
export * from './CombatInterfaces';

// Gameplay UI
export * from './GameplayUIInterfaces';

// Unit Sprite System (Phase 7 visual layer — mech silhouettes + pip ring)
export * from './UnitSpriteTypes';

// Vehicle Combat Behavior
export * from './VehicleCombatInterfaces';

// Battle Armor Combat Behavior
export * from './BattleArmorCombatInterfaces';

// Per-type combat behavior state envelopes consumed by IUnitGameState.
export type { IAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
export type { IInfantryCombatState } from '@/utils/gameplay/infantry/state';
export type { IProtoMechCombatState } from '@/utils/gameplay/protomech/state';
