# Chain drape BV movement

The critical scanner owns chain-drape presence. The shared Mech movement-input
owner subtracts one walking MP once when any cape, apron or poncho is present,
clamped at zero, before deriving run MP. Jump movement retains its existing
jet/wing rules. Do not multiply the penalty by critical slots or locations.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`BipedMek.java:166-168`, `QuadMek.java:176-178` and `TripodMek.java:206-208`
apply the same walk penalty. `MPCalculationSetting.java:123-133` retains it in
BV calculation; `Mek.java:1929-1936` tests presence of any working drape.
