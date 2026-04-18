/**
 * Unit tests for ArmorPipRow shared primitive.
 *
 * Validates:
 *  - Correct number of pip spans rendered
 *  - ARIA label format
 *  - Clamping of current > max
 *  - Orientation class switching
 */

import { render } from '@testing-library/react';
import React from 'react';

import { ArmorPipRow } from '../ArmorPipRow';

describe('ArmorPipRow', () => {
  it('renders max pip spans', () => {
    const { container } = render(
      <ArmorPipRow label="Front" current={3} max={8} />,
    );
    // Each pip is a <span> inside the wrapper div
    const pips = container.querySelectorAll('span');
    expect(pips).toHaveLength(8);
  });

  it('sets correct aria-label with current/max', () => {
    const { container } = render(
      <ArmorPipRow label="Nose" current={5} max={10} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute('aria-label')).toBe('Nose: 5 of 10');
  });

  it('clamps current above max without crashing', () => {
    const { container } = render(
      <ArmorPipRow label="Head" current={20} max={5} />,
    );
    const pips = container.querySelectorAll('span');
    expect(pips).toHaveLength(5);
  });

  it('renders 0 pips when max is 0', () => {
    const { container } = render(
      <ArmorPipRow label="Rotor" current={0} max={0} />,
    );
    const pips = container.querySelectorAll('span');
    expect(pips).toHaveLength(0);
  });

  it('applies column flex class when orientation is column', () => {
    const { container } = render(
      <ArmorPipRow label="T1" current={3} max={7} orientation="column" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-col');
  });

  it('applies row flex class when orientation is row (default)', () => {
    const { container } = render(
      <ArmorPipRow label="T1" current={3} max={7} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-row');
  });
});
