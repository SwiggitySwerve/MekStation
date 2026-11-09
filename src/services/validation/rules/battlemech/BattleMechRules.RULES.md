# BattleMech tonnage validation

`constructionConstants.BATTLEMECH_TONNAGE` owns the accepted range and step.
The service rule, construction validator and structure controls read that owner:
10/15-ton ultralights remain available alongside standard and superheavy mechs.
The five-ton increment, 200-ton maximum and other construction checks remain.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`TestMek.java:1814-1820` checks multiples of five without a 20-ton floor;
`Mek.java:1068-1069` defines the 10/15-ton internal-structure rows.

The standard-only `MechBuilderService` and standard weight-class classifier
retain their separate 20-100-ton scope. They do not own source validity.

## Component introduction years

`BattleMechIntroductionYear` owns the mech component-date check. It reads
one live accessor, `getMechComponentIntroductionDates`, over the equipment
catalog and existing construction definition owners. Catalog date batches
feed it without validator changes or cached dates. The
editor supplies armor identity and mixed-tech mode alongside its other types.
Pinned `TestEntity.java:1471-1622` at `48fcb2f64` skips ammunition,
deduplicates equipment types and exempts retrofittable EI/DNI cockpit mods.
A single-tech design uses its own date side; mixed-tech small cockpits use
the earliest side. The validation year (explicit campaign year when supplied,
otherwise design introduction) permits dates through year + 5 inclusively.
Unknown definitions have no available date to test. No chassis exceptions
or changes to catalog dates belong in this rule.

`useMechValidationInput` owns the editor-state projection passed to the
orchestrator. It composes the existing focused metadata, weight, armor,
equipment and structure hooks; consumers do not reproduce their defaults or
assemble a second validation input. `useUnitValidation` debounces that input
and retains ownership of validation options and UI result formatting.

## Introductory ammunition legality

`BattleMechAmmoTechLevel` owns the ammunition rules-level check for Introductory
BattleMechs and OmniMechs. It compares each mounted ammunition definition's
rules level with the unit's level through the existing enum comparison owner.
Each illegal bin produces an error naming its ammunition. Non-ammunition,
missing definitions and non-Introductory units are outside this rule's scope.
Source loading remains independent of construction validity.

Pinned MegaMek `48fcb2f64`: `TestMek.java:766` calls
`TestEntity.hasIllegalTechLevels`; `TestEntity.java:1271-1286` compares ammunition's
minimum rules level with the ammo rules level. The pinned Javelin JVN-10U has
Introductory rules and two SRT 6 ammo bins, which Java rejects as non-box-set
ammunition. Catalog metadata and its normalization are consumed unchanged.
