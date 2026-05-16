/**
 * Canonical Template Element ID Catalog — Wave-1 non-mech families.
 *
 * Frozen typed constants capturing the injectable `id=` element set of
 * each Wave-1 canonical record-sheet template (vehicle / VTOL,
 * aerospace / conventional fighter, ProtoMech).
 *
 * Purpose: the per-family `bindings.ts` adapters bind ONLY against IDs
 * present in this catalog, so a typo against a non-existent template ID
 * is caught at type-check time rather than producing a silent no-op
 * `getElementById` injection.
 *
 * Extraction: IDs were extracted from the `id=` attributes of the 10
 * synced canonical templates under
 * `public/record-sheets/templates_us/`. SVG-editor auto-generated noise
 * IDs (`gNNN`, `pathNNN`, `svgNNN`, `namedviewNNN`, per-pip
 * `armorXXRowNN` / `structurePipsXXNN`) are intentionally EXCLUDED —
 * only injectable text targets and pip-group container IDs are
 * catalogued. The per-pip row IDs are layout output, not binding input.
 *
 * MegaMekLab review (task 0.5): every ID below was cross-referenced
 * against `megameklab/printing/IdConstants.java` (the canonical
 * MegaMekLab element-ID source consumed by `PrintTank` / `PrintAero` /
 * `PrintProtoMek`). The `IdConstants` field name is noted per entry.
 * No catalogued ID diverges from `IdConstants`. Divergences, where they
 * exist, are flagged inline with a `DIVERGENCE:` comment.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/mm-data-asset-integration/spec.md
 *   (Requirement: Canonical Template Element ID Catalog)
 */

/**
 * Header / unit-data text IDs shared by every Wave-1 non-mech template.
 * These mirror the mech `ELEMENT_IDS` header block (see `constants.ts`)
 * and the corresponding `IdConstants` fields.
 */
export const SHARED_TEMPLATE_IDS = {
  /** IdConstants.TYPE — chassis + model line. */
  type: 'type',
  /** IdConstants.TONNAGE — unit tonnage. */
  tonnage: 'tonnage',
  /** IdConstants.TECH_BASE — Inner Sphere / Clan / Mixed. */
  techBase: 'techBase',
  /** IdConstants.RULES_LEVEL — Introductory / Standard / Advanced / Experimental. */
  rulesLevel: 'rulesLevel',
  /** IdConstants.ROLE — unit battlefield role. */
  role: 'role',
  /** IdConstants.LBL_ROLE — the "Role:" label element. */
  labelRole: 'labelRole',
  /** IdConstants.ENGINE_TYPE — engine rating + type. */
  engineType: 'engineType',
  /** IdConstants.BV — Battle Value. */
  bv: 'bv',
  /** IdConstants.ARMOR_TYPE — armor type label. */
  armorType: 'armorType',
  /** IdConstants.INVENTORY — equipment / weapon inventory block. */
  inventory: 'inventory',
  /** IdConstants.MP_WALK / MP_RUN / MP_JUMP — movement points. */
  mpWalk: 'mpWalk',
  mpRun: 'mpRun',
  mpJump: 'mpJump',
  /** IdConstants.PILOT_NAME / GUNNERY_SKILL / PILOTING_SKILL — crew 0. */
  pilotName0: 'pilotName0',
  gunnerySkill0: 'gunnerySkill0',
  pilotingSkill0: 'pilotingSkill0',
  /** IdConstants.RS_TEMPLATE — root template marker group. */
  rs_template: 'rs_template',
  /** IdConstants.ERA_ICON — era icon image slot. */
  eraIcon: 'eraIcon',
  /** IdConstants.FLUFF_IMAGE — fluff image slot. */
  fluffImage: 'fluffImage',
  /** IdConstants.FOOTER — copyright / footer block. */
  footer: 'footer',
  /** IdConstants.COPYRIGHT — copyright year tspan. */
  tspanCopyright: 'tspanCopyright',
  /** IdConstants.NOTES — notes block. */
  notes: 'notes',
} as const;

/**
 * Vehicle / VTOL family template element IDs.
 *
 * Covers `vehicle_noturret_standard`, `vehicle_turret_standard`,
 * `vehicle_dualturret_standard`, `vtol_noturret_standard`,
 * `vtol_turret_standard`. Reviewed against `PrintTank.java` (which
 * consumes `IdConstants`).
 *
 * Location codes mirror MegaMekLab tank sides:
 *   FR = Front, LS = Left Side, RS = Right Side, RR = Rear,
 *   TU = Turret, FT = Front Turret (dual-turret only),
 *   RO = Rotor (VTOL only).
 */
