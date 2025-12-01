/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for Badge Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge, TechBaseBadge, WeightClassBadge } from '@/components/ui/Badge';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

describe('Badge', () => {
  describe('Base Badge', () => {
    it('should render children', () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should apply default variant (slate)', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-slate-600/20');
    });

    it('should apply blue variant', () => {
      render(<Badge variant="blue">Blue</Badge>);
      const badge = screen.getByText('Blue');
      expect(badge).toHaveClass('bg-blue-600/20');
    });

    it('should apply emerald variant', () => {
      render(<Badge variant="emerald">Emerald</Badge>);
      const badge = screen.getByText('Emerald');
      expect(badge).toHaveClass('bg-emerald-600/20');
    });

    it('should apply purple variant', () => {
      render(<Badge variant="purple">Purple</Badge>);
      const badge = screen.getByText('Purple');
      expect(badge).toHaveClass('bg-purple-600/20');
    });

    it('should apply amber variant', () => {
      render(<Badge variant="amber">Amber</Badge>);
      const badge = screen.getByText('Amber');
      expect(badge).toHaveClass('bg-amber-600/20');
    });

    it('should apply orange variant', () => {
      render(<Badge variant="orange">Orange</Badge>);
      const badge = screen.getByText('Orange');
      expect(badge).toHaveClass('bg-orange-600/20');
    });

    it('should apply red variant', () => {
      render(<Badge variant="red">Red</Badge>);
      const badge = screen.getByText('Red');
      expect(badge).toHaveClass('bg-red-600/20');
    });

    it('should apply semantic variants', () => {
      const { rerender } = render(<Badge variant="muted">Muted</Badge>);
      expect(screen.getByText('Muted')).toHaveClass('bg-slate-600/50');

      rerender(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText('Warning')).toHaveClass('bg-amber-600/20');

      rerender(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success')).toHaveClass('bg-emerald-600/20');

      rerender(<Badge variant="info">Info</Badge>);
      expect(screen.getByText('Info')).toHaveClass('bg-blue-600/20');
    });

    it('should apply small size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-2');
    });

    it('should apply medium size (default)', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('py-1');
    });

    it('should apply large size', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('text-sm');
      expect(badge).toHaveClass('px-3');
    });

    it('should apply pill style when pill=true', () => {
      render(<Badge pill>Pill Badge</Badge>);
      const badge = screen.getByText('Pill Badge');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should apply rounded style by default (pill=false)', () => {
      render(<Badge>Rounded Badge</Badge>);
      const badge = screen.getByText('Rounded Badge');
      expect(badge).toHaveClass('rounded');
      expect(badge).not.toHaveClass('rounded-full');
    });

    it('should apply custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('should have base classes', () => {
      render(<Badge>Base</Badge>);
      const badge = screen.getByText('Base');
      expect(badge).toHaveClass('font-medium');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
    });
  });

  describe('TechBaseBadge', () => {
    it('should render Clan with emerald variant', () => {
      render(<TechBaseBadge techBase={TechBase.CLAN} />);
      const badge = screen.getByText('Clan');
      expect(badge).toHaveClass('bg-emerald-600/20');
    });

    it('should render Inner Sphere with blue variant', () => {
      render(<TechBaseBadge techBase={TechBase.INNER_SPHERE} />);
      const badge = screen.getByText('Inner Sphere');
      expect(badge).toHaveClass('bg-blue-600/20');
    });
  });

  describe('WeightClassBadge', () => {
    it('should render Light with emerald variant', () => {
      render(<WeightClassBadge weightClass={WeightClass.LIGHT} />);
      const badge = screen.getByText('Light');
      expect(badge).toHaveClass('bg-emerald-600/20');
    });

    it('should render Medium with amber variant', () => {
      render(<WeightClassBadge weightClass={WeightClass.MEDIUM} />);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('bg-amber-600/20');
    });

    it('should render Heavy with orange variant', () => {
      render(<WeightClassBadge weightClass={WeightClass.HEAVY} />);
      const badge = screen.getByText('Heavy');
      expect(badge).toHaveClass('bg-orange-600/20');
    });

    it('should render Assault with red variant', () => {
      render(<WeightClassBadge weightClass={WeightClass.ASSAULT} />);
      const badge = screen.getByText('Assault');
      expect(badge).toHaveClass('bg-red-600/20');
    });
  });
});
