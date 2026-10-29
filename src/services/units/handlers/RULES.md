# Source loading and construction diagnostics

`AbstractUnitTypeHandler` owns the parse/validate contract. VTOL and SmallCraft
handlers materialize representable BLK facts and call their existing validators
to populate `isValid` and `validationErrors`. Callers can obtain the full errors,
warnings and infos through `validate(unit)`. A successful parse says that the
source was retained; it does not certify a legal construction or numerical parity.

Construction tonnage ranges belong to
`src/services/construction/constructionConstants.ts`. Handler diagnostics and
aerospace tonnage validation consume those definitions. VTOL minimum cruise MP,
SmallCraft minimum safe thrust/SI, armor and personnel checks remain construction
diagnostics. This change preserves these local rules without claiming that they
match upstream validation, including the 30-ton VTOL and 100-ton SmallCraft limits.

The scoped numeric source checks in `unitHandlerShared.ts` reject missing,
malformed and nonfinite tonnage/movement and negative or fractional movement.
Zero movement remains a source fact. Common parsing still requires positive
tonnage and a chassis name. No source clamp or construction minimum may replace
a value merely to make a design load.

Authority: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`megamek/src/megamek/common/loaders/BLKVTOLFile.java` lines 74–115 and
`BLKSmallCraftFile.java` lines 72–75, 149–152 load source weight/movement separately
from construction checking. Regression fixtures retain original bytes from
mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985`, with source index, path, blob and
SHA-256. These fixtures establish this loading boundary, not equipment resolution,
engine/turret correctness, serialization/reload or BV parity.
