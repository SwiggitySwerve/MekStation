import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EquipmentDetail } from '../EquipmentDetail';

const mockItem = {
  id: '1',
  name: 'Large Laser',
  type: 'Energy',
  tonnage: 5,
  damage: '8',
  range: 'Medium',
  heat: 8,
  description: 'A powerful energy weapon that deals significant damage.',
};

describe('EquipmentDetail', () => {
  const mockOnBack = jest.fn();
  const mockOnAssign = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display equipment name', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('Large Laser')).toBeInTheDocument();
    });

    it('should display equipment type', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('Energy')).toBeInTheDocument();
    });

    it('should display equipment tonnage', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('5 tons')).toBeInTheDocument();
    });

    it('should display combat stats', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('Damage')).toBeInTheDocument();
      expect(screen.getAllByText('8')).toHaveLength(2); // Appears for damage and heat
      expect(screen.getByText('Range')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Heat')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('A powerful energy weapon that deals significant damage.')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EquipmentDetail item={mockItem} onBack={mockOnBack} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should have back button', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const backButton = screen.getByLabelText('Go back');
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should have 44x44px minimum touch target on back button', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toHaveClass('min-h-[44px]');
    });

    it('should display page title', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('Equipment Details')).toBeInTheDocument();
    });
  });

  describe('Content Sections', () => {
    it('should organize stats in sections', () => {
      const { container } = render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByText('Information')).toBeInTheDocument();
      expect(screen.getByText('Combat Stats')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should have prominent equipment name', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const nameElement = screen.getByText('Large Laser');
      expect(nameElement).toHaveClass('text-2xl');
      expect(nameElement).toHaveClass('font-bold');
    });

    it('should be scrollable', () => {
      const { container } = render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const contentArea = container.querySelector('.overflow-y-auto');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display assign button when onAssign is provided', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} onAssign={mockOnAssign} />);

      expect(screen.getByText('Assign Equipment')).toBeInTheDocument();
    });

    it('should not display assign button when onAssign is not provided', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.queryByText('Assign Equipment')).not.toBeInTheDocument();
    });

    it('should call onAssign when assign button is clicked', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} onAssign={mockOnAssign} />);

      const assignButton = screen.getByText('Assign Equipment');
      fireEvent.click(assignButton);

      expect(mockOnAssign).toHaveBeenCalledTimes(1);
    });

    it('should have 44x44px minimum height on assign button', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} onAssign={mockOnAssign} />);

      const assignButton = screen.getByText('Assign Equipment');
      expect(assignButton).toHaveClass('min-h-[44px]');
    });

    it('should position actions at bottom', () => {
      const { container } = render(
        <EquipmentDetail item={mockItem} onBack={mockOnBack} onAssign={mockOnAssign} />
      );

      const actionArea = container.querySelector('.sticky.bottom-0');
      expect(actionArea).toBeInTheDocument();
    });
  });

  describe('Slide-in Transition', () => {
    it('should have slide-in animation', () => {
      const { container } = render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const detailView = container.querySelector('.equipment-detail');
      expect(detailView).toHaveClass('transition-transform');
      expect(detailView).toHaveClass('duration-300');
    });

    it('should be fixed position covering full screen', () => {
      const { container } = render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const detailView = container.querySelector('.equipment-detail');
      expect(detailView).toHaveClass('fixed');
      expect(detailView).toHaveClass('inset-0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have proper heading hierarchy', () => {
      render(<EquipmentDetail item={mockItem} onBack={mockOnBack} />);

      const h1 = screen.getByText('Equipment Details');
      const h2 = screen.getByText('Large Laser');
      expect(h1.tagName).toBe('H1');
      expect(h2.tagName).toBe('H2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle item without combat stats', () => {
      const itemWithoutStats = {
        id: '2',
        name: 'Heat Sink',
        type: 'Equipment',
        tonnage: 1,
      };

      render(<EquipmentDetail item={itemWithoutStats} onBack={mockOnBack} />);

      expect(screen.queryByText('Combat Stats')).not.toBeInTheDocument();
      expect(screen.getByText('Heat Sink')).toBeInTheDocument();
    });

    it('should handle item without description', () => {
      const itemWithoutDescription = {
        id: '3',
        name: 'Jump Jet',
        type: 'Equipment',
        tonnage: 0.5,
        damage: '-',
      };

      render(<EquipmentDetail item={itemWithoutDescription} onBack={mockOnBack} />);

      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('should handle item with zero damage', () => {
      const itemWithZeroDamage = {
        id: '4',
        name: 'AMS',
        type: 'Equipment',
        tonnage: 0.5,
        damage: '0',
        description: 'Anti-missile system',
      };

      render(<EquipmentDetail item={itemWithZeroDamage} onBack={mockOnBack} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle long descriptions', () => {
      const longDescription =
        'This is a very long description that should wrap properly and remain readable. '.repeat(10);
      const itemWithLongDescription = {
        ...mockItem,
        description: longDescription,
      };

      const { container } = render(<EquipmentDetail item={itemWithLongDescription} onBack={mockOnBack} />);

      // Check that description is rendered, even if truncated
      expect(screen.getByText('Description')).toBeInTheDocument();
      const descriptionElement = container.querySelector('.leading-relaxed');
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement?.textContent).toContain('This is a very long description');
    });
  });
});
