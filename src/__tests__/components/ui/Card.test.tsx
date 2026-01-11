/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for Card Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardSection } from '@/components/ui/Card';

describe('Card', () => {
  describe('Base Card', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply default variant', () => {
      render(<Card>Default</Card>);
      const card = screen.getByText('Default');
      expect(card).toHaveClass('bg-surface-base/50');
    });

    it('should apply dark variant', () => {
      render(<Card variant="dark">Dark</Card>);
      const card = screen.getByText('Dark');
      expect(card).toHaveClass('bg-surface-base/30');
    });

    it('should apply header variant', () => {
      render(<Card variant="header">Header</Card>);
      const card = screen.getByText('Header');
      expect(card).toHaveClass('bg-surface-base/50');
    });

    it('should apply interactive variant', () => {
      render(<Card variant="interactive">Interactive</Card>);
      const card = screen.getByText('Interactive');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('hover:border-border-theme');
    });

    it('should apply gradient variant', () => {
      render(<Card variant="gradient">Gradient</Card>);
      const card = screen.getByText('Gradient');
      expect(card).toHaveClass('backdrop-blur');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class">Custom</Card>);
      const card = screen.getByText('Custom');
      expect(card).toHaveClass('custom-class');
    });

    it('should handle onClick', () => {
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Clickable</Card>);
      
      fireEvent.click(screen.getByText('Clickable'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render as div by default', () => {
      render(<Card>Div Card</Card>);
      const card = screen.getByText('Div Card');
      expect(card.tagName).toBe('DIV');
    });

    it('should render as section when specified', () => {
      render(<Card as="section">Section Card</Card>);
      const card = screen.getByText('Section Card');
      expect(card.tagName).toBe('SECTION');
    });

    it('should render as article when specified', () => {
      render(<Card as="article">Article Card</Card>);
      const card = screen.getByText('Article Card');
      expect(card.tagName).toBe('ARTICLE');
    });

    it('should have border and rounded styles', () => {
      render(<Card>Styled</Card>);
      const card = screen.getByText('Styled');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('rounded-xl');
    });
  });

  describe('CardSection', () => {
    it('should render title', () => {
      render(<CardSection title="Section Title" />);
      expect(screen.getByText('Section Title')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <CardSection title="Title">
          <p>Section Content</p>
        </CardSection>
      );
      expect(screen.getByText('Section Content')).toBeInTheDocument();
    });

    it('should apply white title color by default', () => {
      render(<CardSection title="White Title" />);
      expect(screen.getByText('White Title')).toHaveClass('text-text-theme-primary');
    });

    it('should apply amber title color', () => {
      render(<CardSection title="Amber Title" titleColor="amber" />);
      expect(screen.getByText('Amber Title')).toHaveClass('text-accent');
    });

    it('should apply cyan title color', () => {
      render(<CardSection title="Cyan Title" titleColor="cyan" />);
      expect(screen.getByText('Cyan Title')).toHaveClass('text-cyan-400');
    });

    it('should apply rose title color', () => {
      render(<CardSection title="Rose Title" titleColor="rose" />);
      expect(screen.getByText('Rose Title')).toHaveClass('text-rose-400');
    });

    it('should apply emerald title color', () => {
      render(<CardSection title="Emerald Title" titleColor="emerald" />);
      expect(screen.getByText('Emerald Title')).toHaveClass('text-emerald-400');
    });

    it('should apply violet title color', () => {
      render(<CardSection title="Violet Title" titleColor="violet" />);
      expect(screen.getByText('Violet Title')).toHaveClass('text-violet-400');
    });

    it('should render icon', () => {
      render(
        <CardSection 
          title="With Icon" 
          icon={<span data-testid="icon">🔥</span>}
        />
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<CardSection title="Custom" className="custom-section" />);
      const section = screen.getByText('Custom').parentElement;
      expect(section).toHaveClass('custom-section');
    });

    it('should render as card when asCard=true', () => {
      const { container } = render(
        <CardSection title="Card Section" asCard>
          <p>Content</p>
        </CardSection>
      );
      // Should have card styling
      const card = container.querySelector('.bg-surface-base\\/50');
      expect(card).toBeInTheDocument();
    });

    it('should render as div when asCard=false', () => {
      render(<CardSection title="Div Section" />);
      const heading = screen.getByText('Div Section');
      expect(heading.parentElement?.tagName).toBe('DIV');
    });

    it('should add margin below title when children present', () => {
      render(
        <CardSection title="Title With Content">
          <p>Content</p>
        </CardSection>
      );
      expect(screen.getByText('Title With Content')).toHaveClass('mb-4');
    });

    it('should not add margin below title when no children', () => {
      render(<CardSection title="Title Without Content" />);
      expect(screen.getByText('Title Without Content')).not.toHaveClass('mb-4');
    });
  });
});