export const VEHICLE_TEMPLATE_IDS = {
  ...SHARED_TEMPLATE_IDS,

  /** IdConstants.MOVEMENT_TYPE — Tracked / Wheeled / Hover / VTOL. */
  movementType: 'movementType',
  /** IdConstants.TRACKS — tracked-motive marker. */
  tracks: 'tracks',
  /** IdConstants.WHEELS — wheeled-motive marker (absent on VTOL). */
  wheels: 'wheels',
  /** IdConstants.LBL_JUMP — the "Jump" MP label. */
  lblJump: 'lblJump',
  /** IdConstants.UNIT_SCALE — unit scale marker. */
  unitScale: 'unitScale',

  // --- Crew hit / damage markers (PrintTank crew panel) ---
  /** IdConstants.DRIVER_HIT. */
  driver_hit: 'driver_hit',
  /** IdConstants.COMMANDER_HIT. */
  commander_hit: 'commander_hit',
  /** IdConstants.COPILOT_HIT — VTOL crew panel. */
  copilot_hit: 'copilot_hit',
  /** IdConstants.PILOT_HIT — VTOL crew panel. */
  pilot_hit: 'pilot_hit',

  // --- Armor pip-group containers (one per side) ---
  /** Aggregate armor pip group. IdConstants.ARMOR_PIPS. */
  armorPips: 'armorPips',
  /** Front-side armor pip group. */
  armorPipsFR: 'armorPipsFR',
  /** Left-side armor pip group. */
  armorPipsLS: 'armorPipsLS',
  /** Right-side armor pip group. */
  armorPipsRS: 'armorPipsRS',
  /** Rear armor pip group. */
  armorPipsRR: 'armorPipsRR',
  /** Turret armor pip group (turret + dualturret templates). */
  armorPipsTU: 'armorPipsTU',
  /** Front-turret armor pip group (dualturret template only). */
  armorPipsFT: 'armorPipsFT',
  /** Rotor armor pip group (VTOL templates only). */
  armorPipsRO: 'armorPipsRO',

  // --- Structure pip-group containers (one per side) ---
  /** Aggregate structure pip group. IdConstants.STRUCTURE_PIPS. */
  structurePips: 'structurePips',
  structurePipsFR: 'structurePipsFR',
  structurePipsLS: 'structurePipsLS',
  structurePipsRS: 'structurePipsRS',
  structurePipsRR: 'structurePipsRR',
  structurePipsTU: 'structurePipsTU',
  structurePipsFT: 'structurePipsFT',
  structurePipsRO: 'structurePipsRO',

  // --- Armor value text labels (IdConstants.TEXT_ARMOR prefix) ---
  textArmor_FR: 'textArmor_FR',
  textArmor_LS: 'textArmor_LS',
  textArmor_RS: 'textArmor_RS',
  textArmor_RR: 'textArmor_RR',
  textArmor_TU: 'textArmor_TU',
  textArmor_FT: 'textArmor_FT',
  textArmor_RO: 'textArmor_RO',
} as const;

/**
 * Aerospace / conventional-fighter family template element IDs.
 *
 * Covers `fighter_aerospace_default`, `fighter_conventional_default`.
 * Reviewed against `PrintAero.java` (consumes `IdConstants`).
 *
 * Arc codes mirror MegaMekLab aero arcs:
 *   NOS = Nose, LWG = Left Wing, RWG = Right Wing, AFT = Aft.
 *
 * DIVERGENCE: the aero templates use `gunnerySkill0` / `pilotingSkill0`
 * (the standard `IdConstants.GUNNERY_SKILL` + crew-index `0`). The
 * `asfGunnerySkill` / `asfPilotingSkill` IdConstants fields are NOT
 * present on these default fighter templates — they belong to the
 * mech-with-ASF-stats template. Bindings target the standard IDs.
 */
