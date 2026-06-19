/**
 * E2E Test Harness for opponent-intel tier projection.
 *
 * Mounts `TacticalUnitInspector` against a synthetic `IGameSession` with one
 * friendly unit AND one opponent unit. The opponent's intel tier is driven by
 * the `?tier=` URL query param (one of: 'exact' | 'rough' | 'silhouette' |
 * 'hidden'). Two inspectors render side-by-side so a single page load can
 * assert both the friendly full-state view AND the redacted/quantized
 * opponent view.
 *
 * This route exists to close the orphan-rot gap raised by OMO Heavy Council
 * audit Phase 2 / Oracle seat: `src/services/intel/intelGuardrails.ts` is
 * reachable only through `useUnitInspectorProjection → TacticalUnitInspector
 * → GameplayLayout`, with no CI-enforced consumer route exercising the 4
 * opponent tiers end-to-end. Without this harness, a future refactor could
 * silently break the redaction policy and the only signal would be a unit-
 * test gap surfacing months later (mirroring the 6-month indirect-fire
 * helper orphan precedent).
 *
 * Only available in development/test environments. Guarded by the same
 * `isTestEnv` check the sibling E2E harnesses use; production builds render
 * the "Not Available" placeholder.
 *
 * @internal For E2E testing only — never linked from production UI.
 */

import { useRouter } from 'next/router';
import { useMemo } from 'react';

import type {
  IGameSession,
  IGameState,
  IGameUnit,
  IUnitGameState,
} from '@/types/gameplay';
import type {
  OpponentIntelTier,
  PlayerId,
} from '@/types/gameplay/TacticalShellInterfaces';

import { TacticalUnitInspector } from '@/components/gameplay/TacticalUnitInspector';
import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';

// =============================================================================
// Test-environment gate
// =============================================================================

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_TEST === 'true' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

// =============================================================================
// Synthetic-session constants
// =============================================================================

/** Stable test-ids used by the e2e spec to grab each inspector instance. */
const FRIENDLY_INSPECTOR_TESTID = 'intel-harness-friendly-inspector';
const OPPONENT_INSPECTOR_TESTID = 'intel-harness-opponent-inspector';
const TIER_BADGE_TESTID = 'intel-harness-active-tier';

/** Unit ids — picked so they cannot be confused with the opponent's name. */
const FRIENDLY_UNIT_ID = 'friendly-1';
const OPPONENT_UNIT_ID = 'opponent-1';
const VIEWER_PLAYER_ID: PlayerId = 'player-a';
const OPPONENT_PLAYER_ID: PlayerId = 'player-b';

/**
 * Names + chassis chosen so we can DOM-grep them to confirm they leak through
 * (or NOT) at each tier. Pilot name "Mechwarrior Smith" is uniquely identifying
 * and absent from the redacted shape's placeholder text.
 */
const FRIENDLY_NAME = 'Atlas AS7-D';
const FRIENDLY_CHASSIS = 'atlas-as7-d';
const FRIENDLY_PILOT = 'Mechwarrior Smith';
const OPPONENT_NAME = 'Mad Cat Prime';
const OPPONENT_CHASSIS = 'mad-cat-prime';

/** Whitelist of tiers this harness exposes to the e2e spec. */
const SUPPORTED_TIERS: readonly OpponentIntelTier[] = [
  'exact',
  'rough',
  'silhouette',
  'hidden',
];

/**
 * Resolve the active tier from the URL query param. Defaults to 'exact'
 * (most information visible) so the route renders something meaningful when
 * navigated without a query string.
 */
function resolveTier(raw: string | string[] | undefined): OpponentIntelTier {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value &&
    (SUPPORTED_TIERS as readonly string[]).includes(value as string)
  ) {
    return value as OpponentIntelTier;
  }
  return 'exact';
}

// =============================================================================
// Synthetic fixture builders
// =============================================================================

/**
 * Build a minimal IGameUnit with stable fields. Cast through `unknown` because
 * the test harness only needs the fields the inspector projection reads.
 */
function buildGameUnit(
  id: string,
  side: GameSide,
  name: string,
  unitRef: string,
): IGameUnit {
  return {
    id,
    name,
    side,
    unitRef,
    pilotRef: `pilot-${id}`,
    gunnery: 3,
    piloting: 4,
  } as IGameUnit;
}

/**
 * Build a minimal IUnitGameState. Heat/armor numbers below are deliberately
 * unique values so the spec can grep them to confirm they leak (exact tier)
 * or do NOT leak (rough / silhouette / hidden tiers).
 */
