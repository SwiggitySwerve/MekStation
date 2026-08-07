# Proposal: Vault/Campaign Separation and the Campaign Map Experience

## Why

MekHQ — the domain reference — has no personal storage concept: everything lives inside one campaign save. MekStation's differentiator is a clear separation of function: an account-level personal vault of immutable, versioned templates (custom mech designs, pilots, player cards/progression) and campaigns that draw on the vault by taking **instance copies** — "the template created by the user, put in context where it becomes real." Today that separation is implemented inconsistently (thin live references, one dead snapshot spec, one fuzzy name/tonnage match that violates the frozen D1 design), and the campaign's strategic layer lacks the two surfaces that make a campaign feel real: a travel map with genuine time/expense consequences and a readable ground-combat battlefield. The 2026-08-06 council decision (`openspec/council-decisions/2026-08-06-player-vault-vs-campaign-state.md`, judge-VERIFIED) settled the state architecture; this change turns that decision plus the map experience into specs.

## What Changes

- Establish the **vault/campaign boundary** as a first-class capability: immutable versioned vault templates; campaign roster entries as instance copies carrying `unitRef`/`pilotId` + `unitSource` + `sourceVersion` provenance; campaign-local divergence (damage, refits, XP, wounds, death) owned entirely by the instance; explicit screen/menu ownership (personal context: My Units, Pilots, player cards, customizer; campaign context: mech bay, roster, contract market, missions, starmap).
- **Reconcile `campaign-instances`** to the shipped architecture per the council decision: the pilot half maps onto `ICampaignRosterEntry` (already implemented), the unit half becomes reference+provenance per D1 (`add-saved-custom-unit-campaign-roster/design.md:41-43`) — construction-payload snapshots are removed from the spec. **BREAKING (spec-level):** `CampaignUnitInstance`/`vaultUnitVersion` as specified are retired; no code change is breaking (those types were never implemented).
- Add **starmap travel economy**: travel on the campaign starmap consumes in-fiction time and campaign funds (jump/transit fees, daily operating costs), produces arrival consequences, and surfaces **dynamic opportunities** — GM-authored or randomly generated — as time-bound map affordances that resolve into contracts/missions.
- Extend the shipped **starmap-interface** display contract with route preview (time/cost before commit), opportunity markers, and travel-state rendering.
- Add an **isometric battlefield view**: a base-UI enhancement rendering the existing hex tactical model in an easy isometric 3D projection (elevation-aware tiles, unit tokens, facing), layered over — not replacing — the current 2D tactical map.
- Sequencing: implementation of all of the above begins **after CAMP-01F/G/H land** (frozen contract digests pin today's roster shape; council/Momus precondition).

## Capabilities

### New Capabilities
- `vault-campaign-boundary`: the personal-vault vs campaign-context separation — immutable versioned templates, instance-copy semantics with provenance, context ownership of screens/menus, and the template→instance flow ("becomes real").
- `starmap-travel-economy`: travel simulation on the campaign starmap — time advancement, jump/transit/daily costs against campaign finances, arrival effects, and dynamic opportunity generation (GM-authored and random) resolving into contracts.
- `isometric-battlefield-view`: isometric 3D presentation of ground combat over the existing hex tactical model — projection, elevation, tokens, selection/hover parity with the 2D map.

### Modified Capabilities
- `campaign-instances`: reconciled to the reference+provenance instance model (council decision); pilot instances named onto the shipped roster-entry shape; unit construction snapshots removed; `unitSource`/`sourceVersion` added.
- `starmap-interface`: display contract gains route/time/cost preview, opportunity markers, and travel-in-progress rendering.

## Impact

- **Types/state**: `IRosterUnitProjection` (+`unitSource`, `sourceVersion`), `ICampaignRosterEntry` (naming/spec reconciliation only), `SerializedCampaign` v1→v2 migration rung (`campaignMigration.ts` ladder), vault-side design version counter (producer for `sourceVersion`).
- **Screens**: personal context (My Units, Pilots, Customizer, player cards) vs campaign context (dashboard, mech bay, contract market, missions, starmap) — navigation/IA ownership declared per context; campaigns index gains the create/draw-from-vault flow.
- **Campaign systems**: `campaign-finances` (travel fees/daily costs post), `day-progression` (travel time), `mission-contracts` (opportunities resolve into contracts; no requirement change expected — integration via design), GM tooling (opportunity authoring).
- **Combat UI**: tactical map stack gains an isometric renderer consuming the same hex/terrain/unit state (`tactical-map-interface` untouched at requirement level; the isometric view is additive).
- **Frozen constraints honored**: D1 (no construction-payload duplication; no name/tonnage inference — the `CreateCampaignPage.submit.ts:158-160` fuzzy match is deleted by this work), CAMP-01 contract digests (implementation sequenced post-F/G/H), replay determinism (instances resolve stats by pinned version).
