# NDC1 R5 native failure — independent diagnostic review

**Verdict: REJECT native-framed-export acceptance; the original 19-case run remains failed and incomplete.** Seven cases passed, `native-framed-export` failed, and the following eleven cases remain UNRUN. The new observations establish LastAccessTime drift at the first export boundary despite successful suppression on the exact source handle. They do not establish which Windows component performed the update. No demonstrated same-contract production repair follows from this packet.

**Recommended next action:** prepare one bounded, three-specimen differential experiment described below, using fresh protected fixtures and the existing pinned native owners. Do not make an unconditional R6 Source clone, repeat the identical suppression patch, or add passive instrumentation without the stated intervention. This recommendation is preparation direction, not execution permission or another acceptance gate. Source/Main/operation acceptance remain false; P2 remains closed.

Reviewer: `/root/astra_p1_exit_r1`, established actual `gpt-6-astra / high`, served tier UNKNOWN, 2026-10-15. This review performed named Source/evidence reads and independent byte/hash/JSON comparisons only. Its sole write is this audit. No reviewed-runtime import, native call, fixture probe, helper execution, retry, Source/control edit, static/test run, Git operation, cleanup or delegation occurred.

## Exact packet and custody

D = `E:/Projects/MekStation/.omo/ulw-execute/mekstation-whole-roadmap-execution-20261002-01a0febd`.

R5 = `E:/Projects/codex-native-retention-repair-01a0febd/deployment/concrete-runtime-operation-namespace-foundation-r5-20261013`.

F = `R5/.omo/evidence/1e6f7049-3da7-4c25-9ad2-249a2a3c0f77`; T = `R5/.omo/evidence/top-1e6f7049-3da7-4c25-9ad2-249a2a3c0f77`.

I waited for the final diagnostic packet before reading it. The frozen D/`namespace-r5-single-native-diagnostic-result-20261015.json` is **566,932 bytes**, SHA-256 **`024985aa7a76fd083fb143f0af7315125c57da1992d2002d7d2b29c7342dfc0e`**. All 14 named actual F/T artifacts independently match their byte/hash pins and embedded JSON or raw content. This is a reconciliation of the finite named set, not a new filesystem census. All **261 post-native inputs / 61,473,026 bytes** independently match their expected pins, with no mismatch or duplicate normalized input path.

| Artifact                              |  Bytes | SHA-256                                                            |
| ------------------------------------- | -----: | ------------------------------------------------------------------ |
| F/`case-artifacts/failure.json`       | 12,427 | `7ca23dbc73cb7f99a502f5240e9e3098adc16c955e4bf45688636bec4edce464` |
| T/`before-start.json`                 |  1,785 | `5bb1fe092a986623daa586b1bd48951faa5a019097c591039f25fd3380595c9f` |
| T/`spawn.json`                        |    410 | `bc0876105a089965a2f27a0e8f8092d0a965ca64055be510b0bbd3098695b0ff` |
| T/`exit.json`                         |    820 | `dd12598ca58e0963722df227ebc5d915d592dde8c80b62eee6df08c87bbdea34` |
| T/`stdout.bin` and `stderr.bin`, each |      0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The recorded actual process is Python PID **11844**, creation FILETIME **134365422677282086**, exit FILETIME **134365422681201146**, native exit **1**. Its live-image query was gated on STILL_ACTIVE 259, top ingress qualified, both raw drains completed, no collector/startup failure is recorded, and termination was not requested. The tool wrapper returned **0** while explicitly printing native exit **1**; the wrapper is not a passing test result. The actual invocation used the renewed request/procedure pins, admitted Python flags, fixed R5 cwd and cleared private ENV7. Empty raw streams do not erase the protected failure artifact.

The seven completed artifacts cover ABI, relative open, protected create, create collision, named DATA, logical-root DATA and frozen census. There is no completed framed-export result. Storage-root ADS, reparse policy and the nine pure cases are the eleven remaining UNRUN declarations. One released attempt is recorded; no automatic retry occurred.

## What the first-boundary evidence now proves

The first failing session is the logical source directory `relative: "."`. Its retained native open produced handle **800**, requested access **2148532480 / 0x80100100** (`GENERIC_READ | SYNCHRONIZE | FILE_WRITE_ATTRIBUTES`), return NTSTATUS **0**, IOSB status **0**, IOSB information **1**, and qualified completion. The existing suppression call returned **BOOL 1**, with cached error **0**, on that exact handle before its metadata/read use.

The first retained `before`/`after` pair differs only at `times[1]`. I compared the original integer tokens losslessly, using BigInt for subtraction rather than a JavaScript Number roundtrip. The pair also exactly matches the decoded expected/actual frozen-metadata hex in the later exit failure.

