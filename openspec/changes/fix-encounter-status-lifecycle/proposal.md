## Why
Local encounter launches can leave persisted encounters in Draft/Ready, and completed games leave encounters Launched. Status writers are not guarded by one lifecycle owner.

## What Changes
- Extract existing classification without behavior changes, then enforce a single transition table at the repository.
- Link local skirmish, interactive, spectator and auto sessions, and complete matching terminal games through server boundaries.
- Complete encounters on first replay persistence and duplicate retries.
- Preserve clone/template behavior, terminal history and the force-deletion cascade exception; clear linkage on cascade demotion.
- Document read-only legacy auditing. No migration or automatic repair.

## Impact
S1a changes encounter services, thin APIs, store transport and two approved pre-battle hooks. Canonical contract: openspec/specs/encounter-system/spec.md. No schema, event payload or replay format changes. Fast-forward and authoritative multiplayer completion are explicitly deferred to S1b after K6 and M-H3 PR2 merge.
