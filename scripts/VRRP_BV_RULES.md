# Virtual Reality Piloting Pod BV

The source converter retains the VRRP cockpit through the unit schema and its
generated contract. The existing cockpit mapper feeds `vrrp` to the total-BV
owner, whose summary multiplier is 1.4. Defensive and offensive aggregates
remain unchanged; apply the existing final integer rounding after the summary
multiplier. Preserve ordinary cockpit modifiers.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`MekBVCalculator.java:469-473` applies 1.4 for COCKPIT_VRRP. Only the permitted
unit schema changes; the miscellaneous equipment schema and unit catalogs do
not change.
