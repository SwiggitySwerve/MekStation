## 1. Consolidation

- [ ] 1.1 Record baseline runner, integration, replay, digest, and golden results.
- [ ] 1.2 Characterize and extract existing per-unit readiness decisions.
- [ ] 1.3 Verify unchanged behavior and commit consolidation separately.

## 2. Derived readiness

- [ ] 2.1 Write failing condition, legacy-save, pilot, repair, and refit tests.
- [ ] 2.2 Derive readiness without mutating persisted facts.
- [ ] 2.3 Add optional authority response data and the shared browser hook.
- [ ] 2.4 Connect campaign UI and all campaign launch admission paths.
- [ ] 2.5 Enforce server admission using stored facts only.

## 3. Verification and delivery

- [ ] 3.1 Kill cached-readiness and missing-server-gate mutants.
- [ ] 3.2 Run full touched test directories and all lane gates.
- [ ] 3.3 Compare seeded outcomes; stop on any admission-driven change.
- [ ] 3.4 Record evidence, commit behavior, and open one draft PR without merging.
