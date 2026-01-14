/**
 * Tests for VerticalSlotChip component
 * 
 * Verifies the component matches SlotRow styling rotated 90 degrees.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerticalSlotChip } from '@/components/customizer/critical-slots/VerticalSlotChip';

describe('VerticalSlotChip', () => {
  const defaultProps = {
    name: 'Medium Laser',
    criticalSlots: 1,
  };

  it('should render equipment name', () => {
    render(<VerticalSlotChip {...defaultProps} />);
    
    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should have responsive width classes matching SlotRow height', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} />);
    
    const button = container.querySelector('button');
    // Mobile: w-[22px], sm+: sm:w-[30px]
    expect(button).toHaveClass('w-[22px]');
    expect(button).toHaveClass('sm:w-[30px]');
  });

  it('should have responsive height classes', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} />);
    
    const button = container.querySelector('button');
    // Mobile: h-[80px], sm+: sm:h-[100px]
    expect(button).toHaveClass('h-[80px]');
    expect(button).toHaveClass('sm:h-[100px]');
  });

  it('should have flex-shrink-0 to prevent auto-sizing', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} />);
    
    const button = container.querySelector('button');
    expect(button).toHaveClass('flex-shrink-0');
  });

  it('should show tooltip with name and slot count', () => {
    render(<VerticalSlotChip {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Medium Laser (1 slots)');
  });

  it('should apply selection ring when isSelected is true', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} isSelected={true} />);
    
    const button = container.querySelector('button');
    expect(button).toHaveClass('ring-2');
    expect(button).toHaveClass('ring-accent');
  });

  it('should not apply selection ring when isSelected is false', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} isSelected={false} />);
    
    const button = container.querySelector('button');
    expect(button).not.toHaveClass('ring-2');
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<VerticalSlotChip {...defaultProps} onClick={handleClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply equipment colors based on name classification', () => {
    const { container } = render(<VerticalSlotChip name="Medium Laser" criticalSlots={1} />);
    
    const button = container.querySelector('button');
    // Energy weapons get red-based colors
    expect(button?.className).toMatch(/bg-/);
    expect(button?.className).toMatch(/border-/);
  });

  it('should have rotated text styling for vertical display', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} />);
    
    const textSpan = container.querySelector('span');
    expect(textSpan).toHaveStyle({ writingMode: 'vertical-rl' });
    expect(textSpan).toHaveStyle({ transform: 'rotate(180deg)' });
  });

  it('should have responsive text size classes matching SlotRow', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} />);
    
    const textSpan = container.querySelector('span');
    // Mobile: text-[10px], sm+: sm:text-sm
    expect(textSpan).toHaveClass('text-[10px]');
    expect(textSpan).toHaveClass('sm:text-sm');
  });

  it('should have whitespace-nowrap to prevent text wrapping', () => {
    const { container } = render(<VerticalSlotChip {...defaultProps} />);
    
    const textSpan = container.querySelector('span');
    expect(textSpan).toHaveClass('whitespace-nowrap');
  });

  it('should display the full equipment name text', () => {
    render(<VerticalSlotChip name="ER Medium Laser" criticalSlots={1} />);
    
    const textElement = screen.getByText('ER Medium Laser');
    expect(textElement).toBeVisible();
  });

  it('should display long equipment names without breaking', () => {
    const longName = 'Extended Range Large Laser (Clan)';
    render(<VerticalSlotChip name={longName} criticalSlots={2} />);
    
    const textElement = screen.getByText(longName);
    expect(textElement).toBeVisible();
    expect(textElement).toHaveClass('whitespace-nowrap');
  });

  describe('with different equipment types', () => {
    it('should render Endo Steel correctly', () => {
      render(<VerticalSlotChip name="Endo Steel" criticalSlots={7} />);
      
      expect(screen.getByText('Endo Steel')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Endo Steel (7 slots)');
    });

    it('should render weapons correctly', () => {
      render(<VerticalSlotChip name="AC/20" criticalSlots={10} />);
      
      expect(screen.getByText('AC/20')).toBeInTheDocument();
    });

    it('should render ammunition correctly', () => {
      render(<VerticalSlotChip name="AC/20 Ammo" criticalSlots={1} />);
      
      expect(screen.getByText('AC/20 Ammo')).toBeInTheDocument();
    });
  });
});
