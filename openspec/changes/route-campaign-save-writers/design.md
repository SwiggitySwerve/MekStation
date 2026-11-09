## Decisions

Start at fetched main 8ac5025ed, containing the PR1 reducer. Add three events to
that owner and three named actions in the persistence facade. Keep the existing
public fields and reset action. Do not add a shadow snapshot or persisted state.

Creation retains its unsettled-work guard, reset, and separate campaign-id
binding. Observers must still see the reset before the newly assigned id.
Day rollback retains its campaign-identity guard and all content restoration;
the persistence action owns the final conditional dirty restoration. A no-op
must dispatch nothing so subscribers see no additional notification.
Co-op cleanup retains reset, campaign restore, and snapshot restore in that
order. Snapshot restore itself neither resets coordination nor cancels timers:
the existing campaign install can arm a timer between reset and restoration.
Changing that behavior belongs to held PR3. Preserve all captured persistence
fields, including editSeq, version/fence evidence, diagnostics, and action refs
carried by the existing getState snapshot.

## Caller paths

| Path | PR2 handling |
| --- | --- |
| Wizard, solo, co-op host, guest mirror creation | Existing creation guard/reset, then named identity binding in useCampaignStore.actions |
| Day advancement or travel rollback | Existing identity/content restore guards, then named dirty restoration |
| Failed co-op create or cleanup retry | Existing acknowledged-id deletion and later-selection guards, then named captured-snapshot restore |
| Auto-save and close-time flush | Existing dirty/timer/flush behavior stays unchanged, including timers armed by restoration |
| Load, take-server, launch conflict, committed-command refresh | PR1 actions and ordering unchanged |
| Engine, AI, authoritative server/journal, P2P, simulation runner | No direct consumers of these browser persistence actions; no changes |

## Verification

Characterize all three creation modes and rollback dirty/no-op notifications
against main before adding actions. Add action tests and strengthen the existing
co-op cleanup test at its named-action boundary. Kill an omitted snapshot-restore
mutant. Existing dense campaign race tests remain byte-unchanged. Run full
campaign, campaign page-module, and integration directories, both TypeScript
configs, lint/format/unit-lint gates, strict OpenSpec, and the 57-test CI budget.

The campaign-list co-op test and two dashboard tests mock the old persistence
API while invoking the changed production callers. Add only the corresponding
named-action mock members, retaining their previous setter effects, and include
their complete test directories in verification. No product dashboard, readiness,
or launch UI code changes.
