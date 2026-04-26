import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
/**
 * Toast a11y tests.
 *
 * Verifies the live-region container, role="alert" item, dismiss button
 * label, and action button render axe-clean across variants.
 */
import React from 'react';

import { ToastProvider, useToast } from '@/components/ui/Toast';

// Helper that mounts a toast inside the provider then immediately schedules
// a single addToast on mount, so axe sees the live ToastItem in the DOM.
function ToastFixture({
  variant,
  withAction,
}: {
  variant: 'info' | 'success' | 'warning' | 'error';
  withAction?: boolean;
}): React.ReactElement {
  const { addToast } = useToast();
  React.useEffect(() => {
    addToast({
      message: 'Reactor stable.',
      variant,
      duration: 0, // persistent so axe sees it
      action: withAction
        ? { label: 'Undo', onClick: () => undefined }
        : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div data-testid="fixture-root" />;
}

describe('Toast a11y', () => {
  it.each(['info', 'success', 'warning', 'error'] as const)(
    'has no axe violations for variant=%s (no action)',
    async (variant) => {
      const { container } = render(
        <ToastProvider>
          <ToastFixture variant={variant} />
        </ToastProvider>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    },
  );

  it('has no axe violations when an action button is present', async () => {
    const { container } = render(
      <ToastProvider>
        <ToastFixture variant="info" withAction />
      </ToastProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders no toasts (empty state) without violations', async () => {
    const { container } = render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
