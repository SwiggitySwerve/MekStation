# Improved heavy laser explosion eligibility

`validate-bv-crit-scan.ts` owns the critical-grid classification consumed by
both Mech BV paths. Improved heavy lasers incur one reduced deduction per
critical slot; ordinary heavy lasers do not. Recognize both size/heavy word
orders through the existing critical-name normalizer. Keep ammunition excluded
and leave CASE decisions to `battleValueExplosivePenalties.ts`.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `CLImprovedHeavyLaserLarge.java:57-60,74,81-86` defines the large laser's
  display/internal/lookup names, three slots, explosive flag and improved flag.
- `CLImprovedHeavyLaserMedium.java:57-61,74,80` and
  `CLImprovedHeavyLaserSmall.java:57-61,74,80` define the other size aliases,
  two/one slots and explosive flags.
- `MekBVCalculator.java:196-198,204-215` applies existing mount protection and
  the reduced penalty to improved lasers.

Tests cover the shared scanner and both public BV paths, ordinary heavy lasers,
neighboring ammunition, local CASE II and transferred arm CASE protection.
