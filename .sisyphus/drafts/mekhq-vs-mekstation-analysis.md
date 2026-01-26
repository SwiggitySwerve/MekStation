# MekHQ vs MekStation — Exhaustive Codebase Comparison

> **Status**: COMPLETE — All 14 exploration agents finished
> **Date**: January 2026
> **Scope**: Full codebase analysis of MekHQ (Java/Swing, 1,316 source files) vs MekStation (Next.js/React/TypeScript, ~25,726 lines)

---

## Executive Summary

**MekHQ** is a mature, 15+ year Java/Swing campaign management application with extraordinary depth across 19+ major subsystems, 700+ configurable options, 453 GUI files, 100+ enum classes, and deep simulation of mercenary company life — from marriage and procreation to planetary logistics and faction diplomacy.

**MekStation** is a modern web-based BattleTech toolkit (Next.js, React, TypeScript, Zustand, SQLite) that implements approximately **35-40% of MekHQ's campaign feature set** but significantly exceeds MekHQ in unit construction, web accessibility, P2P collaboration, event sourcing, and modern UI/UX.

### The Gap at a Glance

| Dimension | MekHQ | MekStation |
|-----------|-------|------------|
| Source files | 1,316 Java files | ~400 TypeScript files |
| Campaign options | 700+ configurable settings | 40 settings |
| GUI surface area | 453 files, 12 tabs, 100+ dialogs | Modern SPA, ~30 pages/views |
| Personnel depth | 150+ files, 37 statuses, 360+ roles | ~10 files, 9 statuses, 9 roles |
| Skill types | 40+ skills, 150+ SPAs, 200+ quirks | Gunnery + piloting, basic abilities |
| Enum classes | 100+ enums | ~10 enums |
| Parts/repair | 128 part classes, full repair pipeline | Basic repair tracking |
| Test suite | Moderate | 11,000+ tests |
| Platform | Desktop only (Java/Swing) | Web + Desktop (Electron) |
| Architecture | Campaign.java hub (~1500 lines) | Zustand stores + services |
| Persistence | XML save files | SQLite + IndexedDB + Event sourcing |

---

## Feature Comparison Matrix

### Legend
- **MekStation ONLY** — Feature exists only in MekStation
- **MekStation AHEAD** — Both have it, MekStation is more complete
- **PARITY** — Roughly equivalent implementation
- **PARTIAL** — MekStation has a basic version
- **MekHQ AHEAD** — Both have it, MekHQ is more complete
- **MekHQ FAR AHEAD** — MekHQ has deep implementation vs MekStation's basic one
- **MekHQ ONLY** — Feature exists only in MekHQ

### Unit Construction & Reference

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 1 | **Unit Construction** | Via MegaMekLab (separate app) | ✅ Built-in customizer, all TechManual rules, drag-drop criticals | **MekStation AHEAD** | MekStation integrates construction directly; MekHQ requires launching a separate application |
| 2 | **Unit Compendium** | Via MegaMek data files | ✅ 4,200+ canonical units with search/filter/era | **PARITY** | Both draw from same MegaMek data |
| 3 | **Equipment Database** | Via MegaMekLab | ✅ Full equipment DB with drag-drop, formulas, variable equipment | **MekStation AHEAD** | Integrated browser with category filtering |
| 4 | **Record Sheets** | Via MegaMekLab PDF export | ✅ SVG rendering + PDF export using MegaMek templates | **PARITY** | Both produce official-format record sheets |
| 5 | **Unit Comparison** | Not built-in | ✅ Multi-unit side-by-side comparison workspace | **MekStation ONLY** | BV, cost, weapons, capabilities analysis |
| 6 | **Format Import/Export** | Full MTF/BLK/MUL support | ✅ MTF + BLK import/export with parity validation | **PARITY** | MekStation includes automated parity checking against MegaMek |
| 7 | **Battle Value** | Full BV 2.0 | ✅ Full BV 2.0 per TechManual | **PARITY** | Both implement complete BV 2.0 calculation |
| 8 | **Construction Validation** | Full TechManual rules | ✅ 50+ validation rules, 10 configuration types | **PARITY** | Both validate against TechManual rules |

### Campaign Core

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 9 | **Campaign Management** | ✅ Campaign.java (~1500 lines), full lifecycle | ✅ MVP with 40 options, basic operations | **MekHQ FAR AHEAD** | MekHQ: 700+ options vs MekStation: 40 |
| 10 | **Campaign Options** | ✅ 700+ settings across 15 GUI tabs | ✅ 40 essential options | **MekHQ FAR AHEAD** | MekHQ has 17.5x more configurable options |
| 11 | **Campaign Presets** | ✅ Full preset system (save/load configurations) | ❌ Not implemented | **MekHQ ONLY** | Pre-built campaign configurations |
| 12 | **Day Advancement** | ✅ CampaignNewDayManager: maintenance, training, travel, events, healing, markets, contracts, morale, fatigue | ✅ Basic: healing, contract processing, maintenance costs | **MekHQ FAR AHEAD** | MekHQ processes 20+ systems per day vs MekStation's 3-4 |
| 13 | **Campaign Persistence** | ✅ XML save files | ✅ SQLite + IndexedDB + event sourcing | **DIFFERENT APPROACH** | MekStation's event sourcing enables audit trail and replay |

