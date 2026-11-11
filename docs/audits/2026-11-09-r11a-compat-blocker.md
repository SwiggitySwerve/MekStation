# R11a compatibility blocker - Root decision required

Implementation is stopped at Coordinator 4's request. The approved section 0.3 Error-only mechanism does **not** display its reason in an un-reloaded pre-R11a lobby tab. No push or PR has been made. The existing implementation, including incomplete tests, is being preserved in a local checkpoint commit; this is not a release-ready result.

All source references below are on pre-R11a commit **943f5354db0a8f88bd567e91ec4565ed83d3c5a7**, the fetched origin/main used to start the branch. They are not line numbers on the edited branch. Source links use that immutable commit.

## 1. Failing frozen-client witness

The executed harness is [R11a-frozen-client/frozen.witness.test.tsx](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/frozen.witness.test.tsx), with [configuration](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/jest.config.json), [resolver](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/resolver.cjs), [source manifest](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/manifest.json) and [Jest result](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/result.json). Nine captured source files were compared byte-for-byte with `git show` at the pinned commit. The resolver uses those frozen versions of the client, hook, hook adapter, mirror, surface gate, composed registry, lifecycle schema pack, lobby page and spectator page. Other unchanged dependencies come from this worktree. The input seed comes from the new producer.

This is focused jsdom proof using the real old page/hook/client/parser over a mock WebSocket. It is not a browser run or a complete archived deployment bundle. No page, hook or strict parser is replaced by a simplified rendering stub.

Command, from the assigned worktree:

```powershell
node node_modules/jest/bin/jest.js --config 'E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/jest.config.json' --runTestsByPath 'E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/frozen.witness.test.tsx' --maxWorkers=3 --json --outputFile='E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/result.json' --silent
```

Observed: **4 passed, 1 deliberately failed**, exit 1. The failing acceptance assertion is `expect(screen.getByRole('alert')).toHaveTextContent(reason)`: no alert exists after the approved Error-only refusal.

### Stamped GameCreated reaches an old tab

