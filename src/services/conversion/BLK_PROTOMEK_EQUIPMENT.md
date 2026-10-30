# ProtoMek source equipment effects

`BlkProtoEquipment.ts` owns interpretation of native source entries for the
undamaged myomer-booster effect. The handler preserves each raw mount record
and delegates this interpretation to the adapter. It does not use catalog
normalization: punctuation remains significant. Lookup uses the admitted source
technology declaration, including the pinned loader's specific prefix fallback.

MegaMek at `48fcb2f64a1b3f2d575707ce5653dad64927b587` supplies the contract:

- `ProtoMek.hasMyomerBooster` checks operable miscellaneous equipment with
  `F_MASC`; it does not check construction legality at this point.
- `MiscType` defines six such types: IS MASC, Clan MASC, Supercharger, VTOL Jet
  Booster, ProtoMek Myomer Booster and BA Myomer Booster. Exact internal,
  registered and display names are matched case-insensitively by EquipmentType.
- Lookup first tries a technology-qualified identity, then the bare identity.
  BLKProtoMekFile's final fallback uses `Clan ` only for Clan Level 2 and `IS `
  otherwise. Thus `Super Charger` enables the effect for IS and Clan Level 3/4,
  but not Clan Level 2. Registered aliases use lowercase lookup; display names separately use native case folding;
  at this pin no relevant qualified identity redirects to a non-booster.
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

ProtoMek equipment parsing preserves Unicode whitespace until native trimming:
only boundary characters through U+0020 are removed, including for size values.
CR, LF and CRLF separate physical lines before native comment filtering;
Unicode-padded hashes remain equipment, including malformed suffixes.
Family classification precedes legacy filtering even with late UnitType.
Nonbreaking/ideographic spaces remain significant. Other families retain their
existing parser behavior. Display-name folding admits long S and Kelvin sign;
it does not fold those characters across registered aliases or expand ligatures.
The same interpretation protects raw-state exports, preserving their bytes.
Inline equipment tags and differently cased closing tags still differ from
Java's line-based block reader, as do Unicode tag names, Unicode padding
before tags and spaces inside tags. Whitespace-only equipment lines may
remain unresolved records locally; mount fidelity is unclaimed.

Shot counts accept Java's BMP decimal digits, optional ASCII sign and values
from zero to 2147483647, including signed zero. The digit ranges come from
the pinned runtime's Character.digit(char, 10); supplementary digits are
rejected because Integer.parseInt reads UTF-16 chars. Malformed counts produce
a structured equipment error. Size values must
be finite decimal numbers, optionally with a Java float/double suffix. This is
deliberately stricter than Java's nonfinite and hexadecimal double syntax;
those forms are not claimed as source parity. The adapter checks every entry,
including those following a valid booster. Unvisited locations remain ignored
for the effect, while existing handler preservation/diagnostics stay intact.
Case-variant equipment blocks use the first retained block, including an empty
one. Identically spelled duplicate tags are already overwritten by the shared
parser; their original order is unavailable here and remains a source gap.

This change does not resolve canonical equipment IDs, rewrite source names,
remap Body into a faithful persisted mount, calculate equipment mass or cost,
validate legality or model damaged/disabled mounts. The existing handler's cost
and BV consumers observe the corrected flag; full numerical parity is open.
The 86 pinned source exports retain their existing bytes and effects.
The export boundary rejects a booster flag that disagrees with the emitted
equipment. This preserves the input and returns diagnostics with no content;
it does not add or remove equipment or modify a saved design. Both enabling a
flag without equipment and disabling it while retaining equipment are refused.
The existing Main Gun topology check still rejects contents without a mount.

The same adapter owns the existing export equipment projection. It preserves
the writer's Head, Torso, Main Gun, Left Arm, Right Arm, Legs order, exact raw
names and duplicate entries. A missing or empty location still defaults to
Torso; other locations remain omitted. Export validation uses that exact
projection and the same source decoder, including its malformed suffix errors.
The decoder receives the exact type declaration emitted by the writer, so
technology-dependent fallback is identical on export and reload. Equipment
ignored at a source location but normalized into Torso cannot silently enable
an effect: export rejects the resulting flag/equipment mismatch.
Emitted names containing CR, LF or angle brackets are refused: BLK has no
escaping for embedded lines or tags, which could change the effect on reload.
Unknown omitted locations cannot enable the exported booster. The vehicle
turret and aerospace arc projections have different rules and remain separate.

Successful exports keep their existing bytes. This guard does not resolve
equipment IDs, prove full mount preservation, or complete production import,
editing or persistence. Later mount editing must produce consistent equipment
and flags; rejection alone is not a complete user workflow. Native BLK derives
Run from Walk and equipment, so it cannot preserve arbitrary legacy stored
flank values. That save-migration/export policy remains separate and unproven.
