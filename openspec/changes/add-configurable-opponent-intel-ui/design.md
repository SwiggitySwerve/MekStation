## Context

Existing fog-of-war specs already classify visibility and redact hidden combat-state fields. This change turns that into a player-facing and GM-configurable information model for tactical combat.

## Goals / Non-Goals

**Goals:**

- Support open information, rough intel, sensor-limited intel, and hidden intel modes.
- Show confidence and staleness instead of pretending guesses are exact facts.
- Make event feed and replay obey the same redaction rules as live UI.
- Give GM/referee users exact-state controls without leaking to players.

**Non-Goals:**

- No new LOS or sensor math.
- No multiplayer authority redesign.
- No hidden information in client state for non-authorized viewers.

## Decisions

- **Policy is match configuration.** Intel mode is set before/during match setup by game master or scenario config.
- **Projection tiers are explicit.** Exact, rough, lastKnown, silhouette, and hidden states map to typed UI projections.
- **GM view is privileged.** GM/referee shell can reveal exact state; player shell receives redacted projections.
- **Replay is perspective-aware.** A replay can be viewed from player, opponent, spectator, or GM perspective if the event log supports it.

## Risks / Trade-offs

- **Accidental leaks** -> tests assert stripped fields are absent, not merely hidden.
- **Player confusion** -> visual language must clearly mark rough and stale data.
- **GM complexity** -> presets first, advanced per-field toggles later.

## Open Questions

- Should rough armor/heat use bands, percentages, or descriptive states?
- Should GM be able to override one unit's visibility mid-match, and should that emit an audit event?
