import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArmorLocation } from '@/components/customizer/armor/ArmorLocation';
import { MechLocation } from '@/types/construction';

describe('ArmorLocation', () => {
  const defaultProps = {
    location: MechLocation.HEAD,
    x: 10,
    y: 10,
    width: 50,
    height: 40,
    data: { location: MechLocation.HEAD, current: 9, maximum: 9 },
    isSelected: false,
    isHovered: false,
    onClick: jest.fn(),
    onHover: jest.fn(),
    locationType: 'head' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location label', () => {
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} />
      </svg>
    );
    
    expect(container.querySelector('text')).toBeInTheDocument();
  });

  it('should render armor value', () => {
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} data={{ location: MechLocation.HEAD, current: 9, maximum: 9 }} />
      </svg>
    );
    
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
    // One text should contain the armor value
    const hasValue = Array.from(texts).some(el => el.textContent === '9');
    expect(hasValue).toBe(true);
  });

  it('should render rear armor when showRear is true', () => {
    const { container } = render(
      <svg>
        <ArmorLocation
          {...defaultProps}
          location={MechLocation.CENTER_TORSO}
          locationType="torso"
          showRear={true}
          data={{ location: MechLocation.CENTER_TORSO, current: 30, maximum: 46, rear: 10 }}
        />
      </svg>
    );
    
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(1); // Main + rear
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} />
      </svg>
    );
    
    const group = container.querySelector('g[role="button"]');
    expect(group).toBeInTheDocument();
    
    await user.click(group!);
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onHover when hovered', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} />
      </svg>
    );
    
    const group = container.querySelector('g[role="button"]');
    await user.hover(group!);
    
    expect(defaultProps.onHover).toHaveBeenCalledWith(true);
  });

  it('should call onClick when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} />
      </svg>
    );
    
    const group = container.querySelector('g[role="button"]') as HTMLElement | null;
    if (group) {
      group.focus();
      await user.keyboard('{Enter}');
    }
    
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Space key is pressed', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} />
      </svg>
    );
    
    const group = container.querySelector('g[role="button"]') as HTMLElement | null;
    if (group) {
      group.focus();
      await user.keyboard(' ');
    }
    
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('should have correct aria-label', () => {
    const { container } = render(
      <svg>
        <ArmorLocation
          {...defaultProps}
          location={MechLocation.CENTER_TORSO}
          data={{ location: MechLocation.CENTER_TORSO, current: 30, maximum: 46, rear: 10 }}
          showRear={true}
        />
      </svg>
    );
    
    const group = container.querySelector('g[role="button"]');
    expect(group).toHaveAttribute('aria-label');
    expect(group?.getAttribute('aria-label')).toContain('30');
    expect(group?.getAttribute('aria-label')).toContain('10');
  });

  it('should set aria-pressed when selected', () => {
    const { container } = render(
      <svg>
        <ArmorLocation {...defaultProps} isSelected={true} />
      </svg>
    );
    
    const group = container.querySelector('g[role="button"]');
    expect(group).toHaveAttribute('aria-pressed', 'true');
  });
});

