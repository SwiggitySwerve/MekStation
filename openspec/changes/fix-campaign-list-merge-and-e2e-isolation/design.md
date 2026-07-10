# Design: fix-campaign-list-merge-and-e2e-isolation

## Technical Approach

One product change and two test-hardening changes, all over data and fixtures that
already exist. The product change is a render-time list merge; the e2e changes wire
in an existing delete fixture and tighten one wait. The change is sequenced for a
single Codex worker as three task groups plus a verification group.

## Architecture Decisions

### Decision: D1 — Merge server summaries with the in-store campaign, deduped by id, server summary wins on collision

**Choice**: Replace the XOR at `src/pages/gameplay/campaigns/index.tsx:110-115`

```ts
const campaigns =
  campaignSummaries.length > 0
    ? campaignSummaries.map(summaryToEntry)
    : campaign
      ? [campaignToEntry(campaign)]
      : [];
```

with a union: map every server summary to an entry, then append the in-store
campaign **only when its id is not already present in the summaries**:

```ts
const summaryEntries = campaignSummaries.map(summaryToEntry);
const hasStoreCampaign =
  campaign && !campaignSummaries.some((s) => s.id === campaign.id);
const campaigns = hasStoreCampaign
  ? [...summaryEntries, campaignToEntry(campaign)]
  : summaryEntries;
```

**Rationale**: The list surface is a directory of the player's campaigns; it must
show both what is persisted on the server AND a campaign that is live in the store
but not yet saved. The XOR hid the latter whenever the DB was non-empty. Merging by
id is the minimum correct rule that surfaces every campaign exactly once.

**Tiebreak — server summary wins (the ONE choice, justified):** when a campaign id
exists in both sources, the rendered entry is the server summary, and the in-store
campaign is dropped for that id. Three reasons:

1. **Reload consistency.** After a reload the store campaign is re-hydrated from the
   server, so only summaries drive the list. Preferring the summary on collision
   makes the pre-reload and post-reload list render identically for a persisted
   campaign — no flicker of a store-shaped card into a summary-shaped card.
2. **The store campaign is an additive affordance, not an override.** Its only job
   here is to make the *not-yet-persisted* case visible. Once an id is persisted
   (present in summaries) the additive case no longer applies, so the summary is the
   authoritative representation — consistent with the existing "Multi-Campaign List
   And Switcher" requirement that the list sources its entries from the backend.
3. **Simplicity.** Server-wins needs only an id-presence check (`some((s) => s.id === campaign.id)`),
   with no per-field merge of the two differently-shaped entries (`summaryToEntry`
   carries `balance`; `campaignToEntry` carries `forcesCount`/`missionsCount`).

**Spec obligation**: the current list-surface requirements assume every listed
campaign is backend-persisted; a store-only campaign appearing in the list is new
behavior, so it is authorized by a new **ADDED** `campaign-management` requirement
rather than a silent code change.

### Decision: D2 — E2E isolation via the existing server-side delete fixture, plus a specific-card setup wait

**Choice**: In the four persisting specs (`campaign-flow`,
`campaign-subroute-recovery`, `campaign-starmap-logistics`,
`campaign-customizer-handoff`), add an `afterEach`/`finally` that calls the existing
`deleteCampaign` fixture (`e2e/fixtures/campaign.ts:346-353`, which clears the
client store then issues `DELETE /api/campaigns/<id>`) for each campaign the test
persisted, so each spec leaves the shared per-run DB clean. In `campaign.spec.ts`,
tighten the Detail-Page `beforeEach` (currently `campaign.spec.ts:222-226`, which
waits for **any** `[data-testid^="campaign-card-"]`) to wait for the **specific**
`campaign-card-<campaignId>` created in that setup.

**Rationale**: The root pollution is server-side (`getSQLiteService()` is one shared
DB for the whole run) and the delete fixture that fixes it already exists — wiring
it in is strictly less code than any new isolation primitive. The specific-card wait
is a diagnostic upgrade: if pollution ever recurs, setup fails at the wait with a
clear "the campaign I created never rendered" signal instead of passing on a
stranger's card and then timing out mysteriously inside a test body.

**Constraint**: cleanup must be resilient — `deleteCampaign` already tolerates a
`404` (idempotent) and a destroyed execution context (retries once); the
`afterEach` should not throw if the campaign is already gone (mirror the existing
`campaign.spec.ts:229-236` `try/catch`).

### Decision: D3 — Quick-play locators track the current labels; no product change

**Choice**: Two locator corrections in `e2e/quick-play.spec.ts`, no product edits.

1. **"start battle" → play options.** The review screen's launch control is now
   three buttons (`QuickGameReview.tsx:386-409`): `watch-ai-battle-btn`
   ("Watch AI Battle"), `interactive-skirmish-btn` ("Interactive Skirmish"), and
   `start-game-btn` (relabeled to "Auto-Resolve"). Replace the `/start battle/i`
   role-name assertion with `getByRole('button', { name: /auto-resolve/i })` (and
   optionally assert the two new option buttons by testid); rename the test from
   "should show start battle button" to reflect the play options.
2. **"Turns Played" disambiguation.** The results screen now renders two
   "Turns Played" labels — the Battle Statistics `<p>` (`QuickGameResultsSections.tsx`)
   and the new `QuickGameResultExplanation` `<dt>` — so `getByText(/turns played/i)`
   is a strict-mode violation. Disambiguate: scope to the Battle Statistics section,
   use `.first()`, or assert `toHaveCount(2)` (mirroring the jest
   `getAllByText('Turns Played')` already in `QuickGameResults.test.tsx`).

**Rationale**: Both underlying UI changes were intentional and already shipped; the
e2e spec simply lagged. Correcting the locators (not the product) is the honest fix —
these are test-rot, not regressions.

## Risks

- **R1 — Duplicate-card render on collision.** If the merge were an unconditional
  concat, a persisted-and-active campaign would render twice. Mitigation: the
  id-presence guard drops the in-store entry when the id is already in summaries
  (D1); the delta's "Duplicate id resolves to the server summary" scenario pins
  exactly-one-card.
- **R2 — `campaignToEntry` needs Map-shaped fields in the jest test.** The store
  path reads `campaign.forces.size` / `campaign.missions.size`, so the failing-first
  merge test's mock campaign must provide `forces` and `missions` as `Map`s (or
  `{ size }` stand-ins). Mitigation: called out in task 1.1.
- **R3 — Formatter/validator quote race.** Per repo memory, the double-quote
  formatter hook vs `oxfmt` single-quote can break token-matching QC validators.
  After the spec-delta edit, run `oxfmt` (or `npm run format`) + `openspec validate
  --strict`.
- **R4 — Cleanup masking a real persistence bug.** Server-side `afterEach` deletes
  could hide a spec that fails to persist. Mitigation: cleanup is `try/catch` and
  tolerates `404`, so a missing campaign is a no-op, not a false green; the specs'
  own in-body persistence assertions still gate correctness.
- **R5 — File-order proof.** Pollution is only reproducible in CI file order
  (`workers: 1`). The final verification runs
  `npx playwright test e2e/campaign-flow.spec.ts e2e/campaign.spec.ts
  --project=chromium --workers=1` **in that order** to prove `campaign.spec` is green
  after `campaign-flow` runs — the exact interaction that was red nightly.