### Personnel

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 14 | **Personnel System** | ✅ Person.java: 150+ fields, 37 statuses, 360+ roles | ✅ IPerson: 45 fields, 9 statuses, 9 roles | **MekHQ FAR AHEAD** | MekHQ tracks blood type, personality, family, education, loyalty, fatigue |
| 15 | **Skills System** | ✅ 40+ skill types with progression, aging effects, XP costs, linked attributes | ✅ Gunnery + piloting (2 skills), basic XP | **MekHQ FAR AHEAD** | MekHQ: Administration, Negotiation, Leadership, Tactics, Medicine, Tech skills, etc. |
| 16 | **Special Abilities (SPAs)** | ✅ 150+ SPAs: tech specializations, flaws, compulsions, mutations, dark secrets, admin abilities, madness | ❌ Basic abilities with effect types | **MekHQ FAR AHEAD** | MekStation has the framework but few abilities defined |
| 17 | **Personality System** | ✅ 200+ personality quirks: Aggression, Ambition, Greed, Social, Reasoning traits with 5 levels each | ❌ Not implemented | **MekHQ ONLY** | Affects interactions, morale, turnover |
| 18 | **Character Creation** | ✅ ATOW life path system, random generators, portrait management, origin faction/planet | ❌ Basic pilot creation with templates (Green/Regular/Veteran/Elite) | **MekHQ FAR AHEAD** | MekHQ: full life path character generation |
| 19 | **NPC Generation** | ✅ Multiple personnel generators with faction/era awareness | ❌ Not implemented | **MekHQ ONLY** | OpFor callsign generation, random personnel |
| 20 | **Ranks** | ✅ Full rank system with faction-specific ranks, custom rank creation, time-in-rank tracking | ❌ Basic rank field only | **MekHQ ONLY** | MekHQ: promotion rules, rank prerequisites |
| 21 | **Awards** | ✅ 13 auto-award categories (contract, faction hunter, injury, kill, formation, rank, scenario, skill, theatre, time, training, misc) | ✅ 5 award categories with criteria, progress tracking, 100+ medals defined | **PARTIAL** | MekStation has good framework; MekHQ has more award types and auto-awarding |
| 22 | **Attributes** | ✅ 8 ATOW attributes used in skill checks, aging, ability prerequisites | ✅ 8 attributes (STR, BOD, REF, DEX, INT, WIL, CHA, Edge) 1-10 scale | **PARTIAL** | MekStation defines them but doesn't use them deeply yet |

### Personnel Life Simulation

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 23 | **Injuries/Medical** | ✅ Advanced: diseases, prosthetics, MASH theatres, surgery, natural healing, random diseases, kinder healing options, 25 max patients per doctor | ✅ Basic injury tracking with healing days and severity | **MekHQ FAR AHEAD** | MekHQ: prosthetic limbs, disease system, MASH capacity |
| 24 | **Family/Relationships** | ✅ Marriage, divorce, procreation, genealogy: surname styles, maternity leave, fertility, family tree viewer, mutual ancestor checking | ❌ Not implemented | **MekHQ ONLY** | Full life simulation with baby surname options, due dates |
| 25 | **Education** | ✅ Academy system: entrance exams, faculty XP, curriculum rates, dropout chances, military academy accidents, reeducation camps | ❌ Not implemented | **MekHQ ONLY** | Full education module with local and prestigious academies |
| 26 | **Death System** | ✅ Random death by age group, suicide cause option, death multiplier, 15+ death causes (KIA, homicide, wounds, disease, old age, pregnancy complications, suicide, etc.) | ❌ Basic KIA status only | **MekHQ ONLY** | MekHQ models natural death, medical complications |
| 27 | **Turnover/Retention** | ✅ Full: fatigue, retirement, defection, loyalty, HR strain, service contracts, founder tracking, custom modifiers (faction, family, mission status, hostile territory) | ❌ Not implemented | **MekHQ ONLY** | Affects personnel retention and unit stability |
| 28 | **Morale** | ✅ Victory/defeat effects on unit morale, decisive victory bonuses | ❌ Not implemented | **MekHQ ONLY** | Linked to combat outcomes |
| 29 | **Prisoners** | ✅ Full prisoner system: capture styles, escape artist, ransom events, prisoner events (6 dialog types), reeducation, defection offers | ❌ Not implemented | **MekHQ ONLY** | Complex prisoner management with events |

