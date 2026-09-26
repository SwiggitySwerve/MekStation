# Lane A review: U91
reviewedHead: ce8e8acfba644290be4da546d9b95f44fe698079
baseline: bd6bfe779036631bf63b0e84b748a7bfd6e122b6
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (clean, no output).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u91-review ce8e8acfba644290be4da546d9b95f44fe698079` — HEAD is now at `ce8e8acfb`.
- Junctioned `node_modules` via PowerShell `New-Item -ItemType Junction` to the root checkout's `node_modules`.
- `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` (`node --version` → `v22.22.0`) and `export npm_config_dry_run=true` before every npm/npx command.
- No install/build/Playwright/commit/push was run. No other worktree or the root checkout was touched.
- Torn down after review: deleted the `node_modules` junction (`[System.IO.Directory]::Delete`) then `git worktree remove --force`.

## Files on the range

`git diff bd6bfe779036631bf63b0e84b748a7bfd6e122b6..ce8e8acfba644290be4da546d9b95f44fe698079 --stat`:
```
 .../proposal.md                                    |  2 +-
 .../specs/coop-campaign-sync/spec.md               | 23 ++++++++++++++++++++++
 2 files changed, 24 insertions(+), 1 deletion(-)
```
Both files are under `openspec/changes/harden-gm-two-player-campaign-sessions/`. `git log bd6bfe77..ce8e8acf --format='%H %s%n%b'` shows one commit, `ce8e8acfb`, message: "docs(openspec): the co-op host command screen exposes approve and veto per proposal; the GM intervention controls live on the GM ledger route (harden delta, MODIFIED requirement)".

## Findings

1. **[PASS] MODIFIED header is byte-identical to the living header; no comment leak.** `openspec validate harden-gm-two-player-campaign-sessions --strict` → `Change 'harden-gm-two-player-campaign-sessions' is valid`, exit 0. `xxd` on `openspec/specs/coop-campaign-sync/spec.md:488` and the delta's `### Requirement: Co-op campaign command authority projection` line (delta file line 109) produced identical bytes (`### Requirement: Co-op campaign command authority projection\n`). `openspec show harden-gm-two-player-campaign-sessions --json --deltas-only` prints the coop-campaign-sync `MODIFIED` entry's parsed `requirement.text` as exactly the four-sentence paragraph in the diff (role mapping + host/guest split + approve/veto sentence + GM-ledger-route sentence); the HTML comment above the requirement in the source file (explaining the U91 rationale and that "the GM correction" on the ledger route means "approval of a previewed correction") does **not** appear anywhere in the parsed JSON `description`/`requirement`/`requirements` fields — it does not leak into spec text.

2. **[PASS with a wording caveat] Every sentence checked against code on the reviewed head.**
   - Dashboard row exposes approve/veto only: `src/components/campaign/coop/__tests__/HostGmReviewSurface.deadControls.test.tsx:86-91`, `describe('the host dashboard review mount')` / `it('renders Approve and Veto only')` — matches the requirement's citation verbatim.
   - GM Ledger tab reaches `/gameplay/campaigns/[id]/gm-ledger` for a co-op host: `src/components/campaign/CampaignNavigation.tsx:78` (`const canUseGmLedger = canUseCampaignGmControls(coopSession);`) and `:166-171` (tab pushed only `...(canUseGmLedger ? [{id:'gm-ledger', label:'GM Ledger', href:`/gameplay/campaigns/${campaignId}/gm-ledger`}] : [])`). `canUseCampaignGmControls` → `resolveCampaignAuthorityFromSession` (`src/lib/campaign/campaignAuthority.ts:18-46`) returns `canUseGmControls: true` for `coopSession.mode === 'host'` (and for single-player), `false` for `'coop-guest'` — host-only, as claimed.
   - GM ledger route controls: `src/pages/gameplay/campaigns/[id]/gm-ledger.tsx:38-51` renders `GmCampaignInterventionControlPlane` when `authority.canUseGmControls`. `GmCampaignInterventionControlPlane.tsx` renders `GmCampaignInterventionActions` (`:385-390`), which has exactly three buttons (`GmCampaignInterventionActions.tsx`): `data-testid="gm-ledger-preview-btn"` labeled "Generate correction" (the preview control), `data-testid="gm-ledger-manual-btn"` labeled "Take manual control" (manual takeover, gated on `canTakeManualControl`), and `data-testid="gm-ledger-approve-btn"` labeled "Approve cascade" (gated on `canApprove = preview?.status === 'ready' && !approvedApplied`, wired to `handleApprove` → `approveGmCascadePreview`, `:134,255,259`).
   - **Caveat, called out because the charter asks directly:** there is no button literally named or labeled "GM correction" on the ledger route — the requirement's third named control maps onto "Approve cascade" (applying a previewed correction), not a distinct UI element. This is not a new inaccuracy U91 introduces: the pre-existing living requirement already used the identical vocabulary ("preview, approve, veto, manual takeover, and GM correction controls") without any literal-label correspondence, and the delta's own HTML comment (see Finding 1) discloses the mapping for a human reader of the source file, even though that comment is excluded from the parsed spec text an automated reader would see. I did not find any clause that is factually **untrue** — every clause is either an unchanged carryover or a functional (not literal-label) description that the code supports — but the "GM correction" naming is imprecise vocabulary inherited from the original requirement, worth flagging rather than treating as a defect.

