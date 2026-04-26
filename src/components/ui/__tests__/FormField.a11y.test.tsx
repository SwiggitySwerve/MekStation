import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
/**
 * FormField a11y tests.
 *
 * Verifies the label/htmlFor binding, aria-describedby wiring for hint
 * and error states, and required-indicator hidden text all render
 * axe-clean across realistic combinations.
 */
import React from 'react';

import { FormField } from '@/components/ui/FormField';

describe('FormField a11y', () => {
  it('basic label + input has no violations', async () => {
    const { container } = render(
      <FormField label="Pilot name" htmlFor="pilot-name">
        <input id="pilot-name" type="text" />
      </FormField>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('with hint text has no violations', async () => {
    const { container } = render(
      <FormField
        label="Callsign"
        htmlFor="callsign"
        hint="Up to 16 characters."
      >
        <input id="callsign" type="text" />
      </FormField>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('with error message has no violations', async () => {
    const { container } = render(
      <FormField
        label="Tonnage"
        htmlFor="tonnage"
        error="Tonnage must be between 20 and 100."
      >
        <input id="tonnage" type="number" />
      </FormField>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('with required indicator has no violations', async () => {
    const { container } = render(
      <FormField label="Chassis" htmlFor="chassis" required>
        <input id="chassis" type="text" />
      </FormField>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('with select control has no violations', async () => {
    const { container } = render(
      <FormField label="Tech base" htmlFor="tech-base" required>
        <select id="tech-base" defaultValue="is">
          <option value="is">Inner Sphere</option>
          <option value="clan">Clan</option>
        </select>
      </FormField>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
