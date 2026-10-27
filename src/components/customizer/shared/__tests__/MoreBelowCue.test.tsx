import { render, screen } from '@testing-library/react';
import React from 'react';

import { MoreBelowCue } from '../MoreBelowCue';
import { hasContentBelow } from '../scrollOverflow';

function viewport(client: number, scrollHeight: number, scrollTop: number) {
  const element = document.createElement('div');
  Object.defineProperties(element, {
    clientHeight: { value: client },
    scrollHeight: { value: scrollHeight },
    scrollTop: { value: scrollTop },
  });
  return element;
}

it('shows the hint only while the list has content below', () => {
  const { rerender } = render(
    <MoreBelowCue visible={false} label="Scroll for more equipment" />,
  );
  expect(screen.queryByTestId('more-below-cue')).toBeNull();
  rerender(<MoreBelowCue visible label="Scroll for more equipment" />);
  const cue = screen.getByTestId('more-below-cue');
  expect(cue).toHaveTextContent('Scroll for more equipment');
  expect(cue).toHaveAttribute('aria-hidden', 'true');
  expect(cue).not.toHaveTextContent('More below');
  rerender(<MoreBelowCue visible label="Scroll for more slots" />);
  expect(cue).toHaveTextContent('Scroll for more slots');
});

it('detects content below, ignoring sub-pixel overflow and hidden viewports', () => {
  expect(hasContentBelow(viewport(400, 700, 0))).toBe(true);
  expect(hasContentBelow(viewport(400, 700, 300))).toBe(false);
  expect(hasContentBelow(viewport(400, 401, 0))).toBe(false);
  expect(hasContentBelow(viewport(0, 700, 0))).toBe(false);
});