3. **[PASS] Guest scenario is verbatim; nothing else changed; proposal.md sentence is accurate.** Diffing the added guest scenario block against `openspec/specs/coop-campaign-sync/spec.md:497-499` (`#### Scenario: Guest sees proposal or public command path` / the two bullet lines) shows byte-for-byte identical text. `git diff --name-only` confirms only `proposal.md` and this one delta spec changed — no other requirement, scenario, or file in the delta or the living spec was touched. `proposal.md`'s added sentence ("Also MODIFIES `Co-op campaign command authority projection` to name which host screen carries which GM control: approve and veto per pending proposal on the co-op command screen; preview, manual takeover and GM correction on the GM ledger route (roadmap U91, owner decision PK-u90-controls, 2026-09-25).") matches the packet `PK-u90-controls` decision text and the requirement's own wording.

4. **[PASS] No contradiction found; :499-504 left untouched and unmet, as intended.** `grep -rl` for `'GM correction'`, `'manual takeover'`, `'command screen'` across `openspec/specs/**` and non-archived `openspec/changes/*/specs/**` turns up only the harden change itself and the pre-existing living requirements it modifies/relates to (`gm-campaign-intervention-boundaries`, `gm-combat-interventions`, `intervention-ledger-abstraction`, `multiplayer-game-surface`, `ui-flow-shell`, `playable-command-screens`, `gm-authority-redaction`, `gm-cascade-preview`, `gm-tactical-command-surface`, `gm-unit-reload-reconciliation`, `time-cascade-system`); none of these assert a conflicting screen placement for approve/veto/preview/manual-takeover/GM-correction — `playable-command-screens/spec.md:41` only requires role-aware projections generically, not a specific screen. The `Co-op player-safe GM result projection` requirement (living spec, lines 501-506, guest gets a redacted public net-effect result) is not part of this diff (not in the two changed files) and is left unmet by the code on this head: `evidence/u90-admission-20260925.json` documents that the ledger route's fund corrections are overwritten on the next accepted co-op frame (`campaignMirrorProjection.ts:27-30`) and never reach the guest. U91 is a docs-only screen-naming delta and does not claim to close that gap — consistent with the unit's stated narrow scope.

5. **Gates on the head** (all commands run with `PATH` pinned to Node 22 and `npm_config_dry_run=true`):
   - `openspec validate harden-gm-two-player-campaign-sessions --strict` → last line `Change 'harden-gm-two-player-campaign-sessions' is valid`, exit 0.
   - `npm run --silent qc:openspec-ci:validate` → last line `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0`, exit 0.
   - `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` → last line `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0.
   - `npm run --silent lint:units` → last lines `LINT_UNITS_PATH scripts 50` / `LINT_UNITS_PASS 100/100`, exit 0.
   - `npx --no-install tsc --noEmit` → no output, exit 0 (confirmed by explicit `echo $?` capture) — nothing changed, as expected for a docs-only delta.

## Scope

- `git diff --name-only`: 2 files, both under `openspec/changes/harden-gm-two-player-campaign-sessions/` (`proposal.md`, `specs/coop-campaign-sync/spec.md`) — no product or test file touched, no edit to `openspec/specs/**`.
- `tasks.md` in this change does not appear in the diff at all — no checkbox change.
- `grep -in "claude|anthropic|co-authored|C:\\\\Users|E:\\\\Projects|/c/Users|/e/Projects"` over the full diff and the commit subject/body: no match (exit 1) — no AI attribution, no absolute machine paths.
- Size: 24 insertions / 1 deletion across 2 files, well inside the unit's caps (`maxFiles: 15`, `maxNonGeneratedLines: 500`).

## Verdict rationale

APPROVE. The MODIFIED requirement's header is byte-identical to the living requirement it will replace on archive, `openspec validate --strict` and all four required gates pass clean on the exact reviewed head, the guest scenario and every other line outside the touched requirement are verbatim, no contradicting requirement exists elsewhere in the spec set, and the scope is exactly the two files the unit's ownership path allows with no product/test drift, no `openspec/specs` edit, no attribution, and no absolute paths. The one thing worth the owner's or a future reader's attention (not a blocker): the requirement names a "GM correction" control on the GM ledger route that has no literally-labeled UI element — it is the "Approve cascade" button's effect — a piece of imprecise vocabulary the requirement inherits unchanged from the pre-existing living spec rather than one U91 introduces.
