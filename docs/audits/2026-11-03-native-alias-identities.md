# Native lookup identity corrections (follow-up 79)

Pinned MegaMek: 48fcb2f64a1b3f2d575707ce5653dad64927b587. Exact catalog IDs are preserved. The 14 corrected native identities have identical Java lookup ownership for UNKNOWN, ALL, IS and CLAN. No catalog values change.

Of the prior 139 mismatches: 9 proven fixes, 103 unrepresented/ambiguous catalog identities and 27 tech-context-dependent names. Of the 188 review cases: 120 unambiguously correct identities, 5 proven fixes, 33 unrepresented/ambiguous identities and 30 tech-context-dependent names. Every case and its Java lookup modes is classified in unit-loading/FU-79/decisions.json. Unrepresented means no unique existing representation has been proved.

| Native name               | Previous target                   | Correct target                               | Java identity / source                                                                   |
| ------------------------- | --------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| CLERFlamer                | clan-flamer                       | clan-er-flamer                               | CLERFlamer; weapons/flamers/clan/CLERFlamer.java:57                                      |
| IS Heavy Machine Gun Ammo | clan-heavy-machine-gun-ammo-proto | heavy-machine-gun-ammo-full                  | IS Heavy Machine Gun Ammo - Full; equipment/AmmoType.java:6853                           |
| IS Light Machine Gun Ammo | clan-light-machine-gun-ammo-proto | light-machine-gun-ammo-full                  | IS Light Machine Gun Ammo - Full; equipment/AmmoType.java:6722                           |
| IS Machine Gun Ammo       | clan-machine-gun-ammo-proto       | ammo-mg-full                                 | IS Ammo MG - Full; equipment/AmmoType.java:6582                                          |
| IS Narc Beacon            | narcbeacon                        | narc                                         | ISNarcBeacon; weapons/other/innerSphere/ISNarc.java:53                                   |
| ISERFlamer                | flamer                            | er-flamer                                    | ER Flamer; weapons/flamers/innerSphere/ISERFlamer.java:57                                |
| ISNarcBeacon              | narcbeacon                        | narc                                         | ISNarcBeacon; weapons/other/innerSphere/ISNarc.java:53                                   |
| NovaCEWS                  | watchdog-cews                     | nova-combined-electronic-warfare-system-cews | NovaCEWS; equipment/MiscType.java:6187                                                   |
| Small VSP Laser           | basmallvsplaser                   | small-vsp-laser                              | ISSmallVSPLaser; weapons/lasers/innerSphere/small/ISVariableSpeedPulseLaserSmall.java:57 |
| IS LB 10-X AC Ammo        | clan-lb-10-x-ac                   | lb-10-x-ammo                                 | IS LB 10-X AC Ammo; equipment/AmmoType.java:5432                                         |
| IS LB 2-X AC Ammo         | clan-lb-2-x-ac                    | lb-2-x-ammo                                  | IS LB 2-X AC Ammo; equipment/AmmoType.java:5370                                          |
| IS LB 20-X AC Ammo        | clan-lb-20-x-ac                   | lb-20-x-ammo                                 | IS LB 20-X AC Ammo; equipment/AmmoType.java:5464                                         |
| IS LB 5-X AC Ammo         | clan-lb-5-x-ac                    | lb-5-x-ammo                                  | IS LB 5-X AC Ammo; equipment/AmmoType.java:5401                                          |
| IS Streak SRM 2 Ammo      | clan-streak-srm-2                 | streak-srm-ammo                              | IS Streak SRM 2 Ammo; equipment/AmmoType.java:10617                                      |

## Context-dependent names: unchanged

Java selects different IS and Clan identities for these generic names. A global correction would misresolve one context. They need a separate context-aware alias change; no generic name is forced to the default Java identity here. Full mode ownership and current targets are in the classification artifact.

