import { render, screen } from '@testing-library/react';
import React from 'react';

import { ReplayBlockedHistoryPanel } from '../ReplayBlockedHistoryPanel';

it('explains the writer mark and makes no current-version loading promise', () => {
  render(
    <ReplayBlockedHistoryPanel
      blocked={{
        sourceId: 'quick/marked',
        formatId: 'simulation-report-jsonl',
        formatVersion: 1,
        sourceDigest: 'a'.repeat(64),
        blockedLineCount: 1,
        blockedLines: [
          { line: 1, reason: 'unverifiable-event', eventType: 'psr_resolved' },
        ],
      }}
    />,
  );
  expect(
    screen.getByText(/writer found an event that the replay reader cannot/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /Current-version recordings can also contain unverifiable events/,
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(
      /recording should never be blocked|version load normally/,
    ),
  ).toBeNull();
});
