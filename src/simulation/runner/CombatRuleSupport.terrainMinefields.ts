import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS } from './CombatMovementSourceRefs';
import {
  megamekEmpMinefieldSourceRef,
  megamekTerrainSourceRef,
  mekstationDeviationSourceRef,
} from './CombatRuleSupport.sourceRefs';

const MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek Minefield represents minefield state separately from terrain ids, including conventional, command-detonated, vibrabomb, active, EMP, inferno, density, sea mine, and depth fields.',
    'common/equipment/Minefield.java',
    'L47-L125',
  ),
  megamekTerrainSourceRef(
    'MegaMek Game stores minefields by coordinate, supports add/set/reset/remove/clear minefield operations, and keeps minefield visibility/state outside board terrain.',
    'common/game/Game.java',
    'L178-L343',
  ),
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.enterMinefield resolves minefield detonations when an entity enters a mined coordinate.',
    'server/totalWarfare/TWGameManager.java',
    'L7348-L7590',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_VIBRABOMB_MINEFIELD_SOURCE_REFS = [
  ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.checkVibraBombs triggers vibrabombs from BattleMech mass versus mine setting, supports proximity detonation, and skips non-Mek triggers.',
    'server/totalWarfare/TWGameManager.java',
    'L7762-L7859',
  ),
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.explodeVibrabomb applies mine density in 5-point kick-table damage clusters, resolves piloting fallout, then reduces and marks the vibrabomb detonated.',
    'server/totalWarfare/TWGameManager.java',
    'L8061-L8120',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_COMMAND_DETONATED_MINEFIELD_SOURCE_REF = megamekTerrainSourceRef(
  'MegaMek mine-laying still carries command-detonated mines as a TODO rather than a represented layMine producer branch.',
  'server/totalWarfare/TWGameManager.java',
  'L29499-L29500',
);

const MEGAMEK_EMP_MINEFIELD_EFFECT_SOURCE_REFS = [
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPMineEffectsTable defines BattleMek EMP thresholds as 2-6 no effect, 7-8 interference, and 9+ shutdown.',
    'common/equipment/EMPMineEffectsTable.java',
    'L631-L670',
  ),
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPMineEffectsTable.determineEffect maps modified EMP rolls to none, interference, or shutdown outcomes.',
    'common/equipment/EMPMineEffectsTable.java',
    'L753-L784',
  ),
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPMineEffectsTable.rollForEffect applies a +2 drone OS modifier, rolls 2d6 for effect, and rolls 1d6 duration for interference or shutdown.',
    'common/equipment/EMPMineEffectsTable.java',
    'L786-L830',
  ),
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPEffectResult carries EMP effect, durationTurns, modified roll value, and modifier for replayable reporting.',
    'common/equipment/EMPEffectResult.java',
    'L35-L90',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_SCENARIO_MINEFIELD_MODIFIER_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation MINEFIELD is scenario-generation modifier data with mineCount, mineDamage, and deploymentZone parameters, not battlefield minefield terrain/state consumed by movement or damage resolution.',
    'src/constants/scenario/modifiers/equipmentModifiers.ts',
    'L5-L27',
  );

const MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation TerrainType enum carries Mines as a zero-cost terrain marker; runner movement treats represented Mines entry as a bounded conventional minefield damage marker while broader reveal variants remain unmodeled.',
  'src/types/gameplay/TerrainTypes.ts',
  'L15-L35',
);

const MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation runMovementPhase calls applyMovementMinefieldEffects after movement declaration to apply represented TerrainType.Mines and conventional IGameState.minefields entry damage to BattleMech legs; explicit inferno coordinate entries with positive density queue pending external heat and infernoBurning state without leg damage; explicit active coordinate entries suppress ground BattleMech entry without damage or MinefieldChanged side effects, and represented BattleMech jump entry triggers active minefield leg damage plus MinefieldChanged detonation/reduction state; explicit EMP coordinate entries roll source-backed BattleMech EMP no-effect/interference/shutdown outcomes and emit EmpMinefieldEffectApplied; explicit vibrabomb coordinate entries with density, setting, and BattleMech tonnage resolve same-hex kick-table 5-point damage clusters plus proximity detonation/reduction. Explicit detonated coordinate entries and unsupported coordinate-state variants do not trigger represented damage, represented density adjusts detonation target thresholds, and successful represented density-reduction rolls emit MinefieldChanged state updates.',
  'src/simulation/runner/phases/movementMines.ts',
  'L1-L774',
);

const MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation IGameState.minefields stores represented battle-wide minefield entry damage, optional density, optional setting/sensitivity, optional detonated state, and explicit conventional, command-detonated, vibrabomb, active, EMP, and inferno type tags by canonical coordToKey q,r keys while runtime behavior resolves conventional semantics, explicit inferno density external-heat entry, explicit active ground-entry suppression, represented active BattleMech jump-entry triggering, represented EMP effect state, represented vibrabomb density/setting triggers, and fail-closes unsupported non-conventional tags.',
    'src/types/gameplay/GameSessionStateTypes.ts',
    'L720-L748',
  );

const MEKSTATION_GAME_CREATED_MINEFIELDS_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation createGameSession and GameCreated payloads seed explicit coordinate-authored represented minefield state into derived combat state, and prebattle skirmish config can pass through only already-authored coordinate entries.',
    'src/utils/gameplay/gameEvents/lifecycle.ts',
    'L43-L78',
  );

const MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation MinefieldChanged event replay applies represented add, set, remove, clear, reset, detonate, detect, and reveal operations to IGameState.minefields.',
    'src/utils/gameplay/gameState/terrainReducer.ts',
    'L40-L216',
  );

const MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation minefield action helpers emit replayable MinefieldChanged manual conventional detonation, command-detonated detonation, clearing, mine-sweeper, collateral reset, and detection events without damage or PSR side effects.',
  'src/simulation/runner/phases/minefieldActions.ts',
  'L1-L234',
);

