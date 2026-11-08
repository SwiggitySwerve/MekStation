# Vault pilot status rules

`pilotStatus.ts` owns exact parsing against `PilotStatus` and permission for normal vault transitions. `PilotRepository.update` enforces both before mutation; API PUT parses external input first. Normal KIA cannot transition to another status, while KIA-to-KIA and status-omitting edits remain possible. Healing uses the same transition rule and preserves its existing errors.

Pinned MekHQ permits manual resurrection. The normal PUT restriction is an explicitly approved MekStation policy, not a universal MekHQ rule. Explicit GM revival and campaign-to-vault death propagation are follow-ups. See `openspec/changes/validate-vault-pilot-force-status/design.md` for pinned evidence, caller paths, distinct status vocabularies, and the documentation-only cleanup procedure.
