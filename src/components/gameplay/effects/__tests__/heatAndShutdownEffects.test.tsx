import { render } from '@testing-library/react';
import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

import { AmmoExplosionAura } from '../AmmoExplosionAura';
import { HeatGlow } from '../HeatGlow';
import { ShutdownOverlay } from '../ShutdownOverlay';
import { StartupPulse } from '../StartupPulse';

jest.mock('@/hooks/useReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(),
}));

const mockUsePrefersReducedMotion =
  usePrefersReducedMotion as jest.MockedFunction<
    typeof usePrefersReducedMotion
  >;

function renderInSvg(ui: React.ReactElement): SVGSVGElement {
  const { container } = render(<svg>{ui}</svg>);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('Expected svg root');
  return svg;
}

function getByTestId(root: ParentNode, testId: string): Element {
  const element = root.querySelector(`[data-testid='${testId}']`);
  if (!element) throw new Error(`Expected ${testId}`);
  return element;
}

describe('HeatGlow', () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  it('renders a filtered SVG glow with the 300ms threshold transition contract', () => {
    const svg = renderInSvg(<HeatGlow heat={15} idSuffix="unit-a" />);

    const root = getByTestId(svg, 'heat-glow');
    const halo = getByTestId(svg, 'heat-glow-halo');

    expect(root).toHaveAttribute('pointer-events', 'none');
    expect(root).toHaveAttribute('data-heat-threshold', 'overheat');
    expect(root).toHaveAttribute('data-layer-order', 'heat-glow');
    expect(root).toHaveAttribute('data-transition-ms', '300');
    expect(getByTestId(svg, 'heat-glow-filter')).toBeInTheDocument();
    expect(halo).toHaveAttribute('filter', 'url(#heat-glow-filter-unit-a)');
    expect(halo.getAttribute('style')).toContain('300ms');
  });

  it('pulses only at critical heat', () => {
    const hotSvg = renderInSvg(<HeatGlow heat={19} />);
    expect(hotSvg.querySelector("[data-testid='heat-glow-pulse']")).toBeNull();

    const criticalSvg = renderInSvg(<HeatGlow heat={20} />);
    expect(getByTestId(criticalSvg, 'heat-glow-pulse')).toHaveAttribute(
      'dur',
      '1.5s',
    );
    expect(
      getByTestId(criticalSvg, 'heat-glow-critical-core'),
    ).toBeInTheDocument();
  });

  it('renders textual heat badges where color alone is not enough', () => {
    const belowBadgeSvg = renderInSvg(<HeatGlow heat={14} />);
    expect(
      belowBadgeSvg.querySelector("[data-testid='heat-glow-badge']"),
    ).toBeNull();

    const overheatSvg = renderInSvg(<HeatGlow heat={15} />);
    expect(getByTestId(overheatSvg, 'heat-glow-badge')).toHaveTextContent(
      'OVERHEAT',
    );

    const criticalSvg = renderInSvg(<HeatGlow heat={22} />);
    expect(getByTestId(criticalSvg, 'heat-glow-badge')).toHaveTextContent(
      'CRITICAL',
    );
  });

  it('collapses to a static outline under reduced motion', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const svg = renderInSvg(<HeatGlow heat={22} />);

    expect(getByTestId(svg, 'heat-glow')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
    expect(svg.querySelector("[data-testid='heat-glow-pulse']")).toBeNull();
    expect(getByTestId(svg, 'heat-glow-reduced-outline')).toBeInTheDocument();
  });

  it('is suppressed when shutdown is definitive', () => {
    const svg = renderInSvg(<HeatGlow heat={22} isShutdown />);

    expect(svg.querySelector("[data-testid='heat-glow']")).toBeNull();
  });
});

