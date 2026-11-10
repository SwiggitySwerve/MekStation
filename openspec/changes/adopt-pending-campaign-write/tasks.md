## 1. Marker

- [x] 1.1 Add the pure `campaignPendingWrite.ts`: marker type, parse, derive and the load decision.
- [x] 1.2 Persist `pendingWrite` with the campaign copy in `useCampaignStore` partialize/merge.
- [x] 1.3 Derive the marker from the persistence store in the same task as the edit; record flush evidence before the request leaves.

## 2. Adoption

- [x] 2.1 Decide in `runLoad` before the cache verdict; add `pending-write-adopted` and `pending-write-conflicted`.
- [x] 2.2 Keep local and arm the ordinary save at the marker token; adopt a proven flush; otherwise conflict with no push and no replace.

## 3. Indicator

- [x] 3.1 `edited` and `flush-acknowledgement-owed` move `saved` to `idle`; sweep the invariant over event sequences.
- [x] 3.2 One derived badge in `CampaignSaveStatusCard`, including "Recovered unsaved changes" and a visibly failed save.
- [x] 3.3 Conflict card states the local and server dates and versions and offers only "Use Server Version".

## 4. Verify

- [x] 4.1 Decision table, reducer property, marker persistence, load adoption and card tests.
- [x] 4.2 Mutants run and restored: push on moved-on, push at the server's version, clear before acknowledgement, timestamp comparison, saved while dirty, discard in the conflict branch.
- [ ] 4.3 Run `e2e/campaign-pending-write-adoption.spec.ts` on a production build (C4 heavy slot).
- [ ] 4.4 Full `src/stores/campaign` and `src/__tests__` directories, trial merge and POST-MERGE check (C4).

## 5. Campaign-wide indicator and conflict edits

- [x] 5.1 Extract the existing badge derivation without changing behavior; verify the card.
- [x] 5.2 Add the accessible navigation indicator and dashboard-card anchor; cover every state and non-dashboard navigation.
- [x] 5.3 Suppress scheduling, manual/queued saves and flushes during pending-write conflict; explain unsent edits and resume after take-server.
- [x] 5.4 Run focused tests and the three requested mutants, restoring each; run light gates and campaign-store directory once.
- [x] 5.5 Update the implementation report and PR body, including the intended co-op label change and remaining OPEN items.
