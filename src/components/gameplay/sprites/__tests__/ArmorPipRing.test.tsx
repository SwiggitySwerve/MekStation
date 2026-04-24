/**
 * Tests for ArmorPipRing — the damage-overlay pip ring that sits around a
 * mech silhouette.
 *
 * Covers:
 *   - Default (no state): renders 8 biped dots
 *   - Quad state: renders 6 dots in the quad layout, no arm pips
 *   - Per-location color coding (full=green, partial=yellow, structure=orange
 *     as stripe pattern, destroyed=red outline no fill)
 *   - Missing locations are omitted
 *   - Low-zoom simplification (no stripes) and cutoff below 0.35 (no ring)
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Armor Pip Damage Overlay
 */

import { render } from '@testing-library/react';
import React from 'react';

import type {
  ArmorPipState,
  BipedPipLocation,
  PipLocationState,
  QuadPipLocation,
} from '@/types/gameplay';

import { ArmorPipRing } from '../ArmorPipRing';

// =============================================================================
// Helpers
// =============================================================================

/** Wrap the ring in an <svg> root so jsdom handles SVG children correctly. */
function renderInSvg(ui: React.ReactElement): { svg: SVGSVGElement } {
  const { container } = render(<svg>{ui}</svg>);
  return { svg: container.querySelector('svg')! };
}

/** Build a biped location record where every location has the same state. */
function uniformBipedLocations(
  state: PipLocationState,
): Record<BipedPipLocation, PipLocationState> {
  return {
    head: state,
    centerTorso: state,
    leftTorso: state,
    rightTorso: state,
    leftArm: state,
    rightArm: state,
    leftLeg: state,
    rightLeg: state,
  };
}

/** Build a biped `ArmorPipState` filled with one uniform state. */
function uniformBiped(state: PipLocationState): ArmorPipState {
  return { archetype: 'humanoid', locations: uniformBipedLocations(state) };
}

/** Biped state with one location overridden. */
function bipedWithOverride(
  location: BipedPipLocation,
  overrideState: PipLocationState,
): ArmorPipState {
  const base = uniformBipedLocations('full');
  return {
    archetype: 'humanoid',
    locations: { ...base, [location]: overrideState },
  };
}

/** LAM state (same shape as biped, different archetype tag). */
function lamState(state: PipLocationState): ArmorPipState {
  return { archetype: 'lam', locations: uniformBipedLocations(state) };
}

/** Build a quad location record where every location has the same state. */
function uniformQuadLocations(
  state: PipLocationState,
): Record<QuadPipLocation, PipLocationState> {
  return {
    head: state,
    centerTorso: state,
    frontLeftLeg: state,
    frontRightLeg: state,
    rearLeftLeg: state,
    rearRightLeg: state,
  };
}

/** Build a quad `ArmorPipState` filled with one uniform state. */
function uniformQuad(state: PipLocationState): ArmorPipState {
  return { archetype: 'quad', locations: uniformQuadLocations(state) };
}

// =============================================================================
// Default (no state)
// =============================================================================

describe('ArmorPipRing — default state', () => {
  it('renders 8 pip dots when no state is supplied (biped default)', () => {
    const { svg } = renderInSvg(<ArmorPipRing patternKey="test" />);
    const dots = svg.querySelectorAll('[data-pip-state]');
    expect(dots.length).toBe(8);
    dots.forEach((d) => expect(d.getAttribute('data-pip-state')).toBe('full'));
  });

  it('applies the green fill to full-armor pips', () => {
    const { svg } = renderInSvg(<ArmorPipRing patternKey="test" />);
    const dots = svg.querySelectorAll("[data-pip-state='full']");
    expect(dots.length).toBe(8);
    expect(dots[0].getAttribute('fill')).toBe('#16a34a');
  });
});

// =============================================================================
// Archetype layouts
// =============================================================================

describe('ArmorPipRing — archetype layouts', () => {
  it('renders 6 pips for a quad unit (no arm pips)', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing patternKey="q" state={uniformQuad('full')} />,
    );
    const dots = svg.querySelectorAll('[data-pip-state]');
    expect(dots.length).toBe(6);
  });

  it('renders 8 pips for a biped unit', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing patternKey="b" state={uniformBiped('full')} />,
    );
    const dots = svg.querySelectorAll('[data-pip-state]');
    expect(dots.length).toBe(8);
  });

  it('renders 8 pips for a LAM unit (biped layout)', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing patternKey="l" state={lamState('full')} />,
    );
    const dots = svg.querySelectorAll('[data-pip-state]');
    expect(dots.length).toBe(8);
  });
});

// =============================================================================
// Per-location state colors / shape
// =============================================================================

describe('ArmorPipRing — per-location state', () => {
  it('partial state paints yellow', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing
        patternKey="p"
        state={bipedWithOverride('rightArm', 'partial')}
      />,
    );
    const partialDots = svg.querySelectorAll("[data-pip-state='partial']");
    expect(partialDots.length).toBe(1);
    expect(partialDots[0].getAttribute('fill')).toBe('#facc15');
  });

  it('structure state uses the stripe pattern fill', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing
        patternKey="s"
        state={bipedWithOverride('centerTorso', 'structure')}
      />,
    );
    const structureDots = svg.querySelectorAll("[data-pip-state='structure']");
    expect(structureDots.length).toBe(1);
    expect(structureDots[0].getAttribute('fill')).toBe(
      'url(#armor-pip-stripe-s)',
    );
  });

  it('destroyed state renders a red outline with no fill', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing
        patternKey="d"
        state={bipedWithOverride('leftLeg', 'destroyed')}
      />,
    );
    const destroyedDots = svg.querySelectorAll("[data-pip-state='destroyed']");
    expect(destroyedDots.length).toBe(1);
    expect(destroyedDots[0].getAttribute('fill')).toBe('none');
    expect(destroyedDots[0].getAttribute('stroke')).toBe('#dc2626');
  });

  it('missing locations are omitted from the ring', () => {
    const base = uniformBipedLocations('full');
    const state: ArmorPipState = {
      archetype: 'humanoid',
      locations: {
        ...base,
        rightArm: 'missing',
        leftArm: 'missing',
      },
    };
    const { svg } = renderInSvg(<ArmorPipRing patternKey="m" state={state} />);
    const dots = svg.querySelectorAll('[data-pip-state]');
    expect(dots.length).toBe(6);
  });
});

// =============================================================================
// Zoom behaviour
// =============================================================================

describe('ArmorPipRing — zoom behaviour', () => {
  it('hides the ring entirely below zoom 0.35', () => {
    const { container } = render(
      <svg>
        <ArmorPipRing patternKey="low" zoom={0.3} />
      </svg>,
    );
    expect(
      container.querySelector("[data-testid='armor-pip-ring']"),
    ).toBeNull();
  });

  it('suppresses the stripe pattern below zoom 0.6', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing
        patternKey="simplify"
        state={bipedWithOverride('centerTorso', 'structure')}
        zoom={0.5}
      />,
    );
    expect(svg.querySelector('pattern')).toBeNull();
    const structureDots = svg.querySelectorAll("[data-pip-state='structure']");
    expect(structureDots[0].getAttribute('fill')).toBe('#f97316');
  });

  it('emits the stripe pattern at zoom >= 0.6', () => {
    const { svg } = renderInSvg(
      <ArmorPipRing
        patternKey="full-zoom"
        state={bipedWithOverride('centerTorso', 'structure')}
        zoom={1}
      />,
    );
    expect(
      svg.querySelector('pattern#armor-pip-stripe-full-zoom'),
    ).not.toBeNull();
  });
});
