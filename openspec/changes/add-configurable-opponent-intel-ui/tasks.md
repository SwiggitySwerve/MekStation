## 1. Intel Policy Types

- [ ] 1.1 Define opponent intel policy presets and projection tiers
- [ ] 1.2 Extend fog projection adapters to output exact, rough, last-known, silhouette, hidden, and GM views

## 2. UI Integration

- [ ] 2.1 Add intel confidence and staleness display to enemy tokens and target inspectors
- [ ] 2.2 Add opponent intel setup controls for GM/scenario configuration
- [ ] 2.3 Apply redacted projections to event feed and replay viewer

## 3. Safety and Audit

- [ ] 3.1 Ensure hidden fields are stripped before reaching non-GM components
- [ ] 3.2 Emit audit/replay events for GM reveal overrides

## 4. Verification

- [ ] 4.1 Unit tests for each intel policy projection
- [ ] 4.2 Component tests for exact, rough, last-known, and hidden display states
- [ ] 4.3 Replay test proving player and GM perspectives differ without mutating event history
