# Native single-pilot biped and quad SPA placement

`nativeMechSPA` owns presentation fitting for the existing single-pilot biped
and quad payloads only. `recordsheet/spaSection.buildSPASection` remains the sole ability
resolver, sorter and designation formatter. The native list uses those formatted
headlines; it does not implement Java PilotOptions, strip local designations, or
change assignment/persistence. Other Mech configurations retain their legacy
renderer. Non-Mech canonical omissions and infantry notes remain unchanged.

Pinned MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`:

- [PrintEntity.java:537-550](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintEntity.java#L537):
  use the existing SPA rectangle and its parent; `Abilities: ` list; normal-width
  measurement at `FONT_SIZE_MEDIUM * 0.9f`; switch once to `height / 2.4f` when
  overwide; italic output; line spacing `fontSize * 1.2`, first baseline one line
  below the rectangle's y. The current single-pilot model selects `spas0`.
- [PrintRecordSheet.java:108-112](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintRecordSheet.java#L108):
  default Eurostile typeface; medium font size 6.76. Java float rounding is
  preserved before double-precision line spacing.
- [PrintRecordSheet.java:1084-1143](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintRecordSheet.java#L1084):
  wrap on literal spaces with italic metrics, retain delimiter spaces, emit an
  unbroken overwide token whole. No clipping, truncation, line cap or additional
  shrink. Long lists can overflow below the native rectangle; this is accepted
  upstream behavior, not a containment guarantee.
- [PrintMek.java:112-131](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintMek.java#L112):
  quad Mechs select `mek_quad_default.svg` (or `_toheat` when configured).
  `writeTextFields` at line287 calls the common PrintEntity fitting path.
  Both paper formats reserve `spas0` in the transformed pilot panel. This
  single-pilot model does not select `spas1` or add native crew-slot support.
- [PrintRecordSheet.java:1411-1423](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintRecordSheet.java#L1411):
  normal vs italic width measurement matters. Browser output uses actual canvas
  font metrics and the same typeface for its SVG text. Java/browser glyph metrics
  or installed-font identity are not asserted equal.

Missing native rectangles omit the native list. No fallback fixed coordinates or
new geometry is invented. Long native lists include all supported headlines;
legacy descriptions, six-entry cap and `+N more` belong to the unchanged legacy
layout. The data owner's entries remain unchanged.

Enforcement: `mechPilotSPA.test.ts` checks biped/quad serialized SVG geometry, both paper
formats, designated headlines, unchanged sheet fields, native long-list/token
overflow, missing/empty inputs and legacy configuration behavior. Full-template
Chromium/PDF proof is recorded separately; DOM tests do not establish pixel or
Java font-metric parity.
