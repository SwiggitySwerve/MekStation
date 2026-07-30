## Context

The journal foundation deliberately exposes a raw server-internal persistence API. Production adoption needs a separate viewer boundary because current socket admission can occur before durable membership validation and a known match ID must never become read authority. The active GM/two-player umbrella already defines strong privacy and audit requirements; this wave makes them an explicit prerequisite rather than an assumption.

## Goals / Non-Goals

**Goals:**

- One durable server-derived viewer context before any authority access.
- Pre-serialization projection for every live and historical surface.
- Action lifecycle provenance without rejected gameplay facts.
- Separate player-safe and GM-private storage/retention classes.
- Executable negative privacy proof across raw and rendered surfaces.

**Non-Goals:**

- New identity providers, client-side redaction, or player-visible global authority positions.
- One immutable chain containing both public and private payloads.

## Decisions

### D1 — Membership produces the only viewer context

```ts
interface IAuthorizedViewer {
  kind: "viewer";
  principalId: string;
  campaignId: string;
  campaignSessionId: string;
  matchId: string | null;
  participantId: string;
  role: "gm" | "player";
  ownedForceIds: readonly string[];
  membershipRevision: number;
}

interface ISystemEffectPrincipal {
  kind: "system-effect";
  effectId: string;
  sourceStreamId: string;
  sourceBranchId: string;
  sourceEventId: string;
  sourceEffectiveGeneration: number;
  deliveryAdmissionToken: string;
  targetCampaignId: string;
  bindingRevision: number;
}
```

Verified identity plus durable active membership produces the viewer context. A socket is not attached and receives no replay until the lookup succeeds. Client-supplied role, actor, authority, campaign, match, or ownership fields are never accepted as authority. Every human command, history read, branch operation, timeline, and export rechecks the relevant active membership.

Internal outcome delivery uses a distinct non-serializable system-effect principal minted only after a leased outbox row is durably promoted to `admitted` against an unfenced source generation and authoritative source-to-target binding. It authorizes one effect ingestion at one target campaign, source effective generation, and delivery-admission token. It cannot attach a socket, read or render history, access private audit, submit another command kind, or impersonate a GM/player. Human membership revocation does not invalidate a committed admitted effect; binding, generation, or admission-token mismatch does.

### D2 — Raw records never cross serialization

`IEventJournal` and private-audit repositories remain infrastructure-internal. Application services accept `IAuthorizedViewer`, authorize the requested entity/stream against its campaign/session, project each event, assign a gapless viewer delivery sequence, and only then serialize. Projection failure sends no raw fallback.

### D3 — Action audit is separate from gameplay history

One append-once action-audit record captures session, command identity/digest, server-derived actor/authority, lifecycle state, safe reason code, correlation, timestamps, and any published receipt identity. Accepted actions link to committed batches. Rejected, vetoed, and timed-out actions append no gameplay event, outbox, projection, or viewer-sequence fact. Retried terminal identities return the existing action-audit record.

### D4 — Private detail has a separate lifecycle

Player-safe authority rows may contain an opaque, non-guessable reference to an access-controlled GM-private record, but player-visible digests never include private payload content. Every private lookup requires current membership/role authorization and records access. Private records are excluded from export by default and carry a configured retention class plus an erasure/redaction state. Lifecycle actions may remove or redact private detail without rewriting player-safe authority facts; the public record retains only its safe fact and opaque unavailable-reference state.

### D5 — Privacy proof spans objects, bytes, storage, and UI

Tests inspect the pre-serialization projected object, raw live/replay/recovery frames, snapshots, timeline/export output, browser history/storage, and DOM for GM-private reasons, hidden opponent facts, raw authority positions, secret event IDs, and inferable hidden-event gaps. A healthy authorized control proves the denial path is not merely empty output.

## Risks / Trade-offs

- [Membership lookup adds latency] → Cache only revision-bound membership decisions and invalidate them on membership change; never cache client role claims.
- [Audit records capture hostile input] → Store typed reason codes and digests by default; keep sensitive detail in the private class.
- [Private erasure weakens explanation] → Preserve the player-safe authority fact and an audited unavailable-detail marker without retaining the erased payload.
- [Projection fixes change old views] → Version projectors and verify live/replay/export parity for the same viewer.

## Migration Plan

1. Add membership-before-attachment tests and the typed viewer context.
2. Add action-audit and private-record storage with retention/access contracts.
3. Route all historical/live serialization through the viewer projector.
4. Add raw-to-rendered privacy matrices and three-context browser evidence.
5. Block combat/campaign journal cutover until every gate passes.

Rollback disables new journal admission, preserves player-safe facts and authorized audit records, and sends no raw fallback.

## Open Questions

Concrete retention durations remain deployment policy; storage classes, authorization, export defaults, and erasure/redaction mechanics are mandatory in this wave.
