import { describe, it } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react';

import { MechLocation } from '@/types/construction';

import { makeProps, renderInSvg } from './VariantLocationRenderer.test-helpers';

describe('VariantLocationRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Interaction handlers
  // =========================================================================

  describe('interaction handlers', () => {
    it('calls onClick when location is clicked', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onHover(true) on mouse enter', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(onHover).toHaveBeenCalledWith(true);
    });

    it('calls onHover(false) on mouse leave', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.mouseLeave(button);
      expect(onHover).toHaveBeenCalledWith(false);
    });

    it('calls onClick on Enter key press', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key press', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick on other key presses', () => {
      const onClick = jest.fn();
      const props = makeProps({ onClick });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Escape' });
      fireEvent.keyDown(button, { key: 'a' });
      fireEvent.keyDown(button, { key: 'Tab' });
      expect(onClick).not.toHaveBeenCalled();
    });

    it('calls onHover(true) on focus', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.focus(button);
      expect(onHover).toHaveBeenCalledWith(true);
    });

    it('calls onHover(false) on blur', () => {
      const onHover = jest.fn();
      const props = makeProps({ onHover });
      renderInSvg(props);

      const button = screen.getByRole('button');
      fireEvent.blur(button);
      expect(onHover).toHaveBeenCalledWith(false);
    });
  });

  // =========================================================================
  // Accessibility / aria attributes
  // =========================================================================

  describe('accessibility', () => {
    it('has role="button"', () => {
      const props = makeProps();
      renderInSvg(props);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has tabIndex=0 for keyboard accessibility', () => {
      const props = makeProps();
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('has correct aria-label for front-only location', () => {
      const props = makeProps({
        location: MechLocation.LEFT_ARM,
        data: { current: 20, maximum: 24 },
        showRear: false,
      });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Left Arm armor: 20 of 24');
    });

    it('has correct aria-label for front+rear location', () => {
      const props = makeProps({
        location: MechLocation.CENTER_TORSO,
        data: { current: 30, maximum: 47, rear: 10, rearMaximum: 23 },
        showRear: true,
      });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        'Center Torso armor: 30 of 47, rear: 10 of 23',
      );
    });

    it('has aria-pressed=true when selected', () => {
      const props = makeProps({ isSelected: true });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('has aria-pressed=false when not selected', () => {
      const props = makeProps({ isSelected: false });
      renderInSvg(props);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
