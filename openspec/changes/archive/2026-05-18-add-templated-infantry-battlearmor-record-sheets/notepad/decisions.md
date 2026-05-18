# Decisions — add-templated-infantry-battlearmor-record-sheets

## Task 0.6 finding — infantryDamage value is ABSENT (recorded by Atlas at session start)
- VERIFIED: `IInfantryWeaponEntry` has no `infantryDamage` field; `INFANTRY_WEAPON_TABLE` populates
  no per-trooper damage. `IInfantryWeaponSheet.damage` is a generic field, not the canonical figure.
- CONSEQUENCE: task 1.3 is IN SCOPE — `infantryDamage` must be added to `IInfantryWeaponEntry`
  and populated for all 13 weapons in `INFANTRY_WEAPON_TABLE`.
- Referenced by tasks: 0.6, 1.1, 1.2, 1.3, 1.4. (>=2 tasks => graduates to design.md.)
- CONFIRMED at Phase 0 execution: read InfantryInterfaces.ts:96-114 and weaponTable.ts in full.
  IInfantryWeaponEntry fields: id, name, isHeavy, damageDivisor, rangeShort/Medium/Long, heat,
  ammoType, special, secondaryRatio. NO infantryDamage. All 13 INFANTRY_WEAPON_TABLE entries
  confirmed lacking it. Task 1.3 IS IN SCOPE.

## Phase 0 ID-catalog facts (templateElementIds.ts INFANTRY_TEMPLATE_IDS / BATTLEARMOR_TEMPLATE_IDS)
- conventional_infantry_platoon.svg (per-unit block, confirmed by PrintInfantry.getSVGFileName line 79).
  Pip slots: `soldier_1..30` (platoon pip elements, IdConstants.SOLDIER); `no_soldier_1..30` empty twins.
  Damage row: `damage_1..30` (IdConstants.DAMAGE; PrintInfantry line 108 fills damage_j with
  round(getDamagePerTrooper()*j)). INFANTRY_MAX_TROOPERS = 30.
- battle_armor_squad.svg (per-unit block, confirmed by PrintBattleArmor.getSVGFileName line 74).
  Per-trooper pip groups: `pips_0..pips_5` (IdConstants.PIPS; PrintBattleArmor line 140 loops
  getElementById(PIPS+i) for i in 0..5). Suit labels: `suit0..suit5` (IdConstants.SUIT).
  BATTLEARMOR_MAX_TROOPERS = 6 (squad fields 4-6).
- CRITICAL BA pip rule (PrintBattleArmor lines 138-160): pip count per trooper column =
  getOArmor(LOC_TROOPER_1+i) + 1 — the per-suit armor value PLUS one extra "trooper" pip.
  The Wave-2 per-trooper pip grid MUST reproduce this +1, and the fidelity test asserts
  rendered count == armorPips + 1. Max BA armor is 18 (so 19-pip width division in MML).
- ID catalog reviewed vs MegaMekLab IdConstants.java — every catalogued ID matches an IdConstants
  field; field name noted inline per entry. No divergence except the documented BA +1 pip rule.
- Numbered ID families (soldier_N, damage_N, pips_N, suit_N, range_N, etc.) are catalogued as
  `*Prefix` string constants — adapters iterate `prefix + N`, the numbered IDs are layout targets.

## Decision: canonical-template marker is a `data-template-source` attribute (task 5.5)
- Referenced by tasks: 5.2, 5.5, F5. (>=2 tasks => graduates to design.md.)
- The silent-fallback guard needs a marker only the canonical-template path produces.
- CHOICE: `renderViaSmallUnitTemplate` stamps `data-template-source="mm-data-canonical"` on the
  SVG root via `renderer.root.setAttribute`. Exported as `CANONICAL_TEMPLATE_MARKER` /
  `CANONICAL_TEMPLATE_MARKER_VALUE` from renderTemplated.ts.
- RATIONALE: an attribute on the root is the cheapest assertable signal; the skeleton renderers
  (infantryRenderer / battleArmorRenderer) never set it, so its presence proves the template
  path — not the fallback — produced the SVG. The guard test asserts presence on template
  output and absence on skeleton output.

## Decision: small-unit pip layout runs BEFORE mount (task 5.2)
- Referenced by tasks: 5.2, 5.3, 3.3, 4.3. (>=2 tasks => graduates to design.md.)
- `TemplateRecordSheetRenderer.mount()` detaches the SVG root from `svgDoc`; after mount,
  `svgDoc.getElementById` returns null. The Wave-2 pip-grid helpers use `getElementById` +
  attribute geometry (Bounds.fromRect) — NOT getBBox() — so they need no live DOM.
- CHOICE: `renderViaSmallUnitTemplate` lays out pips on the parsed document BEFORE calling
  mount(); mount + awaitFontsReady follow only for text measurement. This differs from the
  Wave-1 `renderViaTemplate` order (which mounts first because Wave-1 pips need getBBox()).
