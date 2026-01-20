# Change: Add Awards System

## Why

Awards and achievements add progression and recognition to gameplay. Pilots earning medals creates narrative depth and investment. Tracking accomplishments encourages continued play and provides goals beyond individual battles.

## What Changes

- Add award/medal definitions with criteria
- Implement award tracking and granting logic
- Add pilot award display on profile
- Add achievement notifications
- Add leaderboards for competitive awards (optional)

## Dependencies

- `add-pilot-system` (Phase 1) - Pilot data model
- `add-campaign-system` (Phase 5) - Campaign context for awards
- `add-encounter-system` (Phase 4) - Battle participation tracking

## Impact

- Affected specs: `awards` (new capability)
- Affected code: `src/types/awards/`, `src/services/awards/`, pilot store
- New UI: Award display, achievement toasts, pilot decorations
- Storage: Award history per pilot

## Success Criteria

- [ ] Pilots can earn awards based on actions
- [ ] Awards display on pilot profile
- [ ] Notification shown when award earned
- [ ] Campaign-specific and lifetime awards supported
- [ ] Rare awards feel meaningful

## Award Categories

1. **Combat Awards**: Kills, survival, damage dealt
2. **Campaign Awards**: Mission completions, campaign victories
3. **Service Awards**: Games played, time in service
4. **Skill Awards**: Perfect missions, clutch victories
5. **Special Awards**: First blood, last mech standing
