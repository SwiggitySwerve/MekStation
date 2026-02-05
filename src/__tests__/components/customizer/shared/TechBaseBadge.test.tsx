import { render, screen } from '@testing-library/react';
import React from 'react';

import { TechBaseBadge } from '@/components/customizer/shared/TechBaseBadge';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';

describe('TechBaseBadge', () => {
  it('should render Inner Sphere badge', () => {
    render(<TechBaseBadge techBaseMode={TechBaseMode.INNER_SPHERE} />);

    const badge = screen.getByText('IS');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-700');
  });

  it('should render Clan badge', () => {
    render(<TechBaseBadge techBaseMode={TechBaseMode.CLAN} />);

    const badge = screen.getByText('Clan');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-700');
  });

  it('should render Mixed badge', () => {
    render(<TechBaseBadge techBaseMode={TechBaseMode.MIXED} />);

    const badge = screen.getByText('Mixed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-purple-700');
  });

  it('should use short name by default', () => {
    render(<TechBaseBadge techBaseMode={TechBaseMode.INNER_SPHERE} />);

    expect(screen.getByText('IS')).toBeInTheDocument();
    expect(screen.queryByText('Inner Sphere')).not.toBeInTheDocument();
  });

  it('should use full name when short is false', () => {
    render(
      <TechBaseBadge techBaseMode={TechBaseMode.INNER_SPHERE} short={false} />,
    );

    expect(screen.getByText('Inner Sphere')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <TechBaseBadge
        techBaseMode={TechBaseMode.INNER_SPHERE}
        className="custom-class"
      />,
    );

    const badge = screen.getByText('IS');
    expect(badge).toHaveClass('custom-class');
  });
});
