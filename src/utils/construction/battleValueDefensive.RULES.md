# Defensive BV rules

`calculateDefensiveBV` retains fractional armor BV through the defensive sum
and movement factor. Armor and BAR multipliers do not round that subtotal.
Source: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
BVCalculator.java:429-434,453,461-462. The fractional-armor cases and Warwolf
Prime defensive rating in battleValueDefensive.test.ts enforce this rule.

battleValueDefensive.ts owns the undamaged modular-armor BV point rule and
canonical normalized ID. Each construction mount adds ten points before armor
multipliers and BAR. Mech callers retain their positive-slot guard; vehicle
callers retain raw-ID normalization and physical-location filtering.
The critical scanner retains its separate raw-critical spelling projection.
Source: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
MiscType.java:2524-2543 and BVCalculator.java:385-408,425-436.

Native armor-code projection lives in this owner, independent of editor enum
ordinals. Unknown codes preserve the prior standard fallback. Vehicle callers
keep their guards; the aircraft consumer is a separate behavior change.
BVCalculator.java:350-420,1489-1503 at pin 48fcb2f64.

The aerospace editor preserves native per-arc type codes as source facts and
keeps points solely in armorAllocation. Serialization retains PATCHWORK and
those original contract arc keys. Choosing a global armor type clears the
native type map. This supporting change does not yet alter aircraft BV.
Enforcement: aerospaceBV.patchworkOwner.test.ts and all-family report equality.
