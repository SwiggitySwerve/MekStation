# Simulation Viewer UI - Proposal

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-02
**Dependencies**: simulation-system (completed)
**Affects**: Quick game results, Campaign dashboard, Simulation analysis

---

## Problem Statement

The current simulation system (349 tests, 89% coverage) generates comprehensive battle data but lacks rich visualization for:

1. **Campaign net effects** - Aggregate state changes (personnel, units, finances) separate from individual battles
2. **Encounter histories** - Detailed battle records with damage attribution, key moments, and event timelines
3. **Bug detection** - Anomaly alerts, invariant violations, and simulation health monitoring

Users need a UI-rich view to understand simulation results, detect issues, and analyze campaign progression.

---

## Proposed Solution

Create a **three-tab Simulation Viewer** that separates concerns:

### Tab 1: Campaign Dashboard (Net Effects)

- **Purpose**: "What's the state of my campaign right now?"
- **Shows**: Roster summary, force status, financial trends, progression metrics, top performers
- **Drill-down**: Click any metric → related detail in Encounter History tab

### Tab 2: Encounter History (Battle Records)

- **Purpose**: "What happened in each battle?"
- **Shows**: Battle list, damage matrix, key moments, event timeline, comparison views
- **Drill-down**: Click battle → detailed view with playback controls

### Tab 3: Analysis & Bugs (Simulation Health)

- **Purpose**: "Is the simulation working correctly?"
- **Shows**: Invariant status, anomaly alerts, violation log, statistical summary
- **Drill-down**: Click anomaly → related battle/event

---

## Key Features

### Heat Suicide Detection

- **Problem**: AI currently has zero heat awareness, can make suicidal decisions
- **Solution**: Warning (not blocker) when unit generates >30 heat (unless "last ditch" scenario)
- **Display**: Anomaly card with battle link, turn, unit, heat values

### Key Moment Detection

- **Tier 1 (High)**: First blood, BV swing >20%, comeback, wipe, last stand, ace kill
- **Tier 2 (Medium)**: Head shot, ammo explosion, pilot kill, critical engine/gyro, alpha strike
- **Tier 3 (Low)**: Heat crisis, mobility kill, weapons kill, rear arc hit, overkill
- **Display**: Timeline with tier badges, auto-detected from event stream

### Damage Attribution Matrix

- **Already planned** in simulation-enhancements
- **Display**: Grid visualization (rows=attackers, columns=targets, cells=damage totals)
- **Drill-down**: Click cell → specific engagement events

---

## User Stories

### As a campaign player

- I want to see my roster status at a glance so I know who's available
- I want to see financial trends so I can plan expenses
- I want to see top performers so I can promote/reward them

### As a battle analyst

- I want to see who damaged whom so I understand engagement patterns
- I want to see key moments so I can review critical decisions
- I want to replay battles so I can learn from mistakes

### As a developer

- I want to see anomaly alerts so I can detect bugs early
- I want to see invariant violations so I can fix issues
- I want configurable thresholds so I can tune detection

---

## Success Criteria

1. **Campaign Dashboard** displays aggregate state with trend charts
2. **Encounter History** shows battle list with damage matrix and key moments
3. **Analysis Tab** displays anomaly alerts with configurable thresholds
4. **Navigation** allows drill-down from summary to detail across tabs
5. **Performance** handles 1000+ event timelines without lag

---

## Out of Scope

- Real-time simulation monitoring (batch only)
- Export to external formats (JSON/CSV) - future enhancement
- AI decision visualization (utility scores) - future enhancement
- Comparison across multiple campaigns - future enhancement

---

## Open Questions

### Campaign Dashboard

1. **Trend chart time range**: Last 7 days? 30 days? Configurable?
2. **"At risk" thresholds**: What defines low funds? Many wounded?
3. **Top performers sorting**: By kills? XP? Survival rate? User choice?

### Encounter History

4. **Battle grouping**: By mission/contract? By date? Both?
5. **Key moment tiers**: Show all 3 tiers or filter by default?
6. **Comparison baseline**: Campaign average? Previous battle? User choice?

### Analysis & Bugs

7. **Heat suicide threshold**: 30 heat? 24 (ammo explosion)? Configurable?
8. **Passive unit threshold**: 3 turns? 5 turns? Configurable?
9. **Auto-snapshot**: Save all anomalies or only critical?

### Cross-Cutting

10. **Data persistence**: Store simulation runs in database or memory-only?
11. **Mobile support**: Full responsive or desktop-only?
12. **Dark mode**: Support from day 1 or later?

---

## Next Steps

1. **Answer open questions** (user input required)
2. **Create detailed specs** for each tab (3 specs)
3. **Create component specs** for shared UI (KPI cards, charts, timelines)
4. **Create data model specs** for new interfaces (key moments, anomalies)
5. **Create implementation tasks** with dependencies and acceptance criteria
