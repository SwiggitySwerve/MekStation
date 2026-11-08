# Salvage acceptance

Allocation and player acceptance are separate. Owner ruling D6 says `awarded`
means salvage was allocated to a side and still needs player acceptance.

`isSalvageUnitEnrolled` in `salvageAcceptance.ts` owns enrollment evidence:
whole-unit membership in any campaign force, or membership in the roster bound
to that same campaign. Parts and foreign rosters do not establish whole-unit
enrollment. This conservative custody check does not replace the enrollment
coordinator's entitlement, design provenance, force and recovery validation.

The inventory projection calls this predicate through `salvageAcceptanceStatus`.
The salvage selector reprojects allocations instead of trusting a stale cache;
the panel renders the resulting status. Actions call the same predicate before
allowing decline. No presentation layer repeats the force-membership rule.

An unenrolled awarded unit displays pending, and a declined unenrolled unit can
still be accepted. An enrolled unit displays accepted even if an older save has
a declined candidate status. Decline refuses without mutation after enrollment
and while an acceptance is in flight. Acceptance retains the existing atomic
roster, force, recovered-damage and acknowledged-save boundary, including its
rollback, idempotency and host-only safeguards. Accepted panel decisions are
disabled. Parts retain their existing candidate-status and inventory behavior.

MekHQ at e7adc2c6f3b17ec8ad243d30843e22207fe935e4 separates these stages:

- [The wizard records the player's selected claim or unclaimed salvage](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/gui/dialog/ResolveScenarioWizardDialog.java#L1608-L1618).
- [The tracker stores claimed and leftover salvage separately](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/campaign/ResolveScenarioTracker.java#L2044-L2061).
- [Settlement adds only kept salvage units to the campaign](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/campaign/mission/scenarios/salvage/CamOpsSalvageUtilities.java#L278-L291).

The post-enrollment decline refusal is MekStation's owner ruling, not a claim
that MekHQ exposes an identical post-settlement button. Eligibility, splitting,
value calculations, processor deduplication and persisted formats stay outside
this module.
