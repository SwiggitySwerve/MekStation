## 1. Consolidation

- [x] 1.1 Record baseline runner, integration, replay, digest, and golden results.
- [x] 1.2 Characterize and extract existing per-unit readiness decisions.
- [x] 1.3 Verify unchanged behavior and commit consolidation separately.

## 2. Derived readiness

- [x] 2.1 Record failing readiness tests and cover condition, legacy saves, pilots, repairs, and refits.
- [x] 2.2 Derive readiness without mutating persisted facts.
- [x] 2.3 Add optional authority response data and the shared browser hook.
- [x] 2.4 Connect campaign UI and all campaign launch admission paths.
- [x] 2.5 Enforce server admission using stored facts only.

## 3. Verification and delivery

- [x] 3.1 Kill cached-readiness and missing-server-gate mutants.
- [x] 3.2 Run full touched test directories and all lane gates; document the unchanged base budget failure.
- [x] 3.3 Compare seeded outcomes; stop on any admission-driven change.
- [ ] 3.4 Record evidence, commit behavior, and open one draft PR without merging.
