import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationArmorEditor } from '@/components/customizer/armor/LocationArmorEditor';
import { MechLocation } from '@/types/construction';

describe('LocationArmorEditor', () => {
  const defaultProps = {
    location: MechLocation.HEAD,
    data: { location: MechLocation.HEAD, current: 9, maximum: 9 },
    tonnage: 50,
    onChange: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location name', () => {
    render(<LocationArmorEditor {...defaultProps} />);
    
    expect(screen.getByText(MechLocation.HEAD)).toBeInTheDocument();
  });

  it('should render total armor input', () => {
    render(<LocationArmorEditor {...defaultProps} />);
    
    // Get the number input specifically (there's also a range input with the same value)
    const totalInput = screen.getByRole('spinbutton');
    expect(totalInput).toBeInTheDocument();
    expect(totalInput).toHaveValue(9);
  });

  it('should render max armor value', () => {
    render(<LocationArmorEditor {...defaultProps} />);
    
    expect(screen.getByText(/\/9/)).toBeInTheDocument();
  });

  it('should call onChange when total armor changes', async () => {
    const user = userEvent.setup();
    render(<LocationArmorEditor {...defaultProps} />);
    
    // Get the number input specifically
    const totalInput = screen.getByRole('spinbutton');
    await user.clear(totalInput);
    await user.type(totalInput, '8');
    
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationArmorEditor {...defaultProps} />);
    
    // Find the close button by its role or by finding button with × icon
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => 
      btn.textContent?.includes('×') || 
      btn.querySelector('svg') !== null ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('close')
    ) || buttons[buttons.length - 1]; // Fallback to last button
    
    await user.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show front/rear inputs for torso locations', () => {
    render(
      <LocationArmorEditor
        {...defaultProps}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5 }}
      />
    );
    
    expect(screen.getByText(/Front/i)).toBeInTheDocument();
    expect(screen.getByText(/Rear/i)).toBeInTheDocument();
  });

  it('should not show front/rear inputs for non-torso locations', () => {
    render(<LocationArmorEditor {...defaultProps} location={MechLocation.HEAD} />);
    
    expect(screen.queryByText(/Front/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rear/i)).not.toBeInTheDocument();
  });

  it('should call onChange with front and rear for torso locations', async () => {
    const user = userEvent.setup();
    render(
      <LocationArmorEditor
        {...defaultProps}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5 }}
      />
    );
    
    const frontInputs = screen.getAllByDisplayValue('20');
    const frontInput = frontInputs[frontInputs.length - 1]; // Get the front input
    await user.clear(frontInput);
    await user.type(frontInput, '22');
    
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should disable inputs in read-only mode', () => {
    render(<LocationArmorEditor {...defaultProps} readOnly={true} />);
    
    // Get the number input specifically
    const totalInput = screen.getByRole('spinbutton');
    expect(totalInput).toBeDisabled();
  });

  it('should call onChange when total armor changes via number input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <LocationArmorEditor
        {...defaultProps}
        onChange={onChange}
        data={{ location: MechLocation.HEAD, current: 9, maximum: 9 }}
      />
    );
    
    // Get the number input specifically
    const totalInput = screen.getByRole('spinbutton');
    await user.clear(totalInput);
    await user.type(totalInput, '8');
    
    expect(onChange).toHaveBeenCalled();
  });
});

