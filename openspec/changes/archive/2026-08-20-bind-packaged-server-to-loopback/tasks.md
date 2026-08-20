> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-00 wave (product PR #1229); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Preconditions and Red Proof

- [x] 1.1 Re-ground from freshly fetched exact main after all ten child OpenSpecs and confirm CAMP-PROOF implemented/tested the closed CAMP-00 adapter, held-handle mutation/path cases, real Windows no-replace collision, and isolated runtime cleanup; after PROOF-02 triage/repairs and predecessor cleanup validate, create one `codex/` branch within 4 files/180 lines.
- [x] 1.2 Add the strict packaged-listener record parser and focused regression fixtures first, then retain a failing bounded run showing that the unmodified production `server.js` does not publish valid `server.address()` evidence even when `HOSTNAME=127.0.0.1`.
- [x] 1.3 Lock the marker truth table (config absent with/without `.next` is nonpackaged; config without `.next` fails; both packaged), ambient-`NODE_ENV` independence, hostname/preload matrix, bounds/framing, invalid records, held-handle mutation, pre-creation, reparse, no-replace/identity-drift, and extra-sibling cases before editing.

## 2. Production Listener Boundary

- [x] 2.1 Before Next, use `server.next-config.json` as the package selector; absent config is nonpackaged even with `.next`, config requires a same-root `.next` directory, and both select packaged. Ignore ambient `NODE_ENV`, keep loopback defaults, and reject wildcard/non-loopback hosts in all modes.
- [x] 2.2 Pass the validated production hostname to the actual Node HTTP/WebSocket listener and emit exactly one newline-terminated `MEKSTATION_LISTENER_READY <compact-json>` `mekstation-packaged-listener-ready/v1` record derived from `server.address()` only after the listener callback verifies address, family, and port.
- [x] 2.3 Keep the human-readable ready log operational but ensure neither it, the Next.js hostname option, nor loopback reachability is accepted as listener-authority proof.

## 3. Packaged-Socket Authority

- [x] 3.1 Prepare only under the parent runtime path; initial omits host/mode, restart sets loopback plus ambient development, fixed markers must keep both packaged, both records and the complete replay/persistence/reconnect journey pass.
- [x] 3.2 Exercise every rejected value through the same resolver/preload guard; repeat wildcard/LAN probes with ambient `NODE_ENV` unset/development and require bounded rejection without the Next-import sentinel.
- [x] 3.3 No-replace hard-link the observation after the journey; writer holds one handle across reads, normalizes in memory, closes, deletes/verifies observation/runtime absent, then finalizes/reopens both results; CAMP-PROOF proves injected faults and real Windows `EEXIST` byte preservation.
- [x] 3.4 Use OS-assigned ports; await child close on every exit/timeout/termination, fail incomplete cleanup, rebind/close the same port without fixed delays, then run focused tests and the immutable command under Node 22 and confirm no prohibited retention.

## 4. Focused PR and Exact-Main Handoff

- [x] 4.1 Run risk-appropriate typecheck, lint, format, build, desktop/package, OpenSpec strict, and QC gates; confirm `git diff --check`, the 4-file/180-line cap, no dependency change, and no campaign/protocol/persistence behavior change.
- [x] 4.2 Publish/reopen the immutable reviewed-head `camp-00` authority receipt with approved provenance; require both result artifacts and every exact child-owned row assertion true without changing the immutable command sequence or digest.
- [x] 4.3 Obtain independent code, goal, QA, and security review of the exact product head, resolve every blocking finding within this seam, wait for applicable GitHub checks, and merge only with a matching-head SHA guard.
- [x] 4.4 Rerun CAMP-00 against freshly fetched exact main under a new run identity, compare the merge tree to the reviewed tree, validate the durable receipt, record the handoff, and remove only the creation-bound clean product/proof worktrees and local wave branch before CAMP-01A.
