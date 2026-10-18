# R5 differential outcome

**ACCEPT the bounded diagnostic outcome and close this checkpoint. Live ADS-bearing export remains unqualified.** Original19 remains **7 PASS / 1 FAILED_INCOMPLETE / 11 UNRUN**; no Source/Main/operation acceptance or NDC1 completion follows. P2 remains closed.

Reviewer: `/root/astra_p1_exit_r1`, established actual Astra/high, tier UNKNOWN, 2026-10-15. Read/hash/data comparisons only; this is the sole new file. No runtime execution, experiment, research, fixture probe, cleanup or delegation.

D is `E:/Projects/MekStation/.omo/ulw-execute/mekstation-whole-roadmap-execution-20261002-01a0febd`. The frozen result `namespace-r5-differential-result-20261015.json` is **18,683 bytes**, SHA-256 **`86c14e07275e12329ca41c5861f351a9a5d423c2b9ed6ddc0ea75296d636efc6`**.

| Specimen              | Independently reconciled outcome                                                    |
| --------------------- | ----------------------------------------------------------------------------------- |
| A: ADS, query only    | Full metadata stable; no fabricated BackupRead records.                             |
| B: no ADS, BackupRead | Full metadata stable; genuine zero-byte EOF and successful release, CompleteExport. |
| C: ADS, BackupRead    | LastAccessTime drift; expected DATA frame and genuine EOF/release; PartialExport.   |

C's once-frozen access time changed from **134365437227552314** to **134365437227736477**: **184,163 ticks / 0.0184163 seconds**. Lossless integer comparison confirms every other metadata field is exact. Session.after, captured before abort, equals post-return metadata; abort did not introduce this already-observed change. Actual source handle **548** had successful suppression BOOL1, NTSTATUS/IOSB0 and qualified completion.

I independently parsed C's raw 60-byte frame: ALTERNATE_DATA, `:root:$DATA`, exact expected 18-byte payload/hash. Raw C SHA-256 is `72c4499f2a2cd104b6fc0864cf3db2992c1015ae3a2e51bc67e8d0ba0e156701`; raw B is empty. No unexpected frame or DATA content was accepted. All **266 post-input pins / 62,258,573 bytes** remain exact.

Python PID **52684** naturally exited0; explicit PS7 exited0, both drains completed, stderr is empty, and no termination/deadline was imposed. Zero means this diagnostic completed, not preservation success. Named custody hashes independently match:

| `namespace-r5-differential-preparation-20261015` suffix | Bytes | SHA-256                                                            |
| ------------------------------------------------------- | ----: | ------------------------------------------------------------------ |
| `.stdout.json`                                          |   245 | `d8c6b4471933608c1ea0014a2593d492fb0b2a9617bda96bbac393a8a382c735` |
| `.process.json`                                         | 1,568 | `9e555ba70091f3e839870e380c8c6c221d1964064f60f8e38f1e23b05fe1968f` |
| `.dispatch.json`                                        | 3,819 | `2e58307d0ba331f9a898448e515daaf397babffec7c779a175364ec63ef6dd2c` |

The release and dispatch preserve the preparation audit Root actually read before execution: `e730beef4f9455e2015cfc4eb7aff46d1c88cef093fab7022fb2f68078737481`. I subsequently shortened that audit before announcing its final hash, `8e6122530f8653fb7e338e7b39a981422e0e9292d7a13f04427ff49b92d36a1c`. Both approved identical corrected driver/descriptor pins. Root reports rereading the final version; its current hash independently matches. This records the sequence without retroactively changing the release pin or rerunning anything. Dispatch includes the exact three-line descriptor binding and accounts for260 new executable/custody lines under300, reused77 separately.

Fresh closed-history C reproduced ADS-associated export drift while A/B stayed stable. Prior seven-case activity is therefore unnecessary for this reproduction. This is interval association, not proof of an internal Windows handle or universal impossibility; timing/provider uncertainties remain.

**Stop this live-export repair route:** no R6 clone, equivalent suppression change, retry or further specimens. Preserve all evidence. Any alternative requires a separately concrete supported design; the failed original19 is not relabelled complete.
