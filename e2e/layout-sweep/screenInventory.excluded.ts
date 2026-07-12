import type { ExcludedScreenEntry } from './screenInventory.types';

// ============================================================================
// Excluded screens (13) -- never swept by this change, each with a
// non-empty documented reason (design D5/D10).
// ============================================================================

const NO_COVERING_PACK_REASON =
  'No scenario pack (this change consumes only the navigation and combat pilot packs, design D10b) or ' +
  "front-door observable sources this route's required identifier/state; reaching it would require store " +
  'injection, hand-seeded rows, or an uncontracted loader surface, all forbidden (design D5/D7).';

export const excludedEntries: readonly ExcludedScreenEntry[] = [
  {
    id: 'excluded-encounter-detail',
    class: 'excluded',
    label: 'encounter detail',
    manifestPaths: ['/gameplay/encounters/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/encounter-flow.spec.ts and e2e/encounter.spec.ts already seed encounter detail state; a future ' +
      "encounter/combat pack (per the manifest's own delegatedRoutes proof precedent) would unlock this route.",
  },
  {
    id: 'excluded-encounter-pre-battle',
    class: 'excluded',
    label: 'encounter pre-battle',
    manifestPaths: ['/gameplay/encounters/[id]/pre-battle'],
    reason: NO_COVERING_PACK_REASON,
    followUp: 'Same follow-up path as encounter detail.',
  },
  {
    id: 'excluded-encounter-sim',
    class: 'excluded',
    label: 'encounter sim',
    manifestPaths: ['/gameplay/encounters/[id]/sim'],
    reason: NO_COVERING_PACK_REASON,
    followUp: 'Same follow-up path as encounter detail.',
  },
  {
    id: 'excluded-force-detail',
    class: 'excluded',
    label: 'force detail',
    manifestPaths: ['/gameplay/forces/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/force.spec.ts already generates a roster object; a follow-up may promote that seeder to a ' +
      'front-door pattern this sweep can consume.',
  },
  {
    id: 'excluded-pilot-detail',
    class: 'excluded',
    label: 'pilot detail',
    manifestPaths: ['/gameplay/pilots/[id]'],
    reason:
      "Design D10b: pilot ids are not in W4's enumerated remap families (join only conditionally per its " +
      "own R10), no pack contract makes any targetRoute a pilot detail route, and a fresh app's pilot " +
      'roster is empty so in-page discovery from /gameplay/pilots has no promised row to click either.',
    followUp:
      'Unlocks via either W4\'s R10 verdict landing on "loader creates pilot rows front-door", or the ' +
      'existing non-pack seeder precedent the manifest names for this pattern (force.spec.ts/' +
      'replay-player.spec.ts-style generated roster objects).',
  },
  {
    id: 'excluded-game-replay',
    class: 'excluded',
    label: 'game replay',
    manifestPaths: ['/gameplay/games/[id]/replay'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/replay-player.spec.ts already seeds replay state for a future pack.',
  },
  {
    id: 'excluded-game-review',
    class: 'excluded',
    label: 'game review',
    manifestPaths: ['/gameplay/games/[id]/review'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/game.spec.ts already seeds completed match state for a future pack.',
  },
  {
    id: 'excluded-game-victory',
    class: 'excluded',
    label: 'game victory',
    manifestPaths: ['/gameplay/games/[id]/victory'],
    reason: NO_COVERING_PACK_REASON,
    followUp: 'Same follow-up path as game review.',
  },
  {
    id: 'excluded-match-detail',
    class: 'excluded',
    label: 'match detail',
    manifestPaths: ['/gameplay/matches/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/quick-play.spec.ts already seeds match state for a future pack.',
  },
  {
    id: 'excluded-gameplay-lobby',
    class: 'excluded',
    label: 'gameplay lobby',
    manifestPaths: ['/gameplay/lobby/[roomCode]'],
    reason:
      NO_COVERING_PACK_REASON +
      ' Lobby routes additionally require live multiplayer runtime state, not just seeded rows.',
    followUp:
      'e2e/p2p-sync.spec.ts and e2e/playtest-mp-smoke.spec.ts already exercise lobby state live.',
  },
  {
    id: 'excluded-multiplayer-lobby',
    class: 'excluded',
    label: 'multiplayer lobby',
    manifestPaths: ['/multiplayer/lobby/[roomCode]'],
    reason:
      NO_COVERING_PACK_REASON +
      ' Lobby routes additionally require live multiplayer runtime state, not just seeded rows.',
    followUp: 'Same follow-up path as gameplay lobby.',
  },
  {
    id: 'excluded-multiplayer-spectate',
    class: 'excluded',
    label: 'multiplayer spectate',
    manifestPaths: ['/multiplayer/spectate/[matchId]'],
    reason:
      NO_COVERING_PACK_REASON +
      ' Spectate additionally requires a signed vault identity and a live match to observe.',
    followUp:
      'e2e/multiplayer-live-vault-auth.spec.ts already exercises this live.',
  },
  {
    id: 'excluded-custom-unit-detail',
    class: 'excluded',
    label: 'custom unit detail',
    manifestPaths: ['/units/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/customizer.spec.ts already generates a saved unit; a follow-up may promote that seeder to a ' +
      'front-door pattern this sweep can consume.',
  },
];
