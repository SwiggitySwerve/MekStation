# Equipment values batch 2

Pinned MegaMek: 48fcb2f64a1b3f2d575707ce5653dad64927b587. Existing values only; no identities, entries, tech bases or dates change. Impacted BV and construction values precede unused BV corrections. All 249 old tech-base differences compare Java ALL availability with binary catalog identity; BOTH is parsed as Inner Sphere here. They require schema/identity review and are excluded.

| Catalog ID                    | Field         | Before | After | Pinned Java source                                                                                              |
| ----------------------------- | ------------- | -----: | ----: | --------------------------------------------------------------------------------------------------------------- |
| babattleclawmagnets           | battleValue   |      1 |   1.5 | equipment/MiscType.java:11693                                                                                   |
| long-tom                      | battleValue   |    226 |   329 | weapons/artillery/LongTomCannon.java:73                                                                         |
| protomagneticclamp            | battleValue   |      0 |     1 | equipment/MiscType.java:9401                                                                                    |
| vehicular-grenade-launcher    | battleValue   |      5 |    15 | weapons/mortars/VehicularGrenadeLauncherWeapon.java:87                                                          |
| sniper-rifle-hammel-marksman  | battleValue   |      0 |  0.28 | weapons/infantry/sniperRifle/InfantrySniperRifleHammelMarksman.java:67                                          |
| inarc-ammo                    | battleValue   |     21 |     0 | equipment/AmmoType.java:10816                                                                                   |
| nail-rivet-gun                | battleValue   |      0 |     1 | weapons/autoCannons/NailRivetGunWeapon.java:74                                                                  |
| ammo-nac-20                   | weight        |      1 |   0.4 | equipment/AmmoType.java:12495                                                                                   |
| ammo-nac-30                   | weight        |      1 |   0.8 | equipment/AmmoType.java:12551                                                                                   |
| ammo-nac-10                   | weight        |      1 |   0.2 | equipment/AmmoType.java:12467                                                                                   |
| ammo-barracuda                | weight        |      1 |    30 | equipment/AmmoType.java:12636                                                                                   |
| ammo-nac-25                   | weight        |      1 |   0.6 | equipment/AmmoType.java:12523                                                                                   |
| thumper-cannon                | weight        |     15 |    10 | weapons/artillery/ThumperCannon.java:76                                                                         |
| ammo-nac-40                   | weight        |      1 |   1.2 | equipment/AmmoType.java:12607                                                                                   |
| long-tom                      | weight        |     30 |    20 | weapons/artillery/LongTomCannon.java:71                                                                         |
| improved-large-laser          | weight        |      5 |     4 | weapons/lasers/clan/large/CLImprovedLaserLarge.java:72                                                          |
| small-re-engineered-laser     | weight        |    0.5 |   1.5 | weapons/lasers/innerSphere/small/ISReengineeredLaserSmall.java:69                                               |
| nail-rivet-gun                | weight        |      0 |   0.5 | weapons/autoCannons/NailRivetGunWeapon.java:72                                                                  |
| fluid-suction-system-standard | weight        |      0 |     1 | equipment/MiscType.java:7579; equipment/MiscType.java:7582                                                      |
| thumper-cannon                | criticalSlots |     15 |     7 | weapons/artillery/ThumperCannon.java:77                                                                         |
| thunderbolt-5                 | criticalSlots |      0 |     1 | weapons/missiles/thunderbolt/Thunderbolt5Weapon.java:48                                                         |
| thunderbolt-15                | criticalSlots |      0 |     3 | weapons/missiles/thunderbolt/Thunderbolt15Weapon.java:48                                                        |
| thunderbolt-10                | criticalSlots |      0 |     2 | weapons/missiles/thunderbolt/Thunderbolt10Weapon.java:48                                                        |
| long-tom                      | criticalSlots |     20 |    15 | weapons/artillery/LongTomCannon.java:72                                                                         |
| thunderbolt-20                | criticalSlots |      0 |     5 | weapons/missiles/thunderbolt/Thunderbolt20Weapon.java:48                                                        |
| fluid-gun                     | criticalSlots |      1 |     2 | weapons/other/innerSphere/ISFluidGun.java:65                                                                    |
| improved-large-laser          | criticalSlots |      2 |     1 | weapons/lasers/clan/large/CLImprovedLaserLarge.java:73                                                          |
| nail-rivet-gun                | criticalSlots |      0 |     1 | weapons/autoCannons/NailRivetGunWeapon.java:73                                                                  |
| risc-apds                     | criticalSlots |      4 |     2 | weapons/other/innerSphere/ISAPDS.java:65                                                                        |
| thumper-cannon                | heat          |      6 |     5 | weapons/artillery/ThumperCannon.java:68                                                                         |
| laser-ams                     | damage        |      0 |     3 | weapons/other/innerSphere/ISLaserAMS.java:67                                                                    |
| clan-ams                      | damage        |      0 |     2 | weapons/other/clan/CLAMS.java:67                                                                                |
| bombast-laser                 | damage        |     12 |    16 | weapons/lasers/innerSphere/ISBombastLaser.java:78                                                               |
| battlemech-taser              | damage        |      0 |     1 | weapons/other/innerSphere/ISMekTaser.java:75                                                                    |
| clan-laser-ams                | damage        |      0 |     3 | weapons/other/clan/CLLaserAMS.java:66                                                                           |
| fluid-gun                     | damage        |      2 |     0 | equipment/WeaponType.java:799,922 (inherited damage field/getter); weapons/other/innerSphere/ISFluidGun.java:58 |
| sniper-rifle-hammel-marksman  | damage        |      0 |  0.28 | weapons/infantry/sniperRifle/InfantrySniperRifleHammelMarksman.java:69                                          |
| small-re-engineered-laser     | damage        |      3 |     4 | weapons/lasers/innerSphere/small/ISReengineeredLaserSmall.java:60                                               |
| baheavybattleclawmagnets      | battleValue   |      1 |   1.5 | equipment/MiscType.java:11721                                                                                   |
| chain-whip                    | battleValue   |      5 | 5.175 | equipment/MiscType.java:3968                                                                                    |
| clan-streak-lrm-1             | battleValue   |      0 | 0.016 | equipment/AmmoType.java:8742                                                                                    |
| clan-streak-lrm-11            | battleValue   |      0 | 0.183 | equipment/AmmoType.java:8966                                                                                    |
| clan-streak-lrm-12            | battleValue   |      0 |   0.2 | equipment/AmmoType.java:8994                                                                                    |
| clan-streak-lrm-13            | battleValue   |      0 | 0.216 | equipment/AmmoType.java:9022                                                                                    |
| clan-streak-lrm-14            | battleValue   |      0 | 0.233 | equipment/AmmoType.java:9050                                                                                    |
| clan-streak-lrm-16            | battleValue   |      0 | 0.266 | equipment/AmmoType.java:9078                                                                                    |
| clan-streak-lrm-17            | battleValue   |      0 | 0.283 | equipment/AmmoType.java:9106                                                                                    |
| clan-streak-lrm-18            | battleValue   |      0 |   0.3 | equipment/AmmoType.java:9134                                                                                    |
| clan-streak-lrm-19            | battleValue   |      0 | 0.316 | equipment/AmmoType.java:9162                                                                                    |
| clan-streak-lrm-2             | battleValue   |      0 | 0.033 | equipment/AmmoType.java:8770                                                                                    |

