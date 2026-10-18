# P2CG1D admission STOP report (2026-10-17)

Source: delegated prep task `mek-p2cg1d-opus-20261017-r1` (Claude Opus 5.5), child thread `thread:delegated-task:command%3Amcp%3Ae6e56864-fc2e-4504-abfe-fb555f7e5eb9%3Adelegate-task%3Amek-p2cg1d-opus-20261017-r1`, final message 2026-10-17T18:37:54Z. Root persisted this report so the parent literal-path amendment (PR #2220) can cite a stable file.

## Finding

P2CG1D cannot be admitted under its current registration. It needs one file outside its registered leaves: `src/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers.ts`.

- `ownershipPaths` is the directory `src/lib/multiplayer/server`. `roadmap.json` `R2.authority-live.ownershipPathsAmended20261009P2C.restrictions.P2CG1D` narrows it to 9 named leaves, and the helper is not one of them. `knownSourceTestLifecycleSubtotals.P2CG1D` is 10. `admissionRequires` forbids unnamed tests and directory-wide grants.
- Probe at #2218 head `ed7fb95b`: adding only the required field `launch: CampaignLaunchView | null` to `ICampaignHostRegistryEntry`, then running the TS7 `tsc --noEmit`, gives 5 errors in `CampaignHostRegistry.ts` (a leaf, expected) and 1 error in `campaignGrantChannel.test-helpers.ts(175,9)`: TS2741, property `launch` is missing. Nothing else broke. The probe was reverted and the worktree left clean.
- Helper blob: `d7018768b64bdf8d853edfbd5475f84fa557192c`, identical on main and on the #2218 head. The fix is one line, `launch: null,`, under `__tests__/`, so the line does not count toward the 500-line cap but the file counts toward the 15-file cap.
- Census with the helper registered: 10 source/test files, plus `units.json`, plus the admission/red/local receipts, plus the reserved review file, comes to 15/15 with no spare. The scope estimate is about 285-445 counted lines of 500 (not measured).

## Options (each needs a separate registration change and review before D's admission)

1. A literal-path amendment (recommended): add the helper to `restrictions.P2CG1D` (9 to 10), set the subtotal from 10 to 11, and update the behavior text from "Planned leaves (9)" to 10.
2. A narrower split into D1 and D2.
3. An owner ruling that makes the field optional (`launch?:`).

## Other findings

No other file outside the leaves is needed. The binder reaches the match-store lock as #2218 does. Both proposal paths go through the arbiter (a leaf). B's `applyHostIntentWithControls` supplies the guard, onCommitted and afterRelease hooks. The helper constructs `new CampaignGmArbiter(host, 'auto-approve', {proposalTimeoutMs: 0})`, so any new arbiter dependency must be optional. A type-only `ICampaignApplicationReceiptPort` import into the registry needs a madge check.