1. The old strict creation schema lists no `replayFidelityVersion`, then calls `.strict()`: [CombatLifecycleBaselineSchemaPack.ts:60](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/events/replay/CombatLifecycleBaselineSchemaPack.ts#L60), strict boundary at line 81, parse call at line 158. Zod rejects the added key as `unrecognized_keys`.
2. [ReplaySchemaRegistry.ts:236](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/events/replay/ReplaySchemaRegistry.ts#L236) catches that parser exception at 237 and throws `UnsupportedReplayHistoryError('invalid-payload', ...)` at 238-244. The message names the old parser schemaId.
3. [ReplaySurfaceGate.ts:267](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/events/replay/ReplaySurfaceGate.ts#L267) invokes the strict registry. Its catch at 289-300 turns the error into blocked-event evidence. It returns a blocked history, not an exception for the connection error handler.
4. [mirrorMatchSession.ts:148](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/multiplayer/mirrorMatchSession.ts#L148) propagates `kind: 'blocked'` at 154-158. [useMultiplayerSession.ts:293](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/hooks/useMultiplayerSession.ts#L293) exposes `mirrorSession: null` and `mirrorBlocked` at 297-304 without turning the connection status/error into a terminal failure.
5. The old transport sets `ready = true` after delivering the replay at [client.ts:329](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/multiplayer/client.ts#L329); the subsequent React gate failure does not undo readiness.
6. With an actual `LobbyUpdated(status: 'active')`, [lobby/[roomCode].tsx:380](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/pages/multiplayer/lobby/%5BroomCode%5D.tsx#L380) mounts the game surface at 404. [NetworkedGameSurface.tsx:333](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/components/multiplayer/NetworkedGameSurface.tsx#L333) returns `MatchLoadingState` for the null mirror. Its actual content is a spinner, **"Loading match..."**, and "Rebuilding the board from the match event stream.": [NetworkedGameSurface.overlays.tsx:38](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/components/multiplayer/NetworkedGameSurface.overlays.tsx#L38), lines 44-52.

The frozen test passed with `status === 'ready'`, a null mirror, `invalid-payload` evidence and the visible loading panel. There was no alert. This is a spinner/loading failure, not a blank screen or a generic schema-error notification. Without a lobby snapshot, the page remains **"Joining lobby..."** instead.

### The prescribed Error-only refusal also fails visibly

The host's intended frame is valid under the old wire schema:

```json
{"kind":"Error","matchId":"old-match","ts":"2026-11-09T00:00:00.000Z","code":"PROTOCOL_VIOLATION","reason":"reload-required: Reload this tab to join this match."}
```

The old [client.ts:411](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/multiplayer/client.ts#L411) emits a plain error payload at 417-422. [useMultiplayerSession.helpers.ts:352](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/hooks/useMultiplayerSession.helpers.ts#L352) routes every named server error except `CLIENT_ERROR` to **`setIntentError`**, returning at 361. It does not set `error` or change `status`.

The old joining page passes only `session.error` at [lobby/[roomCode].tsx:376](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/pages/multiplayer/lobby/%5BroomCode%5D.tsx#L376). Its alert at 190-193 is conditional on that value, not `intentError`. The executed fixture established:

- `error === null`;
- `intentError === { code: 'PROTOCOL_VIOLATION', reason }`;
- the page still shows "Joining lobby..." and "Status: connecting. Waiting for the first lobby snapshot.";
- the reload reason is absent and the requested alert assertion fails.

Sending **Error then Close alone does not repair a cold lobby**: the second frozen test passed with `status: 'closed'` and `closedInfo.reason` retained, but the old page still shows Joining without the reason. The close adapter clears `error` at [useMultiplayerSession.helpers.ts:367](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/hooks/useMultiplayerSession.helpers.ts#L367). The page only gives special unavailable treatment to runtime/bind/dispatch failures and reconnect exhaustion at [lobby/[roomCode].tsx:224](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/pages/multiplayer/lobby/%5BroomCode%5D.tsx#L224); arbitrary protocol Close reasons do not enter that panel.

The draft branch's earlier `oldJoiningAlert` test only parses the frame and formats hypothetical alert props. It does **not** prove that the actual old hook supplies those props. Do not cite it as old-client visibility proof; the real frozen-client witness disproves that inference.

## 2. What pre-R11a clients already display

| Existing path | Old behavior and source | Limits |
| --- | --- | --- |
| Invite-resolution HTTP error body `{error: reason}` on a non-404 failure | Reads the server string at `src/pages/multiplayer/lobby/[roomCode].tsx:64-74`; `LobbyResolveError` displays it at 116-125. Frozen **HTTP 409** test passed: "Lobby not found" plus the exact reload reason; no WebSocket opens. | Does not cover a tab whose invite resolution already finished. A 404 may resume from stored matchId at 50-59, so do not use 404 for capability refusal. This route is not authenticated by this old request; do not disclose private match/version facts there. |
| Spectator registration HTTP error | `src/hooks/useSpectatorRegistration.ts:46-63` reads `{error}` from authenticated POST failure. `src/pages/multiplayer/spectate/[matchId].tsx:155-156` chooses `SpectatorRegisterError`; lines 76-78 display "Cannot spectate" and an alert containing the reason. | Applies when registration is attempted, not every subsequent SessionJoin/catch-up. Source-traced here, not executed in the frozen harness. |
| Terminal Close once the active game surface is mounted | `src/lib/multiplayer/client.ts:424-430` emits Close and closes without retry. `src/hooks/useMultiplayerSession.helpers.ts:370-380` stores its reason. `src/components/multiplayer/NetworkedGameSurface.tsx:327-328` selects the terminal panel **before** its null-mirror/loading check. `NetworkedGameSurface.overlays.tsx:211-216` displays "Match ended" and the exact reason. | A cold lobby with no active LobbyUpdated never mounts this component. A real lobby-status baseline renders LobbyPanel instead. |
| Ordinary intent rejection after a usable mirror exists | `src/components/multiplayer/NetworkedGameSurface.tsx:364-365` renders IntentErrorToast; `NetworkedGameSurface.overlays.tsx:244-260` displays the reason with `role=alert`. | The null-mirror return at 333 happens first. This cannot solve seed admission. |
| Generic client-side Error object | `src/hooks/useMultiplayerSession.helpers.ts:346-350` sets status/error, which the joining alert can render. | A valid wire Error frame arrives as a plain payload, not an Error instance. Adding an unknown `CLIENT_ERROR` wire enum value would be rejected by old parsers. |

Existing server join refusals already send **Error + Close + socket close**, for example `src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts:126-129` and 390-405. That wire pattern is understood, but its cold-lobby reason is not generally rendered. A WebSocket HTTP-upgrade rejection is also insufficient: the browser does not expose a server response body as the old page's named error.

A third passing frozen test verified a bounded useful path: **real active LobbyUpdated baseline, then Error, then Close**, with no GameCreated or replay frames, causes the actual old page to show the terminal panel and exact reload reason. This is a possible active-match compatibility mechanism, not proof for lobby matches.

## 3. Proposed revision for Root

### Capability detection: no existing fidelity/build discriminator

Pre-R11a `SessionJoin` contains kind, matchId, timestamp, playerId, token, optional lastSeq and deliveryCursor: [Protocol.ts:92](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/types/multiplayer/Protocol.ts#L92), ending at 135; [client.ts:818](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/multiplayer/client.ts#L818). Neither cursor identifies reader support. Do not infer capability from timestamps, token age, identity, or whether a viewer has history.

There **is** an existing WebSocket subprotocol marker: `mekstation.v1`, [socketCredentialProtocol.ts:25](https://github.com/SwiggitySwerve/MekStation/blob/943f5354db0a8f88bd567e91ec4565ed83d3c5a7/src/lib/multiplayer/socketCredentialProtocol.ts#L25). Every current client offers that same value alongside the credential at 56-57. It has no build/fidelity sub-version today. `server.js:276` contains an inlined mirror and `server.js:646-647` selects that marker. It cannot distinguish an unmodified reader from an R11a reader without a deliberate protocol-value/negotiation change.

**Preferred discriminator, subject to Root's revised wire approval:** keep the optional `SessionJoin.replayFidelityReaderMaxVersion` proposed in section 0.3. Absence means legacy reader 1; new readers advertise the version owner's maximum. This is a **new wire field**, not an existing build marker. Its approval must be explicit under the coordinator's latest STOP; it is already present in the preserved partial implementation, but no additional handshake change is being implemented now. If Root instead chooses a new value/optional marker in `Sec-WebSocket-Protocol`, that requires changing client and `server.js` negotiation and reviewing older-server compatibility; reusing the header does not make it a no-change wire contract.

### Concrete active-match mechanism, supported by the frozen witness

After authenticating the socket and resolving current match membership, but before sending **any GameCreated, Event or ReplayStart/Chunk/End**:

1. Read the actual retained seed's producer-rules version through the shared owner, independently of any tail-resume cursor.
2. Compare it with the advertised reader maximum; absent capability means 1.
3. For an incompatible reader **when the actual match status is active**, send the viewer-authorized, normal `LobbyUpdated(status: 'active')` baseline through the existing publication guard. It must contain only the baseline facts that authenticated viewer may already receive.
4. Send existing `Error(code: 'PROTOCOL_VIOLATION', reason: 'reload-required: Reload this tab to join this match.')`, then existing `Close` with the same code/reason; close the socket and detach. There is no replay, readiness, delivery acknowledgement or reconnect loop.
5. The frozen pre-R11a lobby page mounts its existing active surface and shows **"Match ended" plus the exact reload reason**. Old clients do not acquire a new Reload button; only updated code can supply that action.

This adds no new error enum or gameplay rule. It **changes the approved compatibility framing/order** by publishing a guarded baseline before the refusal and adding a terminal Close. Root must approve it. It must not bypass authorization or fabricate an active status for a match that is actually still in the lobby.

### Remaining cold-lobby gap and rollout decision

There is **no universal existing old socket-error display path for an already-resolved, still-lobby tab**. Sending a real LobbyUpdated with status lobby does not choose the active terminal panel. Error-only and Error+Close alone were both tested and are invisible there. Fabricating `status: 'active'`, impersonating a timeout, or smuggling a reload reason into unrelated fields would misstate match state and is not proposed.

For the original requirement covering **every** un-reloaded old tab, Root must approve a client/rollout prerequisite or revise the acceptance claim. A concrete split is:

- **Reader-preparation PR first:** visible named terminal join errors on both pages, Close handling before lobby/mirror availability, local unsupported-version errors, and explicitly approved capability negotiation. Keep the writer at its old behavior during that prerequisite.
- **R11a writer PR afterward:** activate stamp 2 only against the approved minimum reader baseline; authorization-first host refusal remains mandatory. Use the frozen active-baseline+Close mechanism for original old active tabs if approved. HTTP JSON refusals can provide the reason to old invite-resolution/spectator-registration flows, but they are supplemental and do not cover a previously resolved lobby.
- **Deployment acceptance:** explicitly decide how original pre-prerequisite lobby tabs are refreshed/retired. A server refusal can protect history immediately; deploying new JavaScript does not update an already-running tab. No claim that all original old tabs display the reason is justified without a real refresh/retirement mechanism or an accepted limitation.

An invite/spectator HTTP capability preflight would additionally need an approved request marker for updated readers; these old requests have no fidelity field. It cannot be silently added as an unrelated route edit. The active-baseline mechanism and preparation split are proposals only, not implemented or approved here.

**Requested Root decision:** approve the explicit reader capability wire field and baseline+Error+Close ordering for active matches; choose a preparation/deployment prerequisite for still-lobby tabs, or narrow the old-tab visibility acceptance. Until that decision, R11a cannot claim section 0.3 complete and must not be pushed as ready.

## 4. Updated readers still need the in-app named error

**Yes.** A newly loaded R11a client can later meet a version-3-or-newer host. The host must compare actual seed version against that reader's advertised maximum and refuse before delivering the seed. Updated hook/pages need terminal `reload-required` plus a visible Reload action; they must not remain Joining/Loading or reconnect indefinitely.

Unexpected local unsupported-version failures in hosted mirror catch-up, cold recovery and Replay Library loading must remain distinct from malformed/corrupt history. The transport must stop before acknowledging a rejected seed or declaring ready. None of these updated-client changes patches a pre-R11a tab's already-loaded JavaScript.

## Preserved branch checkpoint and verification limits

Branch: `fix/d8-r11a-replay-fidelity-version`, based on pinned origin/main above. Implementation checkpoint: `bb29e1427ad2419968da0e08b835a9048454bd5f`. Current work is partial and stays intact in a local commit. No push, draft PR, merge, installs, full/directory Jest, build, fixture re-mint or hash re-pin was performed.

Completed evidence before the stop:

- Baseline: five required focused suites, 91 tests passed.
- Partial new owner/factory/runner/schema/server preflight: four suites, 73 tests passed.
- Partial updated hook/lobby/spectator presentation: three suites, 45 tests passed; Jest reported a worker teardown warning. This is not complete old-client compatibility evidence.
- Both TypeScript configs passed on the then-current tree. The local checkpoint commit used normal Git with no skip flags. This worktree lacks `.husky/_/pre-commit` despite `core.hooksPath=.husky/_`, so the commit did not rerun lint-staged/typechecks; no final-tree hook proof is claimed. No Git configuration was changed.
- Frozen blocker harness: four characterization/alternative-path tests passed; the approved Error-only visibility assertion failed as expected.
- The old recording remains 58,703 bytes, SHA-256 `4366ce6cb897f79ea9f75e9b88a48f21db16864e56c58cbe790d7fa72c6833a9`.

The last already-running focused batch finished after the stop request: **47 passed, 6 failed**. The two engine event locks moved as expected from the stamp and were **not re-pinned** (42: old `2e6518e7722bb8fedc5212f0a83b0b67f4568ab56326e54266cc2d94608c0de1`, observed `729e77594b25d0407b914a7149bdd421375fbe38c01ff0be0f94e44139076a99`; 12345: old `b0d824117f9c7cdff7f78ff4a1d9aa54d1a6139a5557a85b7bb31f55c3f9399a`, observed `a58194599adbf83c95b0f75a8295152e251a755a55a9353670e9649c51ceec0b`). Per-lock exact stamp-removal proofs are still outstanding. Three added persistence assertions incorrectly compared pre-storage JSON order with the existing canonicalized storage order; they remain unfinished tests, not established new product drift. The added future-gate test accidentally builds from HISTORY[0] (GameStarted), so its input needs correction. They were preserved on request rather than repaired after implementation stopped.

The CI budget check passed at the stop point: 57 unkeyable tests (no increase). Required mutants, complete movement/fingerprint receipts, strict OpenSpec and the remaining final-tree checks are outstanding. OpenSpec tasks remain unchecked. This checkpoint must not be described as passing or merge-ready.


## 5. Launch-time frozen witness and pre-launch seed reachability (C4 follow-up; parked under section 50)

**Result: the requested lobby-to-launch refusal sequence PASSES, but the current host can send its creation seed before launch. The cold-lobby gap therefore does not disappear on this base.** Root's four rulings in the subsequent owner directive supersede the earlier approval requests in this report; implementation remains parked.

### Executed launch witness

The run was already in flight when the park directive arrived and was allowed to finish. Its final result is **1 passed, 5 skipped, 0 failed**, exit 0; the focused test executed **22 assertions**. Evidence: [launch-result.json](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/launch-result.json), test `a connected old still-lobby tab shows the exact terminal reason when launch active baseline precedes Error and Close with no seed or replay` in [frozen.witness.test.tsx](E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/frozen.witness.test.tsx).

The harness first renders the frozen old page connected to a match resolved as `lobby`, supplies valid normal lobby seats, and asserts that the actual lobby panel and Launch match control are visible. It then calls the **real pinned pre-R11a `handleLobbyIntent(LaunchMatch)`** against an isolated InMemoryMatchStore. The handler changes the stored status to active and broadcasts its real `LobbyUpdated(active)` frame to the frozen client. The harness then delivers the prescribed existing Error and Close frames with reason `reload-required: Reload this tab to join this match.`

It asserts the exact reason, including the existing `(PROTOCOL_VIOLATION)` display suffix, is visible in `match-closed-panel`. The mirror is still null; there is no blocked mirror, Loading match panel or Joining lobby heading; the socket is closed; no reconnect is scheduled; the client never became ready; lastSeq stays -1. The complete inbound frame-kind list is exactly:

```text
LobbyUpdated(lobby)
LobbyUpdated(active)  [real LaunchMatch handler output]
Error(PROTOCOL_VIOLATION, reload-required: ...)
Close(PROTOCOL_VIOLATION, reload-required: ...)
```

No GameCreated, Event, ReplayStart, ReplayChunk or ReplayEnd was delivered. A throwing stub would fail the test if the launch handler attempted engine event delivery or dice capture. The frozen manifest now additionally captures `ServerMatchHostLobbyIntents.ts` from the same pinned base (10 source files total). It does not modify any product source.

```powershell
node node_modules/jest/bin/jest.js --config 'E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/jest.config.json' --runTestsByPath 'E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/frozen.witness.test.tsx' --testNamePattern 'connected old still-lobby tab' --maxWorkers=3 --json --outputFile='E:/Projects/Personal/_scratch/sm-audit-reports/d8-fidelity/R11a-frozen-client/launch-result.json' --silent
```

This focused run did not rerun or turn green the earlier intentionally failing Error-only witness. Initial harness attempts used invalid seat/player-reference fixtures and were corrected within the external witness before the final in-flight run; those fixture failures are not product findings.

### Code reading: the no-pre-launch-seed premise is false

All references in this table are on **943f5354db0a8f88bd567e91ec4565ed83d3c5a7**. The metadata's lobby/active lifecycle and the engine session's creation/start events are separate here.

| Path / boundary | Pinned source evidence | Finding |
| --- | --- | --- |
| Normal match creation | `src/pages/api/multiplayer/matches/index.ts:218-249`, especially `status: 'lobby'` at 235 | The REST route creates lobby metadata. This alone does not yet claim an engine seed. |
| First lobby socket host lookup | `src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts:123-144`; `MatchHostRegistry.ts:155-179` | The socket binder calls getOrCreate. Registry createHost rejects completed at 167, but does not require active; ordinary lobby metadata reaches ServerMatchHost.create at 179. |
| Host bootstrap eagerly creates the seed | `ServerMatchHost.ts:482-489`; `ServerMatchHostBootstrap.ts:43-53`; `src/engine/InteractiveSession.ts:244-252`; `src/utils/gameplay/gameSessionCore.ts:118-129` | Bootstrap constructs InteractiveSession immediately, which calls createGameSession and startGame. createGameSession already contains GameCreated. This happens before a later LaunchMatch intent. |
| Initial events are stored before launch | `ServerMatchHost.ts:464-468`; `ServerMatchHostEvents.ts:91-102` | The fresh host persists the constructor's GameCreated and GameStarted. Neither persistence call waits for metadata status active. The asynchronous persistence is not a guarantee of withholding: once its ordinary writes complete, pre-launch joins can read the seed. |
| Lobby SessionJoin sends replay before its baseline | `bindMultiplayerSocketConnection.ts:276-293`; `ServerMatchHost.ts:1184-1204`; `ServerMatchHostReplay.ts:350-386` | After authorization, handleSessionJoin calls sendReplay at 358 **before** reading metadata at 363 and sending LobbyUpdated at 369-386. There is no lobby-status exemption. |
| Replay does not suppress the lobby seed | `ServerMatchHostReplay.ts:100-134`, `:230-240`, `:486-488`; `projection/MatchWireAudienceCatalog.ts:73-74` | Fog-off is an ordinary supported route: getReplayEventsForPlayer returns stored events, streamReplay constructs chunks and safeSend sends them. GameCreated/GameStarted are public audience decisions, not active-only events. Therefore a pre-launch lobby client can receive its creation seed. |
| Invitees before seat occupancy | `authorization/MatchSeatMembershipSource.ts:181-207` | A verified lobby invitee may be admitted while an open human seat exists or they are rostered. Pre-launch replay reachability is not limited to an already occupied host seat. Existing auth/membership checks still apply. |
| Fresh spectator registration before launch | `src/pages/api/multiplayer/matches/[id]/spectate.ts:115-121`, rechecked at 149-153 | Normal REST spectator registration refuses lobby metadata with HTTP 409; this route does not create a fresh pre-launch spectator seat or send the seed. |
| Already-authorized/pre-seated viewer and other replay seams | `authorization/MatchSeatMembershipSource.ts:97-105`, `:160-177`, `:211-222`; `ServerMatchHost.ts:1096-1107` | Membership recognizes existing human/spectator occupancy (or roster fallback). Such a viewer uses the same status-independent join replay. The direct host sendReplay wrapper also has no launch-status gate. This is not a claim that REST lets a fresh spectator bypass its active-only rule. |
| Actual LaunchMatch | `ServerMatchHostLobbyIntents.ts:105-114`, `:288-300` | LaunchMatch changes metadata to active, clears the room code, and broadcasts LobbyUpdated. It does **not** first create GameCreated: that seed was created with the host. |

The original old seed is unstamped. Under the preserved R11a producer change, the same eager factory writes 2, so a supported/new reader can receive a stamped GameCreated while metadata is still lobby. The preserved partial compatibility preflight blocks an incompatible old reader even earlier, before replay, **with only Error and no baseline/Close**; that is exactly the invisible cold-lobby failure already proved above. Do not interpret this as evidence that the partial checkpoint bypasses its own version check and sends a version-2 seed to a refused reader.

### Consequence for the approved direction

The launch-time display mechanism is valid once the real active baseline is available. It cannot retroactively protect a pre-launch SessionJoin that already encounters the seed or is refused silently. Keeping old tabs connected seedlessly until launch would require a reviewed change to lobby replay/admission and retained reader capabilities; that is additional implementation, not a fact established by this witness, and is parked.

The owner has approved the reader field, active-match baseline + Error + Close order, conditional preparation split, and updated in-app Reload action. The narrow launch witness passed, so this report does not select the conditional fallback on the false claim that it failed. On resume, account for the newly traced pre-launch seed path before claiming complete old-tab compatibility; retain the owner's approved preparation/old-tab-limitation option for the end-to-end compatibility decision. No product changes, engine lock re-pins, further test runs or implementation fixes accompany this section.
