# MTF source rules levels

`enum_mapping_tables.RULES_LEVEL_MAP` owns source rules-level numbering;
`enum_mappings.map_rules_level` consumes that table for the MTF parser and shared
conversion callers. MTF source numbers are one-based: 1 Introductory, 2 Standard,
3 Advanced, 4 Experimental and 5 Unofficial. Clan and explicit Mixed chassis
sources start at 2 in the pinned loader. This correction changes decoded rules
metadata, not construction or BV arithmetic.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`MtfFile.java:828-902` loads these values; `Mek.java:5205-5207` writes the source
value from `TechConstants.T_SIMPLE_LEVEL` (`TechConstants.java:104-106`).
Pinned MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`,
`UnitUtil.java:2001-2002`, delegates MTF saving to that `Mek.getMtf()` writer.

The table's existing named aliases and zero alias retain their values. Zero is
legacy converter compatibility, not a newly accepted pinned MTF source code.
The existing fallback and default policies are outside this correction.
Shipped unit catalogs are not regenerated here. The strict converter census
compares source rows byte for byte after removing only each unit's `rulesLevel`.

# MTF source configuration

`enum_mappings.map_mech_config` is the only owner of the `Config:` mapping; it has
no table. The converter SHALL select the contract `configuration` the way pinned
MegaMek `48fcb2f64` does, `MtfFile.java:283-310`: test `chassisConfig.contains(...)`
in the order QuadVee, Quad, LAM, Tripod, and build a `BipedMek` for everything else.
`QuadVee` is tested before `Quad` because it contains it. The `OmniMek` and
`FrankenMek` suffixes never change the geometry: `Tripod OmniMek` is a Tripod
(`:307-308`); omni-ness is the separate `chassisConfig.contains("Omni")` test
(`:358-359`), and `Biped FrankenMek` is a Biped.

An unmatched or empty `Config:` value is converted to `Biped`, because that is the
pinned loader's own `else` branch. This is a deliberate match of Java, not a
project default: the 4,263 pinned BattleMech sources hold only the ten values
`Biped`, `Biped OmniMek`, `Biped FrankenMek`, `Quad`, `Quad OmniMek`, `QuadVee`,
`QuadVee OmniMek`, `LAM`, `Tripod` and `Tripod OmniMek`, all of which match. The
converter has no per-record diagnostics channel, so a string that matches no token
is not reported; adding one is a separate change. Matching is case-sensitive, like
`String.contains`.

Before this change `Tripod OmniMek` fell through a lookup table to `Biped`. The
shipped catalogs are not regenerated here; the six Ares sources are the only
converter outputs that move.

# MTF OmniMek source facts

The converter keeps three optional OmniMek facts, in this serialized order after
`componentTechBases`: `isOmni`, `baseChassisHeatSinks`, `clanName`. Pinned MegaMek
`48fcb2f64`: `MtfFile.java:358-359` (`chassisConfig.contains("Omni")`, case-sensitive,
independent of the geometry), `:371` and `:1717-1718` (the `base chassis heat sinks:`
line, default `-1`), `:326` and `:1745-1746` (the `clanname:` line).

- `isOmni` is written as `true` only; a non-Omni source gains no key.
- `baseChassisHeatSinks` is the integer exactly as written, so the 237 pinned sources
  that state a value below 10 keep it. A value that is not an integer raises
  `ValueError` naming the value, as `Integer.parseInt` fails the load in Java.
  The pinned sources hold 1,040 such lines: all parse, none repeat, none is negative.
- `clanName` is the raw text and is kept on non-Omni units too (67 of the 434 pinned
  `clanname:` lines); a blank name is omitted, as `Mek.java:5155` writes it only when
  not blank.

Java's stored value is derived: for an Omni with an engine `MtfFile.java:601-606`
stores the file value when it is at least 10 and the unit's total heat sinks
otherwise, and the only accessor, `Engine.getBaseChassisHeatSinks(compact)`
(`Engine.java:1318-1320`), returns `min(integralHeatSinkCapacity(compact), stored)`.
The catalog keeps the source value and never stores that derived number. A pinned-Java
probe of all 4,263 sources (`Entity.isOmni()`, `Entity.getClanChassisName()` and the
accessor above) found: the Omni flag and the clan name equal the converter's for every
source; the rule above reproduces the accessor for all 1,040 Omni units; and **the
accessor returns the source value for all 1,040**, including the 237 below 10, because
those units' integral capacity (`engineRating / 25`) equals the source value (237 of 237) while the substituted total is larger, so the cap hides the substitution. For the
other 803 units the capacity is never below the source value (equal for 548, larger
for 255). No pinned unit
therefore separates "stored = total" from "stored = source value" through the
accessor. If a source ever states a value larger than the engine's integral capacity,
the accessor would return the capacity, not the source value; that derived number is
the consumer's concern.
