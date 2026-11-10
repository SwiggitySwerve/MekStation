## REMOVED Requirements

### Requirement: Contract Morale Tracking

**Reason**: It described a player-perspective rule (a victory raises the contract's morale one step, a defeat lowers it, with no roll) that moved the enemy-morale level the wrong way, was never called, and was removed with `updateMorale`. The pinned MekHQ rule is a monthly roll.
**Migration**: The "Monthly Contract Enemy Morale Check" requirement in mission-contracts replaces it. The default level remains STALEMATE for a contract with no recorded level.
