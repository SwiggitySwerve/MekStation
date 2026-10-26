import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
} from '@/components/customizer/tabs/CustomizerTabs';

function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollLeft: number; scrollWidth: number; clientWidth: number },
): void {
  for (const [key, value] of Object.entries(metrics))
    Object.defineProperty(element, key, { configurable: true, value });
}

describe('CustomizerTabs overflow cues', () => {
  it('shows a chevron cue on each edge that hides tabs and scrolls toward it', () => {
    render(
      <CustomizerTabs
        tabs={DEFAULT_CUSTOMIZER_TABS}
        activeTab="overview"
        onTabChange={jest.fn()}
        compact
      />,
    );
    const list = screen.getByRole('tablist');
    const scrollBy = jest.fn();
    list.scrollBy = scrollBy;
    expect(
      screen.queryByTestId('customizer-tabs-scroll-cue-left'),
    ).not.toBeInTheDocument();

    setScrollMetrics(list, {
      scrollLeft: 0,
      scrollWidth: 700,
      clientWidth: 300,
    });
    act(() => {
      fireEvent.scroll(list);
    });
    expect(
      screen.queryByTestId('customizer-tabs-scroll-cue-left'),
    ).not.toBeInTheDocument();
    const right = screen.getByRole('button', { name: 'Scroll tabs right' });
    expect(right).toHaveAttribute('tabindex', '-1');
    fireEvent.click(right);
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number) }),
    );
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);

    setScrollMetrics(list, {
      scrollLeft: 200,
      scrollWidth: 700,
      clientWidth: 300,
    });
    act(() => {
      fireEvent.scroll(list);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Scroll tabs left' }));
    expect(scrollBy.mock.calls[1][0].left).toBeLessThan(0);
    expect(
      screen.getByRole('button', { name: 'Scroll tabs right' }),
    ).toBeInTheDocument();

    setScrollMetrics(list, {
      scrollLeft: 400,
      scrollWidth: 700,
      clientWidth: 300,
    });
    act(() => {
      fireEvent.scroll(list);
    });
    expect(
      screen.queryByRole('button', { name: 'Scroll tabs right' }),
    ).not.toBeInTheDocument();
  });
});
