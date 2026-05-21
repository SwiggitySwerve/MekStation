/**
 * Component tests for TacticalUnitInspector.
 *
 * Verifies §4.1 of the add-tactical-unit-inspector-drawers spec:
 *
 *   1. Friendly exact-state path — all fields rendered with correct
 *      data-testid attributes; name, chassis, pilot skills, heat, armor,
 *      structure, movement, and weapon list are visible.
 *
 *   2. Rough opponent path — band descriptor rendered; heat and exact
 *      armor/structure numbers are NOT present in the DOM.
 *
 *   3. Hidden/unknown opponent path (redacted) — DOM contains ZERO
 *      identifying information: no unit name, no chassis, no numeric
 *      heat/armor value. Only "Unknown Contact" placeholder is present.
 *
 *   4. Null unit path — empty "Select a unit to inspect" placeholder.
 *
 * The redaction tests are DOM-level assertions, not CSS-visibility
 * checks, per the spec requirement "exact hidden fields SHALL not be
 * recoverable from labels, tooltips, DOM text, ARIA text, or test ids".
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-unit-inspector-drawers/tasks.md §4.1
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "@jest/globals";

import { GameSide } from "@/types/gameplay";
import type {
  IGameSession,
  IGameUnit,
  IGameState,
  IUnitGameState,
  IWeaponStatus,
} from "@/types/gameplay";
import type { PlayerId } from "@/types/gameplay/TacticalShellInterfaces";

import { TacticalUnitInspector } from "../TacticalUnitInspector";

// =============================================================================
// Minimal fixture helpers
// =============================================================================

function makeUnit(
  id: string,
  side: GameSide,
  overrides: Partial<IGameUnit> = {},
): IGameUnit {
  return {
    id,
    name: `Unit-${id}`,
    side,
    unitRef: `atlas-as7-d-${id}`,
    pilotRef: `pilot-${id}`,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeUnitState(
  id: string,
  side: GameSide,
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: 0 as unknown as IUnitGameState["facing"],
    heat: 8,
    movementThisTurn: "WALK",
    hexesMovedThisTurn: 3,
    armor: { HEAD: 9, CT: 31, LT: 20, RT: 20, LA: 16, RA: 16, LL: 20, RL: 20 },
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
    lockState: "unlocked" as unknown as IUnitGameState["lockState"],
    ...overrides,
  };
}

function makeWeapon(
  id: string,
  name: string,
  overrides: Partial<IWeaponStatus> = {},
): IWeaponStatus {
  return {
    id,
    name,
    location: "CT",
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    ...overrides,
  };
}

function makeSession(
  units: IGameUnit[],
  unitStates: IUnitGameState[],
  sideOwners?: Record<GameSide, string>,
): IGameSession {
  const stateMap: Record<string, IUnitGameState> = {};
  for (const us of unitStates) {
    stateMap[us.id] = us;
  }

  const currentState = {
    units: stateMap,
    phase: "movement",
    turn: 1,
    firstMover: GameSide.Player,
    initiativeWinner: GameSide.Player,
  } as unknown as IGameState;

  return {
    id: "test-session",
    units,
    currentState,
    events: [],
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: ["elimination"],
      optionalRules: [],
    },
    sideOwners: sideOwners ?? null,
  } as unknown as IGameSession;
}

// =============================================================================
// Shared test data
// =============================================================================

const FRIENDLY_ID = "friendly-1";
const OPPONENT_ID = "opponent-1";
const VIEWER_PLAYER_ID: PlayerId = "player-a";
const OPPONENT_PLAYER_ID: PlayerId = "player-b";

const friendlyUnit = makeUnit(FRIENDLY_ID, GameSide.Player, {
  name: "Atlas AS7-D",
  unitRef: "atlas-as7-d",
  gunnery: 3,
  piloting: 4,
});
const opponentUnit = makeUnit(OPPONENT_ID, GameSide.Opponent, {
  name: "Mad Cat Prime",
  unitRef: "mad-cat-prime",
});

const friendlyState = makeUnitState(FRIENDLY_ID, GameSide.Player, { heat: 12 });
const opponentState = makeUnitState(OPPONENT_ID, GameSide.Opponent, {
  heat: 7,
});

const session = makeSession(
  [friendlyUnit, opponentUnit],
  [friendlyState, opponentState],
  {
    [GameSide.Player]: VIEWER_PLAYER_ID,
    [GameSide.Opponent]: OPPONENT_PLAYER_ID,
  },
);

const mediumLaser = makeWeapon("ml-1", "Medium Laser");
const lrm20 = makeWeapon("lrm-1", "LRM-20", { ammoRemaining: 1 });

// =============================================================================
// Tests
// =============================================================================

describe("TacticalUnitInspector", () => {
  // ---------------------------------------------------------------------------
  // 1. Null / empty state
  // ---------------------------------------------------------------------------

  it("renders the empty placeholder when inspectedUnitId is null", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={null}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{}}
      />,
    );

    expect(screen.getByTestId("inspector-empty")).toBeTruthy();
    expect(screen.queryByTestId("inspector-friendly")).toBeNull();
    expect(screen.queryByTestId("inspector-target")).toBeNull();
    expect(screen.queryByTestId("inspector-redacted")).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 2. Friendly exact state
  // ---------------------------------------------------------------------------

  it("renders full friendly view with correct data-testids and values", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={FRIENDLY_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{}}
        supplemental={{
          pilotNames: { [FRIENDLY_ID]: "Mechwarrior Smith" },
          unitWeapons: { [FRIENDLY_ID]: [mediumLaser, lrm20] },
          maxArmor: {
            [FRIENDLY_ID]: {
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
          maxStructure: {
            [FRIENDLY_ID]: {
              HEAD: 3,
              CT: 20,
              LT: 14,
              RT: 14,
              LA: 10,
              RA: 10,
              LL: 14,
              RL: 14,
            },
          },
          heatSinks: { [FRIENDLY_ID]: 10 },
        }}
      />,
    );

    // Root + sub-view
    expect(screen.getByTestId("tactical-unit-inspector")).toBeTruthy();
    expect(screen.getByTestId("inspector-friendly")).toBeTruthy();

    // Unit identity
    expect(screen.getByTestId("inspector-unit-name").textContent).toBe(
      "Atlas AS7-D",
    );
    expect(screen.getByTestId("inspector-chassis").textContent).toBe(
      "atlas-as7-d",
    );

    // Pilot
    expect(screen.getByTestId("inspector-pilot-name").textContent).toBe(
      "Mechwarrior Smith",
    );
    expect(screen.getByTestId("inspector-pilot-skills").textContent).toContain(
      "3",
    );
    expect(screen.getByTestId("inspector-pilot-skills").textContent).toContain(
      "4",
    );

    // Heat
    expect(screen.getByTestId("inspector-heat").textContent).toBe("12");

    // Armor / structure
    expect(screen.getByTestId("inspector-armor")).toBeTruthy();
    expect(screen.getByTestId("inspector-structure")).toBeTruthy();

    // Movement
    expect(screen.getByTestId("inspector-movement")).toBeTruthy();

    // Weapons — mediumLaser is ready, lrm20 has ammo warning
    expect(screen.getByTestId(`inspector-weapon-ml-1`)).toBeTruthy();
    expect(screen.getByTestId(`inspector-weapon-lrm-1`)).toBeTruthy();
  });

  it("renders gunnery 3 / piloting 4 skills correctly in pilot-skills cell", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={FRIENDLY_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{}}
        supplemental={{ pilotNames: { [FRIENDLY_ID]: "Smith" } }}
      />,
    );
    const skills = screen.getByTestId("inspector-pilot-skills");
    expect(skills.textContent).toContain("G3");
    expect(skills.textContent).toContain("P4");
  });

  // ---------------------------------------------------------------------------
  // 3. Rough opponent — band visible, numbers absent
  // ---------------------------------------------------------------------------

  it("renders target view at rough tier with damage band, no exact numbers", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={OPPONENT_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{
          [OPPONENT_PLAYER_ID]: "rough",
        }}
      />,
    );

    expect(screen.getByTestId("inspector-target")).toBeTruthy();
    expect(screen.getByTestId("inspector-damage-band")).toBeTruthy();

    // At rough tier, exact numbers MUST NOT appear.
    expect(screen.queryByTestId("inspector-heat")).toBeNull();
    expect(screen.queryByTestId("inspector-armor")).toBeNull();
    expect(screen.queryByTestId("inspector-structure")).toBeNull();

    // The opponent's unit name IS visible at rough tier.
    expect(screen.getByTestId("inspector-unit-name").textContent).toBe(
      "Mad Cat Prime",
    );
  });

  it("renders target view at exact tier with numeric heat and armor", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={OPPONENT_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{
          [OPPONENT_PLAYER_ID]: "exact",
        }}
      />,
    );

    expect(screen.getByTestId("inspector-target")).toBeTruthy();
    // At exact tier numeric fields are populated.
    expect(screen.getByTestId("inspector-heat")).toBeTruthy();
    expect(screen.getByTestId("inspector-armor")).toBeTruthy();
    expect(screen.getByTestId("inspector-structure")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // 4. Hidden / unknown opponent — DOM-level redaction
  // ---------------------------------------------------------------------------

  it("renders redacted view at hidden tier — zero identifying info in DOM", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={OPPONENT_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{
          [OPPONENT_PLAYER_ID]: "hidden",
        }}
      />,
    );

    const root = screen.getByTestId("tactical-unit-inspector");

    // Correct sub-view is mounted.
    expect(screen.getByTestId("inspector-redacted")).toBeTruthy();

    // Friendly / target sub-views MUST NOT be present.
    expect(screen.queryByTestId("inspector-friendly")).toBeNull();
    expect(screen.queryByTestId("inspector-target")).toBeNull();

    // The opponent's real unit name ('Mad Cat Prime') MUST NOT appear anywhere
    // in the rendered DOM — not in text, aria-label, or test-id values.
    const domText = root.textContent ?? "";
    expect(domText).not.toContain("Mad Cat Prime");
    expect(domText).not.toContain("mad-cat-prime");

    // The raw numeric heat value (7) MUST NOT appear as text.
    expect(domText).not.toContain("7");

    // Generic placeholder MUST be visible.
    expect(domText).toContain("Unknown Contact");
  });

  it("renders redacted view at unknown tier — zero identifying info in DOM", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={OPPONENT_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        opponentVisibilityScopes={{
          [OPPONENT_PLAYER_ID]: "unknown",
        }}
      />,
    );

    const root = screen.getByTestId("tactical-unit-inspector");
    const domText = root.textContent ?? "";

    expect(screen.getByTestId("inspector-redacted")).toBeTruthy();
    expect(domText).not.toContain("Mad Cat Prime");
    expect(domText).not.toContain("7"); // raw heat
    expect(domText).toContain("Unknown Contact");
  });

  // ---------------------------------------------------------------------------
  // 5. Default tier fallback: missing opponentVisibilityScopes entry → 'rough'
  // ---------------------------------------------------------------------------

  it("falls back to rough tier when opponent is absent from scope map", () => {
    render(
      <TacticalUnitInspector
        inspectedUnitId={OPPONENT_ID}
        session={session}
        viewerPlayerId={VIEWER_PLAYER_ID}
        viewerSide={GameSide.Player}
        // No entry for OPPONENT_PLAYER_ID — should default to 'rough'
        opponentVisibilityScopes={{}}
      />,
    );

    // Target view (rough) renders damage band, not exact numbers.
    expect(screen.getByTestId("inspector-target")).toBeTruthy();
    expect(screen.getByTestId("inspector-damage-band")).toBeTruthy();
    expect(screen.queryByTestId("inspector-heat")).toBeNull();
  });
});