## Field semantics

Java ALL describes shared availability; the catalog component type is binary (src/types/enums/TechBase.ts:17,45), and its loader parses BOTH as Inner Sphere. Java ISFlamer.java:83 sets ALL while the separate CLFlamer.java:80 sets CLAN. Therefore none of the 249 ALL-versus-binary differences is corrected to BOTH here.

PPC capacitor is deferred: MiscType.java:1323-1333 returns 88 when linked to a standard IS PPC, while :9722 gives base BV 0. Replacing that contextual value requires a separate linked-mount contract change. Every selected value is a fixed numeric fact.

## Fixed-source measurements

| Family      | Rows | Exact before | Exact after |
| ----------- | ---: | -----------: | ----------: |
| aerospace   |  620 |          413 |         414 |
| battlearmor | 1188 |          234 |         237 |
| battlemechs | 4263 |         4089 |        4089 |
| capital     |  394 |          145 |         145 |
| infantry    | 1820 |         1667 |        1667 |
| protomeks   |   86 |           74 |          82 |
| vehicles    | 1444 |         1019 |        1025 |

Fixed base: 589d3558912aa9ba440292c7f0218642eca03602. BV/status changes: 45. Lost exact rows: 0. Gained exact rows: 18.

Actual source handlers validate vehicles, BA, infantry, aerospace, capital and ProtoMechs. Mechs use UnitValidationOrchestrator with editor weight, armor and slot projections. Every one of the 9,815 source digests is joined to the same Java oracle row; loading and construction validity remain separate. Current validator agreement is measured, not assumed to be full Java legality.

Counts below are before -> after.

