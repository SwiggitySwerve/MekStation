# Unit detail quirk presentation

`UnitQuirkSummary` owns the read-only quirk card shared by canonical and saved
unit detail pages. Preserve raw unit IDs, ordering, repeated values, and absence
of the card for missing or empty data. Canonical cards use purple badges; saved
cards use violet badges and their existing bottom margin.

This presentation does not establish gameplay effects, legality, or pilot/crew
abilities. Quirk rules and aliases remain with the existing quirk domain owner.

Optional `weaponQuirks` uses the canonical `IUnitContract` map. The saved-detail
parser validates it with that contract's existing field schema; malformed maps
are omitted from this read-only projection without changing saved data. Missing
maps and maps containing no quirk entries add no output.

Each nonempty source key gets its own list item, in source order. Display the
entire key verbatim, including legacy name-only keys; never match by name or
infer an editor mount UUID. Preserve every raw quirk ID and repeated entry,
including unknown IDs. No catalog filtering, alias normalization, or effect
calculation belongs in this component. Both detail pages use the same badge
renderer, retaining their existing color and spacing choices.

Enforcement: `UnitQuirkSummary.test.tsx`, `unitDetailQuirks.test.tsx` and
`detail.quirks.test.ts` exercise committed aerospace, capital and vehicle maps,
absence, unknown/repeated values and source locators. These DOM tests do not
certify browser geometry, editor/save retention, gameplay or printed output.
