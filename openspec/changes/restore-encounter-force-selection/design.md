## Context

Encounter detail already renders player and opponent force slots and links empty
slots to
`/gameplay/encounters/[id]/select-force?type=player|opponent`. The Pages Router
route does not exist, so both documented recovery paths terminate at the
framework 404 page. The underlying server and store boundaries are already
present:

- `useForceStore.loadForces()` reads existing forces from `/api/forces`.
- `useEncounterStore.setPlayerForce()` and `setOpponentForce()` use the
  side-specific encounter APIs and reload hydrated encounters after success.
- `useEncounterStore.validateEncounter()` recomputes launch readiness.
- `encounterRouteIdentityFromRouter()` recovers a concrete encounter id and
  optional campaign/mission linkage even while `router.query` still contains
  dynamic placeholders.

This change repairs one route seam. It must preserve current force and encounter
models, make failure and recovery legible, and prove persistence with more than
a screenshot.

## Goals / Non-Goals

**Goals:**

- Make both existing detail-page selection links resolve to one side-aware
  route.
- Select an existing force through the current API/store authority boundary
  while preserving the other encounter slot.
- Distinguish loading, empty, invalid-side, missing-encounter, save-error, and
  success states.
- Return to the same encounter after the server accepts the assignment and
  validation has been refreshed.
- Provide keyboard, touch, desktop, and narrow-screen behavior that is directly
  testable.
- Prove the selected raw force id and hydrated force survive navigation and a
  cold reload.

**Non-Goals:**

- Creating or editing a force inside this route.
- Replacing the force, encounter, validation, or persistence stores.
- Changing launch rules, OpFor generation, mission materialization, or combat
  behavior.
- Adding a dependency or introducing a new API.

## Decisions

### D1 - One strict side-aware Pages Router route

`src/pages/gameplay/encounters/[id]/select-force.tsx` SHALL resolve the encounter
with `encounterRouteIdentityFromRouter()` and parse `type` into the closed union:

```ts
type EncounterForceSide = 'player' | 'opponent';

interface IEncounterForceSelectionRoute {
  readonly encounterId: string;
  readonly side: EncounterForceSide;
  readonly campaignId: string | null;
  readonly missionId: string | null;
}
```

Missing or unsupported `type` values render a recoverable invalid-link state and
perform no write. The route does not infer a side. The return URL is built from
the resolved encounter id and preserves recognized `campaignId` and `missionId`
query values.

Alternative considered: add two pages, one per side. Rejected because both
flows have identical loading, selection, error, and proof contracts and would
drift.

### D2 - Existing side-specific store actions remain the write authority

The page loads the encounter and force stores, finds the hydrated encounter by
its durable id, and dispatches exactly one of:

```ts
setPlayerForce(encounterId, forceId);
setOpponentForce(encounterId, forceId);
```

These actions call the existing side-specific APIs, which update only the
requested slot and then reload encounter state. The UI SHALL NOT mutate Zustand
state directly and SHALL NOT send a broad encounter replacement object. After a
successful assignment, it awaits `validateEncounter(encounterId)` before
navigating back. A failed assignment stays on the page, preserves the candidate
list, exposes the store error, and allows retry.

Alternative considered: use the generic encounter `PATCH` endpoint. Rejected
because the side-specific actions already express the narrow write intent,
preserve the other slot, and are independently testable.

### D3 - Route state and presentation stay separate

The route owns identity resolution, store loading, save state, validation, and
navigation. A focused presentational component owns the heading, current slot
summary, candidate list, and state-specific recovery controls:

```text
SelectEncounterForceRoute
`-- EncounterForceSelectionPage
    |-- SelectionContext
    |-- ForceCandidateList
    |   `-- ForceCandidate
    `-- SelectionStatus
```

The component consumes existing `IEncounter` and `IForce` types. It does not
introduce a second force-summary model. Candidate summaries derive name, status,
assigned unit count, total Battle Value, and readiness from `IForce`.

Alternative considered: reuse `ForceCard` with an `onClick` wrapper. Rejected as
the default because its Card click surface is not a semantic selection control.
The new list SHALL use native buttons or an explicit button inside each summary
so keyboard and disabled-saving behavior are unambiguous.

### D4 - Empty and failed states keep recovery close

If no forces exist, the page shows an honest empty state with a link to
`/gameplay/forces/create` and a link back to the encounter. It does not claim
that a slot was assigned. Encounter-not-found and load-error states retain a
route back to the encounter list. The save-error message uses an alert/live
region and selection controls remain available for retry.

The candidate list is one column on narrow screens and may use a denser
multi-column layout at desktop widths. Every selection target is at least 44
CSS pixels high, supports visible focus, exposes the force name in its accessible
name, and is disabled while its assignment request is pending.

### D5 - Proof crosses route, API, store, and reload boundaries

The blocking browser journey SHALL:

1. open an encounter with empty slots through its concrete route;
2. follow the real player selection link and assign an existing force;
3. inspect the side-specific request and the raw encounter API force id;
4. confirm the detail page hydrates the chosen force while the opponent slot is
   unchanged;
5. repeat for the opponent side;
6. cold reload and prove both raw ids and hydrated summaries remain;
7. exercise the no-force state without treating the create-force link as a
   successful assignment.

Screenshots are supporting visual evidence only. The request/response, store
rehydration, raw API values, navigation, and cold-reload assertions are the
authority proof.

## Risks / Trade-offs

- [A force can be deleted between list load and selection] -> The existing API
  rejects the assignment; keep the page open, surface the error, and reload
  candidates on retry.
- [Both stores expose independent loading/error state] -> Derive the page state
  explicitly from both stores and keep the assignment-pending flag local so one
  store cannot falsely imply the other completed.
- [A generated OpFor and explicit opponent force are different modes] -> This
  route assigns only an explicit opponent force and does not clear or rewrite
  unrelated encounter data beyond the behavior of the existing
  `setOpponentForce` service.
- [A stale selected force remains visible during a request] -> Disable all
  selection controls and announce the pending assignment until the authoritative
  reload completes.
- [The create-force route cannot automatically return with a new force in this
  slice] -> Preserve an explicit back-to-encounter path and leave creation
  handoff automation to a later focused change.

## Migration Plan

This is an additive page and test change. No data or schema migration is needed.
Deploy the route after focused component/store tests and the blocking browser
journey pass. Rollback removes the new route and registrations; the existing
encounter and force data remain unchanged.

## Open Questions

None for this wave. Automatic return from force creation and editing a currently
assigned force remain deliberately separate product decisions.
