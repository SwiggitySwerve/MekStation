## 1. PR1: shared producer extraction (no behaviour change)

- [x] Record the runner terrain and recovery event digest, the replay set and
      the runner suites on unmodified main.
- [x] Move the terrain triggers into `planMovementTerrainEffects` and the
      recovery eligibility, PSR and roll into `stuckRecovery`; keep the runner
      adapters' signatures.
- [x] Add characterization tests for every trigger and the recovery helpers.
- [x] Re-anchor shifted catalog citations by content.
- [x] Prove byte-identical runner events and identical replay counts after.
- [x] Kill the characterization mutants.

## 2. PR2: MegaMek fall-eligibility gate

- [x] Record failing gate tests (vehicles, prone Meks, non-walking water modes).
- [x] Gate water, rubble, skid and ice PSRs on `Mek.canFall`; exclude the
      non-falling movement modes from water entry.
- [x] Kill the gate mutants.

## 3. PR3: interactive wiring

- [ ] Record failing session, AI, engine, P2P and once-only tests.
- [ ] Apply the shared producer at every interactive commit site.
- [ ] Grant jump eligibility on a failed interactive ground bog-down.
- [ ] Kill the wiring mutants.

## 4. PR4: session and engine recovery roll

- [ ] Record failing recovery tests for the session and `runToCompletion`.
- [ ] Roll recovery after advancing into Movement, before any unit moves.
- [ ] Kill the recovery mutants.

## 5. PR5: auto-resolve PSR drain

- [ ] Drain pending PSRs at the End phase of `runToCompletion`.
- [ ] List every changed assertion with old and new values; update the C4
      digest in its own commit.
- [ ] Summarise seeded QuickResolve, fast-forward and campaign deltas.

## 6. Verification

- [ ] Root verifies hosted CI for each PR; the lane never merges.
