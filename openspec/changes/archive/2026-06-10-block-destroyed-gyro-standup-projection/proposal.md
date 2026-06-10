# Block Destroyed-Gyro Stand-Up Projection

## Why

MegaMek treats a standard Mek with a destroyed gyro as unable to stand from
prone. Its movement step validation marks non-turn/eject steps illegal for a
prone Mek with a destroyed gyro, and its base piloting roll resolves destroyed
gyro PSRs as automatic failures. MekStation was still projecting a destroyed
gyro stand-up as a high-number PSR, which made the map advertise a stand-and-walk
attempt that the rules should explain as impossible.

## What Changes

- Classify represented standard-gyro destruction (`gyroHits >= 2`) as an
  impossible stand-up reason in the shared stand-up projection.
- Keep movement reachability, tactical-map metadata, and committed movement on
  the same projection-backed reason: `Cannot stand with a destroyed gyro`.
- Resolve a committed destroyed-gyro stand-up attempt as an automatic failed
  stand-up at the origin without consuming dice or emitting `UnitStood`.

## Out Of Scope

- Heavy-duty gyro destruction thresholds.
- QuadVee vehicle-mode, tracked-Mek, or LAM fighter-mode destroyed-gyro
  exceptions beyond existing conversion-mode work.
