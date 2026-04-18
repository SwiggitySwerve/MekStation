/**
 * SPATooltip — basic render + show/hide behaviour
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SPATooltip } from '../SPATooltip';

describe('SPATooltip', () => {
  it('does not render the tooltip until the trigger is hovered', () => {
    render(
      <SPATooltip content={<span>tooltip body</span>}>
        <button>trigger</button>
      </SPATooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the tooltip on mouseEnter and hides on mouseLeave', () => {
    render(
      <SPATooltip content={<span>hover-me</span>}>
        <button>trigger</button>
      </SPATooltip>,
    );

    const wrapper = screen.getByText('trigger').parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('hover-me');

    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the tooltip on focus and hides on blur (a11y)', () => {
    render(
      <SPATooltip content={<span>focus-me</span>}>
        <button>trigger</button>
      </SPATooltip>,
    );

    const wrapper = screen.getByText('trigger').parentElement!;
    fireEvent.focus(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('focus-me');

    fireEvent.blur(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
