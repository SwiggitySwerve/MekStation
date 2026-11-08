# Guard the GM control plane with one token-guarded state (K11)

## Why

The GM ledger control plane kept its preview, approval and manual-takeover
state in separate React `useState` hooks:

- "Generate correction" stayed enabled while an approval was in flight, and the
  approval's answer then marked whatever preview was on screen as approved.
- "Take manual control" never disabled after it ran.
- Saved intervention rows disappeared after the first action, because the rows
  were replaced by the session ledger's rows.
- An apply that threw left the "Ready for GM approval." status and an unhandled
  promise rejection.

On a co-op campaign the GM ledger page minted a second intervention id for the
host intent, so the host's saved history entry and the GM's session row could
never be recognised as the same intervention.

## What Changes

- `gmControlPlaneState.ts` holds one discriminated union (`idle`, `previewed`,
  `approving`, `applied`, `refused`, `blocked`, `failed`, `manual`), one
  transition map, and a token minted per generated preview. An action with a
  stale token, or one its phase does not accept, is refused and changes
  nothing. Dispatch answers synchronously, so a second click in one event turn
  is refused before it applies anything.
- While an approval is in flight neither a new preview nor a second approve is
  accepted. A refused approval may be retried. A failed (thrown) apply is
  terminal for its preview: the apply may have landed before it threw, so the
  GM generates a fresh preview first.
- Status text and every control's enabled state derive from the phase.
- The shown rows are the persisted rows merged with this session's rows by
  intervention id; the session row wins because it carries GM-private
  metadata. Older saves without an intervention id keep their rows.
- A manual takeover records once per preview, under an id carrying the
  preview token.
- The co-op ApplyGmIntervention intent carries the approval's own intervention
  id. The intent schema is unchanged; the host replays only committed intents
  by id, so a retry after a refusal still runs (pinned by a host test: exactly
  one FundsChanged).

No event, payload, wire-shape, schema or persisted-format change.

## Impact

- `src/components/campaign/gm/gmControlPlaneState.ts` (new)
- `src/components/campaign/gm/GmCampaignInterventionControlPlane.tsx`, `.helpers.ts`
- `src/components/campaign/gm/GmCampaignInterventionActions.tsx`
- `src/lib/campaign/coop/coopGmIntervention.ts`
