# Mech cockpit identities and layouts

`CockpitType.ts` owns all 19 identities, canonical source tags, mass metadata
and fixed cockpit system positions. Loader mappers and custom-unit persistence
call that owner. The unit JSON schema admits the same source tags, with an
executable contract test preventing drift; generated Zod output comes from
`npm run schema:gen`.

Authority: MegaMek `48fcb2f64`, `Mek.java:192-229` (identities),
`Mek.java:5612-5838` (cockpit installation), `MtfFile.java` cockpit regeneration,
and `TestMek.java:225-248` (mass). Native loaded-unit probes confirm the QuadVee
head occupies all six slots. Small Command Console leaves slot 6 free; torso
cockpits reserve head sensors plus their center/side-torso systems.

Source identity is explicit. Never infer a Tripod cockpit from configuration:
`TripodMek.java:74-82` passes its supplied cockpit to the base constructor.
Legacy Standard-tagged tripods remain Standard until their source data is
corrected. Existing VRRP recovery requires its complete native system layout.

New identity metadata follows the pinned advancement table. Existing cockpit
introduction-year values remain unchanged here; FU-102 owns the broader year
correction. The legacy loader's abbreviated aliases and unknown-to-Standard
fallback are retained.

Dual is unofficial in Java; the app's four-level rules vocabulary represents
it as Experimental, following `EnumParserRegistry`'s existing mapping.

Recognizing an existing catalog tag needs no catalog rewrite. Regenerating a
lost tag is a separate owner decision; measured scratch overlays must preserve
every byte outside the cockpit value.