| Field          | Before                 | After                  |
| -------------- | ---------------------- | ---------------------- |
| CreationTime   | 134365422679040440     | 134365422679040440     |
| LastAccessTime | **134365422679191199** | **134365422680980515** |
| LastWriteTime  | 134365422679191199     | 134365422679191199     |
| ChangeTime     | 134365422679191199     | 134365422679191199     |

The access-time difference is **1,789,316 100-ns ticks / 0.1789316 seconds**. Full identity, directory kind, attributes 48, link count, security bytes, size and reparse tag are unchanged. The time-field interpretation follows the actual `FileBasicInfo` `<qqqq` layout and the independent QA sampler's offsets 0/8/16/24.

Actual BackupRead calls recorded: nonzero BOOL with 60 bytes, nonzero BOOL with zero-byte EOF, then nonzero BOOL on abort/release. The sole captured frame is ALTERNATE_DATA `:root:$DATA`, payload size **18**, payload SHA-256 `cbe2e48588c4e03267a9622bae544dd1635bd61b41a781bbb653ce455b267cbe`. Raw framed size is **60**, SHA-256 `72c4499f2a2cd104b6fc0864cf3db2992c1015ae3a2e51bc67e8d0ba0e156701`. Cached error 87 beside successful calls is not a failed BOOL result. EOF and release are true; the export is still **PartialExport** because its exact metadata guard refused it. No positive EA-absence or full three-entry export proof follows.

The source establishes this failure sequence:

1. `BackupSession.capture` retains `before`, performs the real read loop, destination writes and parsing, then retains `after`. Exact inequality raises `backup-source-metadata-drift` at `winfiles.py:1454`.
2. Its finally block still performs the required abort. The retained refusal prevents CompleteExport.
3. `FoundationLease.export` refuses coverage at `namespace.py:509`.
4. Lease exit checks the unchanged frozen metadata and raises `foundation-frozen-metadata-drift` at `namespace.py:386`. The protected diagnostic retains the incoming coverage exception and the session's original metadata failure separately; it does not fabricate a Python cause chain.

The decisive capture occurs before abort. Therefore abort is not the cause of the already-observed first difference. The capture spans more than the BackupRead call alone, so it cannot attribute the change specifically to an internal ADS open, the EOF call, a metadata query, prior deferred work or another permitted metadata actor.

## Supported cause, hypotheses and rejected remedies

The concrete failure cause at the application boundary is **failure to preserve the frozen LastAccessTime during the export capture interval**. Missing requested attribute-write rights, a failed suppression BOOL, a wrong recorded source handle and a schema mismatch are not the observed explanation. R5 closes the exact first-boundary/suppression gap identified in D/`namespace-r3-export-failure-analysis-astra-20261013.md`; that prior review's recommendation to retain these facts is fulfilled.

The existing code already passes all-ones LastAccessTime to `SetFileTime` immediately after opening the source. The [documented suppression](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfiletime) applies to operations through that handle. [BackupRead](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-backupread) exposes neither a callback for supplying separately suppressed ADS handles nor a documented file-wide timestamp-suppression option. Its context is opaque. The prior review's linked Microsoft API analysis remains applicable; no new external API discovery or Windows-internal trace was performed here.

An internal ADS operation on another file object is consistent with these facts. So are a deferred update from earlier activity and other timing/provider effects not isolated by this run. Neither R3 nor R5 contains an internal-handle trace proving that mechanism. The same broad failure occurred before the four Windows binaries were renewed, so these records do not establish the update as the cause.

There is **no demonstrated documented setter/flag substitution that guarantees this same live-source operation will pass**. Repeating SetFileTime, substituting a similarly handle-local basic-info setter, enabling backup intent/privileges, broadening rights, waiting for an arbitrary warmup, refreshing the baseline, restoring timestamps, ignoring access time, synthesizing frames or treating successful EOF as coverage is not an acceptable repair. This is not a proof that all Windows/provider configurations are incapable of preserving metadata; it is a rejection of the current route's acceptance and of an unsupported drop-in fix.

## Preferred bounded intervention and decision table

Prepare **one three-specimen experiment**, rather than serial fresh Source copies or another identical original19 run. Its falsifiable question is whether fresh closed-history specimens exhibit drift from setup/query activity, base BackupRead, or specifically the ADS-bearing BackupRead path. It is a diagnostic control, not three additions to `NativeScenario` and not substitute acceptance evidence.

| Specimen | Source shape                                                    | Intervention                                                                      |
| -------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A        | Protected directory with the same `:root:$DATA` payload         | Existing native open/suppression and matched metadata sampling; **no BackupRead** |
| B        | Matched protected directory without ADS                         | Actual native BackupRead through EOF and abort                                    |
| C        | Matched protected directory with the same `:root:$DATA` payload | Actual native BackupRead through EOF and abort                                    |

