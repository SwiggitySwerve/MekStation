## Context

K4 PR #3012 added edit-sequence acknowledgments and the launch Resync return
check. This extraction starts at main 7c8579e19 and preserves those fixes, the
save chain, in-flight load publication, guarded-refresh generations, and co-op
rollback/refusal behavior.

## Decisions

The pure campaign save reducer owns the existing flat persistence snapshot.
Named events replace internal partial updates. The snapshot discriminates on
the existing saveState labels; dirty and recovery evidence remain reducer-owned
fields so existing selectors and direct test setup remain compatible. No second
copy of the state is introduced. Error and conflict variants carry their
required evidence, while other variants retain existing nullable evidence.

Promises, timers, HTTP calls, cache-key updates, campaign/roster installation,
and notifications remain orchestration in the existing store. The extraction
does not add state eligibility checks that would reject currently supported
save/load interleavings. Each event defines its admissible source states and
its resulting status; stale binding and payload guards keep their existing
position relative to effects. campaignSaveState.RULES.md owns the transition
contract and lists deliberate no-ops.

## Risks and compatibility

An old save acknowledgment must not erase later edits or replace a newer loaded
version. A typed host-token refusal retains pending changes, whereas a generic
co-op failure rolls back. A proven discard flush adopts its row token and then
still owes an ordinary acknowledged save. Characterization and existing race
suites pin these distinctions. Deferred bugs remain visible rather than being
silently fixed during extraction.

External direct store writes are intentionally still present for PR2. This
change centralizes internal transitions; it does not claim global enforcement
until those callers have been routed through actions.
