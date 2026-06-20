## 1. Intervention Ledger Abstraction

- [x] 1.1 Add reusable intervention ledger types for domain, intervention kind, append-only record, causality refs, approval status, public projection, private projection, and conflict details.
- [x] 1.2 Add the intervention ledger implementer interface with preview, apply, public projection, private projection, and domain key entry points.
- [x] 1.3 Implement ledger registration/routing so combat and unit reload can register as first-slice implementers while economy/time return explicit unsupported results.
- [x] 1.4 Add tests proving registered domains route to their implementer and unregistered domains return unsupported without mutation.
- [x] 1.5 Add tests proving the same ledger record projects differently for GM-private and player-public viewers.

## 2. Authority and Redaction Envelope

- [ ] 2.1 Add GM authority context for actor, game, optional campaign, owned-state refs, and role.
- [ ] 2.2 Implement an authority guard that rejects non-GM or non-owner requests before preview generation.
- [ ] 2.3 Implement redaction helpers that split GM-private metadata from player-public net effects.
- [ ] 2.4 Add unit tests proving non-owner player requests are rejected before preview generation and append no records/events.
- [ ] 2.5 Add unit tests proving player-visible payloads exclude private reason, hidden notes, default outcome, and manual takeover notes.
- [ ] 2.6 Add safe internal logging for rejected authorization attempts.

## 3. Cascade Preview Pipeline

- [ ] 3.1 Implement pure preview generation for GM interventions that returns public net effect, private context, projected event effects, affected refs, and conflicts without mutating state.
- [ ] 3.2 Implement approval flow that appends accepted intervention events only after GM approval.
- [ ] 3.3 Implement blocked/deferred results for unsupported first-slice requests such as merchant reversal or accumulated time correction.
- [ ] 3.4 Add tests proving preview does not mutate current game state or append events.
- [ ] 3.5 Add tests proving approval appends the accepted intervention and updates derived state through normal event replay.
- [ ] 3.6 Add regression coverage proving normal player undo remains separate from GM undo semantics.

## 4. Combat Intervention Implementer

- [ ] 4.1 Register a combat-domain implementer with the reusable intervention ledger.
- [ ] 4.2 Implement preview/apply support for reposition and facing corrections.
- [ ] 4.3 Implement preview/apply support for damage and critical state corrections.
- [ ] 4.4 Implement preview/apply support for heat and ammo corrections.
- [ ] 4.5 Implement preview/apply support for phase, initiative, and turn ownership corrections.
- [ ] 4.6 Implement preview/apply support for ejection, withdrawal, disabled, destroyed, and rescued lifecycle corrections.
- [ ] 4.7 Add reducer and replay tests for every first-slice combat intervention family.

## 5. Unit Reload Implementer

- [ ] 5.1 Register a unit-reload-domain implementer with the reusable intervention ledger.
- [ ] 5.2 Implement active-encounter unit reload preview that rehydrates construction/loadout-derived fields from the source unit by `unitRef` and pilot data by `pilotRef`.
- [ ] 5.3 Preserve compatible live overlays by default: position, facing, initiative/phase state, damage state, heat, ammo, pilot state, movement locks, and committed action state.
- [ ] 5.4 Detect reload conflicts for removed components, incompatible armor/structure mapping, changed ammo bins, changed movement profile, or invalid target/queued effects.
- [ ] 5.5 Add manual-takeover result support for reload conflicts and block commit until the GM resolves or accepts conflict handling.
- [ ] 5.6 Add tests proving reload updates one active unit without resetting the encounter, unrelated units, or prior event history.

## 6. Tactical Command Surface

- [ ] 6.1 Replace TacticalActionDock GM command stubs with calls into the GM intervention preview pipeline.
- [ ] 6.2 Ensure shell mode controls visibility/ergonomics only; service-level authority remains required for every GM command.
- [ ] 6.3 Add confirmation UI that shows GM-private detail, player-public net effect, conflicts, and manual-takeover state before approval.
- [ ] 6.4 Add player-facing log/replay UI coverage showing only resulting state and public net effect.
- [ ] 6.5 Add accessibility coverage for the GM confirmation/manual takeover controls.

## 7. Campaign Boundary and Deferred Cascades

- [ ] 7.1 Add explicit deferred/unsupported results for post-combat, base/economy, repair/salvage, and time-cascade interventions in the first slice.
- [ ] 7.2 Document future implementer seams for post-combat, campaign sync, co-op GM arbitration, finance/inventory reversal, repair/salvage correction, and time cascade phases.
- [ ] 7.3 Add tests proving deferred campaign interventions do not silently mutate finances, inventory, repair queues, salvage, travel, or campaign time.
- [ ] 7.4 Add safe logging for deferred domain attempts without leaking hidden scenario notes to player-visible output.

## 8. Validation

- [ ] 8.1 Run targeted GM intervention unit tests and integration tests.
- [ ] 8.2 Run relevant gameplay event/reducer, fog/redaction, encounter launch, and tactical command tests.
- [ ] 8.3 Run LSP diagnostics or TypeScript checks over changed files.
- [ ] 8.4 Run `cmd /c openspec validate add-gm-intervention-control-plane --strict`.
- [ ] 8.5 Update the task checklist with completed verification evidence before archive or PR handoff.