### Force Organization

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 30 | **Force Management** | ✅ Full hierarchy (lance→company→battalion→regiment), combat roles (7 types), operational status, layered force icons | ✅ Tree structure with parent/child, unit assignments, commander, force types, formation levels | **PARTIAL** | MekStation has the structure; MekHQ has richer metadata |
| 31 | **TOE (Table of Organization)** | ✅ Dedicated TOE tab with drag-drop, context menus, transport handler | ✅ Force tree component | **MekHQ AHEAD** | MekHQ: full TOE management UI with transfer handler |
| 32 | **Combat Teams** | ✅ Lance assignments with combat roles (Maneuver, Frontline, Patrol, Training, Auxiliary, Cadre, Reserve) | ❌ Not implemented | **MekHQ ONLY** | Affects scenario generation and deployment |

### Missions, Contracts & Scenarios

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 33 | **Missions** | ✅ Full mission lifecycle: active, success, partial, failed, breach; mission viewer (54KB) | ✅ Mission CRUD with 8 statuses | **MekHQ AHEAD** | MekHQ: richer mission tracking and reporting |
| 34 | **Contracts** | ✅ Full: 19 contract types (Garrison, Planetary Assault, Guerrilla Warfare, Pirate Hunting, Assassination, Espionage, etc.), command rights (4 types), payment negotiation | ✅ Basic: 5 contract types (Garrison, Recon, Raid, Extraction, Escort), employer/target, payment terms, salvage rights | **MekHQ FAR AHEAD** | MekHQ: 19 contract types vs MekStation's 5 |
| 35 | **Contract Market** | ✅ 3 market methods (None, AtB Monthly, CamOps), search radius, variable length, dynamic difficulty | ✅ Basic random contract generation | **MekHQ FAR AHEAD** | MekHQ: sophisticated market simulation |
| 36 | **Scenario Generation** | ✅ 25+ scenario types, AtB dynamic factory, scenario modifiers, weather/light/planetary conditions, OpFor lance tables | ✅ Basic scenario templates (Duel, Skirmish, Battle, Custom) | **MekHQ FAR AHEAD** | MekHQ: massive scenario generation system |
| 37 | **Scenario Resolution** | ✅ Full resolution wizard (88KB dialog), loot, salvage, XP, injuries, prisoner handling | ✅ ACAR auto-resolve + battle result processing | **DIFFERENT APPROACH** | MekHQ resolves via MegaMek; MekStation uses abstract resolution |
| 38 | **StratCon** | ✅ Full strategic conquest: hex map, force deployment, facility control, reinforcements, resupply, scenario generation | ❌ Not implemented | **MekHQ ONLY** | Entire strategic layer with dedicated tab |

### Finances

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 39 | **Financial System** | ✅ Full: 27 transaction types, loans, assets, financial institutions, taxes, shares, price multipliers (Clan/IS/Mixed/Used/Damaged), rented facilities, financial year durations | ✅ Basic: transaction recording, balance tracking, maintenance/repair/salary costs | **MekHQ FAR AHEAD** | MekHQ: 27 transaction types vs MekStation's ~7 |
| 40 | **Loans** | ✅ Full loan system: terms (biweekly→annually), year durations, loan limits, collateral, principal tracking | ❌ Basic loan flag only | **MekHQ ONLY** | Full financial instrument simulation |
| 41 | **Salary System** | ✅ Full: role-based salaries, XP multipliers, anti-Mek multiplier, specialist infantry multiplier, secondary role salary | ✅ Basic salary per person | **MekHQ FAR AHEAD** | MekHQ: 360+ role-specific base salaries |
| 42 | **Mercenary Economics** | ✅ Full: equipment contracts, DropShip/JumpShip/WarShip percentages, BLC, diminishing contract pay, overage repayment | ❌ Not implemented | **MekHQ ONLY** | Complex mercenary contract economics |
| 43 | **Reports** | ✅ 11 report types (Cargo, Hangar, Maintenance, Monthly Unit Cost, News, Part Quality, Personnel, Reputation, Transport, Unit Rating) | ❌ Not implemented | **MekHQ ONLY** | Detailed campaign reporting system |

