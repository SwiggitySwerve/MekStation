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
