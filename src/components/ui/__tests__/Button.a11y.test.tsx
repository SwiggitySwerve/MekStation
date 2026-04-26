import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
/**
 * Button a11y tests.
 *
 * Validates default + every variant + disabled + loading states render
 * axe-clean. Also covers the `PaginationButtons` group at low/mid/high
 * page positions to catch missing button labels at the edges.
 */
import React from 'react';

import { Button, PaginationButtons } from '@/components/ui/Button';

const VARIANTS = [
  'primary',
  'secondary',
  'ghost',
  'pagination',
  'danger',
  'success',
] as const;

describe('Button a11y', () => {
  it.each(VARIANTS)('has no axe violations for variant=%s', async (variant) => {
    const { container } = render(<Button variant={variant}>Save</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when disabled', async () => {
    const { container } = render(<Button disabled>Save</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when loading', async () => {
    const { container } = render(
      <Button isLoading aria-label="Saving">
        Save
      </Button>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with leftIcon + rightIcon', async () => {
    const { container } = render(
      <Button
        leftIcon={<span aria-hidden="true">L</span>}
        rightIcon={<span aria-hidden="true">R</span>}
      >
        Action
      </Button>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('PaginationButtons a11y', () => {
  it('has no violations on first page', async () => {
    const { container } = render(
      <PaginationButtons
        currentPage={1}
        totalPages={10}
        onPageChange={() => undefined}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations on middle page', async () => {
    const { container } = render(
      <PaginationButtons
        currentPage={5}
        totalPages={10}
        onPageChange={() => undefined}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations on last page', async () => {
    const { container } = render(
      <PaginationButtons
        currentPage={10}
        totalPages={10}
        onPageChange={() => undefined}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
