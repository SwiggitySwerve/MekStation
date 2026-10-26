import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { TabIssueNotice } from '../TabIssueNotice';

describe('TabIssueNotice', () => {
  it('names the issue and its fix beside a link to every issue', () => {
    const onShowAll = jest.fn();
    render(
      <TabIssueNotice
        notice={{
          severity: 'warning',
          summary: '1 warning: Runs hot',
          hint: 'add heat sinks in Cooling',
        }}
        onShowAll={onShowAll}
      />,
    );

    const notice = screen.getByTestId('tab-issue-notice');
    expect(notice).toHaveAttribute('data-severity', 'warning');
    expect(notice).toHaveTextContent(
      '1 warning: Runs hot — add heat sinks in Cooling',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show all issues' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('omits the fix when the tab has several issues', () => {
    render(
      <TabIssueNotice
        notice={{ severity: 'error', summary: '2 errors: A; B' }}
        onShowAll={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('tab-issue-notice-hint')).toBeNull();
    expect(screen.getByTestId('tab-issue-notice')).toHaveTextContent(
      '2 errors: A; B',
    );
  });

  it.each([
    ['1 warning: Runs hot', 'Runs hot', true],
    ['1 warning: Runs hot', undefined, false],
    ['2 warnings: Runs hot; Unplaced equipment', 'Runs hot', false],
    ['1 warning: Unplaced equipment', 'Runs hot', false],
  ] as const)(
    'suppresses %s on phones only when already named (%s)',
    (summary, statusRowIssue, hidden) => {
      render(
        <TabIssueNotice
          notice={{ severity: 'warning', summary }}
          onShowAll={jest.fn()}
          statusRowIssue={statusRowIssue}
        />,
      );
      const notice = screen.getByTestId('tab-issue-notice');
      if (hidden) expect(notice).toHaveClass('max-sm:hidden');
      else expect(notice).not.toHaveClass('max-sm:hidden');
      expect(notice).not.toHaveClass('hidden');
    },
  );
});
