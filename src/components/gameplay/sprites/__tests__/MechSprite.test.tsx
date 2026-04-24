/**
 * Tests for MechSprite — the silhouette renderer that sits at a hex.
 *
 * Covers:
 *   - Rotation matches `facing * 60deg` (spec: Built-in Facing Indicator,
 *     Scenario "Facing rotates sprite and indicator together")
 *   - Selection ring renders only when `isSelected === true`
 *   - Side tint applied to both the sprite body and the shape overlay
 *   - Low-zoom glyph collapse (< 0.6) swaps in the archetype glyph
 *   - Destroyed units render with the destroyed tint, not the side tint
 *   - Sprite id resolves to the right archetype × weight
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Built-in Facing Indicator
 *        §Sprite Scaling
 *        §Side Tint and Selection Ring
 */

import { render } from '@testing-library/react';
import React from 'react';

import { WeightClass } from '@/types/enums/WeightClass';
import { Facing, GameSide } from '@/types/gameplay';

import { MechSprite } from '../MechSprite';

// =============================================================================
// Helpers
// =============================================================================

/** Wrap the sprite in an <svg> so jsdom treats its children correctly. */
function renderInSvg(ui: React.ReactElement): { svg: SVGSVGElement } {
  const { container } = render(<svg>{ui}</svg>);
  return { svg: container.querySelector('svg')! };
}

type TokenShape = React.ComponentProps<typeof MechSprite>['token'];

function makeToken(overrides: Partial<TokenShape> = {}): TokenShape {
  return {
    weightClass: WeightClass.MEDIUM,
    facing: Facing.North,
    side: GameSide.Player,
    isDestroyed: false,
    ...overrides,
  };
}

// =============================================================================
// Facing rotation
// =============================================================================

describe('MechSprite — facing rotation', () => {
  const cases: Array<{ facing: Facing; expected: number }> = [
    { facing: Facing.North, expected: 0 },
    { facing: Facing.Northeast, expected: 60 },
    { facing: Facing.Southeast, expected: 120 },
    { facing: Facing.South, expected: 180 },
    { facing: Facing.Southwest, expected: 240 },
    { facing: Facing.Northwest, expected: 300 },
  ];

  it.each(cases)(
    'facing $facing → rotate($expected)',
    ({ facing, expected }) => {
      const { svg } = renderInSvg(<MechSprite token={makeToken({ facing })} />);
      const rotator = svg.querySelector("[data-testid='mech-sprite-rotator']");
      expect(rotator).not.toBeNull();
      expect(rotator!.getAttribute('data-rotation-deg')).toBe(String(expected));
      expect(rotator!.getAttribute('transform')).toBe(`rotate(${expected})`);
    },
  );
});

// =============================================================================
// Selection ring
// =============================================================================

describe('MechSprite — selection ring', () => {
  it('renders the selection ring when isSelected=true', () => {
    const { svg } = renderInSvg(<MechSprite token={makeToken()} isSelected />);
    expect(
      svg.querySelector("[data-testid='mech-sprite-selection-ring']"),
    ).not.toBeNull();
  });

  it('does not render the selection ring by default', () => {
    const { svg } = renderInSvg(<MechSprite token={makeToken()} />);
    expect(
      svg.querySelector("[data-testid='mech-sprite-selection-ring']"),
    ).toBeNull();
  });
});

// =============================================================================
// Side tint
// =============================================================================

describe('MechSprite — side tint', () => {
  it('applies blue for Player', () => {
    const { svg } = renderInSvg(
      <MechSprite token={makeToken({ side: GameSide.Player })} />,
    );
    const body = svg.querySelector(
      "[data-testid='mech-sprite-body']",
    ) as SVGGElement | null;
    expect(body).not.toBeNull();
    expect(body!.getAttribute('style')).toContain('color: rgb(59, 130, 246)');
  });

  it('applies red for Opponent', () => {
    const { svg } = renderInSvg(
      <MechSprite token={makeToken({ side: GameSide.Opponent })} />,
    );
    const body = svg.querySelector(
      "[data-testid='mech-sprite-body']",
    ) as SVGGElement | null;
    expect(body!.getAttribute('style')).toContain('color: rgb(239, 68, 68)');
  });

  it('honors tintOverride for neutral-like units', () => {
    const { svg } = renderInSvg(
      <MechSprite token={makeToken()} tintOverride="#9ca3af" />,
    );
    const body = svg.querySelector(
      "[data-testid='mech-sprite-body']",
    ) as SVGGElement | null;
    expect(body!.getAttribute('style')).toContain('color: rgb(156, 163, 175)');
  });

  it('applies gray when destroyed regardless of side', () => {
    const { svg } = renderInSvg(
      <MechSprite
        token={makeToken({ side: GameSide.Player, isDestroyed: true })}
      />,
    );
    const body = svg.querySelector(
      "[data-testid='mech-sprite-body']",
    ) as SVGGElement | null;
    expect(body!.getAttribute('style')).toContain('color: rgb(107, 114, 128)');
  });
});

