# Combat-vehicle construction rules

`equipmentMounts.ts` owns the combat-vehicle import mount flags and primary
turret inference. Nonempty `Turret` / `Turret Equipment` blocks or an explicit
turret type install a primary turret. Sponson and secondary-turret blocks carry
mount flags independently; neither alone installs the primary turret. Explicit
dual/chin and the existing fallback to single are preserved for BLK imports.

`engine.ts` owns combat-vehicle rating and installed-weight derivation.
`suspension.json` owns the suspension table facts consumed by TypeScript and
`scripts/megameklab-conversion/combat_vehicle_engine.py`. Python is a conversion
adapter, not a second table authority. Tracked, rail and maglev use the upstream
default suspension factor zero.

Pinned source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- [Tank.java:1678](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L1678)
  gives movement/tonnage suspension thresholds and extensions. The naval
  extension is literally `ceil(tons / 10) + ceil(tons / 10) % 5`; do not replace
  it with conventional rounding to five.
- [BLKTankFile.java:155](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKTankFile.java#L155)
  subtracts suspension from cruise times integer tonnage, clamps to at least 10,
  then rounds upward to five. Zero cruise with explicit no engine yields zero.
- [Engine.java:396](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/equipment/Engine.java#L396)
  owns the previously corrected installed-weight rounding, shielding and minima.
- [Tamerlane BLK](<https://github.com/MegaMek/mm-data/blob/50f7efef0c9f775b0258f8283525ed4f906e1985/data/mekfiles/vehicles/3075/Tamerlane%20Strike%20Sled%20(Flamer).blk>)
  identifies Magna 155: `20 * 12 - 85 = 155`, installed weight 8.5 tons.

The real store derives rating on cruise, tonnage and motion changes. Its rating
editor adds suspension back before deriving cruise. Rounding/minimum ratings
can represent more than one movement value; the inverse selects the greatest
integer cruise admitted by that rating. The existing tonnage-edit 10..400 clamp
is preserved; other derivations retain ratings above 400 for validation.
The status bar consumes stored rating; validation independently uses the owner.
Combat vehicle and VTOL import/weight/cost callers use the same rating owner;
their other existing approximate weight/cost rules are not corrected here.

Tank import preserves the independent raw engine code and trailer flag.
`BLKFile.NONE` (8), with zero cruise, selects the no-engine rating exception;
trailer identity never selects it. The handler translates that fact once for
parse, weight and cost callers. The shared BLK facts adapter resolves known NONE to `null` at the installed-engine
boundary, preserving raw code 8 and independent Clan context on loaded entities.
Unknown and unsupported codes retain errors; neither becomes absence or fusion.
The mass owner returns exactly zero for null before table lookup, shielding,
fission or hover minima, even at a positive rating. Positive-cruise NONE retains
the loader-derived rating and receives a separate construction legality error.
The store's `EngineType` currently represents installed engines only, so
engine-less store designs are not supported; a trailer with any representable
engine retains minimum rating 10. The tonnage-edit clamp remains unchanged.
BLKVTOLFile lacks Tank's NONE exception: the generic converter's engine-less
zero-cruise VTOL case remains a disclosed loader-family gap, not proven parity.

Support store and converter outputs retain legacy rating behavior, including distinct converter
rounding. This is compatibility, not support-construction parity. Support
identity survives motion edits so later actions cannot accidentally apply combat
suspension. Support UI and construction validation still contain combat-vehicle
approximations and are not covered by this parity slice. Existing imported/saved catalog ratings are not migrated on load.
The converter's support-VTOL discriminator and broader BLK engine ordinal
semantics remain separate work; this slice adds no engine-code table.

`controlsLift.ts` owns controls and lift/dive mass (standard combat construction
ceilings): controls = upward-half-ton-rounded tonnage / 20, unless explicit
`hasNoControlSystems` is true; lift = upward-half-ton-rounded tonnage / 10 for
HOVER, VTOL, HYDROFOIL, SUBMARINE and WIGE only. NAVAL has no lift term.
`weightComposition.ts` composes these with the existing component owners;
the former status-bar utility is a compatible re-export. Validation calls the
same controls/lift owner with the same family, motion and no-controls context.

Pinned [TestTank.java:229-250](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestTank.java#L229)
uses `ceilMaxHalf` for both terms.
[BLKTankFile.java:268-270](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKTankFile.java#L268)
sets no-controls from the tag's **presence**, including a zero payload;
[Tank.java:268](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L268)
defaults it to false. Store creation accepts the explicit fact and persists it;
legacy saves without it retain standard controls. This slice does not connect
BLK raw tags to store creation: that import boundary still needs to preserve
presence semantics, rather than parse the payload as a boolean.

Support identity explicitly excludes these new combat terms; zero here means
legacy behavior, not zero actual support controls/lift mass or support parity.
Tamerlane at rating155 independently has engine8.5, controls1, lift2,
structure2, armor3, weapons3 and turret0.5 = 20 tons. Its additional heat-sink
mass is zero in the pinned runtime reference; general vehicle heat-sink rules
remain unresolved. No stored catalog ratings are migrated. Turret rules,
full BV parity and broader construction validity remain separate work.

Focused enforcement: `useVehicleStore.suspension.test.ts` exercises the real
Zustand actions, pinned thresholds, validation, direct import and actual Python
converter output. `test_vehicle_suspension.py` covers converter rounding and
support exclusion. Construction, store, status bar, handler and BV regressions
must accompany changes. No complete corpus numeric-parity gate is claimed.

## Ordinary turret mechanism mass

`turret.ts:computeTurretWeight` owns the default half-ton-rounded 10% mechanism
mass for each ordinary Single, Dual or VTOL Chin turret. The caller supplies
resolved qualifying equipment mass and adds the independently rounded turret
results. Weight composition excludes ammunition from the mechanism basis while
retaining it in total equipment mass. Validation and Weight Free consume this
same owner; no equipment-count estimate is introduced here.

Pinned MegaMek [TestTank.java:178-226](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestTank.java#L178)
defines both mechanisms. [TestEntity.java:147-150](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestEntity.java#L147)
routes combat VTOLs through TestTank, and MegaMekLab
[CVChassisView.java:297-300](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/ui/combatVehicle/CVChassisView.java#L297)
labels their installed turret Chin. There is no separate 5% chin rule.
The pinned Java runtime returns a 1-ton mechanism for a synthetic source-loaded
Ferret with a resolved 7-ton PPC in its chin, and independently returns 0.5 tons
for each of two 2.5-ton turret loads. The synthetic designs are invalid; these
observations certify individual terms, not valid designs or whole-unit parity.

This owner still lacks explicit Omni base-chassis mechanism allowances and
support-specific rounding. Sponson behavior is unchanged and unverified here.
Primary patchwork armor-mount exclusion and upstream secondary/Omni asymmetries
need richer resolved equipment facts before integration. Missing equipment
resolution still counts as zero in legacy composition and is not parity-ready.
The generic 10%-tonnage `maxWeight` capacity, equipment-count display, and
handler approximations remain separate tracked defects; they are not actual
Omni mechanism allowances. No catalog data or BV arithmetic changes here.

## Base flank movement

`engine.ts:computeFlankMP` owns unmodified vehicle flank MP: cruise times 1.5,
rounded upward. [Entity.java:4004-4016](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L4004)
provides the base rule; [Tank.java:1570-1575](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L1570)
adds a separate armed-MASC override. The store helper is a compatibility export
of the owner. Defaults, actions, validation, BV state adaptation, status and
template displays consume it. Vehicle, VTOL and support imports retain their
previous ceil results; the support import's nonpositive guard remains intact.

The store factory derives flank from initial cruise after defaults and saved
fields merge, so reopening, duplication and direct initialization cannot retain
default or stale flank values. The persisted document keeps cruise as the source
of truth. `useVehicleStore.flank.test.ts` exercises real registry save/reopen,
duplication, rating edits and record-sheet movement transport. Component tests
cover full/compact status and odd-cruise new-unit templates.

The generic 'Mech run helper has a separate nonpositive-input guard. ProtoMek
movement enhancements are a distinct policy (`ProtoMek.java:612-616` booster
override). Python BLK conversion already rounds upward; it retains its
language-boundary expression. No copy of the old floor-based vehicle
construction calculation remains. The same upstream rule still floors outside
this owner, as separate follow-ups:

- In-play flank after motive damage (`utils/gameplay/motiveDamage.ts`
  `computeEffectiveMP`). MegaMek subtracts motive damage from cruise in
  `Tank.getWalkMP` (`Tank.java:397`), and `Entity.getRunMP` then rounds up
  (`Entity.java:4016`).
- Aerospace max thrust (`aerospace/thrustCalculations.ts` and the aerospace
  store, handlers and spec). Airborne `Aero.getRunMP` delegates to
  `Entity.getRunMP` (`Aero.java:1656-1658`), and MegaMekLab derives Flank MP and
  Max Thrust from one `Math.ceil(walk * 1.5)` (`MovementView.java:295`).
- BattleMech run MP in `services/construction/CalculationService.ts`
  `calculateMovement`, which feeds customizer BattleMech BV.

ProtoMek run MP already rounds upward in `protomech/movementCaps.ts`.
Boosters, modified cruise, rail/zero-MP BV special cases and complete BV parity
remain separate work. This correction establishes only base movement and its
propagation. It does not regenerate or migrate unit catalogs.