export const AEROSPACE_TEMPLATE_IDS = {
  ...SHARED_TEMPLATE_IDS,

  /** IdConstants.HS_TYPE — heat sink type (aerospace fighter only). */
  hsType: 'hsType',
  /** IdConstants.HS_COUNT — heat sink count (aerospace fighter only). */
  hsCount: 'hsCount',
  /** IdConstants.HEAT_SINK_PIPS — heat sink pip group (aerospace only). */
  heatSinkPips: 'heatSinkPips',
  /** IdConstants.LBL_JUMP — present on aero templates as a label slot. */
  lblJump: 'lblJump',

  // --- Armor pip-group containers (one per arc) ---
  /** Aggregate armor pip group. IdConstants.ARMOR_PIPS. */
  armorPips: 'armorPips',
  /** Nose-arc armor pip group. */
  armorPipsNOS: 'armorPipsNOS',
  /** Left-wing-arc armor pip group. */
  armorPipsLWG: 'armorPipsLWG',
  /** Right-wing-arc armor pip group. */
  armorPipsRWG: 'armorPipsRWG',
  /** Aft-arc armor pip group. */
  armorPipsAFT: 'armorPipsAFT',

  // --- Structural Integrity pips (IdConstants.SI_PIPS) ---
  /** Structural Integrity pip group. */
  siPips: 'siPips',
  /** IdConstants.TEXT_SI — Structural Integrity value text. */
  textSI: 'textSI',

  // --- Armor value text labels (IdConstants.TEXT_ARMOR prefix) ---
  textArmor_NOS: 'textArmor_NOS',
  textArmor_LWG: 'textArmor_LWG',
  textArmor_RWG: 'textArmor_RWG',
  textArmor_AFT: 'textArmor_AFT',
} as const;

/**
 * ProtoMech family template element IDs.
 *
 * Covers `protomek_biped`, `protomek_quad`, `protomek_glider`.
 * Reviewed against `PrintProtoMek.java` (consumes `IdConstants`).
 *
 * Location codes mirror MegaMekLab ProtoMech locations:
 *   HD = Head, T = Torso, LA = Left Arm, RA = Right Arm,
 *   L  = Legs (single combined location), MG = Main Gun.
 *
 * DIVERGENCE: the `protomek_quad` template has NO `armorPipsLA` /
 * `armorPipsRA` / arm-related IDs — quad ProtoMechs have no arms. The
 * `armorPipsLA` / `armorPipsRA` entries below are present for the biped
 * and glider configs only; the quad `bindings.ts` must omit arm
 * locations. The `protomek_glider` template adds `wings_hit_label` /
 * `wings_hit_text` (glider-only) which have no `IdConstants` field —
 * they are glider-specific damage markers, not binding text targets.
 */
export const PROTOMECH_TEMPLATE_IDS = {
  ...SHARED_TEMPLATE_IDS,

  /** IdConstants.TYPE2 — second-line type text (ProtoMech sheets). */
  type2: 'type2',
  /** IdConstants.PROTOMEK_INDEX — point-position index. */
  protomekIndex: 'protomekIndex',
  /** IdConstants.MAG_CLAMP_NOTE — magnetic clamp note. */
  magClampNote: 'magClampNote',
  /** IdConstants.MP_GROUND — ground MP (glider config uses this). */
  mpGround: 'mpGround',
  /** IdConstants.LBL_JUMP — jump MP label (biped / quad). */
  lblJump: 'lblJump',
  /** IdConstants.ARMOR_DIAGRAM — armor diagram container. */
  armorDiagram: 'armorDiagram',

  // --- Main Gun markers (IdConstants.MAIN_GUN_*) ---
  /** IdConstants.MAIN_GUN_ARMOR. */
  armor_MG: 'armor_MG',
  /** IdConstants.MAIN_GUN_SHADOW. */
  shadow_MG: 'shadow_MG',
  /** IdConstants.MAIN_GUN_TEXT. */
  text_MG: 'text_MG',

  // --- Torso weapon slots (IdConstants.TORSO_WEAPON prefix) ---
  torsoWeapon_0: 'torsoWeapon_0',
  torsoWeapon_1: 'torsoWeapon_1',
  torsoWeapon_2: 'torsoWeapon_2',

  // --- Armor pip-group containers (one per location) ---
  /** Aggregate armor pip group. IdConstants.ARMOR_PIPS. */
  armorPips: 'armorPips',
  /** Head armor pip group. */
  armorPipsHD: 'armorPipsHD',
  /** Torso armor pip group. */
  armorPipsT: 'armorPipsT',
  /** Legs armor pip group (combined). */
  armorPipsL: 'armorPipsL',
  /** Left-arm armor pip group (biped / glider only — absent on quad). */
  armorPipsLA: 'armorPipsLA',
  /** Right-arm armor pip group (biped / glider only — absent on quad). */
  armorPipsRA: 'armorPipsRA',
  /** Main-gun armor pip group. */
  armorPipsMG: 'armorPipsMG',

  // --- Structure pip-group containers (one per location) ---
  /** Aggregate structure pip group. IdConstants.STRUCTURE_PIPS. */
  structurePips: 'structurePips',
  structurePipsHD: 'structurePipsHD',
  structurePipsT: 'structurePipsT',
  structurePipsL: 'structurePipsL',
  /** Left-arm structure pip group (biped / glider only — absent on quad). */
  structurePipsLA: 'structurePipsLA',
  /** Right-arm structure pip group (biped / glider only — absent on quad). */
  structurePipsRA: 'structurePipsRA',
  structurePipsMG: 'structurePipsMG',
} as const;

