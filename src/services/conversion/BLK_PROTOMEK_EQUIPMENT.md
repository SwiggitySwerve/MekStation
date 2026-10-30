# ProtoMek source equipment effects

`BlkProtoEquipment.ts` owns interpretation of native source entries for the
undamaged myomer-booster effect. The handler preserves each raw mount record
and delegates this interpretation to the adapter. It does not use catalog
normalization: removing punctuation or adding technology prefixes would admit
names the pinned source loader does not recognize.

MegaMek at `48fcb2f64a1b3f2d575707ce5653dad64927b587` supplies the contract:

- `ProtoMek.hasMyomerBooster` checks operable miscellaneous equipment with
  `F_MASC`; it does not check construction legality at this point.
- `MiscType` defines six such types: IS MASC, Clan MASC, Supercharger, VTOL Jet
  Booster, ProtoMek Myomer Booster and BA Myomer Booster. Exact internal,
  registered and display names are matched case-insensitively by EquipmentType.
- `BLKProtoMekFile.loadEquipment` visits Body and each present armor location.
  Main Gun is skipped without a mount. It strips size, uppercase `(R)` and
  shot-count syntax in that order. Unknown equipment does not enable the effect.
- The source loader never reads the separate `myomerbooster` tag. MekStation
  now follows that rule for every accepted spelling. Direct typed/store flags
  remain explicit and are not silently migrated.

The alias `Supercharger (Clan)` collides with the loader's shot-count syntax
and therefore fails as a raw source entry, even though EquipmentType registers
it. Case and punctuation are not interchangeable. Construction-invalid MASC
types still retain the actual source movement effect; legality is separate.

Malformed shot counts produce a structured equipment error. Size values must
be finite decimal numbers, optionally with a Java float/double suffix. This is
deliberately stricter than Java's nonfinite and hexadecimal double syntax;
those forms are not claimed as source parity. The adapter checks every entry,
including those following a valid booster. Unvisited locations remain ignored
for the effect, while existing handler preservation/diagnostics stay intact.

This change does not resolve canonical equipment IDs, rewrite source names,
remap Body into a faithful persisted mount, calculate equipment mass or cost,
validate legality or model damaged/disabled mounts. The existing handler's cost
and BV consumers observe the corrected flag; full numerical parity is open.
Existing source export/reload retains its equipment and therefore its effect.
An editor flag without corresponding equipment is still a separate export
integrity gap; production import/store/edit/save and full topology need proof.

The same adapter owns the existing export equipment projection. It preserves
the writer's Head, Torso, Main Gun, Left Arm, Right Arm, Legs order, exact raw
names and duplicate entries. A missing or empty location still defaults to
Torso; other locations remain omitted. This extraction alone changes no output
or admission policy. The vehicle turret and aerospace arc projections have
different rules and remain separate. Full mount preservation is still open.