Use three distinct, exclusively created names in one newly admitted private experiment namespace; preserve every R3/R4/R5 fixture and result. Close every setup writer/handle before the first frozen baseline. Omit the prior seven-case history and census/data-reading history. Baseline means the first post-setup freeze, not a value refreshed until stable. Keep the same native rights, no-follow/full-identity ownership, successful suppression check, protected destination, bounded raw framing, true EOF and real abort/release. Use the existing owners rather than implementing a second export engine.

For each subject retain full signed64 metadata, identity, security, source handle and actual native receipts. For B/C take full metadata immediately before and after each real BackupRead, before any subsequent parser/destination work, and around abort. A has corresponding query-only observation stages, explicitly labelled as such, with no fake read/EOF/release receipts. Preserve ordinary failure cleanup and the existing actual-process hold for unknown pending/release outcomes. New observations are charged and bounded; no unbounded polling or settle-until-pass loop is allowed. Any metadata difference remains a failed preservation result, even if diagnostic-only bounded observation continues under an explicitly reviewed control.

The intervention is meaningful because it changes source history and ADS presence; additional samples locate the boundary within that intervention. It does not rely on another timestamp record alone.

| Observed result                                   | Permitted conclusion / stop decision                                                                                                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A drifts                                          | Setup/query/provider/external activity is not excluded. Stop: the control does not isolate BackupRead causality.                                                                                                                       |
| A stable; B and C drift                           | The fresh backup path can drift without ADS. Reject an ADS-only explanation; stop that production route pending a different supported design.                                                                                          |
| A and B stable; C drifts                          | Drift is associated with ADS-bearing BackupRead under this matched experiment, and preceding cohort activity is unnecessary for reproduction. This still does not identify an internal kernel handle or prove universal impossibility. |
| All stable                                        | Clean-history execution succeeded for these specimens. History/timing is a candidate, not a proved fix; do not refresh the original baseline or declare original19 complete.                                                           |
| Any other pattern or native/setup/cleanup refusal | Retain the exact outcome as inconclusive or unsupported. No automatic retry or added specimens.                                                                                                                                        |

A/B stability cannot rule out every timing-dependent actor; this is a bounded differential result, not an OS-internals theorem. No branch authorizes another clone or retry automatically. Return the one experiment's evidence to the same finite decision boundary.

The preparation should be **one fully disclosed native diagnostic control**, with frozen inputs/argv/environment/output names and honest process/line accounting, under Root's existing isolated authority. No production Source clone/edit is needed to propose it, and none was made here. Do not move replacement domain implementation into a control to evade Source accounting. The Source budget remains **1,413 actual / 1,426 conservative**, leaving at most **74 conservative additions** under 1,500; no deletion credit or cap waiver is granted. Preserve the existing control and H3 15-file/500-line limits and explicitly account for the proposed control within their applicable scope before execution. This report adds no review layer.

## Design boundary if the live route remains incompatible

If a clean ADS-bearing specimen reproduces the mismatch, more equivalent suppression changes are not justified. Keep the current live-provider framed export capability held. That is safe refusal, not completion of NDC1.

A concrete larger alternative would require an explicit Source-admission amendment for an **externally supplied, immutable read-only snapshot**, with provenance binding its metadata/data/EA state to the intended original source and an export owner that cannot update snapshot metadata. It would need its own identity mapping and access model: a snapshot has distinct identity/provenance, and the present mandatory FILE_WRITE_ATTRIBUTES/suppression path may itself be incompatible with read-only storage. This is not a promise that VSS or another provider works, not authority to create a privileged snapshot, and not implementable by quietly relabelling an ordinary copied tree. Native framed export and genuine EA proof would still be required. That architecture is outside this 74-line repair margin and requires a concrete scope decision before preparation.

## Retained source and finite outcome

The inspected owners match the retained Source pins: `winfiles.py` 63,892 bytes / `21ed5f5cc9fb1a68e65a7e23af0442d82ac79092b7756a1dc71d7d2bc7c6cb4a`; `namespace.py` 27,456 bytes / `73e83d96d5f67147aad1a7557bb92191cbf2ab49d80a6c87f4a0dc5214f55bdd`; `qa_namespace_foundation.py` 21,655 bytes / `c63a49cefbc403f55abf2ce3ee3421ac906a3b9dcd3ded9db917bd1626c5792a`; `namespace-rules.md` 6,971 bytes / `88276323bc1aee0d707db35914ba73ec3e7d44a4048670cdec59867d988dc9da`. Existing security, legacy reader, full-metadata, native completion, framing and failure invariants remain unchanged.

The diagnostic review is complete. The original19 target is not: **7 PASS / 1 FAILED_INCOMPLETE / 11 UNRUN**, native exit **1**. Root can use the bounded experiment proposal for concrete preparation; no successful behavioral repair or execution approval is claimed.