/**
 * Conventional Infantry family template element IDs.
 *
 * Covers the Wave-2 per-unit block template `conventional_infantry_platoon`
 * (the single-unit MVP target — NOT the multi-slot
 * `conventional_infantry_default` outer sheet). Reviewed against
 * MegaMekLab `PrintInfantry.java` and `IdConstants.java` (task 0.5).
 *
 * MegaMekLab review (task 0.5): `PrintInfantry.getSVGFileName()` returns
 * `conventional_infantry_platoon.svg`; every binding target below was
 * cross-referenced against the `IdConstants` field consumed by
 * `PrintInfantry`. The `IdConstants` field name is noted per entry. No
 * catalogued ID diverges from `IdConstants`.
 *
 * The `soldier_1..30` IDs are the platoon pip elements (one per trooper
 * slot, `IdConstants.SOLDIER`); `no_soldier_1..30` are the empty-slot
 * twins (`IdConstants.NO_SOLDIER`). The platoon pip-grid helper lays out
 * exactly `platoonSize` pips against the `soldier_N` slots. The
 * `damage_1..30` IDs are the per-trooper-count damage row
 * (`IdConstants.DAMAGE` — `PrintInfantry` fills `damage_j` with
 * `round(getDamagePerTrooper() * j)`).
 *
 * Per-pip / per-row numeric ID families (`soldier_N`, `no_soldier_N`,
 * `damage_N`, `range_N`, `range_mod_N`, `uw_range_mod_N`) are exposed as
 * a single `as const` prefix string plus a count, mirroring the way the
 * adapters iterate them — the individual numbered IDs are layout
 * targets, not distinct catalog keys.
 */
