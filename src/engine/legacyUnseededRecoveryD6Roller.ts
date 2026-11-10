import { defaultD6Roller, type D6Roller } from '@/utils/gameplay/diceTypes';

/**
 * The dice for ONE case only: recovering an interactive session whose
 * saved config has no seed (every save made before seeds were persisted).
 * Not a general-purpose roller - every other path is handed a seeded or
 * injected roller, and `InteractiveSession.fromSessionAsync` is the only
 * caller (pinned by `legacyUnseededRecoveryD6Roller.test.ts`).
 *
 * It rolls exactly as `main` did for these sessions before C-1c PR 0: the
 * resolvers' ambient `Math.random` d6. Those games were never
 * reproducible, so a fixed seed here would only give every old save the
 * same dice from position zero on every load.
 *
 * OPEN (D-8): seedless recovered sessions use an explicit unseeded
 * roller; resume design (b) assigns a fresh crypto seed at recovery and
 * persists it with a seeded-at-recovery marker, designed together with
 * R11-SP-DRAWS (Root ruling 2026-11-10).
 */
export function createLegacyUnseededRecoveryD6Roller(): D6Roller {
  return () => defaultD6Roller();
}
