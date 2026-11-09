## Decision and upstream evidence

Root approved D-5 on 2026-11-08, explicitly declining a Standard preset change.
Read MekHQ e7adc2c using git show in E:/Projects/Personal/mekhq, the clone named
by the supplied archive snapshot's PINS.md. DataLoadingDialog.java:454-455 calls
refreshApplicants(campaign, true) during new-campaign setup;
ForceHumanResources.java:1044-1048 bypasses the ordinary date restriction.
CampaignOption.java:995-996 defaults the personnel market to disabled.
MekStation preserves its existing daily generation rules and disabled default.

## Callers and authority

| Path | Behavior |
| --- | --- |
| Local wizard | Shared store create action seeds before publishing state and the first awaited save. |
| Co-op host create | Same action seeds before source-record persistence and match creation, with or without session metadata already attached. |
| Record persistence / journal authority | Both serializers retain offers. Server host and durable HireOffer read the saved source pool. Record rewrite removes consumed offers. |
| Co-op mirror projection | Host projection retains unconsumed offers; guest mirror creation never initializes a market. Guest delivery remains deferred. |
| Old-save load | No load-time generation or migration. Local first-open fallback initializes only an absent pool; co-op fallback remains refused. |
| Campaign day advance / fast-forward | Existing processor appends subsequent-day recruits; cadence, prices, attribute draws and expiry remain unchanged. |
| Multiplayer dispatch / browser host arbiter | Existing source-derived HireOffer admission and commit remain unchanged. |
| P2P | No market generation or translation fields are added. |
| Interactive combat / GameEngine phases / runToCompletion / QuickResolve / quick game / pre-battle auto-resolve / AI / standalone simulation | No campaign initialization is introduced into these paths. |

## Determinism and compatibility

The existing daily RNG isolates personnel rolls by campaign seed and UTC date.
The initializer uses that same stream. Offer IDs use campaign identity, resolved
seed, UTC date and candidate ordinal, consuming no extra random draws. Future
daily generated IDs also become deterministic; persisted IDs are never rewritten.
Absent legacy seeds retain the existing campaign-ID-derived fallback.

Markets remain source-record facts outside the journal authoritative-state
projection. No schema packs, payloads, persisted formats or historical fixtures
change. Existing empty pools stay empty, so hiring all recruits cannot cause
first-open replenishment. Disabled markets stay absent, including Standard, so
enabling a local market later still permits its first-open initialization.

## Validation

Test creation before save for local and host, both serializer round trips,
disabled Standard and guests, deterministic complete offers and unchanged
attribute rolls, local first-open compatibility, next-day carry-over, source-row
HireOffer and projection consumption. Kill removal of creation initialization and
restoration of ambient IDs. Run lane-mandated whole-directory and static gates;
any committed fixture or digest change is a stop condition.
