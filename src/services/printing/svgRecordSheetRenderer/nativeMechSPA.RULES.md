# Native Mech crew and SPA placement

`nativeMechSPA` owns presentation fitting for the existing single-pilot biped,
quad and LAM payloads, plus explicit ordinary/superheavy tripod and QuadVee crew payloads.
`recordsheet/spaSection.buildSPASection` remains the sole ability
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
- The same PrintMek selector chooses `mek_lam_default.svg` for LAM. Its native
  `spas0` has y76 on Letter/A4, while biped/quad use y52; the fitter reads the
  actual rectangle and parent transform rather than sharing coordinates. LAM
  support here remains single-pilot only. Tripod uses the explicit crew contract
  landed by #2974; QuadVee uses that same explicit roster contract and renderer
  owner. No slots are inferred from the one-pilot payload.
- [PrintRecordSheet.java:1411-1423](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintRecordSheet.java#L1411):
  normal vs italic width measurement matters. Browser output uses actual canvas
  font metrics and the same typeface for its SVG text. Java/browser glyph metrics
  or installed-font identity are not asserted equal.

Missing native rectangles omit the native list. No fallback fixed coordinates or
new geometry is invented. Long native lists include all supported headlines;
legacy descriptions, six-entry cap and `+N more` belong to the unchanged legacy
layout. The data owner's entries remain unchanged.

Enforcement: `mechPilotSPA.test.ts` checks biped/quad/LAM serialized SVG geometry, both paper
formats, designated headlines, unchanged sheet fields, native long-list/token
overflow, missing/empty inputs and legacy configuration behavior. Full-template
Chromium/PDF proof is recorded separately; DOM tests do not establish pixel or
Java font-metric parity.

## Explicit tripod crew

`nativeMechCrew` owns indexed name/skill presentation, native role-label offsets
and crew-field/frame visibility for explicit `TRIPOD`/`SUPERHEAVY_TRIPOD` rosters
on a tripod sheet and `QUADVEE` on a QuadVee sheet. It consumes `getMechCrewRoles`; schemas/extraction remain the
crew-contract owner's responsibility. Unassigned seats have blank names/skills
and visible blank lines; no person or option is invented. Edge/SPAs remain global.

- [PrintMek.java:112-131](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintMek.java#L112-L131)
  selects the native tripod template. Its
  [343-348](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintMek.java#L343-L348)
  selects `warriorDataSingle/Dual/Triple` by roster size.
- [PrintEntity.java:495-550](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintEntity.java#L495-L550)
  measures the old label's computed text length, replaces it with the native
  role, then offsets the name by new label bbox width minus old length. Measure
  against the shared mounted SVG; restore the document before SPA insertion.
  [595-616](https://github.com/MegaMek/megameklab/blob/62bf19360382049e2e6a1e8f24e859e27bdc5878/megameklab/src/megameklab/printing/PrintEntity.java#L595-L616)
  controls indexed fields/damage panels/blanks. For an unassigned local seat,
  use the blank-field branch rather than fabricating native default skills.
- The SPA code is inside the native crew loop: repeat the same crew-global list
  once for every roster slot at `spas(slotCount-1)`, including unassigned seats.
  Root explicitly approved this native repeated overdraw; do not deduplicate or
  create per-seat ability lists. Unique SVG group IDs preserve a valid document.
  Two-seat tripod uses spas1 y104; three-seat uses spas2 y156. Both are13.5 high,
  widths142.60001 Letter/138.067 A4, in each template's actual transformed parent.
  The fitter's float arithmetic, metrics, unbounded wrapping/overflow are unchanged.
- Native crew fields in the configured default tripod templates have no
  `mml-field-width` fitting metadata. Retain their native text styling and offset;
  no new wrapping, truncation, clipping or font policy is introduced.

`mechCrewRendering.test.ts` enforces unequal skills, repeated names, blank seats,
native visibility/offsets, repeated global SPA placement/overflow and rejected
missing/swapped rendered-field mutations on both papers. Separate real-template
SVG/PDF pixel proof must accompany the PR. Legacy/no-crew and other-family output
remain unchanged. Authoring/persistence remain required later work, not
established by these renderer slices.

QuadVee reuses this owner and fitter without changing either implementation.
Pinned PrintMek112-131 selects `mek_quadvee_default.svg`; its actual Letter/A4
templates have two Pilot/Gunner seats and no third seat/frame. Both use spas1
x0/y104/h13.5, width142.60001 Letter/138.067 A4, with pilot-panel translations
(234.366,87.857)/(226.600,86.359). Name baselines12/64 and skill baselines24/76
retain measured role offsets. Emit the same crew-global SPA list twice at spas1,
including unassigned seats; retain native overflow and explicit blank-seat
behavior. Root's bounded project Playwright1.57/Chromium143 SVG/PDF/pixel proof
is separate from mocked DOM metrics; no shared-preview pixel acceptance is used.
