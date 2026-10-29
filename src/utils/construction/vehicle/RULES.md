# Combat-vehicle construction rules

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
remain unresolved. No stored catalog ratings are migrated. Flank, turret rules,
full BV parity and broader construction validity remain separate work.

Focused enforcement: `useVehicleStore.suspension.test.ts` exercises the real
Zustand actions, pinned thresholds, validation, direct import and actual Python
converter output. `test_vehicle_suspension.py` covers converter rounding and
support exclusion. Construction, store, status bar, handler and BV regressions
must accompany changes. No complete corpus numeric-parity gate is claimed.