### Parts, Repair & Logistics

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 44 | **Parts System** | ✅ 128 part classes: armor, ammunition, weapons (by type), actuators, engines, gyros, heat sinks, jump jets, sensors, cockpits, life support, battle armor parts, vehicle parts, aerospace parts | ✅ Basic repair items: armor, structure, component repair/replace | **MekHQ FAR AHEAD** | MekHQ models every individual part as an object |
| 45 | **Repair Workflow** | ✅ Full: tech assignment, repair time, skill checks, MRMS (Mass Repair/Mass Salvage), quality maintenance, rush jobs, carryover, scrap impossible | ✅ Repair jobs with status tracking, cost/time calculation, priority sorting | **MekHQ FAR AHEAD** | MekHQ: tech skill checks affect repair quality |
| 46 | **Part Quality** | ✅ 6 quality grades (A-F), quality-based maintenance, random unit qualities, reverse quality names | ❌ Not implemented | **MekHQ ONLY** | Part quality affects reliability |
| 47 | **Salvage** | ✅ Full salvage operations, CamOps salvage rules, salvage force/tech pickers, post-scenario salvage | ✅ Basic salvage inventory with salvaged parts | **MekHQ FAR AHEAD** | MekHQ: dedicated salvage UI and rules |
| 48 | **Supply Chain** | ✅ Full: planetary acquisition (faction limits, jump radius, tech/industry/output bonuses), acquisition waiting periods, auto-logistics percentages per equipment type | ❌ Not implemented | **MekHQ ONLY** | Planetary-aware supply system |
| 49 | **Maintenance** | ✅ Full: maintenance cycles (configurable days), maintenance bonus, quality maintenance, planetary modifiers, unofficial maintenance, logging | ✅ Basic daily maintenance cost calculation | **MekHQ FAR AHEAD** | MekHQ: complex maintenance simulation |

### Markets

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 50 | **Unit Market** | ✅ Monthly market with rarity (7 levels: Mythic→Ubiquitous), 6 market types (Open, Employer, Mercenary, Factory, Black Market, Civilian), regional Mek variations | ❌ Not implemented | **MekHQ ONLY** | Complex unit availability simulation |
| 51 | **Personnel Market** | ✅ 4 market styles (Disabled, MekHQ, CamOps Revised, CamOps Strict), hiring hall restriction | ❌ Not implemented | **MekHQ ONLY** | Personnel recruitment marketplace |
| 52 | **Parts Store** | ✅ Full parts store with procurement, availability checks, tech level restrictions | ❌ Not implemented | **MekHQ ONLY** | Buy parts for repairs |
| 53 | **Ship Search** | ✅ Ship search system: cost (100K C-bills), search length (4 weeks), target numbers for DropShip/JumpShip/WarShip, weighted selection tables | ❌ Not implemented | **MekHQ ONLY** | Search for transport vessels |

### Universe & Lore

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 54 | **Planetary System** | ✅ Full: planets with HPG ratings, faction borders, socio-industrial ratings, climate, population, tech sophistication | ❌ 15 canonical systems (contract generation only) | **MekHQ ONLY** | Full universe simulation |
| 55 | **Interstellar Map** | ✅ Full interactive map (64KB panel): jump radius, planetary acquisition radius, contract search radius, color-coded systems | ❌ Not implemented | **MekHQ ONLY** | Dedicated map tab with navigation |
| 56 | **Faction System** | ✅ Full: faction standing with accolades/censures/ultimatums, regard tracking, 20+ faction standing effects (negotiation, resupply, command circuit, recruitment, contract pay, etc.) | ❌ Employer/target faction IDs only | **MekHQ ONLY** | 11 faction standing dialog files |
| 57 | **Reputation** | ✅ Dragoon rating (F→A*), CamOps reputation methods, reputation performance modifiers | ❌ Not implemented | **MekHQ ONLY** | Affects contract availability and pay |
| 58 | **Era System** | ✅ Full era management with faction intro dates, tech availability by era | ✅ Era filtering for equipment and units | **PARTIAL** | MekStation uses eras for filtering; MekHQ for gameplay |
| 59 | **News System** | ✅ Universe news generation, news dialog, news report | ❌ Not implemented | **MekHQ ONLY** | In-universe news feed |
| 60 | **Transport/Logistics** | ✅ Full: ship transport, tactical transport, tow transport, jump costs, transit time, DropShip/JumpShip contracts | ❌ Not implemented | **MekHQ ONLY** | Unit transport between star systems |

### Narrative & Events

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 61 | **Story Arcs** | ✅ Branching narrative system: 14 story point types, 11 triggers, story arc selection/panels, narrative dialogs | ❌ Not implemented | **MekHQ ONLY** | Full branching narrative engine |
| 62 | **Random Events** | ✅ Full: personality events, prisoner events (escape, ransom, warning), life events (births, coming of age, celebrations), Gray Monday, Ronin events | ❌ Not implemented | **MekHQ ONLY** | 76+ campaign event types |
| 63 | **Nag/Warning System** | ✅ 24 nag dialog types: financial warnings (5), personnel (5), unit (3), HR, deployment, faction, StratCon, contract | ❌ Not implemented | **MekHQ ONLY** | Proactive campaign health warnings |
| 64 | **Resupply System** | ✅ Full: abandoned convoys, interception, itinerary, player convoy options, swindled events, resupply focus, roleplay events | ❌ Not implemented | **MekHQ ONLY** | 9 resupply dialog files |

