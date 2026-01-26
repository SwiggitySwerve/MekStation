import React from 'react';
import { render, screen } from '@testing-library/react';
import { QualityBadge } from '../QualityBadge';
import { PartQuality, getQualityDisplayName, getQualityColor } from '@/types/campaign/quality';

describe('QualityBadge', () => {
  it('should render the quality letter by default', () => {
    render(<QualityBadge quality={PartQuality.D} />);
    expect(screen.getByTestId('quality-badge')).toHaveTextContent('D');
  });

  it('should render full display name when showLabel is true', () => {
    render(<QualityBadge quality={PartQuality.D} showLabel />);
    expect(screen.getByTestId('quality-badge')).toHaveTextContent('D (Standard)');
  });

  it('should set title to display name', () => {
    render(<QualityBadge quality={PartQuality.F} />);
    expect(screen.getByTestId('quality-badge')).toHaveAttribute('title', getQualityDisplayName(PartQuality.F));
  });

  it('should set aria-label for accessibility', () => {
    render(<QualityBadge quality={PartQuality.A} />);
    expect(screen.getByTestId('quality-badge')).toHaveAttribute(
      'aria-label',
      `Quality: ${getQualityDisplayName(PartQuality.A)}`,
    );
  });

  it('should apply color as inline style', () => {
    render(<QualityBadge quality={PartQuality.E} />);
    const badge = screen.getByTestId('quality-badge');
    expect(badge.style.color).toBeTruthy();
    expect(badge.style.backgroundColor).toBeTruthy();
    expect(badge.style.border).toBeTruthy();
  });

  it('should render each quality grade', () => {
    const qualities = [PartQuality.A, PartQuality.B, PartQuality.C, PartQuality.D, PartQuality.E, PartQuality.F];
    for (const q of qualities) {
      const { unmount } = render(<QualityBadge quality={q} />);
      expect(screen.getByTestId('quality-badge')).toHaveTextContent(q);
      unmount();
    }
  });

  it('should apply additional className', () => {
    render(<QualityBadge quality={PartQuality.D} className="ml-2" />);
    expect(screen.getByTestId('quality-badge').className).toContain('ml-2');
  });
});
