import { act, fireEvent, render, screen } from '@testing-library/react';

import { useCriticalSlotOverflow } from '../useCriticalSlotOverflow';

function Fixture() {
  const { rootRef, hasMoreBelow } = useCriticalSlotOverflow(true);
  return (
    <div ref={rootRef}>
      <span>{hasMoreBelow ? 'More below' : 'Fits'}</span>
      <div aria-label="Critical slot locations" role="region">
        <div>Slots</div>
      </div>
    </div>
  );
}

it('shows the cue only for content below the viewport and updates after resize and scroll', () => {
  render(<Fixture />);
  const viewport = screen.getByRole('region');
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, value: 600 },
    scrollHeight: { configurable: true, value: 600 },
  });
  fireEvent(window, new Event('resize'));
  expect(screen.getByText('Fits')).toBeInTheDocument();

  Object.defineProperty(viewport, 'scrollHeight', {
    configurable: true,
    value: 700,
  });
  fireEvent(window, new Event('resize'));
  expect(screen.getByText('More below')).toBeInTheDocument();

  viewport.scrollTop = 100;
  fireEvent.scroll(viewport);
  expect(screen.getByText('Fits')).toBeInTheDocument();

  act(() => {
    viewport.scrollTop = 0;
  });
  fireEvent.scroll(viewport);
  expect(screen.getByText('More below')).toBeInTheDocument();

  Object.defineProperty(viewport, 'clientHeight', {
    configurable: true,
    value: 0,
  });
  fireEvent(window, new Event('resize'));
  expect(screen.getByText('Fits')).toBeInTheDocument();
});
