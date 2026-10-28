import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { TabIssueNotice } from '../TabIssueNotice';
import { COOLING_CARD_ID } from '../tabIssueTargets';

describe('TabIssueNotice', () => {
  it('names the issue and its fix beside a link to every issue', () => {
    const onShowAll = jest.fn();
    render(
      <TabIssueNotice
        notice={{
          severity: 'warning',
          summary: '1 warning: Runs Hot',
          hint: 'add heat sinks in Cooling',
        }}
        onShowAll={onShowAll}
      />,
    );

    const notice = screen.getByTestId('tab-issue-notice');
    expect(notice).toHaveAttribute('data-severity', 'warning');
    expect(notice).toHaveTextContent(
      '1 warning: Runs Hot — add heat sinks in Cooling',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show All Issues' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('links the section named in the fix and focuses its control', () => {
    const scrollIntoView = jest.fn();
    render(
      <>
        <section
          id={COOLING_CARD_ID}
          data-focus-target="heat-sink-count"
          ref={(node) => {
            if (node) node.scrollIntoView = scrollIntoView;
          }}
        >
          <select aria-label="Heat Sink Type" />
          <input id="heat-sink-count" aria-label="Heat sink count" />
        </section>
        <TabIssueNotice
          notice={{
            severity: 'warning',
            summary: '1 warning: Runs Hot',
            hint: 'add heat sinks in Cooling',
            hintTarget: { text: 'Cooling', id: COOLING_CARD_ID },
          }}
          onShowAll={jest.fn()}
        />
      </>,
    );

    expect(screen.getByTestId('tab-issue-notice-hint')).toHaveTextContent(
      '— add heat sinks in Cooling',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go to Cooling' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Heat sink count')).toHaveFocus();
  });

  it('keeps the fix plain when it names no section', () => {
    render(
      <TabIssueNotice
        notice={{
          severity: 'warning',
          summary: '1 warning: Runs Hot',
          hint: 'add heat sinks in Cooling',
        }}
        onShowAll={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('tab-issue-notice-target')).toBeNull();
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
    ['1 warning: Runs Hot', 'Runs Hot', true],
    ['1 warning: Runs Hot', undefined, false],
    ['2 warnings: Runs Hot; Unplaced equipment', 'Runs Hot', false],
    ['1 warning: Unplaced equipment', 'Runs Hot', false],
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
