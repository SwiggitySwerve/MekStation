## Implementation

- [x] Record failing identity, cooldown, legacy load and integration regressions.
- [x] Implement unique creation IDs and deterministic legacy normalization.
- [x] Wire the same normalizer through both loaders with minimal persistence edits.
- [x] Retain failed work and enforce the pinned seven-day retry interval.
- [x] Discover the created ID in the existing acquisition browser proof.

## Verification

- [x] Kill terminal-failure and queue-length-ID mutants; record killing tests.
- [ ] Run whole touched test directories and the integration directory.
- [ ] Run runner, replay/digest/golden before and after, and validate:combat.
- [ ] Run both TypeScript configs, lint, formatting, lint:units and its suite.
- [ ] Run OpenSpec checks and CI budget check without raising ceilings.
- [ ] Obtain a passing full Chromium directory gate: blocked by an absent Windows screenshot baseline in unchanged audit-capture.spec.ts; see design.md. No baseline generation in K9.

## Delivery

Open one draft PR with pricing/debits and historical quantity loss listed as
separate follow-ups. Root owns any broader gate decision and merging.