`Heavy Machine Gun Array`, `Light Machine Gun Array`, `LRM 10 (OS)`, `LRM 15 (OS)`, `LRM 20 (OS)`, `LRM 5 (OS)`, `LRT 10`, `LRT 10 (OS)`, `LRT 15`, `LRT 15 (OS)`, `LRT 20`, `LRT 20 (OS)`, `LRT 5`, `LRT 5 (OS)`, `Machine Gun Array`, `SRM 2 (OS)`, `SRM 4 (OS)`, `SRM 6 (OS)`, `SRT 2`, `SRT 2 (OS)`, `SRT 4`, `SRT 4 (OS)`, `SRT 6`, `SRT 6 (OS)`, `Streak SRM 2 (OS)`, `Streak SRM 4 (OS)`, `Streak SRM 6 (OS)`, `Arrow IV Ammo`, `Artemis IV FCS`, `CASE`, `CASE II`, `Double Heat Sink`, `LB 10-X AC Ammo`, `LB 10-X Cluster Ammo`, `LB 2-X AC Ammo`, `LB 2-X Cluster Ammo`, `LB 20-X AC Ammo`, `LB 20-X Cluster Ammo`, `LB 5-X AC Ammo`, `LB 5-X Cluster Ammo`, `LRM 10 Ammo`, `LRM 15 Ammo`, `LRM 20 Ammo`, `LRM 5 Ammo`, `MASC`, `Partial Wing`, `SRM 2 Ammo`, `SRM 4 Ammo`, `SRM 6 Ammo`, `Streak SRM 2 Ammo`, `Streak SRM 4 Ammo`, `Streak SRM 6 Ammo`, `Targeting Computer`, `Ultra AC/10 Ammo`, `Ultra AC/2 Ammo`, `Ultra AC/20 Ammo`, `Ultra AC/5 Ammo`.

## CAT-Q2 generator and identity review

Retain these mappings until a matching catalog identity is generated or independently proved. Grouped names share the current target and required Java identity.

