# Shared BLK conversion rules

`blk_common.py` owns parsing primitives and rules shared by BLK converters.
Converters keep their required-tag policies and compose the shared results.

## Maximum thrust

`maximum_thrust` rounds safe thrust times 1.5 up, including odd values.
The aerospace caller retains its existing integer parsing and zero default.
The DropShip caller requires its SafeThrust source tag before calling the rule.
No clamping is added by this extraction.

Reference: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`Entity.java` base `getRunMP` and `Aero.java` `getRunMP`.
Regression coverage: `scripts/__tests__/test_blk_aerospace_si.py`.
