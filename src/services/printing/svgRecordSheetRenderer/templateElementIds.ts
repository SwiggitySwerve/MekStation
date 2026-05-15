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

/** Vehicle / VTOL template element ID type. */
export type VehicleTemplateId =
  (typeof VEHICLE_TEMPLATE_IDS)[keyof typeof VEHICLE_TEMPLATE_IDS];
/** Aerospace / conventional-fighter template element ID type. */
export type AerospaceTemplateId =
  (typeof AEROSPACE_TEMPLATE_IDS)[keyof typeof AEROSPACE_TEMPLATE_IDS];
/** ProtoMech template element ID type. */
export type ProtoMechTemplateId =
  (typeof PROTOMECH_TEMPLATE_IDS)[keyof typeof PROTOMECH_TEMPLATE_IDS];