| Native names                                      | Current target              | Required Java identity             |
| ------------------------------------------------- | --------------------------- | ---------------------------------- |
| BABattleMechNIU                                   | babattlemechniu             | BABattleMechNIU                    |
| Clan Gauss Ammo                                   | gauss-ammo                  | Clan Gauss Ammo                    |
| Clan LRM 5 (OS)                                   | balrm5-os                   | CLLRM5 (OS)                        |
| Clan SRM 2 (OS)                                   | basrm2-os                   | CLSRM2 (OS)                        |
| Clan SRM 4 (OS)                                   | basrm4-os                   | CLSRM4 (OS)                        |
| Clan SRM 6 (OS)                                   | basrm6-os                   | CLSRM6 (OS)                        |
| IS BA LRM 1, ISBALRM1                             | balrm1                      | ISBALRM1                           |
| IS BA LRM 2, ISBALRM2                             | balrm2                      | ISBALRM2                           |
| IS BA LRM 3, IS BA LRM3, ISBALRM3                 | balrm3                      | ISBALRM3                           |
| IS BA LRM 4, ISBALRM4                             | balrm4                      | ISBALRM4                           |
| IS BA LRM1 OS, ISBALRM1OS                         | balrm1os                    | ISBALRM1OS                         |
| IS BA LRM2 OS, ISBALRM2OS                         | balrm2os                    | ISBALRM2OS                         |
| IS BA LRM3 OS, ISBALRM3OS                         | balrm3os                    | ISBALRM3OS                         |
| IS BA LRM4 OS, ISBALRM4OS                         | balrm4os                    | ISBALRM4OS                         |
| IS BA SRM 1, ISBASRM1                             | basrm1                      | ISBASRM1                           |
| IS BA SRM 3, ISBASRM3                             | basrm3                      | ISBASRM3                           |
| IS BA SRM 5, ISBASRM5                             | basrm5                      | ISBASRM5                           |
| IS BA SRM1 OS, ISBASRM1OS                         | basrm1os                    | ISBASRM1OS                         |
| IS BA SRM5 OS, ISBASRM5OS                         | basrm5os                    | ISBASRM5OS                         |
| IS MRM 1, ISMRM1, MRM 1                           | bamrm1                      | MRM 1                              |
| IS MRM 2, ISMRM2, MRM 2                           | bamrm2                      | MRM 2                              |
| IS MRM 3, ISMRM3, MRM 3                           | bamrm3                      | MRM 3                              |
| IS MRM 4, ISMRM4, MRM 4                           | bamrm4                      | MRM 4                              |
| IS MRM 5, ISMRM5, MRM 5                           | bamrm5                      | MRM 5                              |
| IS SRT 2, ISSRT2                                  | srt2                        | SRT 2                              |
| IS SRT 4, ISSRT4                                  | srt4                        | SRT 4                              |
| IS SRT 6, ISSRT6                                  | srt6                        | SRT 6                              |
| ISBAHeavyMG                                       | baheavymg                   | ISBAHeavyMachineGun                |
| ISC3RemoteSensorLauncher                          | c3-master                   | ISC3RemoteSensorLauncher           |
| ISHMGA                                            | hmga                        | ISHMGA                             |
| ISLBXAC10Prototype                                | lb-10-x-ac                  | ISLBXAC10Prototype                 |
| ISLMGA                                            | lmga                        | ISLMGA                             |
| ISLRTorpedo10                                     | lrtorpedo10                 | LRT 10                             |
| ISLRTorpedo15                                     | lrtorpedo15                 | LRT 15                             |
| ISLRTorpedo20                                     | lrtorpedo20                 | LRT 20                             |
| ISLRTorpedo5                                      | lrtorpedo5                  | LRT 5                              |
| ISMediumPulseLaserPrototype                       | medium-pulse-laser          | ISMediumPulseLaserPrototype        |
| ISMGA                                             | mga                         | ISMGA                              |
| ISSRM4OS                                          | srm-4                       | ISSRM4OS                           |
| LRM 10 (I-OS)                                     | lrm10-ios                   | LRM 10 (I-OS)                      |
| LRM 15 (I-OS)                                     | lrm15-ios                   | LRM 15 (I-OS)                      |
| LRM 2 (OS)                                        | balrm2os                    | CLLRM2OS                           |
| LRM 20 (I-OS)                                     | lrm20-ios                   | LRM 20 (I-OS)                      |
| LRM 3 (OS)                                        | balrm3os                    | CLLRM3OS                           |
| LRM 4 (OS)                                        | balrm4os                    | CLLRM4OS                           |
| LRM 5 (I-OS)                                      | lrm5-ios                    | LRM 5 (I-OS)                       |
| LRT 10 (I-OS)                                     | lrtorpedo10-ios             | LRT 10 (I-OS)                      |
| LRT 15 (I-OS)                                     | lrtorpedo15-ios             | LRT 15 (I-OS)                      |
| LRT 20 (I-OS)                                     | lrtorpedo20-ios             | LRT 20 (I-OS)                      |
| LRT 5 (I-OS)                                      | lrtorpedo5-ios              | LRT 5 (I-OS)                       |
| Machine Gun (Light)                               | balightmg                   | Machine Gun (Light)                |
| MRM 1 (OS)                                        | bamrm1os                    | MRM 1 (OS)                         |
| MRM 2 (OS)                                        | bamrm2os                    | MRM 2 (OS)                         |
| MRM 3 (OS)                                        | bamrm3os                    | MRM 3 (OS)                         |
| MRM 4 (OS)                                        | bamrm4os                    | MRM 4 (OS)                         |
| MRM 5 (OS)                                        | bamrm5os                    | MRM 5 (OS)                         |
| MRM-1                                             | mrm-1                       | MRM 1                              |
| MRM-2                                             | mrm-2                       | MRM 2                              |
| MRM-3                                             | mrm-3                       | MRM 3                              |
| MRM-4                                             | mrm-4                       | MRM 4                              |
| MRM-5                                             | mrm-5                       | MRM 5                              |
| Narc (I-OS)                                       | narcbeacon-i-os             | ISNarcBeacon (I-OS)                |
| Narc (OS)                                         | narcbeacon-os               | ISNarcBeacon (OS)                  |
| Sniper                                            | sniper-cannon               | ISSniper                           |
| SRM 1 (OS)                                        | basrm1os                    | CLSRM1OS                           |
| SRM 2 (I-OS)                                      | srm2-ios                    | ISSRM2IOS                          |
| SRM 3 (OS)                                        | basrm3-os                   | CLSRM3OS                           |
| SRM 4 (I-OS)                                      | srm4-ios                    | ISSRM4IOS                          |
| SRM 5 (OS)                                        | basrm5os                    | CLSRM5OS                           |
| SRM 6 (I-OS)                                      | srm6-ios                    | ISSRM6IOS                          |
| SRT 2 (I-OS)                                      | srt2-ios                    | ISSRT2IOS                          |
| SRT 4 (I-OS)                                      | srt4-ios                    | ISSRT4IOS                          |
| SRT 6 (I-OS)                                      | srt6-ios                    | ISSRT6IOS                          |
| Streak SRM 2 (I-OS)                               | streaksrm2-ios              | ISStreakSRM2IOS                    |
| Streak SRM 4 (I-OS)                               | streaksrm4-ios              | ISStreakSRM4IOS                    |
| Streak SRM 6 (I-OS)                               | streaksrm6-ios              | ISStreakSRM6IOS                    |
| Clan Ammo MG - Full, Clan Machine Gun Ammo - Full | ammo-mg-full                | Clan Machine Gun Ammo - Full       |
| Clan Ammo MG - Half, Clan Machine Gun Ammo - Half | machine-gun-ammo-half       | Clan Machine Gun Ammo - Half       |
| Clan Heavy Machine Gun Ammo - Full                | heavy-machine-gun-ammo-full | Clan Heavy Machine Gun Ammo - Full |
| Clan Heavy Machine Gun Ammo - Half                | heavy-machine-gun-ammo-half | Clan Heavy Machine Gun Ammo - Half |
| Clan Light Machine Gun Ammo - Full                | light-machine-gun-ammo-full | Clan Light Machine Gun Ammo - Full |
| Clan Light Machine Gun Ammo - Half                | light-machine-gun-ammo-half | Clan Light Machine Gun Ammo - Half |
| CLArmoredMotiveSystem                             | armoredmotivesystem         | CLArmoredMotiveSystem              |
| CLArrowIVAmmo                                     | arrowivammo                 | CLArrowIVAmmo                      |
| CLArtemisIV                                       | artemisiv                   | CLArtemisIV                        |
| CLCASE                                            | case                        | CLCASE                             |
| CLCASEII                                          | caseii                      | CLCASEII                           |
| CLLRM1, LRM 1                                     | clan-lrm-1                  | CLLRM1                             |
| CLRotaryAC10                                      | rotaryac10                  | CLRotaryAC10                       |
| CLRotaryAC20                                      | rotaryac20                  | CLRotaryAC20                       |
| IS LB 2-X Cluster Ammo                            | clan-lb-2-x-cluster         | IS LB 2-X Cluster Ammo             |
| IS LB 5-X Cluster Ammo                            | clan-lb-5-x-cluster         | IS LB 5-X Cluster Ammo             |
| IS Streak SRM 4 Ammo                              | clan-streak-srm-4           | IS Streak SRM 4 Ammo               |
| IS Streak SRM 6 Ammo                              | clan-streak-srm-6           | IS Streak SRM 6 Ammo               |
| LRT 10 Ammo                                       | ammo-lrtorpedo-10           | Clan Ammo LRTorpedo-10             |
| LRT 15 Ammo                                       | ammo-lrtorpedo-15           | Clan Ammo LRTorpedo-15             |
| LRT 20 Ammo                                       | ammo-lrtorpedo-20           | Clan Ammo LRTorpedo-20             |
| LRT 5 Ammo                                        | ammo-lrtorpedo-5            | Clan Ammo LRTorpedo-5              |
| Rocket Launcher 1                                 | rl1                         | ISBARL1                            |
| Rocket Launcher 2                                 | rl2                         | ISBARL2                            |
| Rocket Launcher 3                                 | rl3                         | ISBARL3                            |
| Rocket Launcher 4                                 | rl4                         | ISBARL4                            |
| Rocket Launcher 5                                 | rl-5                        | ISBARL5                            |
| SRT 2 Ammo                                        | ammo-srtorpedo-2            | Clan Ammo SRTorpedo-2              |
| SRT 4 Ammo                                        | ammo-srtorpedo-4            | Clan Ammo SRTorpedo-4              |
| SRT 6 Ammo                                        | ammo-srtorpedo-6            | Clan Ammo SRTorpedo-6              |

## Fixed-source measurements

| Family      | Rows | Exact before | Exact after |
| ----------- | ---: | -----------: | ----------: |
| aerospace   |  620 |          413 |         413 |
| battlearmor | 1188 |          234 |         234 |
| battlemechs | 4263 |         4080 |        4089 |
| capital     |  394 |          145 |         145 |
| infantry    | 1820 |         1667 |        1667 |
| protomeks   |   86 |           74 |          74 |
| vehicles    | 1444 |         1019 |        1019 |

Fixed base: ced22e7eb8fe8eb1106460e05daf0a75bf0c6c6e. Joined rows: 9815. Changed BV/status: 19. Lost exactness: 0.

The 25-API snapshot covers 42527 names. It changes 471 API results for 35 spellings of the 14 native identities, including existing mount qualifiers and the converted is-streak-srm-2-ammo spelling. No unrelated name or catalog ID changes. Lost exact rows: 0.
