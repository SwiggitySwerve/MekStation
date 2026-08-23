# OMO Council — Verifiable Execution Roadmap

**Headline:** Do not author a new wave plan — `WAVE_CONTRACTS` already is the in-flight roadmap; the next executable row is `proof-02-reproduction`, not CAMP-01A, and post-CAMP specs (#1175/#1179) stay gated until CAMP-01H cleanup.

**Brief:** Sequence MekStation into a better, verifiable state after CAMP-PROOF, with per-wave pass/fail goals.
**Option space:** A invent a parallel roadmap (killed) · B skip the ledger and code CAMP-01A now · C execution-status ledger for frozen CAMP-00→01H plus gated post-CAMP queue · D park CAMP-01 and jump to #1175/#1179 · E C plus named post-H waves with one pass/fail oracle each.

**Variant:** Lean++ thin (Phase 0 Metis → Oracle + Explore-Deep + Momus). Oracle seat failed to spawn three times (API usage limit); Captain filled Oracle in Mode-C from verified contract/code. Phase 3 skipped (single proposer, Momus no-kill, Explore-Deep aligned).

## Phase 1 — Captain's Assignments
- **Oracle:** given CAMP-PROOF shipped and A–H unshipped, which option, effort tag, post-CAMP order, most expensive wrong.
- **Explore-Deep:** which WAVE_CONTRACTS rows are shipped vs spec-only; next unshipped row; #1175/#1179 product presence.
- **Momus:** kill the ledger proposal if CAMP-00/01A cannot actually start with a pass/fail oracle.

## Phase 2 — Parallel Positions
### Oracle (Strategist) — Mode-C substitute
- Right move is **E**: keep CAMP-00→01H as the only in-flight waves; publish status; name post-H waves with one oracle each.
- Effort: **XL** for 00→H plus post-CAMP; next slice is **M** (proof-02 reproduction/triage/repairs + camp-00).
- Most expensive wrong: start 01A before proof-02 triage, then 01H cannot close because command-browser anchors stay dirty.
- Post-CAMP order: vault provenance → server authority → scope-filtered replication → starmap economy → isometric remainder.
- Do not revive `2026-07-02-next-waves-plan.md` as the campaign program; that decision is a separate combat-correctness track.

### Explore-Deep (Internal evidence)
- CAMP-PROOF infra shipped: `scripts/qc/camp01-authority-receipt.contract.mjs:24` `camp-proof` row; tasks 6.1/6.2 checked in `add-camp01-authority-receipts/tasks.md` (#1217, HEAD `78acffb58`). Parent P.* in `add-saved-custom-unit-campaign-roster/tasks.md` still `[ ]`.
- Next sequential row: `proof-02-reproduction` → `qc:command:browser:quick` (`contract.mjs:25`); then zero-command `proof-02-triage` (`:26`). No durable receipts under `.sisyphus/evidence/playtest/` except `2026-07-07-live-playtest/`.
- CAMP-00 is the next *product* wave: `validate:multiplayer:packaged-socket` (`contract.mjs:27`); predecessors `proof-02-triage` + `proof-02-required-repairs`. `server.js:656` is `server.listen(port)` with no hostname; `bind-packaged-server-to-loopback/tasks.md` all `[ ]`.
- CAMP-01A–H: parent `tasks.md:12-50` all `[ ]`. `src/types/campaign/` has no `unitSource`/`sourceVersion`.
- #1175 `design-vault-campaign-separation-and-maps` and #1179 `design-campaign-authority-and-sync` are spec-only, both gated on CAMP-01F/G/H. Collision risk: other active changes (`adopt-*-event-journal-authority`, `add-replay-schema-and-checkpoint-safety`, `harden-gm-two-player-campaign-sessions`, …) must not reorder CAMP-01.

### Metis (Phase 0)
- Fresh parallel roadmap fails: `WAVE_CONTRACTS` is the sole normative contract; reordering invalidates `camp-01e`–`h` assertion keys.
- Reframe: publish an execution-status ledger for frozen CAMP-00→01H, then queue post-CAMP work after H cleanup.

### Momus (Executability)
- **No live objection. Consensus holds.**
- CAMP-00 / CAMP-01A cannot start tomorrow with one command. Next wave is `proof-02-reproduction` via `qc:camp01-authority-receipt:controller`.
- PROOF-02 triage/repair satisfaction on main is **unknown** (no durable receipts in-repo). Residual: controller needs SHA/spec/product tuples, not a bare npm script; task 4.1 still open for E/H capture routing.

## Phase 3 — Cross-Attack
Skipped: one proposer (Mode-C Oracle), Momus no-kill, Explore-Deep did not contradict. Momus’s “cannot start CAMP-00 tomorrow” is a sequencing correction absorbed into the ledger (next row = proof-02), not a kill of option E.

## Synthesis
**Decision:** Adopt option E. The in-flight roadmap is the frozen `WAVE_CONTRACTS` sequence. Do not create a competing OpenSpec change named as a new wave plan. Start tomorrow on `proof-02-reproduction`, then triage/repairs, then CAMP-00 through 01H in contract order. After CAMP-01H cleanup, run the five post-CAMP waves below. Combat-correctness work from 2026-07-02 may continue on the combat journal/session-seed track only if it does not touch CAMP-01 roster-shape contracts.

**Why:** CAMP-PROOF already spent two weeks making wave evidence fail-closed. A parallel roadmap is either ignored documentation or a forced re-digest of every child OpenSpec. The user’s “verifiable goals” already exist as `assertions` + `commandSequence` on each row.

**Survival Score:** Modified (low-pressure) — Oracle was Mode-C; Momus forced the next-row correction (proof-02 before CAMP-00) into the ledger. Adversaries did not kill option E.

**Trade-offs accepted:** No new “better state” product until proof-02 and CAMP-00 land; #1175/#1179 remain unplayable; colliding active OpenSpec folders stay parked relative to CAMP-01.

**Second-order consequences:** Once 01E–G land, `unitSource` exists and the vault-model wave is a small provenance add-on plus fuzzy-match deletion, not a rewrite. Server-authoritative campaigns then make starmap travel consequences survive reload — which is why authority precedes starmap.

**Open risks / revisit triggers:** If proof-02 reproduction shows new Critical/Major causes, CAMP-00 waits on those repair rows. If the user explicitly parks CAMP-01, that is option D and needs a new council. Task 4.1 (E/H capture routing) still `[ ]` in `add-camp01-authority-receipts/tasks.md:48`.

**Dissent on record:** None live after Momus no-kill. Mode-C Oracle is a coverage gap, not dissent.

## In-flight waves (frozen — do not rename)

| Wave | Status | User-visible goal | Pass/fail oracle |
| --- | --- | --- | --- |
| CAMP-PROOF | Shipped (#1217) | Receipt writer rejects drift | `camp-proof` assertions in `contract.mjs:24` |
| proof-02-reproduction | **Next** | Fresh exact-main browser observation set | `npm run qc:camp01-authority-receipt:controller` with `--wave=proof-02-reproduction`; assertions `completeObservationSet`, `anchorStatesPublished`, `unexpectedFailuresPublished` |
| proof-02-triage | Blocked on reproduction | Every failed/missing/unexpected observation dispositioned | `--wave=proof-02-triage`; `observationSetMatched===true` |
| proof-02-required-repairs | Virtual predecessor | Each Critical/Major cause has a merged repair row or explicit blocker | Controller equality of cause→row; unknown on main today |
| CAMP-00 | Spec-only | Packaged listener binds 127.0.0.1 | `validate:multiplayer:packaged-socket`; `boundAddressIsLoopback===true` |
| CAMP-01A | Spec-only | Roster source canonical/custom/invalid; never inferred | `RosterUnitSource` + readiness + materializer tests; `unknownSourceRejected===true`, `encounterLookupCount===0` |
| CAMP-01B | Spec-only | Guest hydrates host snapshot + force membership | CampaignSync/HostRegistry tests + `verify:qc:coop-campaign-journey`; `guestMirrorHydrated===true` |
| CAMP-01C | Spec-only | Server derives player/role; reject forged identity | Protocol + bind + coopRuntimeSession; `forgedIdentityRejected===true` |
| CAMP-01D | Spec-only | Blocked sources launch nothing | fast-forward + dashboard + launchCoopMission; `blockedSelection.launchEncounterCount===0` |
| CAMP-01E | Spec-only | Saved Designs picker; exact id/source; no construction payload | CreateCampaignPage tests + `e2e/campaign-customizer-handoff.spec.ts`; `unitSourceCustom===true` |
| CAMP-01F | Spec-only | Production persist: accept, honest error, same-id retry | submitPersistence + handoff e2e; `conflictOverwritePrevented===true` |
| CAMP-01G | Spec-only | Cold-reload Mech Bay by source/ref | MechBay + handoff e2e; `coldReloaded===true`, `cachedNamePreserved===true` |
| CAMP-01H | Spec-only | Three independent witnesses: custom save, Mech Bay, canonical combat | `qc:ux-audit:deep` + `qc:command:browser:quick` + `qc:campaign-long:browser` + viewport sweep; `threeSessionWitnessCount===3`, `customLaunchBlockedWithoutSideEffect===true`, `postBattleReloadMatched===true` |

## Post-CAMP waves (start only after 01H cleanup)

| Wave | Goal | Pass/fail oracle (bind into the child change when implementation starts) |
| --- | --- | --- |
| P1 Vault provenance | `unitSource` + `sourceVersion`; vault version counter; delete name/tonnage fuzzy match; v1→v2 migration | `design-vault-campaign-separation-and-maps` tasks 1.1–1.5; tests prove vault edit does not mutate a fielded instance; `CreateCampaignPage.submit.ts` has no `UNIT_TEMPLATES` OR-match |
| P2 Server authority | Creation lands on the server; fresh-tab deep link resolves; deleted records stay dead | `design-campaign-authority-and-sync` tasks 1.1–1.5; e2e: new browser context opens `/gameplay/campaigns/:id` without “Campaign not found” |
| P3 Scope-filtered replication | Share issues grants; replicas get in-scope history only; out-of-scope events absent | coop journey + grant redeem; guest stream omits GM-only events (not redacted) |
| P4 Starmap travel economy | Preview ≠ commit; travel costs days and C-bills; reload keeps consequence | `e2e/campaign-starmap-logistics.spec.ts` travel preview/approve/reload **passed** (not `knownFailureCode=development-mime-diagnostic` as the only outcome) |
| P5 Isometric remainder | Pick/overlay parity with 2D; no second rules engine | existing HexMapDisplay isometric + a pick-parity test; 30 FPS floor from #1175 spec |

## Do not start as a competing campaign program
`adopt-campaign-event-journal-authority`, `add-authoritative-history-branches`, `add-replay-schema-and-checkpoint-safety`, `add-cross-stream-effect-receipts`, `harden-gm-two-player-campaign-sessions` — keep off the CAMP-01 roster-shape path. Combat-journal work may continue on the combat stream only.

## Tomorrow
1. Run `proof-02-reproduction` through `qc:camp01-authority-receipt:controller` (exact-main).
2. Audit-only PR for `proof-02-triage` with exact observation-set equality.
3. Repair rows for each distinct Critical/Major, or record explicit blockers.
4. Only then branch `codex/` for CAMP-00 (`bind-packaged-server-to-loopback`, ≤4 files / 180 lines).

---
*Appendix*
**Decision crux:** `WAVE_CONTRACTS` in `scripts/qc/camp01-authority-receipt.contract.mjs` is already the roadmap; the next row is `proof-02-reproduction`, not CAMP-01A.
**Context factors:** CAMP-PROOF just closed; #1175/#1179 specs merged; 2026-08-06 vault council; 2026-07-02 combat next-waves plan still exists as a separate track.
**Missing information:** whether proof-02-triage/repairs are satisfied on main (no in-repo durable receipts).
**Fault line:** none — option D (park CAMP-01) is available only if the user explicitly overrides.
**Token cost:** Lean++ thin; Oracle Mode-C after three spawn failures; ~Metis+Explore-Deep+Momus plus Captain synthesis.
**Phase 4.5:** omo-judge 3-pass (2-pass diverged: VERIFIED vs REVISE on compressed prompt; tiebreak VERIFIED against the full tables). Pass B's "no enumerated roadmap" flag applied to the compressed judge prompt, not the written artifact.