export const INFANTRY_TEMPLATE_IDS = {
  /** IdConstants.TYPE — chassis + model line. */
  type: 'type',
  /** IdConstants.ROLE — unit battlefield role. */
  role: 'role',
  /** IdConstants.LBL_ROLE — the "Role:" label element. */
  labelRole: 'labelRole',
  /** IdConstants.BV — Battle Value. */
  bv: 'bv',
  /** IdConstants.ARMOR_KIT — infantry armor kit name. */
  armorKit: 'armor_kit',
  /** IdConstants.ARMOR_DIVISOR — armor damage divisor value. */
  armorDivisor: 'armor_divisor',
  /** IdConstants.TRANSPORT_WT — platoon transport weight. */
  transportWt: 'transport_wt',
  /** IdConstants.MP_1 — primary movement-mode MP value. */
  mp1: 'mp_1',
  /** IdConstants.MODE_1 — primary movement-mode label. */
  movementMode1: 'movement_mode_1',
  /** IdConstants.MP_2 — secondary movement-mode MP value. */
  mp2: 'mp_2',
  /** IdConstants.MODE_2 — secondary movement-mode label. */
  movementMode2: 'movement_mode_2',
  /** IdConstants.MP_2_LABEL — secondary MP label slot. */
  mp2Label: 'mp_2_label',
  /** IdConstants.MODE_2_LABEL — secondary movement-mode label slot. */
  movementMode2Label: 'movement_mode_2_label',
  /** IdConstants.RANGE_IN_HEXES — "range in hexes" header text. */
  rangeInHexes: 'rangeInHexes',
  /** IdConstants.DEST_MODS — destruction modifiers block. */
  destMods: 'dest_mods',
  /** IdConstants.SNEAK_CAMO_MODS — sneak/camo modifiers block. */
  sneakCamoMods: 'sneak_camo_mods',
  /** IdConstants.UW_RANGE_MODIFIER — underwater range modifier header. */
  uwRangeModifier: 'uw_range_modifier',
  /** IdConstants.NOTES — notes block. */
  notes: 'notes',
  /** IdConstants.RS_TEMPLATE — root template marker group. */
  rs_template: 'rs_template',
  /** IdConstants.GUNNERY_SKILL + "0" — crew 0 gunnery skill. */
  gunnerySkill0: 'gunnerySkill0',
  /** IdConstants.PILOTING_SKILL + "0" — crew 0 anti-mech / piloting skill. */
  pilotingSkill0: 'pilotingSkill0',
  /** IdConstants.PILOT_NAME + "0" — crew 0 name. */
  pilotName0: 'pilotName0',

  // --- Field gun block (IdConstants.FIELD_GUN_* — present when crewed) ---
  /** IdConstants.FIELD_GUN_COLUMNS — field-gun table container. */
  fieldGunColumns: 'field_gun_columns',
  /** IdConstants.FIELD_GUN_QTY — field-gun quantity. */
  fieldGunQty: 'field_gun_qty',
  /** IdConstants.FIELD_GUN_TYPE — field-gun type / name. */
  fieldGunType: 'field_gun_type',
  /** IdConstants.FIELD_GUN_DMG — field-gun damage. */
  fieldGunDmg: 'field_gun_dmg',
  /** IdConstants.FIELD_GUN_DMG_2 — field-gun secondary damage. */
  fieldGunDmg2: 'field_gun_dmg_2',
  /** IdConstants.FIELD_GUN_MIN_RANGE — field-gun minimum range. */
  fieldGunMinRange: 'field_gun_min_range',
  /** IdConstants.FIELD_GUN_SHORT — field-gun short range. */
  fieldGunShort: 'field_gun_short',
  /** IdConstants.FIELD_GUN_MED — field-gun medium range. */
  fieldGunMed: 'field_gun_med',
  /** IdConstants.FIELD_GUN_LONG — field-gun long range. */
  fieldGunLong: 'field_gun_long',
  /** IdConstants.FIELD_GUN_AMMO — field-gun ammo rounds. */
  fieldGunAmmo: 'field_gun_ammo',
  /** IdConstants.FIELD_GUN_CREW — field-gun crew count. */
  fieldGunCrew: 'field_gun_crew',

  // --- Numbered ID-family prefixes (IdConstants suffix-prefix fields) ---
  /** IdConstants.SOLDIER — platoon pip slot prefix (`soldier_1`..`soldier_30`). */
  soldierPrefix: 'soldier_',
  /** IdConstants.NO_SOLDIER — empty platoon-slot prefix (`no_soldier_1`..). */
  noSoldierPrefix: 'no_soldier_',
  /** IdConstants.DAMAGE — per-trooper-count damage row prefix (`damage_1`..`damage_30`). */
  damagePrefix: 'damage_',
  /** IdConstants.RANGE — range-bracket text prefix (`range_0`..). */
  rangePrefix: 'range_',
  /** IdConstants.RANGE_MOD — range-modifier prefix (`range_mod_0`..). */
  rangeModPrefix: 'range_mod_',
  /** IdConstants.UW_RANGE_MOD — underwater range-modifier prefix (`uw_range_mod_0`..). */
  uwRangeModPrefix: 'uw_range_mod_',
} as const;

/**
 * Maximum trooper count for a conventional infantry platoon — the
 * `soldier_N` / `no_soldier_N` / `damage_N` numbered ID families run
 * `1..30` on the `conventional_infantry_platoon` template.
 */
export const INFANTRY_MAX_TROOPERS = 30;

/**
 * Battle Armor family template element IDs.
 *
 * Covers the Wave-2 per-unit block template `battle_armor_squad` (the
 * single-unit MVP target — NOT the multi-slot `battle_armor_default`
 * outer sheet). Reviewed against MegaMekLab `PrintBattleArmor.java` and
 * `IdConstants.java` (task 0.5).
 *
 * MegaMekLab review (task 0.5): `PrintBattleArmor.getSVGFileName()`
 * returns `battle_armor_squad.svg`; every binding target below was
 * cross-referenced against the `IdConstants` field consumed by
 * `PrintBattleArmor`. The `IdConstants` field name is noted per entry.
 *
 * The `pips_0..pips_5` IDs are the per-trooper armor pip-group regions
 * (`IdConstants.PIPS` — `PrintBattleArmor` iterates `getElementById(PIPS
 * + i)` for `i` in `0..5`). The `suit0..suit5` IDs are the per-trooper
 * suit-label slots (`IdConstants.SUIT`). A Battle Armor squad has 4–6
 * troopers; trooper columns beyond the squad size are left empty.
 *
 * DIVERGENCE: `PrintBattleArmor` draws `getOArmor(trooper) + 1` pips per
 * column — the canonical per-suit armor value PLUS one extra "trooper"
 * pip. The Wave-2 per-trooper pip grid reproduces this `+1` so the
 * rendered count matches MegaMekLab.
 */