| Family      |   Both valid | Both invalid | Java valid only | Local valid only | Not loadable |
| ----------- | -----------: | -----------: | --------------: | ---------------: | -----------: |
| battlearmor | 1184 -> 1184 |       4 -> 4 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| aerospace   |   611 -> 611 |       9 -> 9 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| capital     |   350 -> 350 |     44 -> 44 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| infantry    | 1790 -> 1790 |     30 -> 30 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| battlemechs | 2595 -> 2599 |       3 -> 3 |    1662 -> 1658 |           3 -> 3 |       0 -> 0 |
| protomeks   |     85 -> 85 |       1 -> 1 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| vehicles    | 1420 -> 1420 |       9 -> 9 |          0 -> 0 |         15 -> 15 |       0 -> 0 |

Changed validity/diagnostic rows: 38. Full classifications and diagnostics are in unit-loading/CAT-SWEEP-2/summary.json.

Lost exact rows: 0.
Diagnostic changes affect 38 rows (BipedMek). Across those rows, 55 after messages and 48 before messages differ, including numeric changes in existing messages. The table below lists every validity-state change.

| Source validity change                             | Local before | Local after | Java valid |
| -------------------------------------------------- | ------------ | ----------- | ---------- |
| meks/3145/NTNU RS/Shockwave SKW-8X.mtf             | false        | true        | true       |
| meks/XTRs/Mercenaries/Schwerer Gustav.mtf          | false        | true        | true       |
| meks/XTRs/Republic III/Osprey OSP-36.mtf           | false        | true        | true       |
| meks/XTRs/Royal Fantasy/Vulpes VLP-1DX _Beast_.mtf | false        | true        | true       |

## CI expectation repair

Reproduced all three failed suites after one main merge (main fbcf6bba90f49fd389b06ef7d8e755e4b0659b9b). Hydration preserves Java manual-operation AMS damage. The zero-damage set is 129 minus three AMS records, Mek Taser and Hammel Marksman, plus Fluid Gun: 125. The value table above cites every changed fact.

On the same merged code, restoring only the 50 catalog scalars reproduces the old vehicle snapshot. After correction, BV-source residuals fall 160 to 159; unresolved equipment remains 447 and no unit is rejected. Only these 14 residual rows change (sheet BV / source-adapter BV):

| Catalog unit                                   | Before      | After       | Cited value           |
| ---------------------------------------------- | ----------- | ----------- | --------------------- |
| aithon-assault-transport                       | 1440 / 1563 | 1543 / 1666 | LongTomCannon.java:73 |
| bardiche-heavy-strike-tank                     | 1369 / 1410 | agree       | AmmoType.java:10816   |
| destrier-siege-vehicle                         | 2440 / 2693 | 2599 / 2852 | LongTomCannon.java:73 |
| gulltoppr-omnimonitor-b                        | 2450 / 2702 | 2608 / 2861 | LongTomCannon.java:73 |
| gulltoppr-omnimonitor-prime                    | 2977 / 3072 | 3056 / 3151 | LongTomCannon.java:73 |
| mobile-long-tom-artillery-+carriagesunofficial | 1252 / 904  | 1411 / 904  | LongTomCannon.java:73 |
| mobile-long-tom-artillery-lt-mob-25            | 693 / 283   | 796 / 283   | LongTomCannon.java:73 |
| mobile-long-tom-artillery-lt-mob-25f           | 584 / 266   | 687 / 266   | LongTomCannon.java:73 |
| mobile-long-tom-artillery-lt-mob-95            | 1129 / 781  | 1288 / 781  | LongTomCannon.java:73 |
| padilla-tube-artillery-tank-ltc                | 718 / 882   | 821 / 985   | LongTomCannon.java:73 |
| paladin-defense-system                         | 1406 / 845  | 1564 / 845  | LongTomCannon.java:73 |
| rommel-tank-howitzer-production                | 1119 / 1242 | 1222 / 1345 | LongTomCannon.java:73 |
| rommel-tank-howitzer-prototype                 | 1199 / 1383 | 1315 / 1498 | LongTomCannon.java:73 |
| sm2-heavy-artillery-vehicle-ltc                | 1098 / 1303 | 1201 / 1406 | LongTomCannon.java:73 |

Five Long Tom artillery rows above (four mobile-long-tom-artillery variants and paladin-defense-system) retain a pre-existing native Long Tom to cannon identity mismatch. This snapshot records the residuals; it does not establish their correctness. No alias or frozen owner changes are included. Fixed-source BV/validity tables remain the original paired measurement; CI repairs change tests only.