### MekStation Advantages

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 65 | **Web Application** | ❌ Desktop only (requires Java) | ✅ Full Next.js web app, any modern browser | **MekStation ONLY** | No installation required |
| 66 | **P2P Multiplayer** | ❌ No real-time collaboration | ✅ Yjs/WebRTC sync engine, room codes, offline queue, conflict resolution | **MekStation ONLY** | Collaborative campaign editing |
| 67 | **Event Sourcing** | ❌ Mutable state + XML save | ✅ Full event store with causality tracking, event categories, sequence numbers | **MekStation ONLY** | Complete audit trail of every change |
| 68 | **Game Replay** | ❌ No replay capability | ✅ Turn-by-turn battle replay from event store | **MekStation ONLY** | Review past battles |
| 69 | **Vault System** | ❌ Local files only | ✅ Vault folders, permissions, share links, contacts, version history | **MekStation ONLY** | Cloud-like sharing and collaboration |
| 70 | **Docker Support** | ❌ No containerization | ✅ Full Docker deployment | **MekStation ONLY** | Easy server deployment |
| 71 | **PWA** | ❌ No | ✅ Progressive Web App (partial) | **MekStation ONLY** | Offline-capable web app |
| 72 | **Modern UI** | Java Swing (dated) | ✅ React 19 + Tailwind CSS 4 | **MekStation AHEAD** | Modern responsive design |
| 73 | **Test Suite** | Moderate coverage | ✅ 11,000+ tests | **MekStation AHEAD** | Comprehensive automated testing |
| 74 | **Built-in Unit Customizer** | Requires separate MegaMekLab app | ✅ Integrated with drag-drop, live validation, version history | **MekStation AHEAD** | Seamless construction experience |
| 75 | **Unit Comparison** | Not available | ✅ Multi-unit side-by-side workspace | **MekStation ONLY** | Compare BV, cost, weapons, capabilities |
| 76 | **Accessibility** | Basic Java accessibility | ✅ Accessibility store, haptic feedback, gesture support | **MekStation AHEAD** | Modern a11y patterns |
| 77 | **Auto-Updates** | Manual download | ✅ Electron auto-updates | **MekStation AHEAD** | Seamless update experience |

### Platform & Infrastructure

| # | Feature Area | MekHQ | MekStation | Coverage | Notes |
|---|---|---|---|---|---|
| 78 | **Desktop App** | ✅ Native Java application | ✅ Electron (Windows, macOS, Linux) | **BOTH** | Different platforms |
| 79 | **I18N/Localization** | ✅ 238 resource files, full i18n | ❌ English only | **MekHQ ONLY** | MekHQ supports multiple languages |
| 80 | **Storybook** | ❌ No component library | ✅ Component library at localhost:6006 | **MekStation ONLY** | Visual component development |

---

## Architecture Comparison

### MekHQ Architecture

```
Campaign.java (1,500+ lines) — Central hub
├── CampaignOptions.java (700+ settings)
├── Person.java (150+ fields)
├── Unit.java + 128 Part subclasses
├── Force.java (tree hierarchy)
├── Mission.java / Contract.java
├── Finances.java (27 transaction types)
├── CampaignNewDayManager.java (daily simulation)
├── AtBConfiguration.java (scenario generation)
├── StratconCampaignState.java (strategic conquest)
├── PersonnelMarket / UnitMarket / ContractMarket
├── StoryArc / StoryPoint / StoryTrigger
├── FactionStanding / Reputation
├── Planetary / InterstellarMap / HPG
└── 453 GUI files (Swing)
```

**Key Patterns:**
- Monolithic Campaign object aggregates everything
- Event-driven with listeners
- XML serialization for persistence
- Swing UI with context menus and tabbed interface
- 238 i18n resource files

### MekStation Architecture

```
Zustand Stores (50+ stores)
├── useCampaignStore (40 options)
│   ├── usePersonnelStore
│   ├── useForcesStore
│   └── useMissionsStore
├── useUnitStore + Registry (per unit instance)
├── usePilotStore
├── useEncounterStore
├── useGameplayStore
└── useRepairStore

Services (100+ services)
├── CampaignInstanceStateService (state + events)
├── ForceService (CRUD + hierarchy)
├── PilotService (CRUD + XP + advancement)
├── EquipmentRegistry (4,200+ items)
├── UnitFactoryService + 15 TypeHandlers
├── UnitValidationOrchestrator + 50+ rules
├── EventStoreService (audit trail)
├── VaultService (P2P sharing)
├── RecordSheetService (PDF generation)
└── Conversion services (MTF/BLK)

Types (150+ type files)
├── ICampaign, IPerson, IForce, IMission, IContract
├── IPilot, ISpecialAbility, IAward
├── IBattleMech + 15 unit type interfaces
├── IRepairJob, ISalvageInventory
├── IBaseEvent<T> (causality tracking)
└── All equipment/construction types
```

