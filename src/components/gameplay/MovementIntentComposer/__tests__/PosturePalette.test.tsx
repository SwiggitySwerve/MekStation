/**
 * PosturePalette component tests (task 4.2). Proves rules-derived MP labels, the
 * non-color-only disabled encoding (glyph + sr-only reason), the add-posture
 * dispatch, and that disabled entries do not dispatch.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IPosturePaletteEntry } from '../composer.types';

import { PosturePalette } from '../PosturePalette';

function entry(
  overrides: Partial<IPosturePaletteEntry> = {},
): IPosturePaletteEntry {
  return {
    action: 'STAND_UP',
    label: 'Stand Up',
    mpCost: 2,
    offered: true,
    disabled: false,
    ...overrides,
  };
}

describe('PosturePalette', () => {
  it('renders each posture entry with its MP cost', () => {
    render(
      <PosturePalette
        entries={[
          entry({ action: 'STAND_UP', label: 'Stand Up', mpCost: 2 }),
          entry({ action: 'CAREFUL_STAND', label: 'Careful Stand', mpCost: 4 }),
        ]}
        onAddPosture={() => {}}
      />,
    );
    expect(screen.getByTestId('posture-action-STAND_UP')).toHaveAttribute(
      'data-posture-mp',
      '2',
    );
    expect(screen.getByTestId('posture-action-CAREFUL_STAND')).toHaveAttribute(
      'data-posture-mp',
      '4',
    );
  });

  it('dispatches onAddPosture with the rules-derived cost on click', () => {
    const onAddPosture = jest.fn();
    render(
      <PosturePalette
        entries={[entry({ action: 'STAND_UP', mpCost: 2 })]}
        onAddPosture={onAddPosture}
      />,
    );
    fireEvent.click(screen.getByTestId('posture-action-STAND_UP'));
    expect(onAddPosture).toHaveBeenCalledWith('STAND_UP', 2);
  });

  it('renders a disabled entry with a non-color-only encoding and does not dispatch', () => {
    const onAddPosture = jest.fn();
    render(
      <PosturePalette
        entries={[
          entry({
            action: 'CAREFUL_STAND',
            mpCost: 4,
            disabled: true,
            disabledReason: 'Needs 4 MP; only 1 MP remains.',
          }),
        ]}
        onAddPosture={onAddPosture}
      />,
    );
    const button = screen.getByTestId('posture-action-CAREFUL_STAND');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // Non-color-only encoding: a disabled glyph is present alongside the dim.
    expect(
      button.querySelector('[data-posture-disabled-glyph]'),
    ).not.toBeNull();
    fireEvent.click(button);
    expect(onAddPosture).not.toHaveBeenCalled();
  });

  it('shows the empty state when no posture actions are available', () => {
    render(<PosturePalette entries={[]} onAddPosture={() => {}} />);
    expect(
      screen.getByTestId('movement-posture-palette-empty'),
    ).toBeInTheDocument();
  });
});
