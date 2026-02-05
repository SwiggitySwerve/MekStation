/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for StatDisplay Components
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  StatRow,
  StatList,
  StatCard,
  StatGrid,
  SimpleStatCard,
} from '@/components/ui/StatDisplay';

describe('StatDisplay Components', () => {
  describe('StatRow', () => {
    it('should render label and value', () => {
      render(<StatRow label="Tonnage" value="75" />);
      expect(screen.getByText('Tonnage')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should apply mono font by default', () => {
      render(<StatRow label="Value" value="100" />);
      expect(screen.getByText('100')).toHaveClass('font-mono');
    });

    it('should not apply mono font when mono=false', () => {
      render(<StatRow label="Value" value="Text" mono={false} />);
      expect(screen.getByText('Text')).not.toHaveClass('font-mono');
    });

    it('should apply white color by default', () => {
      render(<StatRow label="Value" value="100" />);
      expect(screen.getByText('100')).toHaveClass('text-text-theme-primary');
    });

    it('should apply amber color', () => {
      render(<StatRow label="Value" value="100" valueColor="amber" />);
      expect(screen.getByText('100')).toHaveClass('text-accent');
    });

    it('should apply cyan color', () => {
      render(<StatRow label="Value" value="100" valueColor="cyan" />);
      expect(screen.getByText('100')).toHaveClass('text-cyan-400');
    });

    it('should apply emerald color', () => {
      render(<StatRow label="Value" value="100" valueColor="emerald" />);
      expect(screen.getByText('100')).toHaveClass('text-emerald-400');
    });

    it('should apply red color', () => {
      render(<StatRow label="Value" value="100" valueColor="red" />);
      expect(screen.getByText('100')).toHaveClass('text-red-400');
    });

    it('should apply orange color', () => {
      render(<StatRow label="Value" value="100" valueColor="orange" />);
      expect(screen.getByText('100')).toHaveClass('text-orange-400');
    });

    it('should apply emerald when highlight is true and color is white', () => {
      render(<StatRow label="Value" value="100" highlight />);
      expect(screen.getByText('100')).toHaveClass('text-emerald-400');
    });

    it('should keep specified color when highlight is true', () => {
      render(
        <StatRow label="Value" value="100" highlight valueColor="amber" />,
      );
      expect(screen.getByText('100')).toHaveClass('text-accent');
    });

    it('should render React node as value', () => {
      render(
        <StatRow
          label="Component"
          value={<span data-testid="custom">Custom</span>}
        />,
      );
      expect(screen.getByTestId('custom')).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      const { container } = render(<StatRow label="Label" value="Value" />);
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('justify-between');
    });
  });

  describe('StatList', () => {
    it('should render children', () => {
      render(
        <StatList>
          <StatRow label="A" value="1" />
          <StatRow label="B" value="2" />
        </StatList>,
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should apply spacing classes', () => {
      const { container } = render(
        <StatList>
          <div>Item</div>
        </StatList>,
      );
      expect(container.firstChild).toHaveClass('space-y-2');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <StatList className="custom-list">
          <div>Item</div>
        </StatList>,
      );
      expect(container.firstChild).toHaveClass('custom-list');
    });
  });

  describe('StatCard', () => {
    it('should render title', () => {
      render(
        <StatCard title="Combat Stats">
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByText('Combat Stats')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <StatCard title="Stats">
          <div data-testid="content">Content</div>
        </StatCard>,
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render icon', () => {
      render(
        <StatCard title="Stats" icon={<span data-testid="icon">🎯</span>}>
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should apply amber variant by default', () => {
      render(
        <StatCard title="Amber">
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByText('Amber')).toHaveClass('text-amber-400');
    });

    it('should apply cyan variant', () => {
      render(
        <StatCard title="Cyan" variant="cyan">
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByText('Cyan')).toHaveClass('text-cyan-400');
    });

    it('should apply emerald variant', () => {
      render(
        <StatCard title="Emerald" variant="emerald">
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByText('Emerald')).toHaveClass('text-emerald-400');
    });

    it('should apply violet variant', () => {
      render(
        <StatCard title="Violet" variant="violet">
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByText('Violet')).toHaveClass('text-violet-400');
    });

    it('should apply rose variant', () => {
      render(
        <StatCard title="Rose" variant="rose">
          <div>Content</div>
        </StatCard>,
      );
      expect(screen.getByText('Rose')).toHaveClass('text-rose-400');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <StatCard title="Card" className="custom-card">
          <div>Content</div>
        </StatCard>,
      );
      expect(container.firstChild).toHaveClass('custom-card');
    });

    it('should have card styling', () => {
      const { container } = render(
        <StatCard title="Card">
          <div>Content</div>
        </StatCard>,
      );
      expect(container.firstChild).toHaveClass('bg-surface-base/30');
      expect(container.firstChild).toHaveClass('border');
      expect(container.firstChild).toHaveClass('rounded-xl');
    });
  });

  describe('StatGrid', () => {
    it('should render children in grid', () => {
      render(
        <StatGrid>
          <div>Item 1</div>
          <div>Item 2</div>
        </StatGrid>,
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should apply 2 column grid by default', () => {
      const { container } = render(
        <StatGrid>
          <div>Item</div>
        </StatGrid>,
      );
      expect(container.firstChild).toHaveClass('grid');
      expect(container.firstChild).toHaveClass('md:grid-cols-2');
    });

    it('should apply 3 column grid', () => {
      const { container } = render(
        <StatGrid cols={3}>
          <div>Item</div>
        </StatGrid>,
      );
      expect(container.firstChild).toHaveClass('lg:grid-cols-3');
    });

    it('should apply 4 column grid', () => {
      const { container } = render(
        <StatGrid cols={4}>
          <div>Item</div>
        </StatGrid>,
      );
      expect(container.firstChild).toHaveClass('lg:grid-cols-4');
    });

    it('should apply gap styling', () => {
      const { container } = render(
        <StatGrid>
          <div>Item</div>
        </StatGrid>,
      );
      expect(container.firstChild).toHaveClass('gap-6');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <StatGrid className="custom-grid">
          <div>Item</div>
        </StatGrid>,
      );
      expect(container.firstChild).toHaveClass('custom-grid');
    });
  });

  describe('SimpleStatCard', () => {
    it('should render value and label', () => {
      render(<SimpleStatCard value="150" label="Units" />);
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Units')).toBeInTheDocument();
    });

    it('should apply amber color by default', () => {
      render(<SimpleStatCard value="150" label="Units" />);
      expect(screen.getByText('150')).toHaveClass('text-accent');
    });

    it('should apply cyan color', () => {
      render(<SimpleStatCard value="150" label="Units" valueColor="cyan" />);
      expect(screen.getByText('150')).toHaveClass('text-cyan-400');
    });

    it('should apply emerald color', () => {
      render(<SimpleStatCard value="150" label="Units" valueColor="emerald" />);
      expect(screen.getByText('150')).toHaveClass('text-emerald-400');
    });

    it('should apply violet color', () => {
      render(<SimpleStatCard value="150" label="Units" valueColor="violet" />);
      expect(screen.getByText('150')).toHaveClass('text-violet-400');
    });

    it('should show loading skeleton when loading', () => {
      const { container } = render(
        <SimpleStatCard value="150" label="Units" loading />,
      );
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not show value when loading', () => {
      render(<SimpleStatCard value="150" label="Units" loading />);
      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });

    it('should show label when loading', () => {
      render(<SimpleStatCard value="150" label="Units" loading />);
      expect(screen.getByText('Units')).toBeInTheDocument();
    });

    it('should render React node as value', () => {
      render(
        <SimpleStatCard
          value={<span data-testid="custom-value">Custom</span>}
          label="Label"
        />,
      );
      expect(screen.getByTestId('custom-value')).toBeInTheDocument();
    });

    it('should have card styling', () => {
      const { container } = render(
        <SimpleStatCard value="150" label="Units" />,
      );
      expect(container.firstChild).toHaveClass('bg-surface-base/50');
      expect(container.firstChild).toHaveClass('rounded-xl');
      expect(container.firstChild).toHaveClass('text-center');
    });
  });
});