describe('ShutdownOverlay', () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  it('desaturates child token content and labels the powered-down state', () => {
    const svg = renderInSvg(
      <ShutdownOverlay active idSuffix="atlas" unitName="Atlas">
        <circle data-testid="token-body" r="20" />
      </ShutdownOverlay>,
    );

    const root = getByTestId(svg, 'shutdown-overlay');
    const filteredContent = getByTestId(svg, 'shutdown-desaturated-content');

    expect(root).toHaveAttribute('pointer-events', 'none');
    expect(root).toHaveAttribute('data-suppresses-heat-glow', 'true');
    expect(root).toHaveAttribute('data-layer-order', 'shutdown-overlay');
    expect(filteredContent).toHaveAttribute(
      'filter',
      'url(#shutdown-desaturation-atlas)',
    );
    expect(getByTestId(svg, 'shutdown-desaturation-filter')).toContainHTML(
      'feColorMatrix',
    );
    expect(getByTestId(svg, 'shutdown-label')).toHaveTextContent(
      'POWERED DOWN',
    );
  });

  it('announces shutdown through an aria-live status region', () => {
    const svg = renderInSvg(
      <ShutdownOverlay active idSuffix="unit-a" unitName="Hunchback" />,
    );

    const liveRegion = getByTestId(svg, 'shutdown-live-region');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveTextContent('Hunchback powered down');
  });

  it('removes flicker under reduced motion', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const svg = renderInSvg(<ShutdownOverlay active />);

    expect(getByTestId(svg, 'shutdown-overlay')).toHaveAttribute(
      'data-flicker',
      'false',
    );
    expect(svg.querySelector("[data-testid='shutdown-flicker']")).toBeNull();
  });
});

describe('StartupPulse', () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  it('plays the success branch once for a restart attempt', () => {
    const svg = renderInSvg(<StartupPulse attemptId="turn-7" success />);
    const root = getByTestId(svg, 'startup-pulse');

    expect(root).toHaveAttribute('pointer-events', 'none');
    expect(root).toHaveAttribute('data-attempt-id', 'turn-7');
    expect(root).toHaveAttribute('data-replay-key', 'turn-7-success');
    expect(root).toHaveAttribute('data-outcome', 'success');
    expect(root).toHaveAttribute('data-duration-ms', '800');
    expect(root).toHaveAttribute('data-shutdown-remains', 'false');
    expect(getByTestId(svg, 'startup-pulse-scale')).toHaveAttribute(
      'repeatCount',
      '1',
    );
  });

  it('uses a shorter gray failure branch that leaves shutdown in place', () => {
    const svg = renderInSvg(
      <StartupPulse attemptId="turn-8" success={false} />,
    );
    const root = getByTestId(svg, 'startup-pulse');

    expect(root).toHaveAttribute('data-outcome', 'failure');
    expect(root).toHaveAttribute('data-duration-ms', '400');
    expect(root).toHaveAttribute('data-shutdown-remains', 'true');
    expect(getByTestId(svg, 'startup-pulse-color')).toHaveAttribute(
      'dur',
      '400ms',
    );
  });

  it('collapses to a single static snap under reduced motion', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const svg = renderInSvg(<StartupPulse attemptId={3} success />);

    expect(getByTestId(svg, 'startup-pulse')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
    expect(svg.querySelector("[data-testid='startup-pulse-scale']")).toBeNull();
    expect(getByTestId(svg, 'startup-pulse-static-snap')).toBeInTheDocument();
  });
});

