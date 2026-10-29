# ProtoMek BLK source projection

The BLK format owner holds native armor order and motion vocabulary; the
registered ProtoMech handler projects them into the existing domain shape.
MegaMek at `48fcb2f64a1b3f2d575707ce5653dad64927b587` is the reference:
`BLKProtoMekFile.java:79-122` reads motion/cruise, derives engine rating and
sets main-gun existence from five versus six armor entries. `ProtoMek.java`
defines Head, Torso, Right Arm, Left Arm, Legs, Main Gun armor order.

Native `ProtoMek` requires representable Biped/Quad/WiGE motion (Glider is a
WiGE alias), finite tonnage, nonnegative integer cruise/jump and five or six
numeric armor values representing safe integers. Decimal spellings such as
`2.0` are accepted here; MegaMek's permissive integer reader can disagree.
Explicit malformed numbers are rejected instead of trusting the generic
parser's partial `parseFloat` projection. This is deliberately stricter than
MegaMek's permissive integer reader (commas and multiple values) and only
supports the three motion modes this domain can retain. Tag casing follows
the existing parser. Every spelling rejects missing/mixed/unknown technology
explicitly; IS/Clan levels 1-4 retain their declared technology and rules level.

Legacy ProtoMech/Protomech documents without motion retain glider-before-quad
flags and the omitted-cruise default. Explicit native motion takes precedence.
All spellings use source armor order and armor-count main-gun topology. A
sixth zero means an existing unarmored mount, not an absent one. Export writes
native identity/motion and five values when the store has no main-gun mount.
Equipment at Main Gun without a mount remains in loaded data with an explicit
warning that upstream ignores it. Export refuses equipment or nonzero armor at
an absent mount with no file content. Disabling a mount does not delete the
user's stored equipment or armor; those contents must be reconciled before export.

Quad/Glider configuration survives above nine tons. Biped at ten tons or more
uses the existing Ultraheavy enum, which is a local weight representation.
Engine rating calls the existing construction owner. The ignored source
engine tag does not determine it. Construction errors remain attached to
loaded designs; the existing two-to-nine-ton and Glider rules are not an
upstream-validity claim.

This slice does not establish internal structure, resolved equipment/mount
qualifiers, mass, cost, BV, native import-to-store, save/reload or full export
parity. The handler's standard-format deserializer remains unimplemented.
The scoped exporter tests use explicit store projections, not a production
source-to-editor path. These gaps remain in the all-family execution ledger.
