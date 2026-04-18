/**
 * Tests for UnitTokenForType — central dispatcher for per-type hex map tokens.
 *
 * Uses @testing-library/react to render the SVG dispatcher and asserts that:
 *   1. Each unitType routes to the correct per-type renderer (identified via data-testid).
 *   2. BA mounted-on-mech path renders the badge overlay next to the host token.
 *   3. Click handler (onClick) is forwarded correctly.
 *
 * All SVG rendering runs in jsdom. Components are rendered inside an <svg>
 * wrapper because jsdom requires SVG children to live inside an <svg> root.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — dispatcher routes to correct renderer per unit type
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { GameSide, TokenUnitType, Facing } from "@/types/gameplay";
import type { IUnitToken } from "@/types/gameplay";

import { UnitTokenForType } from "../UnitTokenForType";

// =============================================================================
// Helpers
// =============================================================================

/** Wrap the dispatcher in an <svg> element so jsdom renders it correctly. */
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

/** Base token fixture — override fields per test. */
function makeToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: "unit-1",
    name: "Test Unit",
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: "TST-1",
    unitType: TokenUnitType.Mech,
    ...overrides,
  };
}

// =============================================================================
// Dispatcher routing — each unitType → correct wrapper data-testid
// =============================================================================

describe("UnitTokenForType dispatcher routing", () => {
  const noop = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders a <g> with data-testid="unit-token-unit-1" for any token', () => {
    const token = makeToken({ unitType: TokenUnitType.Mech });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    expect(screen.getByTestId("unit-token-unit-1")).toBeInTheDocument();
  });

  it("Mech → renders circular mech body (r attribute present)", () => {
    const token = makeToken({ unitType: TokenUnitType.Mech });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    // MechToken renders a <circle> element as the body — assert at least one circle exists.
    const wrapper = screen.getByTestId("unit-token-unit-1");
    expect(wrapper.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("Vehicle → renders a <rect> body element", () => {
    const token = makeToken({ unitType: TokenUnitType.Vehicle });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId("unit-token-unit-1");
    // VehicleToken uses a <rect> for its body shape.
    expect(wrapper.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("Aerospace → renders altitude badge text element", () => {
    const token = makeToken({
      unitType: TokenUnitType.Aerospace,
      altitude: 3,
      velocity: 5,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId("unit-token-unit-1");
    // AerospaceToken renders an altitude badge; the value "3" must appear in the SVG text.
    const texts = Array.from(wrapper.querySelectorAll("text")).map(
      (el) => el.textContent,
    );
    expect(texts.some((t) => t?.includes("3"))).toBe(true);
  });

  it("Infantry → renders trooper-count label text", () => {
    const token = makeToken({
      unitType: TokenUnitType.Infantry,
      infantryCount: 28,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId("unit-token-unit-1");
    const texts = Array.from(wrapper.querySelectorAll("text")).map(
      (el) => el.textContent,
    );
    expect(texts.some((t) => t?.includes("28"))).toBe(true);
  });

  it("ProtoMech → renders proto-count indicator circles", () => {
    const token = makeToken({
      unitType: TokenUnitType.ProtoMech,
      protoCount: 5,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId("unit-token-unit-1");
    // ProtoMechToken renders individual proto silhouette circles.
    expect(wrapper.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("BattleArmor standalone → renders pip cluster (circles), no ba-badge testid", () => {
    const token = makeToken({
      unitType: TokenUnitType.BattleArmor,
      trooperCount: 4,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    // Not mounted → no ba-badge testid.
    expect(screen.queryByTestId("ba-badge-unit-1")).toBeNull();
    const wrapper = screen.getByTestId("unit-token-unit-1");
    expect(wrapper.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("undefined unitType defaults to Mech renderer", () => {
    const token = makeToken({ unitType: undefined });
    renderInSvg(<UnitTokenForType token={token} onClick={noop} />);
    const wrapper = screen.getByTestId("unit-token-unit-1");
    // Mech renderer: circles present.
    expect(wrapper.querySelectorAll("circle").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// BA mounted-on-mech path — badge overlaid on host
// =============================================================================

describe("BattleArmor mounted-on-mech badge", () => {
  const noop = jest.fn();

  it("renders ba-badge testid when mountedOn is set and host token is present", () => {
    const hostToken = makeToken({
      unitId: "mech-host",
      unitType: TokenUnitType.Mech,
    });
    const baToken = makeToken({
      unitId: "ba-1",
      unitType: TokenUnitType.BattleArmor,
      mountedOn: "mech-host",
      trooperCount: 4,
    });

    renderInSvg(
      <>
        <UnitTokenForType
          token={hostToken}
          onClick={noop}
          allTokens={[hostToken, baToken]}
        />
        <UnitTokenForType
          token={baToken}
          onClick={noop}
          allTokens={[hostToken, baToken]}
        />
      </>,
    );

    // Badge variant renders inside unit-token-ba-1 with data-testid="ba-badge-ba-1".
    expect(screen.getByTestId("ba-badge-ba-1")).toBeInTheDocument();
  });

  it("BA without host token falls back to standalone rendering", () => {
    const baToken = makeToken({
      unitId: "ba-orphan",
      unitType: TokenUnitType.BattleArmor,
      mountedOn: "missing-mech",
      trooperCount: 4,
    });

    renderInSvg(
      <UnitTokenForType token={baToken} onClick={noop} allTokens={[baToken]} />,
    );

    // Host not found → standalone path renders the normal token wrapper.
    expect(screen.getByTestId("unit-token-ba-orphan")).toBeInTheDocument();
    expect(screen.queryByTestId("ba-badge-ba-orphan")).toBeNull();
  });
});

// =============================================================================
// onClick event forwarding
// =============================================================================

describe("UnitTokenForType onClick forwarding", () => {
  it("calls onClick with the token unitId when the wrapper <g> is clicked", () => {
    const onClick = jest.fn();
    const token = makeToken({
      unitId: "mech-click-test",
      unitType: TokenUnitType.Mech,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={onClick} />);

    fireEvent.click(screen.getByTestId("unit-token-mech-click-test"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith("mech-click-test");
  });

  it("calls onClick for a Vehicle token click", () => {
    const onClick = jest.fn();
    const token = makeToken({
      unitId: "veh-1",
      unitType: TokenUnitType.Vehicle,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={onClick} />);

    fireEvent.click(screen.getByTestId("unit-token-veh-1"));
    expect(onClick).toHaveBeenCalledWith("veh-1");
  });

  it("calls onClick for a mounted BA badge click", () => {
    const onClick = jest.fn();
    const hostToken = makeToken({
      unitId: "mech-host-2",
      unitType: TokenUnitType.Mech,
    });
    const baToken = makeToken({
      unitId: "ba-click",
      unitType: TokenUnitType.BattleArmor,
      mountedOn: "mech-host-2",
      trooperCount: 3,
    });

    renderInSvg(
      <>
        <UnitTokenForType
          token={hostToken}
          onClick={onClick}
          allTokens={[hostToken, baToken]}
        />
        <UnitTokenForType
          token={baToken}
          onClick={onClick}
          allTokens={[hostToken, baToken]}
        />
      </>,
    );

    // Click the BA token wrapper (mounted path uses unit-token-ba-click testid).
    fireEvent.click(screen.getByTestId("unit-token-ba-click"));
    expect(onClick).toHaveBeenCalledWith("ba-click");
  });
});

// =============================================================================
// Event projection — destroyed state wires through correctly
// =============================================================================

describe("UnitTokenForType event projection", () => {
  it("passes destroyed state from token.isDestroyed to the renderer", () => {
    const token = makeToken({
      unitType: TokenUnitType.Mech,
      isDestroyed: true,
    });
    renderInSvg(<UnitTokenForType token={token} onClick={jest.fn()} />);
    // MechToken renders data-testid="unit-destroyed-overlay" when destroyed.
    expect(screen.getByTestId("unit-destroyed-overlay")).toBeInTheDocument();
  });
});