describe('AmmoExplosionAura', () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  it('activates in ammo danger heat and renders below HeatGlow by contract', () => {
    const svg = renderInSvg(<AmmoExplosionAura heat={19} idSuffix="risk-a" />);
    const root = getByTestId(svg, 'ammo-explosion-aura');

    expect(root).toHaveAttribute('pointer-events', 'none');
    expect(root).toHaveAttribute('data-layer-order', 'ammo-explosion-aura');
    expect(root).toHaveAttribute('data-dismiss-transition-ms', '300');
    expect(getByTestId(svg, 'ammo-explosion-aura-pulse')).toHaveAttribute(
      'dur',
      '1s',
    );
    expect(getByTestId(svg, 'ammo-explosion-aura-halo')).toHaveAttribute(
      'filter',
      'url(#ammo-explosion-aura-risk-a)',
    );
  });

  it('auto-dismisses when heat leaves the danger range', () => {
    const safeSvg = renderInSvg(<AmmoExplosionAura heat={18} />);
    expect(
      safeSvg.querySelector("[data-testid='ammo-explosion-aura']"),
    ).toBeNull();

    const dangerSvg = renderInSvg(<AmmoExplosionAura heat={22} />);
    expect(getByTestId(dangerSvg, 'ammo-explosion-aura')).toBeInTheDocument();
  });

  it('uses a static ring under reduced motion', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const svg = renderInSvg(<AmmoExplosionAura heat={22} />);

    expect(getByTestId(svg, 'ammo-explosion-aura')).toHaveAttribute(
      'data-pulse',
      'false',
    );
    expect(
      svg.querySelector("[data-testid='ammo-explosion-aura-pulse']"),
    ).toBeNull();
    expect(
      getByTestId(svg, 'ammo-explosion-aura-red-ring'),
    ).toBeInTheDocument();
  });
});

describe('heat and shutdown visual indicator lane', () => {
  beforeEach(() => {
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  function HeatIndicatorLane({ heat }: { readonly heat: number }) {
    return (
      <>
        <AmmoExplosionAura heat={heat} />
        <HeatGlow heat={heat} />
      </>
    );
  }

  it('progresses from neutral heat to critical heat and activates ammo aura at 22', () => {
    const { container, rerender } = render(
      <svg>
        <HeatIndicatorLane heat={0} />
      </svg>,
    );

    expect(getByTestId(container, 'heat-glow')).toHaveAttribute(
      'data-heat-threshold',
      'normal',
    );
    expect(
      container.querySelector("[data-testid='ammo-explosion-aura']"),
    ).toBeNull();

    rerender(
      <svg>
        <HeatIndicatorLane heat={5} />
      </svg>,
    );
    expect(getByTestId(container, 'heat-glow')).toHaveAttribute(
      'data-heat-threshold',
      'warm',
    );

    rerender(
      <svg>
        <HeatIndicatorLane heat={10} />
      </svg>,
    );
    expect(getByTestId(container, 'heat-glow')).toHaveAttribute(
      'data-heat-threshold',
      'hot',
    );

    rerender(
      <svg>
        <HeatIndicatorLane heat={15} />
      </svg>,
    );
    expect(getByTestId(container, 'heat-glow')).toHaveAttribute(
      'data-heat-threshold',
      'overheat',
    );

    rerender(
      <svg>
        <HeatIndicatorLane heat={22} />
      </svg>,
    );
    expect(getByTestId(container, 'heat-glow')).toHaveAttribute(
      'data-heat-threshold',
      'critical',
    );
    expect(getByTestId(container, 'ammo-explosion-aura')).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll('[data-layer-order]')).map((node) =>
        node.getAttribute('data-layer-order'),
      ),
    ).toEqual(['ammo-explosion-aura', 'heat-glow']);
  });

  it('renders static visual forms only in reduced-motion mode', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const svg = renderInSvg(
      <>
        <AmmoExplosionAura heat={22} />
        <HeatGlow heat={22} />
        <ShutdownOverlay active />
        <StartupPulse attemptId="restart-1" success={false} />
      </>,
    );

    expect(svg.querySelector('animate')).toBeNull();
    expect(
      getByTestId(svg, 'ammo-explosion-aura-red-ring'),
    ).toBeInTheDocument();
    expect(getByTestId(svg, 'heat-glow-reduced-outline')).toBeInTheDocument();
    expect(getByTestId(svg, 'shutdown-overlay')).toHaveAttribute(
      'data-flicker',
      'false',
    );
    expect(getByTestId(svg, 'startup-pulse-static-snap')).toBeInTheDocument();
  });
});
