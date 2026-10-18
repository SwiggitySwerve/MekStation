# v2.2.0 co-op L1 human session — `<date>`

Status: NOT RUN. Copy to `<date>-v2.2.0-coop-l1.md` and replace placeholders with
observations. Follow [the three-seat script](../checklists/coop-uat.md). Keep
failed attempts and retests; an empty field is not a PASS.

## Candidate and entry evidence

- Session start/end and timezone: `<timestamps>`
- Exact Main SHA: `<full SHA>`
- Release tag: `<tag, or explicitly untagged candidate>`
- Artifact filename/path and SHA-256: `<artifact and hash; explain if no package>`
- Running build/source identity and its relationship to that Main SHA: `<details>`
- `verify:qc:coop-campaign-journey` receipt on this SHA: `<path/result/timestamp>`
- `ServerMatchHostUnitOwnership.test.ts` receipt on this SHA: `<path/result/time>`
- Three-context automated mission proof (launch, owned actions, both foreign-unit
  refusals, terminal combat, outcome, reload): `<receipt and exact SHA>`
- Agent rehearsal on the same candidate: `<record, defects and retests>`
- Separate installer smoke: `<receipt/status; this session does not waive it>`

## Operators, topology and identity

Operator statement: **"one human operating three seats"**, or name the actual
human operators and their seats: `<operators and seats>`. An agent rehearsal
does not satisfy this human attestation. One human driving three seats proves
manual three-seat operation; it does not prove three-person usability.

Topology statement: **same-host loopback; remote play not exercised**.

- Server vehicle: `<one packaged Electron instance or one development server>`
- Shared origin and actual port: `<origin:port>`
- Server log path: `<path>`
- Campaign ID: `<id>`
- Match ID: `<id>`
- Confirm one server and three distinct identities/storage profiles: `<observation>`

| Seat           | Human operator | Client/profile                    | Identity display name / non-secret ID | Owned unit ID(s) |
| -------------- | -------------- | --------------------------------- | ------------------------------------- | ---------------- |
| Non-playing GM | `<operator>`   | `<Electron or browser profile A>` | `<identity>`                          | None             |
| Player 1       | `<operator>`   | `<browser profile B>`             | `<identity>`                          | `<unit IDs>`     |
| Player 2       | `<operator>`   | `<browser profile C>`             | `<identity>`                          | `<unit IDs>`     |

Use separate profiles, not InPrivate windows. Multiple Electron instances start
separate servers and do not form this shared session. Record no tokens, cookies,
invite secrets or credentials in the mapping, screenshots or logs.

Actual listener line (must show `127.0.0.1`; paste observed output, not an example):

```text
`<MEKSTATION_LISTENER_READY line>`
```

## Known L0 defects

Do not re-file these issues. Link the existing ID and record any impact on this
run; a known issue that blocks a step still requires a FAIL and blocking verdict.

| Existing issue | Known behavior  | Observed impact / evidence  |
| -------------- | --------------- | --------------------------- |
| V211-01        | AI hex stacking | `<not observed, or impact>` |
| V211-03        | Prone skip      | `<not observed, or impact>` |
| V211-07        | Per-unit stats  | `<not observed, or impact>` |

## Timestamped execution

Replace NOT RUN with PASS or FAIL only after observation. Use full timestamps
with timezone. Add rows for failed attempts/retests without overwriting history.

