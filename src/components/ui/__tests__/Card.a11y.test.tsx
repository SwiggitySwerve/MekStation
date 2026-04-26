import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
/**
 * Card a11y tests.
 *
 * Card is used everywhere in the UI; this validates each visual variant
 * and the `CardSection` heading wrapper render axe-clean. Notable check:
 * the `accent-bottom` variant adds a decorative div that should not
 * trip "regions without name" or similar landmark rules.
 */
import React from 'react';

import { Card, CardSection } from '@/components/ui/Card';

const VARIANTS = [
  'default',
  'dark',
  'header',
  'interactive',
  'gradient',
  'accent-left',
  'accent-bottom',
] as const;

describe('Card a11y', () => {
  it.each(VARIANTS)('has no axe violations for variant=%s', async (variant) => {
    const { container } = render(
      <Card variant={variant} accentColor="amber">
        <h2>Reactor Status</h2>
        <p>Heat sinks online.</p>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders as <section> with no violations', async () => {
    const { container } = render(
      <Card as="section">
        <h2>Loadout</h2>
        <p>Configuration locked.</p>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardSection a11y', () => {
  it('inline variant has no violations', async () => {
    const { container } = render(
      <CardSection title="Equipment" titleColor="amber">
        <ul>
          <li>Medium Laser</li>
          <li>SRM 6</li>
        </ul>
      </CardSection>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('asCard variant has no violations', async () => {
    const { container } = render(
      <CardSection title="Pilot" asCard>
        <p>Trained at Sun Tzu.</p>
      </CardSection>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('title-only (no children) has no violations', async () => {
    const { container } = render(<CardSection title="Section header" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