**Key Patterns:**
- Composition over inheritance (IEntity, ITechBaseEntity, ITemporalEntity)
- Singleton services via createSingleton factory
- Repository pattern for data access
- Event sourcing with causality chains
- Zustand stores with IndexedDB persistence
- Store registry for managing multiple unit instances

---

## Data Model Depth Comparison

### Person/Personnel

| Field Category | MekHQ (Person.java) | MekStation (IPerson) |
|---|---|---|
| Identity | Name, callsign, gender, blood type, portrait, biography | Name, callsign, gender, blood type, portrait, biography |
| Career | Rank, recruitment date, missions, kills, awards, time-in-service, time-in-rank | Rank, recruitment date, missions, kills, awards |
| Skills | 40+ skill types with progression and aging | Gunnery + piloting + campaign skill framework |
| Attributes | 8 ATOW attributes (used in checks) | 8 attributes (defined but underutilized) |
| SPAs | 150+ special abilities, flaws, mutations, compulsions, madness | Basic ability framework |
| Personality | Aggression, Ambition, Greed, Social, Reasoning (5 levels each) | ❌ Not implemented |
| Family | Spouse, children, genealogy, ancestors, family display level | ❌ Not implemented |
| Medical | Advanced injuries, diseases, prosthetics, MASH, surgery, healing | Basic injuries with healing days |
| Education | Academy, curriculum, entrance exam, faculty, dropout | ❌ Not implemented |
| Loyalty | Loyalty tracking, hidden loyalty, morale modifiers | ❌ Not implemented |
| Fatigue | Fatigue rate, injury fatigue, field kitchen, thresholds | ❌ Not implemented |
| Status Count | 37 statuses (Active→Camp Follower) | 9 statuses (Active→Deserted) |
| Role Count | 360+ roles (combat + support + 300 civilian) | 9 roles |

### Campaign Options

| Category | MekHQ Options | MekStation Options |
|---|---|---|
| General | ~20 (name, faction, date, rating) | ~5 (name, faction, date) |
| Repair & Maintenance | ~25 (MRMS, quality, planetary mods, margin) | ~3 (repair cost toggle) |
| Equipment & Supplies | ~30 (acquisition, auto-logistics, planetary acquisition) | ~2 (acquisition cost toggle) |
| Personnel | ~60 (abilities, edge, implants, age effects, blob crew, prisoners, dependents) | ~5 (healing rate, salary) |
| Finances | ~40 (pay toggles, price multipliers, taxes, shares, rented facilities) | ~5 (starting funds, cost toggles) |
| Markets | ~25 (personnel, unit, contract market settings) | ❌ |
| Advancement | ~20 (XP costs, scenario/kill XP, vocational XP) | ~3 (XP awards) |
| Turnover/Retention | ~40 (fatigue, retirement, loyalty, HR, payout) | ❌ |
| Relationships | ~30 (marriage, divorce, procreation, surnames, dice sizes) | ❌ |
| Biography/Life | ~25 (randomization, personalities, education, death) | ❌ |
| Skills | ~10 (skill configuration) | ~2 (skill levels) |
| Abilities | ~5 (SPA configuration) | ❌ |
| Salaries | ~10 (role salaries, XP multipliers) | ~1 (salary amount) |
| Awards | ~20 (auto-awards, 13 category toggles) | ❌ |
| Systems/AtB | ~50 (StratCon, scenarios, morale, faction standing, auto-resolve) | ❌ |
| **TOTAL** | **~700+** | **~40** |

---

## GUI Surface Area Comparison

### MekHQ GUI (453 files)

**12 Main Tabs:**
1. Command Center (dashboard)
2. TOE (Table of Organization & Equipment)
3. Briefing Room (missions/scenarios)
4. StratCon (strategic conquest)
5. Interstellar Map
6. Personnel
7. Hangar (unit inventory)
8. Warehouse (parts/cargo)
9. Repair Bay
10. Infirmary
11. Mek Lab (unit customization)
12. Finances

**100+ Dialog Windows** including:
- Campaign Options (20 tabs, 700+ settings)
- Character Creation (80KB)
- Scenario Resolution Wizard (88KB)
- GM Tools (71KB)
- Personnel Customization (94KB)
- Contract/Personnel/Unit Markets
- Family Tree Viewer
- 24 Nag/Warning Dialogs
- 11 Report Dialogs
- 8 Random Event Dialogs
- 9 Resupply Dialogs
- 11 Faction Standing Dialogs
- 6 StratCon Dialogs
- 3 Salvage Dialogs