export const TERRAIN_MINEFIELD_COMBAT_SUPPORT = {
  mines: integrated(
    'mines',
    'represented TerrainType.Mines hex entry applies default or encoded feature-level BattleMech leg damage plus resulting damage PSR evidence during runner movement, including forward, lateral, and jump entry steps, while explicit non-Mek units receive no invented minefield damage',
    [
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-entry-side-paths': integrated(
    'minefield-represented-entry-side-paths',
    'represented TerrainType.Mines BattleMech entry side paths are integrated for forward, lateral, and jump entry, same-hex non-entry suppression, per-declaration duplicate-coordinate suppression, and default or encoded feature-level leg damage while lifecycle replay is covered by the coordinate-state lifecycle row',
    [
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-encoded-damage-levels': integrated(
    'minefield-represented-encoded-damage-levels',
    'represented TerrainType.Mines feature levels are integrated as a bounded local per-leg BattleMech damage amount, with movement behavior coverage proving encoded level 6 applies 6 damage to each leg without treating that marker as full MegaMek minefield density/type semantics',
    [
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-coordinate-state-entry-damage': integrated(
    'minefield-represented-coordinate-state-entry-damage',
    'represented battle-wide IGameState.minefields coordinate state is cataloged for canonical coordToKey q,r lookup of conventional minefield entry damage, with BattleMech movement applying explicit per-leg damage on visible, detected, or hidden conventional minefield entry while non-conventional type behavior remains in the unsupported variant row',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-conventional-detonated-state': integrated(
    'minefield-represented-conventional-detonated-state',
    'represented battle-wide IGameState.minefields coordinate entries support explicit conventional minefield state plus already-detonated suppression, proving an inert detonated entry produces no BattleMech damage without claiming hidden/reveal, placement, clearing, command detonation, or non-conventional type behavior',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-coordinate-state-lifecycle': integrated(
    'minefield-represented-coordinate-state-lifecycle',
    'represented battle-wide IGameState.minefields coordinate entries support event-sourced add, set, remove, clear, reset, and detonate lifecycle replay plus density preservation for conventional minefield state without claiming hidden/reveal, placement authoring, clearing/sweeper behavior, command-detonated type controls, or non-conventional type variants',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-manual-conventional-detonation': integrated(
    'minefield-represented-manual-conventional-detonation',
    'represented manual conventional coordinate minefield detonation emits a replayable MinefieldChanged manual_adjustment detonate event, marks the coordinate inert for later movement entry, and produces no damage or PSR side effects at command time while non-conventional coordinate variants remain fail-closed',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-movement-detonation-event': integrated(
    'minefield-represented-movement-detonation-event',
    'represented battle-wide IGameState.minefields coordinate entries without explicit density emit and apply a MinefieldChanged movement_detonation event when BattleMech movement trips the represented conventional minefield, preserving legacy detonated state for replay without claiming collateral reset, hidden/reveal, clearing/sweeper behavior, command-detonated type controls, or non-conventional type variants',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-density-trigger-target': integrated(
    'minefield-represented-density-trigger-target',
    'represented coordinate minefield density is integrated for MegaMek-aligned detonation target thresholds: omitted or density <15 uses target 9, density 20 uses target 8, and density 25 uses target 7 before existing Eagle Eyes relief is applied',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-density-reduction': integrated(
    'minefield-represented-density-reduction',
    'represented coordinate minefield detonation reduces represented conventional and inferno density by one 5-point step when the source-backed density reduction roll succeeds, preserves a minimum density of 5, emits MinefieldChanged with movement_detonation reason, and leaves non-density legacy coordinate entries on the explicit detonated-state path',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-inferno-entry-heat': integrated(
    'minefield-represented-inferno-entry-heat',
    'represented explicit inferno coordinate minefields with positive density follow MegaMek enterMinefield inferno damage shape by converting density/2 missiles into pendingExternalHeat, marking infernoBurning for later GO_PRONE wash-off, reducing represented density through the shared minefield density-reduction roll, and emitting no conventional leg damage, damage PSR, or immediate HeatGenerated event',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-active-ground-suppression': integrated(
    'minefield-represented-active-ground-suppression',
    'represented active minefield coordinate entries follow MegaMek enterMinefield active-mine branching for BattleMech ground entry by suppressing detonation before trigger rolling, leaving state unchanged, and emitting no damage, MinefieldChanged, PSR, or heat side effects; represented BattleMech jump entry is covered by the active non-ground trigger row',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-non-conventional-type-guard': integrated(
    'minefield-represented-non-conventional-type-guard',
    'represented coordinate minefield state is explicitly typed and fail-closed for non-conventional movement-entry data that is not handled by its source-specific branch: command-detonated entries, malformed vibrabomb entries without positive density/setting, and inferno entries without positive density are not treated as conventional BattleMech leg-damage minefields; represented EMP, command-detonated manual control, active ground-entry suppression, and vibrabomb triggers are covered separately with no fallback to conventional damage',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-non-battlemech-sea-variants': outOfScope(
    'minefield-non-battlemech-sea-variants',
    'MegaMek Minefield carries sea/depth state and TWGameManager routes minefield entry through broad Entity handling, but this BattleMech validation catalog only represents ground BattleMech TerrainType.Mines entry damage',
    'Non-BattleMech minefield entry behavior and sea-mine/depth variants stay outside this BattleMech suite instead of being counted as BattleMech terrain-environment blockers',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-variant-side-paths': integrated(
    'minefield-variant-side-paths',
    'Split-accounting row: MegaMek minefield source truth, MekStation scenario MINEFIELD modifier data, represented TerrainType.Mines BattleMech entry damage, represented encoded damage levels, represented entry side paths, represented battle-wide coordinate-state entry damage, represented inferno density external-heat entry and GO_PRONE residual wash-off, represented active ground-entry suppression plus represented BattleMech jump-entry active mine triggers, represented EMP no-effect/interference/shutdown events and state, represented vibrabomb density/setting same-hex and proximity triggers, represented conventional/detonated coordinate state, represented coordinate-state lifecycle replay, represented explicit GameCreated/prebattle coordinate minefield authoring, represented manual conventional detonation control, represented command-detonated manual detonation control, represented movement detonation event emission, represented density trigger targets, represented density reduction, represented hidden conventional coordinate minefield detection/reveal state, represented conventional minefield clearing/sweeper/reset actions, represented typed non-conventional no-fallback guards, and non-BattleMech/sea-mine scope are source-pinned separately; no represented BattleMech minefield variant side-path row remains unsupported',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_SCENARIO_MINEFIELD_MODIFIER_SOURCE_REF,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_GAME_CREATED_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-hidden-reveal-detection': integrated(
    'minefield-hidden-reveal-detection',
    'represented hidden conventional coordinate minefields preserve hidden/revealed/detectedBySides state, apply side-scoped MinefieldChanged detection events without damage side effects, and reveal publicly when movement detonates the represented conventional minefield',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-campaign-placement-authoring': integrated(
    'minefield-campaign-placement-authoring',
    'MekStation campaign/scenario placement authoring is represented only when a producer supplies explicit coordinate-authored IGameState.minefields through GameCreated or prebattle skirmish config; the abstract MINEFIELD modifier remains source-pinned context and does not synthesize random, hidden, typed, or density-aware minefields without explicit combat state',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_SCENARIO_MINEFIELD_MODIFIER_SOURCE_REF,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_GAME_CREATED_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-clearing-sweeper-collateral-reset': integrated(
    'minefield-clearing-sweeper-collateral-reset',
    'represented conventional coordinate minefields support explicit clearing and mine-sweeper events that step density down to the minimum or remove the minefield, plus collateral reset events that replay a supplied minefield map, without damage or PSR side effects and without promoting non-conventional minefield variants',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-vibrabomb-effects': integrated(
    'minefield-represented-vibrabomb-effects',
    'Represented coordinate vibrabomb minefields require explicit density and setting/sensitivity, trigger from BattleMech tonnage versus setting, apply same-hex damage in 5-point kick-table clusters, support proximity detonation without damaging the moving unit outside the mined hex, and emit MinefieldChanged movement_detonation reduction/removal state without claiming minesweeper or optional no-pre-move side paths',
    [
      ...MEGAMEK_VIBRABOMB_MINEFIELD_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-command-detonation': integrated(
    'minefield-represented-command-detonation',
    'represented command-detonated coordinate minefields preserve their explicit type tag, reject conventional entry damage, and support replayable manual detonation through MinefieldChanged manual_adjustment events without damage, PSR, or movement-entry side effects',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEGAMEK_COMMAND_DETONATED_MINEFIELD_SOURCE_REF,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-emp-effects': integrated(
    'minefield-emp-effects',
    'Represented EMP coordinate minefields trigger only through BattleMech movement entry, keep detonation separate from conventional leg damage, apply source-backed BattleMech 2-6 no effect / 7-8 interference / 9+ shutdown thresholds, apply explicit hasDroneOS +2 modifier when represented, roll 1d6 duration for interference or shutdown, mutate empInterferenceTurns or shutdown/empShutdownTurns, emit EmpMinefieldEffectApplied for replay, and still use MinefieldChanged for represented detonation/density state',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      ...MEGAMEK_EMP_MINEFIELD_EFFECT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-active-non-ground-triggers': integrated(
    'minefield-active-non-ground-triggers',
    'Represented active coordinate minefields suppress BattleMech ground-entry damage and MinefieldChanged side effects, while represented BattleMech jump entry triggers active-mine leg damage, MinefieldChanged detonation/reduction state, and density target-number handling without promoting command-detonated, EMP, vibrabomb side paths beyond the represented density/setting slice, or non-BattleMech minefield behavior',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-inferno-residual-controls': integrated(
    'minefield-inferno-residual-controls',
    'Represented BattleMech inferno coordinate minefields with positive density queue pending external heat plus infernoBurning state, share density reduction, and clear the residual infernoBurning state through runner and interactive GO_PRONE movement; inferno entries without positive density still fail closed without damage or MinefieldChanged side effects',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
      mekstationDeviationSourceRef(
        'MekStation runner applyMovementEvent clears infernoBurning when a GO_PRONE movement step is committed.',
        'src/simulation/runner/SimulationRunnerState.ts',
        'L420-L459',
      ),
      mekstationDeviationSourceRef(
        'MekStation interactive movement reducer clears infernoBurning for GO_PRONE movement events.',
        'src/utils/gameplay/gameState/actionLocking.ts',
        'L69-L93',
      ),
    ],
  ),
  'minefield-non-conventional-type-semantics': integrated(
    'minefield-non-conventional-type-semantics',
    'Split-accounting row: represented coordinate minefield state preserves command-detonated, EMP, active, inferno, and malformed vibrabomb type data as explicit tags and fail-closed no-damage/no-side-effect guards, while conventional minefield entry, inferno density external-heat entry, active ground-entry suppression, active jump-entry triggering, represented vibrabomb density/setting triggers, lifecycle, density, hidden/reveal, clearing, and manual conventional detonation behavior are represented separately; remaining non-conventional semantics are narrowed into exact unsupported branch rows',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
