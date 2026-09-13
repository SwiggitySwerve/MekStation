## 1. Vault/Campaign Boundary (first implementation wave; starts only after CAMP-01F/G/H merge — frozen-contract precondition)

- [ ] 1.1 Complete and verify the vault-side version contract, reusing existing custom-unit SQLite versions and explicitly admitting the pilot producer: monotonic published version on custom-unit (and pilot) saves, resolvable by `(vaultId, version)`; expose current version in the custom-unit index API.
- [ ] 1.2 Add `unitSource: 'canonical' | 'custom'` and `sourceVersion` to `IRosterUnitProjection` and the campaign creation flow; mint instance ids unconditionally.
- [x] 1.3 Preserve the resolved D3 identity seam in `CreateCampaignPage.submit.ts`: the former `UNIT_TEMPLATES` name/tonnage OR-match is absent, and root-force membership uses the minted instance id for every source. Add/retain a regression assertion before the vault boundary implementation wave so name/tonnage inference cannot return. (Bounded identity prerequisite only; parent evidence and live source 2026-09-12. It does not satisfy the exact-main receipt, approval, or three-witness gates and does not close remaining vault/campaign implementation tasks or prove runtime/production authority.)
- [ ] 1.4 Admit and implement the next `SerializedCampaign` provenance rung (v2→v3 unless a separately reviewed compatible alternative is chosen), preserving the existing v2 authority metadata: absent `unitSource` → legacy canonical; present-unrecognized → invalid/non-launchable (D4); migration tests both directions.
- [ ] 1.5 Re-digest the CAMP contract for the roster-shape change as its own declared, reviewed seam (`camp01-authority-receipt.contract.mjs` + affected wave rows).
- [ ] 1.6 Reconcile the living `openspec/specs/campaign-instances/spec.md` via this change's delta (archive flow) and cross-link `vault-campaign-boundary`.
- [ ] 1.7 Campaigns index: add the create/draw-from-vault entry (fixes the dead-end index — no CTA exists today) and the drift/refit-prompt affordance in the campaign mech bay (version drift surfaced, never auto-applied).
- [ ] 1.8 Context-ownership pass over navigation/IA: personal surfaces (My Units, Pilots, Customizer, player cards) show no campaign divergence; campaign surfaces operate on instances only.

## 2. Starmap Travel Economy

- [ ] 2.1 Route computation: duration (jumps + transit days) and itemized costs (fees + per-day operating cost) from campaign state; side-effect-free preview API returning duration/costs/arrival/affordability.
- [ ] 2.2 Commit path: extend `travelToSystem` to the preview→commit contract — advance campaign date through day-progression, post itemized finance transactions, arrival event updates `currentSystemId`, typed rejections (same-system, unknown, insufficient funds) with no state change.
- [ ] 2.3 Record travel commitment/arrival as campaign events sufficient for deterministic replay.
- [ ] 2.4 Opportunity model: anchor system, availability window, payload, provenance (`gm` | `generated`); seeded host-side generator recorded in events; expiry sweep with activity-log entries.
- [ ] 2.5 GM authoring surface for opportunities riding the existing GM authority/redaction model.
- [ ] 2.6 Acceptance flow: opportunity at anchor system within window → contract offer through the existing mission-contracts flow; opportunity consumed.
- [ ] 2.7 Coop: host-side generation mirrored to guests via existing sync projections; determinism test across host/guest.

## 3. Starmap Interface Surfaces

- [ ] 3.1 Route preview panel (duration, itemized costs, arrival date, affordability) wired to the preview API; side-effect-free.
- [ ] 3.2 Opportunity markers with window display on hover/selection; redaction-aware provenance.
- [ ] 3.3 Travel-in-progress rendering with second-commit suppression until arrival.
- [ ] 3.4 Update the existing travel-action tests to the new commit contract (the modified requirement's scenarios). Preview/commit source is not acceptance closure.

## 4. Isometric Battlefield View

- [ ] 4.1 Projection layer: hex→isometric transform with elevation extrusion; flat-shaded tiles + sprite/billboard tokens with facing (D7 — no per-unit 3D models).
- [ ] 4.2 Picking: isometric click → hex id inversion with shared parity tests against the 2D map (same click → same hex/unit identity).
- [ ] 4.3 Overlay parity: movement range, firing arcs, targeting rendered from the same underlying data as the 2D map.
- [ ] 4.4 View toggle with preserved selection/pending intents; persisted player preference; 2D remains default and fallback.
- [ ] 4.5 Performance: 30 FPS floor on 4v4 standard boards with degradation-over-drop; evaluate the existing SVG 2.5D renderer against this floor before considering a separately proposed replacement — any new dependency gets its own justification.

## 5. Verification

- [ ] 5.1 Jest coverage per spec scenario across all five capabilities (boundary immutability/provenance, travel time/cost/rejection, opportunity determinism/expiry/acceptance, interface preview/markers/progress, isometric parity/toggle).
- [ ] 5.2 E2E: campaign journey covering draw-from-vault → travel with costs → opportunity acceptance → mission launch; isometric toggle exercised in a combat journey.
- [ ] 5.3 Replay determinism test spanning travel + opportunity events; coop host/guest consistency test.
- [ ] 5.4 Strict OpenSpec + QC validation; spec-purpose lint; archive flow merges deltas into living specs.