**32 Table Models** for data display
**11 Mouse Adapters** for context menus (PersonnelTableMouseAdapter: 279KB!)
**22 Column Sorters**
**14 View Panels** (PersonViewPanel: 141KB)

### MekStation GUI (~30 pages/views)

**Primary Pages:**
- Compendium (unit browser)
- Unit Builder (customizer with 5 tabs)
- Unit Comparison
- Force Builder
- Pilot Management
- Campaign Dashboard
- Encounter Setup
- Quick Play
- Game Replay
- Vault (sharing)
- Settings

**Components:** React components with Tailwind CSS, accessible design, gesture support

---

## Enum Comparison

### MekHQ: 100+ Enum Classes

**Personnel Enums (most complex):**
- PersonnelStatus: 37 values (Active, MIA, POW, On Leave, Maternity Leave, AWOL, Retired, KIA, Homicide, Wounds, Disease, Suicide, Seppuku, Camp Follower, etc.)
- PersonnelRole: 360+ values (combat roles + 300 civilian professions)
- AgeGroup: 7 values (Elder→Baby)
- BloodGroup: 12 values (with Rh factor)

**Mission Enums:**
- AtBContractType: 19 values (Garrison, Planetary Assault, Guerrilla Warfare, Pirate Hunting, Assassination, Espionage, etc.)
- ScenarioStatus: 11 values (Current, Decisive Victory→Decisive Defeat, Fleet in Being, Refused Engagement)
- CombatRole: 7 values
- ContractCommandRights: 4 values
- AtBMoraleLevel: 7 values (Routed→Overwhelming)

**Finance Enums:**
- TransactionType: 27+ values
- FinancialTerm: 5 values
- FinancialYearDuration: 6 values

**Market Enums:**
- UnitMarketRarity: 7 values (Mythic→Ubiquitous)
- UnitMarketType: 6 values
- PersonnelMarketStyle: 4 values

**Parts Enums:**
- PartQuality: 6 grades (A-F)
- PartRepairType: 14 types

### MekStation: ~10 Enum Types

- PersonnelStatus: 9 values (Active, Wounded, MIA, KIA, Retired, On Leave, Student, AWOL, Deserted)
- CampaignPersonnelRole: 9 values (Pilot, Aerospace Pilot, Vehicle Driver, Soldier, Tech, Doctor, Medic, Admin, Support)
- MissionStatus: 8 values
- ScenarioStatus: 7 values
- ForceType: 5 values
- FormationLevel: 5 values
- TransactionType: 7 values
- RepairType: 4 values
- RepairJobStatus: 5 values

---

## Systems Not Yet Started in MekStation (19 Major Systems)

These are entire subsystems present in MekHQ with zero implementation in MekStation:

1. **StratCon** — Strategic conquest hex map with force deployment, facility control
2. **Story Arcs** — Branching narrative engine (14 story point types, 11 triggers)
3. **Interstellar Map** — Full star map with navigation, jump routes, planetary data
4. **Planetary System** — Planets with HPG, faction borders, socio-industrial ratings
5. **Full Medical** — Diseases, prosthetics, MASH theatres, surgery system
6. **Full Skills** — 40+ skill types with progression, aging effects
7. **SPAs/Quirks** — 150+ special pilot abilities, flaws, mutations
8. **Personality System** — 200+ personality quirks affecting gameplay
9. **Marriage/Divorce/Procreation** — Full family simulation with genealogy
10. **Education/Academy** — Training programs with entrance exams
11. **Turnover/Retention/Fatigue** — Personnel stability simulation
12. **Full Parts/Repair** — 128 part classes with quality grades
13. **Supply Chain** — Planetary acquisition with faction/tech limits
14. **Unit/Personnel/Parts Markets** — Dynamic marketplace simulation
15. **Faction Standing/Reputation** — Diplomatic standing with accolades/censures
16. **Random Events** — 76+ campaign event types
17. **News System** — In-universe news generation
18. **Transport/Logistics** — Interstellar unit transport
19. **I18N** — 238 localization resource files

---

## Prioritized Implementation Roadmap (Suggested)

### Phase 1: Campaign Foundation (Would reach ~50% parity)
**Goal**: Make campaign mode feel like a real mercenary sim

1. **Expanded Campaign Options** — Increase from 40 to 100+ options
2. **Expanded Personnel Roles & Statuses** — Add tech, admin, medic depth; more statuses
3. **Skills Expansion** — Add remaining skill types (Administration, Negotiation, Leadership, Medicine, Tech skills)
4. **Rank System** — Faction-specific ranks with promotion rules
5. **Enhanced Day Advancement** — Process more systems daily (skill training, maintenance checks, market refreshes)
6. **Contract Types Expansion** — Add remaining 14 contract types from AtB

