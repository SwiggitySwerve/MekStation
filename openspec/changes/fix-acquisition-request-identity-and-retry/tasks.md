## Implementation

- [ ] Record failing identity, cooldown, legacy load and integration regressions.
- [ ] Implement unique creation IDs and deterministic legacy normalization.
- [ ] Wire the same normalizer through both loaders with minimal persistence edits.
- [ ] Retain failed work and enforce the pinned seven-day retry interval.
- [ ] Discover the created ID in the existing acquisition browser proof.

## Verification

- [ ] Kill terminal-failure and queue-length-ID mutants; record killing tests.
- [ ] Run whole touched test directories and the integration directory.
- [ ] Run runner, replay/digest/golden before and after, and validate:combat.
- [ ] Run both TypeScript configs, lint, formatting, lint:units and its suite.
- [ ] Run OpenSpec checks and CI budget check without raising ceilings.
- [ ] Open one draft PR with both follow-ups; leave merging to Root.
