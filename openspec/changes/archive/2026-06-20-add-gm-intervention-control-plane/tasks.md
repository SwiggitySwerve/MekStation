## 1. Intervention Ledger Abstraction

- [x] 1.1 Add reusable intervention ledger types for domain, intervention kind, append-only record, causality refs, approval status, public projection, private projection, and conflict details.
- [x] 1.2 Add the intervention ledger implementer interface with preview, apply, public projection, private projection, and domain key entry points.
- [x] 1.3 Implement ledger registration/routing so combat and unit reload can register as first-slice implementers while economy/time return explicit unsupported results.
- [x] 1.4 Add tests proving registered domains route to their implementer and unregistered domains return unsupported without mutation.
- [x] 1.5 Add tests proving the same ledger record projects differently for GM-private and player-public viewers.

## 2. Authority and Redaction Envelope

- [x] 2.1 Add GM authority context for actor, game, optional campaign, owned-state refs, and role.
- [x] 2.2 Implement an authority guard that rejects non-GM or non-owner requests before preview generation.
- [x] 2.3 Implement redaction helpers that split GM-private metadata from player-public net effects.
- [x] 2.4 Add unit tests proving non-owner player requests are rejected before preview generation and append no records/events.
- [x] 2.5 Add unit tests proving player-visible payloads exclude private reason, hidden notes, default outcome, and manual takeover notes.
- [x] 2.6 Add safe internal logging for rejected authorization attempts.

## 3. Cascade Preview Pipeline

- [x] 3.1 Implement pure preview generation for GM interventions that returns public net effect, private context, projected event effects, affected refs, and conflicts without mutating state.
- [x] 3.2 Implement approval flow that appends accepted intervention events only after GM approval.
- [x] 3.3 Implement blocked/deferred results for unsupported first-slice requests such as merchant reversal or accumulated time correction.
- [x] 3.4 Add tests proving preview does not mutate current game state or append events.
- [x] 3.5 Add tests proving approval appends the accepted intervention and updates derived state through normal event replay.
- [x] 3.6 Add regression coverage proving normal player undo remains separate from GM undo semantics.

## 4. Combat Intervention Implementer

- [x] 4.1 Register a combat-domain implementer with the reusable intervention ledger.
- [x] 4.2 Implement preview/apply support for reposition and facing corrections.
- [x] 4.3 Implement preview/apply support for damage and critical state corrections.
- [x] 4.4 Implement preview/apply support for heat and ammo corrections.
- [x] 4.5 Implement preview/apply support for phase, initiative, and turn ownership corrections.
- [x] 4.6 Implement preview/apply support for ejection, withdrawal, disabled, destroyed, and rescued lifecycle corrections.
- [x] 4.7 Add reducer and replay tests for every first-slice combat intervention family.

## 5. Unit Reload Implementer

- [x] 5.1 Register a unit-reload-domain implementer with the reusable intervention ledger.
- [x] 5.2 Implement active-encounter unit reload preview that rehydrates construction/loadout-derived fields from the source unit by `unitRef` and pilot data by `pilotRef`.
- [x] 5.3 Preserve compatible live overlays by default: position, facing, initiative/phase state, damage state, heat, ammo, pilot state, movement locks, and committed action state.
- [x] 5.4 Detect reload conflicts for removed components, incompatible armor/structure mapping, changed ammo bins, changed movement profile, or invalid target/queued effects.
- [x] 5.5 Add manual-takeover result support for reload conflicts and block commit until the GM resolves or accepts conflict handling.
- [x] 5.6 Add tests proving reload updates one active unit without resetting the encounter, unrelated units, or prior event history.

## 6. Tactical Command Surface

- [x] 6.1 Replace TacticalActionDock GM command stubs with calls into the GM intervention preview pipeline.
- [x] 6.2 Ensure shell mode controls visibility/ergonomics only; service-level authority remains required for every GM command.
- [x] 6.3 Add confirmation UI that shows GM-private detail, player-public net effect, conflicts, and manual-takeover state before approval.
- [x] 6.4 Add player-facing log/replay UI coverage showing only resulting state and public net effect.
- [x] 6.5 Add accessibility coverage for the GM confirmation/manual takeover controls.

## 7. Campaign Boundary and Deferred Cascades

- [x] 7.1 Add explicit deferred/unsupported results for post-combat, base/economy, repair/salvage, and time-cascade interventions in the first slice.
- [x] 7.2 Document future implementer seams for post-combat, campaign sync, co-op GM arbitration, finance/inventory reversal, repair/salvage correction, and time cascade phases.
- [x] 7.3 Add tests proving deferred campaign interventions do not silently mutate finances, inventory, repair queues, salvage, travel, or campaign time.
- [x] 7.4 Add safe logging for deferred domain attempts without leaking hidden scenario notes to player-visible output.

## 8. Validation

- [x] 8.1 Run targeted GM intervention unit tests and integration tests.
- [x] 8.2 Run relevant gameplay event/reducer, fog/redaction, encounter launch, and tactical command tests.
- [x] 8.3 Run LSP diagnostics or TypeScript checks over changed files.
- [x] 8.4 Run `cmd /c openspec validate add-gm-intervention-control-plane --strict`.
- [x] 8.5 Update the task checklist with completed verification evidence before archive or PR handoff.

Verification evidence:

- `npm.cmd test -- src/lib/interventions/__tests__ src/components/gameplay/TacticalActionDock src/lib/campaign/encounter/__tests__/launchCampaignEncounter.test.ts src/lib/multiplayer/server/__tests__/fogOfWar.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.fogOfWarIntegration.test.ts src/components/gameplay/__tests__/GameplayLayout.viewModel.test.ts src/__tests__/unit/utils/gameplay/gameSession.test.ts src/utils/gameplay/gameState/__tests__/phaseManagement.test.ts`
- `npx.cmd tsc --noEmit --skipLibCheck --pretty false`
- `npx.cmd oxlint src/lib/interventions src/components/gameplay/TacticalActionDock src/types/interventions`
- `npx.cmd oxfmt --check src/lib/interventions/GmTacticalCommandPreviewAdapter.ts src/lib/interventions/index.ts src/lib/interventions/__tests__/GmTacticalCommandPreviewAdapter.test.ts src/components/gameplay/TacticalActionDock/TacticalActionDock.tsx src/components/gameplay/TacticalActionDock/TacticalActionDock.gmIntervention.tsx src/components/gameplay/TacticalActionDock/index.ts src/components/gameplay/TacticalActionDock/commands/gmReferralCommands.ts src/components/gameplay/TacticalActionDock/commands/__tests__/gmReferralCommands.test.ts src/components/gameplay/TacticalActionDock/__tests__/TacticalActionDock.04.gmIntervention.test.tsx openspec/changes/add-gm-intervention-control-plane/specs/gm-tactical-command-surface/spec.md`
- `cmd /c openspec validate add-gm-intervention-control-plane --strict`