export const BATTLEARMOR_TEMPLATE_IDS = {
  /** IdConstants.TYPE — chassis + model line. */
  type: 'type',
  /** IdConstants.ROLE — unit battlefield role. */
  role: 'role',
  /** IdConstants.LBL_ROLE — the "Role:" label element. */
  labelRole: 'labelRole',
  /** IdConstants.BV — Battle Value. */
  bv: 'bv',
  /** IdConstants.SQUAD — squad designation header ("BATTLE ARMOR: ..."). */
  squad: 'squad',
  /** IdConstants.ARMOR_TYPE — BA armor type label. */
  armorType: 'armorType',
  /** IdConstants.MP_WALK — ground MP value. */
  mpWalk: 'mpWalk',
  /** IdConstants.MP_2 — secondary movement-mode MP value (jump/VTOL/UW). */
  mp2: 'mp_2',
  /** IdConstants.MODE_2 — secondary movement-mode label. */
  movementMode2: 'movement_mode_2',
  /** IdConstants.INVENTORY — equipment / weapon inventory block. */
  inventory: 'inventory',
  /** IdConstants.ERA_ICON — era icon image slot. */
  eraIcon: 'eraIcon',
  /** IdConstants.RS_TEMPLATE — root template marker group. */
  rs_template: 'rs_template',
  /** IdConstants.GUNNERY_SKILL + "0" — crew 0 gunnery skill. */
  gunnerySkill0: 'gunnerySkill0',
  /** IdConstants.PILOTING_SKILL + "0" — crew 0 anti-mech / piloting skill. */
  pilotingSkill0: 'pilotingSkill0',

  // --- BA capability check markers (PrintBattleArmor capability panel) ---
  /** Anti-personnel capability check marker. */
  checkAP: 'checkAP',
  /** Leg-attack capability check marker. */
  checkLeg: 'checkLeg',
  /** Mechanized capability check marker. */
  checkMechanized: 'checkMechanized',
  /** Swarm-attack capability check marker. */
  checkSwarm: 'checkSwarm',

  // --- Numbered ID-family prefixes ---
  /** IdConstants.PIPS — per-trooper armor pip-group prefix (`pips_0`..`pips_5`). */
  pipsPrefix: 'pips_',
  /** IdConstants.SUIT — per-trooper suit-label prefix (`suit0`..`suit5`). */
  suitPrefix: 'suit',
  /** Per-trooper fluff-image slot prefix (`fluffImage_0`..`fluffImage_5`). */
  fluffImagePrefix: 'fluffImage_',
} as const;

/**
 * Maximum trooper count for a Battle Armor squad — the `pips_N` /
 * `suit_N` numbered ID families run `0..5` (6 columns) on the
 * `battle_armor_squad` template; a squad fields 4–6 troopers.
 */
export const BATTLEARMOR_MAX_TROOPERS = 6;

/** Vehicle / VTOL template element ID type. */
export type VehicleTemplateId =
  (typeof VEHICLE_TEMPLATE_IDS)[keyof typeof VEHICLE_TEMPLATE_IDS];
/** Aerospace / conventional-fighter template element ID type. */
export type AerospaceTemplateId =
  (typeof AEROSPACE_TEMPLATE_IDS)[keyof typeof AEROSPACE_TEMPLATE_IDS];
/** ProtoMech template element ID type. */
export type ProtoMechTemplateId =
  (typeof PROTOMECH_TEMPLATE_IDS)[keyof typeof PROTOMECH_TEMPLATE_IDS];
/** Conventional Infantry template element ID type. */
export type InfantryTemplateId =
  (typeof INFANTRY_TEMPLATE_IDS)[keyof typeof INFANTRY_TEMPLATE_IDS];
/** Battle Armor template element ID type. */
export type BattleArmorTemplateId =
  (typeof BATTLEARMOR_TEMPLATE_IDS)[keyof typeof BATTLEARMOR_TEMPLATE_IDS];
