## 1. Source and context implementation

- [ ] 1.1 Add failing allowance projection tests against the real parser: presence/casing, absence/zero/negative, malformed lines and ambiguity, and ignored VTOL secondary tags.
- [ ] 1.2 Implement the allowance boundary without duplicating layout or numeric legality owners.
- [ ] 1.3 Preserve context through constructor, persistence/reopen, duplication and normalized-definition mapping.
- [ ] 1.4 Run one mutant per rule, vehicle/customizer suites, both compilers, formatting and oracle no-regression checks before publishing S10.

## 2. Support unknown-block residual

- [ ] 2.1 Add failing real-parser and direct-document tests for unknown nonempty blocks, empty blocks and supported geometry.
- [ ] 2.2 Reject only unknown nonempty blocks and prove support weight agreement does not drop.

## 3. Remaining handler integration

- [ ] 3.1 Complete remaining installed-empty/secondary handler wiring in S14, preserving source inspection and diagnostic policy.
