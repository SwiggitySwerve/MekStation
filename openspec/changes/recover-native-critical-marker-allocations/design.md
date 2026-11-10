# Design

criticalSlotEquipment.ts owns recognizeCriticalSlotEntries(input), returning cells and the missing subset. It consumes the current token parser/resolver, actual getSlotParts coverage and fixed-system owner. Recovery consumes these facts; notices consume the final residual. Unknown identities remain visible.

The JSON component vocabulary owns native marker spellings. Configuration allocations use existing armor/structure ID prefixes, structural category, zero equipment mass and one occupied native source cell per allocation. Armor/structure mass remains owned by material configuration. Cold reopen rehydrates those allocation identities before generic unknown fallback. Existing source-less saved/draft shapes and fingerprint literals remain evidence; never regenerate them.

The first commit exposes the recogniser API and vocabulary without admitting new kinds. Later o3a changes only marker recovery. o3b stacks on the first commit and extends the same owner. Heavy acceptance is run by C3 after the crew spec fix and before trial; no local full census/build is authorized here.

## Sizing contract

Each recognized entry retains `parsedToken`, the return value of the existing
`parseCriticalSlotToken` owner. Its `parameters.size` preserves native `:SIZE:`
raw text and the parsed number (undefined for malformed input).
`parameters.legacySize` preserves the parenthesized value, unit and raw text
that pinned MtfFile.extractLegacySize reads. Both forms remain available when
present; no default or equipment formula is invented in recognition.

`ICriticalSlotRecognitionInput` carries tonnage, unit tech/mode, Omni status,
source cells, system/configuration/engine context and current mounted equipment.
That equipment collection includes weapons. `ICriticalSlotRecoveryInput` adds
the entry, its location and all recognized entries at that location; recovery
passes a refreshed equipment collection after preceding weapon recovery. AES
can receive the actual location and chassis configuration without guessing
from neighboring tokens. The recovery switch delegates sizing to owners.

TC sizing uses weapons/utilities.ts's direct-fire tonnage functions and
targetingComputerUtils.ts's weight/slot functions; the calculator service's TC
formulas are also existing consumers. No AES mass/slot formula exists on this
base: PR-D needs a separately coordinated owner extension. Cargo and
communications have resolveVehicleVariableMass in vehicle/variableEquipmentMass.ts,
but it applies vehicle/support rounding. A shared mech-capable owner extension
is a named PR-D prerequisite, not permission to copy that arithmetic here.
