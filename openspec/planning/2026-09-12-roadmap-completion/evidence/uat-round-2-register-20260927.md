# UAT round 2 register (opened 2026-09-27 by the task 32-37 triage)

Round 1's register (`evidence/uat-round-1-register-20260925.md`) is unchanged. This register lists what the combined triage of plan tasks 32-37 left open, and where each item is held. Source: `evidence/triage-32-37-20260927.md`.

## Owner decisions required (owner currently unavailable)

| Packet | Finding | Question |
|---|---|---|
| PK-triage-checkpoint-day-effects | FN-u96-day-effects-ride-the-checkpoint | Must every non-day co-op AdvanceDay effect be an independently replayable journal event, or may it stay authoritative only through the adopted checkpoint? |
| PK-triage-destroyed-roster-count | FN-u35g-kept-destroyed-units-in-guest-roster-count | Should the co-op Units count include Destroyed roster entries? |
| PK-triage-intervention-history-authority | FN-u97-history-not-in-journal | Is gmInterventionEvents authoritative history that must survive a journal-only rebuild? |

## Assigned to units

| Finding | Holder |
|---|---|
| FN-u94-resynced-mirror-convergence-clause-untrue-for-restricted-viewer | U99 |
| FN-u58-baseline-author-law-not-in-spec | U99 |
| FN-u35g-feed-reads-damaged-as-repaired | U100 |
| FN-u29-6-3-checked-but-scoped-tokens-not-on-production-path | U101 |
| FN-u34-closure-tool-tick-receipt-does-not-tick-live-row | U103 |
| FN-u95-launch-route-saga-read-always-null | U104 |
| FN-u96-guests-do-not-ack-snapshot-frames | U105 |
| FN-u34-e2e-31-32-tags-sit-on-neighbouring-headings | U53 (behavior amended) |
| FN-u29-skip-exception-shape, FN-u29-ladder-counts-skips-neutral | U57 |
| FN-u29-u54-sentence-names-only-e2e-45 | U54 admission |
| FN-u29-umbrella-numbering-errors | harden change archive pass |

## Resolved by proof

FN-u58-legacy-resync-tail-delivers-raw-snapshot (U94), FN-u95-duplicate-idle-host-per-live-session-resolved (U95), FN-u96-coop-host-client-routes-ledger-through-put (U96), FN-u29-manifest-diverges-from-council-decision-7-wording (U29; the manifest is exclusion inventory, not runtime proof).
