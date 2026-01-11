/**
 * Tests for SkeletonLoader components
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SkeletonInput,
  SkeletonSelect,
  SkeletonNumberInput,
  SkeletonText,
  SkeletonButton,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';

describe('SkeletonInput', () => {
  it('should render with default props', () => {
    const { container } = render(<SkeletonInput />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-full');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('should apply custom width', () => {
    const { container } = render(<SkeletonInput width="w-32" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-32');
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonInput className="custom-class" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('custom-class');
  });

  it('should have correct height', () => {
    const { container } = render(<SkeletonInput />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ height: '32px' });
  });
});

describe('SkeletonSelect', () => {
  it('should render with default props', () => {
    const { container } = render(<SkeletonSelect />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-full');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('should apply custom width', () => {
    const { container } = render(<SkeletonSelect width="w-48" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-48');
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonSelect className="my-select" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('my-select');
  });
});

describe('SkeletonNumberInput', () => {
  it('should render with default props', () => {
    const { container } = render(<SkeletonNumberInput />);

    // Should have the input and step controls container
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
  });

  it('should apply custom width to input', () => {
    const { container } = render(<SkeletonNumberInput width="w-32" />);

    const input = container.querySelector('.w-32');
    expect(input).toBeInTheDocument();
  });

  it('should render step controls', () => {
    const { container } = render(<SkeletonNumberInput />);

    // Should have step up/down buttons
    const stepControls = container.querySelectorAll('.flex-col > div');
    expect(stepControls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SkeletonText', () => {
  it('should render with default props', () => {
    const { container } = render(<SkeletonText />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-16');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('should apply custom width', () => {
    const { container } = render(<SkeletonText width="w-24" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-24');
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonText className="text-skeleton" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('text-skeleton');
  });
});

describe('SkeletonButton', () => {
  it('should render with default props', () => {
    const { container } = render(<SkeletonButton />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-full');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('should apply custom width', () => {
    const { container } = render(<SkeletonButton width="w-32" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('w-32');
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonButton className="btn-skeleton" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('btn-skeleton');
  });

  it('should have correct height', () => {
    const { container } = render(<SkeletonButton />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ height: '32px' });
  });
});

describe('SkeletonFormSection', () => {
  it('should render title', () => {
    render(
      <SkeletonFormSection title="Form Section">
        <div>Content</div>
      </SkeletonFormSection>
    );

    expect(screen.getByText('Form Section')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <SkeletonFormSection title="Test">
        <div data-testid="child">Child content</div>
      </SkeletonFormSection>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SkeletonFormSection title="Test" className="custom-section">
        <div>Content</div>
      </SkeletonFormSection>
    );

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveClass('custom-section');
  });

  it('should have default styling', () => {
    const { container } = render(
      <SkeletonFormSection title="Test">
        <div>Content</div>
      </SkeletonFormSection>
    );

    const section = container.firstChild as HTMLElement;
    expect(section).toHaveClass('bg-surface-base');
    expect(section).toHaveClass('rounded-lg');
    expect(section).toHaveClass('border');
  });

  it('should render multiple skeleton components as children', () => {
    render(
      <SkeletonFormSection title="Loading Form">
        <SkeletonInput />
        <SkeletonSelect />
        <SkeletonButton />
      </SkeletonFormSection>
    );

    // All skeleton children should be present
    const section = screen.getByText('Loading Form').parentElement;
    const animatedElements = section?.querySelectorAll('.animate-pulse');
    expect(animatedElements?.length).toBe(3);
  });
});

describe('Skeleton animation', () => {
  it('should all have animate-pulse class', () => {
    const { container: c1 } = render(<SkeletonInput />);
    const { container: c2 } = render(<SkeletonSelect />);
    const { container: c4 } = render(<SkeletonText />);
    const { container: c5 } = render(<SkeletonButton />);

    expect((c1.firstChild as HTMLElement)).toHaveClass('animate-pulse');
    expect((c2.firstChild as HTMLElement)).toHaveClass('animate-pulse');
    expect((c4.firstChild as HTMLElement)).toHaveClass('animate-pulse');
    expect((c5.firstChild as HTMLElement)).toHaveClass('animate-pulse');
  });
});