### Phase 2: Personnel Depth (Would reach ~55% parity)
**Goal**: Make characters feel alive

7. **Advanced Medical** — Disease system, prosthetics, MASH capability
8. **SPAs/Quirks Library** — Populate the existing ability framework with MekHQ's 150+ SPAs
9. **Character Creation** — ATOW-inspired life path system
10. **Awards Auto-Granting** — Auto-award based on career milestones

### Phase 3: Economic Depth (Would reach ~60% parity)
**Goal**: Make finances meaningful

11. **Full Financial System** — Loans, taxes, shares, price multipliers
12. **Unit Market** — Dynamic unit availability with rarity
13. **Personnel Market** — Hiring with market styles
14. **Parts Store** — Buy parts for repairs with availability checks
15. **Salary System** — Role-based salaries with multipliers

### Phase 4: Tactical Depth (Would reach ~70% parity)
**Goal**: Make combat consequences matter

16. **Full Parts/Repair** — Expand to 128 part types with quality grades
17. **Salvage Operations** — Post-battle salvage with CamOps rules
18. **Maintenance System** — Configurable maintenance cycles with quality effects
19. **Scenario Expansion** — More scenario types with modifiers and conditions

### Phase 5: Strategic Layer (Would reach ~80% parity)
**Goal**: Add the big-picture simulation

20. **Faction Standing** — Regard tracking with accolades/censures
21. **Reputation System** — Dragoon rating affecting contracts
22. **Random Events** — Life events, prisoner events, roleplay events
23. **Nag/Warning System** — Proactive campaign health alerts
24. **Reports** — Campaign status reports

### Phase 6: Universe Simulation (Would reach ~90% parity)
**Goal**: Complete the universe

25. **Planetary System** — Full planet database with attributes
26. **Interstellar Map** — Interactive star map with navigation
27. **Transport/Logistics** — Unit transport between systems
28. **News System** — In-universe news generation
29. **Story Arcs** — Branching narrative system
30. **StratCon** — Strategic conquest layer

### Phase 7: Life Simulation (Would reach ~95% parity)
**Goal**: Full mercenary life simulation

31. **Personality System** — 200+ personality quirks
32. **Family/Relationships** — Marriage, divorce, procreation, genealogy
33. **Education** — Academy system with training programs
34. **Turnover/Retention** — Fatigue, loyalty, retirement simulation
35. **Death System** — Natural death, medical complications
36. **Prisoner System** — Capture, ransom, escape, defection

---

## What MekStation Does Better (Keep & Enhance)

These are genuine advantages that MekHQ doesn't have:

1. **Web-Based Access** — No Java installation required; works in any browser
2. **Built-in Unit Customizer** — Seamless construction experience vs launching separate app
3. **Unit Comparison** — Multi-unit side-by-side analysis workspace
4. **Event Sourcing** — Complete audit trail with causality tracking; enables replay
5. **P2P Collaboration** — Real-time collaborative campaign editing
6. **Modern UI/UX** — React + Tailwind vs Java Swing
7. **Comprehensive Testing** — 11,000+ automated tests
8. **Docker Deployment** — Easy server hosting
9. **Vault System** — Cloud-like sharing with permissions and version history
10. **Cross-Platform Desktop** — Electron with auto-updates
11. **Progressive Web App** — Offline capability
12. **OpenSpec-Driven** — Machine-readable rule specifications
13. **Component Library** — Storybook for visual development
14. **Parity Validation** — Automated checking against MegaMek data

---

## Key Architectural Differences

| Aspect | MekHQ | MekStation |
|--------|-------|------------|
| **Central Hub** | Campaign.java (1,500+ lines, God object) | Distributed Zustand stores + services |
| **State Management** | Mutable Java objects | Immutable TypeScript types + Zustand |
| **Persistence** | XML serialization | SQLite + IndexedDB + Event Store |
| **UI Framework** | Java Swing (circa 2005) | React 19 + Tailwind CSS 4 (2025) |
| **Configuration** | 700+ options in CampaignOptions.java | 40 options in ICampaignOptions |
| **Event Model** | Java listeners + callbacks | Event sourcing with causality chains |
| **Module System** | Maven multi-module (MegaMek + MegaMekLab) | npm monorepo with services |
| **Testing** | JUnit (moderate) | Jest + RTL (11,000+ tests) |
| **Localization** | 238 i18n resource files | English only |
| **Build System** | Gradle | npm + Next.js + Electron Builder |

---

*Analysis complete. All 14 exploration agents processed. 80 feature areas compared across 7 categories.*