// =============================================================================
// Colorblind-safe shape overlay
// =============================================================================

describe('MechSprite — colorblind shape overlay', () => {
  it('renders a Player shape marker (triangle)', () => {
    const { svg } = renderInSvg(
      <MechSprite token={makeToken({ side: GameSide.Player })} />,
    );
    expect(
      svg.querySelector(`[data-testid='sprite-side-shape-${GameSide.Player}']`),
    ).not.toBeNull();
  });

  it('renders an Opponent shape marker (square)', () => {
    const { svg } = renderInSvg(
      <MechSprite token={makeToken({ side: GameSide.Opponent })} />,
    );
    expect(
      svg.querySelector(
        `[data-testid='sprite-side-shape-${GameSide.Opponent}']`,
      ),
    ).not.toBeNull();
  });
});

// =============================================================================
// Sprite id resolution (archetype × weight)
// =============================================================================

describe('MechSprite — sprite id resolution', () => {
  it('picks humanoid-medium by default', () => {
    const { svg } = renderInSvg(<MechSprite token={makeToken()} />);
    const sprite = svg.querySelector("[data-testid='mech-sprite']");
    expect(sprite!.getAttribute('data-sprite-id')).toBe('humanoid-medium');
  });

  it('picks quad-heavy for a heavy quad', () => {
    const { svg } = renderInSvg(
      <MechSprite
        token={makeToken({ weightClass: WeightClass.HEAVY, isQuad: true })}
      />,
    );
    const sprite = svg.querySelector("[data-testid='mech-sprite']");
    expect(sprite!.getAttribute('data-sprite-id')).toBe('quad-heavy');
  });

  it('picks lam-assault for an assault LAM', () => {
    const { svg } = renderInSvg(
      <MechSprite
        token={makeToken({ weightClass: WeightClass.ASSAULT, isLAM: true })}
      />,
    );
    const sprite = svg.querySelector("[data-testid='mech-sprite']");
    expect(sprite!.getAttribute('data-sprite-id')).toBe('lam-assault');
  });
});

// =============================================================================
// Zoom behaviour
// =============================================================================

describe('MechSprite — zoom behaviour', () => {
  it('renders the full silhouette at zoom >= 0.6', () => {
    const { svg } = renderInSvg(<MechSprite token={makeToken()} zoom={0.8} />);
    expect(
      svg.querySelector("[data-testid='mech-sprite-body']"),
    ).not.toBeNull();
    expect(svg.querySelector("[data-testid='mech-sprite-glyph']")).toBeNull();
  });

  it('collapses to the archetype glyph at zoom < 0.6', () => {
    const { svg } = renderInSvg(<MechSprite token={makeToken()} zoom={0.4} />);
    expect(svg.querySelector("[data-testid='mech-sprite-body']")).toBeNull();
    expect(
      svg.querySelector("[data-testid='mech-sprite-glyph']"),
    ).not.toBeNull();
  });

  it('reports zoom mode via data-zoom-mode attribute', () => {
    const { svg: fullSvg } = renderInSvg(
      <MechSprite token={makeToken()} zoom={1} />,
    );
    expect(
      fullSvg
        .querySelector("[data-testid='mech-sprite']")!
        .getAttribute('data-zoom-mode'),
    ).toBe('full');

    const { svg: glyphSvg } = renderInSvg(
      <MechSprite token={makeToken()} zoom={0.3} />,
    );
    expect(
      glyphSvg
        .querySelector("[data-testid='mech-sprite']")!
        .getAttribute('data-zoom-mode'),
    ).toBe('glyph');
  });
});