function buildUnitState(id: string, side: GameSide): IUnitGameState {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 12,
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: 3,
    armor: {
      HEAD: 9,
      CT: 31,
      LT: 20,
      RT: 20,
      LA: 16,
      RA: 16,
      LL: 20,
      RL: 20,
    },
    structure: {
      HEAD: 3,
      CT: 20,
      LT: 14,
      RT: 14,
      LA: 10,
      RA: 10,
      LL: 14,
      RL: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

/** Build a synthetic IGameSession with one friendly + one opponent unit. */
function buildSyntheticSession(): IGameSession {
  const friendlyUnit = buildGameUnit(
    FRIENDLY_UNIT_ID,
    GameSide.Player,
    FRIENDLY_NAME,
    FRIENDLY_CHASSIS,
  );
  const opponentUnit = buildGameUnit(
    OPPONENT_UNIT_ID,
    GameSide.Opponent,
    OPPONENT_NAME,
    OPPONENT_CHASSIS,
  );

  const friendlyState = buildUnitState(FRIENDLY_UNIT_ID, GameSide.Player);
  const opponentState = buildUnitState(OPPONENT_UNIT_ID, GameSide.Opponent);

  const currentState = {
    units: {
      [FRIENDLY_UNIT_ID]: friendlyState,
      [OPPONENT_UNIT_ID]: opponentState,
    },
    phase: 'movement',
    turn: 1,
    firstMover: GameSide.Player,
    initiativeWinner: GameSide.Player,
    activationIndex: 0,
    turnEvents: [],
  } as Partial<IGameState> as IGameState;

  return {
    id: 'intel-tier-harness-session',
    createdAt: '2026-05-21T00:00:00.000Z',
    updatedAt: '2026-05-21T00:00:00.000Z',
    units: [friendlyUnit, opponentUnit],
    currentState,
    events: [],
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    sideOwners: {
      [GameSide.Player]: VIEWER_PLAYER_ID,
      [GameSide.Opponent]: OPPONENT_PLAYER_ID,
    },
  } as Partial<IGameSession> as IGameSession;
}

// =============================================================================
// Page component
// =============================================================================

export default function IntelTierProjectionHarnessPage(): React.JSX.Element {
  const router = useRouter();
  const tier = resolveTier(router.query.tier);

  // Synthetic session is constant per page load — build once.
  const session = useMemo(buildSyntheticSession, []);

  // Per-opponent intel scope drives the projection. We always key by the
  // opponent's player id; the friendly inspector ignores this map because the
  // friendly branch short-circuits on `gameUnit.side === viewerSide`.
  const opponentVisibilityScopes = useMemo(
    () => ({ [OPPONENT_PLAYER_ID]: tier }),
    [tier],
  );

  // Supplemental data only matters for the friendly inspector (pilot names,
  // weapons, armor max). The opponent never receives pilot names; the
  // projection hook ignores the supplemental for the opponent branches.
  const friendlySupplemental = useMemo(
    () => ({
      pilotNames: { [FRIENDLY_UNIT_ID]: FRIENDLY_PILOT },
      maxArmor: {
        [OPPONENT_UNIT_ID]: {
          HEAD: 9,
          CT: 47,
          LT: 32,
          RT: 32,
          LA: 24,
          RA: 24,
          LL: 32,
          RL: 32,
        },
      },
    }),
    [],
  );

  if (!isTestEnv) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Not Available</h1>
        <p>This page is only available in development/test environments.</p>
      </div>
    );
  }

  return (
    <div
      data-testid="intel-tier-projection-harness"
      data-active-tier={tier}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderBottom: '1px solid #ccc',
          paddingBottom: 8,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>
          Opponent Intel Tier Projection Harness
        </h1>
        <p style={{ margin: 0, color: '#555', fontSize: 12 }}>
          E2E-only route. Drives the 4 opponent tiers through
          <code> useUnitInspectorProjection </code>+
          <code> assertNoLeakedSecrets </code>
          end-to-end. Set <code>?tier=exact|rough|silhouette|hidden</code> to
          change the active opponent tier.
        </p>
        <div data-testid={TIER_BADGE_TESTID}>Active tier: {tier}</div>
        <nav
          style={{ display: 'flex', gap: 8, fontSize: 12 }}
          data-testid="intel-harness-tier-links"
        >
          {SUPPORTED_TIERS.map((t) => (
            <a
              key={t}
              href={`?tier=${t}`}
              data-testid={`intel-harness-tier-link-${t}`}
            >
              {t}
            </a>
          ))}
        </nav>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <div
          data-testid={FRIENDLY_INSPECTOR_TESTID}
          style={{
            border: '1px solid #6699cc',
            borderRadius: 4,
            background: '#fff',
          }}
        >
          <div
            style={{
              padding: '4px 8px',
              background: '#e6f0fb',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Friendly (always full view)
          </div>
          <TacticalUnitInspector
            inspectedUnitId={FRIENDLY_UNIT_ID}
            session={session}
            viewerPlayerId={VIEWER_PLAYER_ID}
            viewerSide={GameSide.Player}
            opponentVisibilityScopes={opponentVisibilityScopes}
            supplemental={friendlySupplemental}
          />
        </div>

        <div
          data-testid={OPPONENT_INSPECTOR_TESTID}
          style={{
            border: '1px solid #cc6666',
            borderRadius: 4,
            background: '#fff',
          }}
        >
          <div
            style={{
              padding: '4px 8px',
              background: '#fbeaea',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Opponent (tier: {tier})
          </div>
          <TacticalUnitInspector
            inspectedUnitId={OPPONENT_UNIT_ID}
            session={session}
            viewerPlayerId={VIEWER_PLAYER_ID}
            viewerSide={GameSide.Player}
            opponentVisibilityScopes={opponentVisibilityScopes}
            supplemental={friendlySupplemental}
          />
        </div>
      </section>
    </div>
  );
}
