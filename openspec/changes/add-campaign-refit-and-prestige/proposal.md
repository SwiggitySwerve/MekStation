# Change: Add Campaign Refit and Prestige

## Why

Two genuine campaign gaps remain after the persistence, combat-loop, and UI
changes. First, **refit** — a campaign owns mechs but the player cannot swap
equipment, upgrade a chassis variant, or convert a unit between configurations;
the construction tooling builds units but nothing applies a construction change
to an *owned campaign unit* as a time-and-cost-bearing refit. Second,
**prestige and morale** — the campaign has faction standing and contract
reputation, but no unit-cohesion prestige score and no company-morale state
machine; a mercenary company's standing waxes and wanes with victories,
desertions, and pay, and nothing models that.

Faction standing, markets, and contract negotiation already exist and are **not
re-specced here**. This change is deliberately narrow: it adds the refit /
equipment-swap pipeline and the prestige + morale state machine — the two
remaining campaign business systems.

## What Changes

- ADDED a refit pipeline: an `IRefitOrder` describing a target configuration for
  an owned campaign unit, a refit-class classifier (the difficulty/kind of the
  change), and a cost-and-hours estimator
- ADDED refit classes graded by the scope of change (e.g. equipment swap,
  variant upgrade, chassis conversion) each with a time-and-cost multiplier
- ADDED a refit day processor: an in-progress refit consumes tech-hours per day
  and completes when its hour budget is met, mirroring the repair-ticket model
- ADDED a refit launch from the mech bay: the player selects an owned unit,
  chooses a target configuration, sees the estimated cost and hours, and
  commits the refit order
- ADDED a unit prestige score: a per-unit cohesion/reputation value that rises
  with victories and notable performance and falls with damage and crew loss
- ADDED a company morale state machine with discrete morale states and defined
  transitions driven by victories, defeats, pay, and desertions
- ADDED a morale day processor: each day evaluates morale-affecting signals and
  applies at most one state transition, emitting a day event on change
- ADDED a Prestige & Morale UI surface showing the company morale state, recent
  transitions, and per-unit prestige scores

## Dependencies

- **Requires**: `add-campaign-bay-ui` (CP2a — the refit launch links from the
  mech bay), `add-campaign-persistence` (CP0 — refit orders and prestige/morale
  state persist through the persistence store), `construction-services` /
  `construction-rules-core` (the construction validation a target refit
  configuration must pass), `personnel-progression` (the crew/desertion signals
  morale consumes)
- **Required By**: none — terminal Wave 4 change

## Impact

- Affected specs: `campaign-refit-and-prestige` (new capability) — chosen
  because refit and prestige/morale are two new business systems that do not
  fit any existing campaign capability cleanly; grouping them in one change
  keeps Wave 4 at five changes as the council decomposition specified
- Affected code: `src/lib/campaign/refit/` (new refit classifier, estimator,
  pipeline), `src/lib/campaign/processors/` (new refit and morale day
  processors), `src/lib/campaign/prestige/` (new prestige scorer and morale
  state machine), `src/types/campaign/` (new `IRefitOrder`, refit-class enum,
  `IUnitPrestige`, morale-state types), `src/pages/campaigns/[id]/` and
  `src/components/campaign/` (refit launch + Prestige & Morale surface)
- Refit reuses the existing construction validation — a target configuration
  must be a valid unit per `construction-rules-core` before a refit order is
  accepted
- Reversible: the refit pipeline and prestige/morale processors are additive
  day processors; removing them leaves the campaign loop intact without refit
  or morale

## Non-Goals

- Faction standing, markets, and contract negotiation — already built and
  explicitly out of scope per the council decomposition
- A new construction engine — refit validates target configurations against the
  existing construction rules; it does not reimplement construction
- Persisting refit *templates* / saved loadouts as a library — refit operates on
  a per-unit target configuration; a loadout library is a separate concern
- Individual-pilot morale or loyalty — morale here is a company-level state
  machine; per-pilot loyalty belongs to `turnover-retention` / `personnel-progression`
- Prestige-gated content unlocks or rewards — prestige is a tracked score this
  change surfaces; consuming it for unlocks is deferred