| Step                                                     | Start/end timestamps | PASS/FAIL | Actual observation and cross-seat agreement            | Evidence / defect |
| -------------------------------------------------------- | -------------------- | --------- | ------------------------------------------------------ | ----------------- |
| 1. GM creates campaign                                   | `<times>`            | NOT RUN   | `<campaign ID and GM role>`                            | `<path>`          |
| 2. Player 1 joins by invite                              | `<times>`            | NOT RUN   | `<identity and shared campaign>`                       | `<path>`          |
| 3. Player 2 joins by invite                              | `<times>`            | NOT RUN   | `<distinct identity and shared campaign>`              | `<path>`          |
| 4. Proposal approved                                     | `<times>`            | NOT RUN   | `<author, action, applied once in all seats>`          | `<path>`          |
| 5. Proposal rejected                                     | `<times>`            | NOT RUN   | `<notice and no campaign mutation>`                    | `<path>`          |
| 6. GM launches fog-off mission                           | `<times>`            | NOT RUN   | `<match ID, ownership, GM observes>`                   | `<launch images>` |
| 7. Player 1 moves and fires own unit                     | `<times>`            | NOT RUN   | `<unit, hexes, target, result>`                        | `<path>`          |
| 8. Player 2 moves and fires own unit                     | `<times>`            | NOT RUN   | `<unit, hexes, target, result>`                        | `<path>`          |
| 9. Player 1 attempts Player 2 unit                       | `<times>`            | NOT RUN   | `<visible refusal, no state change>`                   | `<path>`          |
| 10. Player 2 attempts Player 1 unit                      | `<times>`            | NOT RUN   | `<visible refusal, no state change>`                   | `<path>`          |
| 11. GM observes normal play                              | `<times>`            | NOT RUN   | `<turns, accepted actions, shared state>`              | `<path>`          |
| 12a. Mid-mission disconnect/recovery before exhaustion   | `<times>`            | NOT RUN   | `<no terminal error, identity and state retained>`     | `<path>`          |
| 12b. Mid-mission HP two-retry exhaustion                 | `<times>`            | NOT RUN   | `<retry times and inline error only after exhaustion>` | `<path>`          |
| 12c. Restore network, reload campaign, resume same match | `<times>`            | NOT RUN   | `<owned action, phase/positions/damage agree>`         | `<path>`          |
| 13. Actual mission ends                                  | `<times>`            | NOT RUN   | `<terminal result in all seats>`                       | `<end images>`    |
| 14. Campaign outcome applied                             | `<times>`            | NOT RUN   | `<consequences once in all seats>`                     | `<path>`          |
| 15. All three seats reload and agree                     | `<times>`            | NOT RUN   | `<same completed mission and outcome; no duplicate>`   | `<reload images>` |
| 16. Attempt fog-on create                                | `<times>`            | NOT RUN   | `<creation unavailable; exact help/refusal text>`      | `<path>`          |

## Refusal and recovery evidence

- Player 1 foreign-unit attempt: `<time, action, target unit, verbatim refusal or
disabled-control explanation, screenshot and unchanged-state observation>`
- Player 2 foreign-unit attempt: `<same details>`
- Disconnect method and affected profile: `<method; server and other seats stay up>`
- HP attempt/retry timestamps and logs: `<initial attempt, retry 1, retry 2>`
- Actual inline error text and first appearance time: `<verbatim text/time>`
- Expected only after exhaustion:
  **"Campaign sync could not connect. Reload this campaign to try again."**
- Recovery after connectivity restored and campaign reloaded: `<same IDs,
ownership, phase, positions, damage and next owned action>`
- Fog-on create attempt: `<verbatim disabled/help text or refusal; mark FAIL if
creation succeeds and only subsequent access is refused>`

## Screenshots and campaign consequences

Provide nine real evidence paths; add action/refusal/recovery captures as needed.

| Checkpoint              | GM       | Player 1 | Player 2 |
| ----------------------- | -------- | -------- | -------- |
| Launch                  | `<path>` | `<path>` | `<path>` |
| Mission end             | `<path>` | `<path>` | `<path>` |
| After each seat reloads | `<path>` | `<path>` | `<path>` |

| Displayed campaign field     | Before outcome               | After outcome: GM / Player 1 / Player 2 | After reload: GM / Player 1 / Player 2 |
| ---------------------------- | ---------------------------- | --------------------------------------- | -------------------------------------- |
| Mission/result status        | `<value>`                    | `<values>`                              | `<values>`                             |
| Unit damage/condition        | `<values>`                   | `<values>`                              | `<values>`                             |
| Resources/rewards shown      | `<values>`                   | `<values>`                              | `<values>`                             |
| Other displayed consequences | `<values or not applicable>` | `<values>`                              | `<values>`                             |

Outcome applied exactly once: `<observation and log reference; no injected result>`.

## Server log excerpt

Paste timestamped, sanitized lines tying the same campaign ID and match ID to
launch, disconnect/recovery and outcome application. Identify the source log and
line range; label missing evidence instead of inventing output.

```text
`<actual excerpt with campaign ID and match ID; no credentials>`
```

## Defects, release verdict and owner sign-off

| Issue / existing ID                 | Severity     | Steps and evidence | Retest timestamp/result | Release-blocking? Why?   |
| ----------------------------------- | ------------ | ------------------ | ----------------------- | ------------------------ |
| `<ID, or explicitly none observed>` | `<severity>` | `<details>`        | `<result/not retested>` | `<yes/no and rationale>` |

- Session result: `<completed PASS / completed with defects / incomplete FAIL>`
- Release-blocking verdict: `<BLOCK / NO BLOCK, with unresolved-step/defect rationale>`
- Incomplete or missing evidence: `<items or none>`
- Human operator attestation: `<name, timestamp, actions personally operated>`
- Owner sign-off: `<name, timestamp, accept/reject, conditions and defect disposition>`
