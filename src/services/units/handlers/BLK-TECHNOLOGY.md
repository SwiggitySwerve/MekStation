# BLK binary technology import

`unitHandlerShared.decodeBlkTechnologyHeader` owns header decoding. The common
handler boundary calls it before family parsing and carries its typed pair into
the unit builder. Battle armor consumes the same pair. Chassis-only consumers
use its `isClanSourceChassis` selector through the existing ValueMappings facade.

For qualified Mixed headers, select the explicit IS/Clan chassis family and
Standard (unsuffixed), Advanced or Experimental rules level. Refuse Unofficial
with a structured load diagnostic because the existing RulesLevel enum cannot
represent it. Do not infer technology from equipment or add a unit Mixed field.

Pinned MegaMek `48fcb2f64` defines these facts in
[BLKFile.java:654-742](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKFile.java#L654-L742).
[Entity.java:1971-1983](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L1971-L1983)
derives chassis family from tech level. Explicit component flags remain
independent: [BLKFile.java:908-917](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKFile.java#L908-L917)
writes `clan_engine` when engine and chassis differ;
[BLKTankFile.java:144-151](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKTankFile.java#L144-L151)
reads it before falling back to chassis technology. `isClanBlkEngine` keeps that
precedence.

Pure-source compatibility is deliberate: preserve the historical family rules
policies, aliases and Level 5 fallback. The pinned format supports Unofficial,
but correcting existing pure Level 5 imports needs a separate representability
decision. This change refuses qualified Mixed Unofficial only. It does not
change catalog conversion, canonical loading, editor Mixed mode, mapper
admission, capital dispatch or BLK export.

The serialization-format delta in `establish-all-unit-data-parity` is the
requirements contract. Tests cover exact pinned source bytes, both chassis
families, all 19 experimental BA inputs, explicit engine overrides, structured
refusal before API writes and SQLite definition reopen. The external census
compares complete pure import-result bytes at a fixed clock.
