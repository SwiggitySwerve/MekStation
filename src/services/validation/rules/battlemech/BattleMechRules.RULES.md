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

`src/utils/validation/mechValidationProjection.ts` is the React-free owner of
editor construction selections and the full `IValidatableUnit` projection.
`getMechConstructionSelections` retains configuration, FrankenMek section data,
LAM subtype, mixed-tech mode, armor identity and all component selections.
Consumers of those facts must call this owner rather than assemble a copy.
The focused validation hooks delegate their defaults and derived inputs to its
pure functions. `useMechValidationInput` only reads the store and dependencies,
memoizes and calls `projectMechValidation`; `useUnitValidation` still owns
options, debounce and UI result formatting.

`captureMechValidity` calls the same pure projection directly. The sole remaining
React render obtains `useUnitCalculations`' complete structural-weight value;
there is no equivalent pure sum (the validation weight helper omits jump jets
and LAM conversion). Both that render and `useWeightValidation` obtain selections
from `getMechConstructionSelections`; neither clones weight arithmetic. Registry
readiness and the equipment catalog are explicit pure-projection dependencies.
Source paths label failures, not projected identity. Capture serializes rule IDs
and messages only, so mount relabeling remains unnecessary.

The shared selections now include `lamType`: pinned MegaMek `48fcb2f64`
`TestMek.java:191-200` assigns bimodal LAM conversion equipment 15% of tonnage,
rounded up. Shadow Hawk SHD-X1/X2 require 9 t conversion and 55 t total, whereas
the previous focused selections supplied 6 t conversion and 52 t total.
`getLAMConversionWeight` remains the arithmetic owner.

Campaign refit will consume the construction selections in C2's follow-up PR;
this change does not alter campaign adapters or their behavior. Other editor
selection assemblies are inventoried in the PR as follow-ups for their owners.

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
