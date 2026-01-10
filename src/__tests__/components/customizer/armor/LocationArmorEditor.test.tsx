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

  it('should render front armor input for non-torso locations', () => {
    render(<LocationArmorEditor {...defaultProps} />);

    // Front label should be present for non-torso (though it may just show armor value)
    const frontInput = screen.getByRole('spinbutton');
    expect(frontInput).toBeInTheDocument();
    expect(frontInput).toHaveValue(9);
  });

  it('should render max armor value', () => {
    render(<LocationArmorEditor {...defaultProps} />);

    // Total should show current and max
    expect(screen.getByText(/\/ 9/)).toBeInTheDocument();
  });

  it('should call onChange when armor changes', async () => {
    const user = userEvent.setup();
    render(<LocationArmorEditor {...defaultProps} />);

    const armorInput = screen.getByRole('spinbutton');
    await user.clear(armorInput);
    await user.type(armorInput, '8');

    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<LocationArmorEditor {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show front and rear inputs for torso locations', () => {
    render(
      <LocationArmorEditor
        {...defaultProps}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    // Use getAllByText since there are multiple "Front" and "Rear" elements (label and legend)
    expect(screen.getAllByText(/Front/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Rear/i).length).toBeGreaterThanOrEqual(1);
  });

  it('should not show rear input for non-torso locations', () => {
    render(<LocationArmorEditor {...defaultProps} location={MechLocation.HEAD} />);

    // Should have Front label but no Rear label
    expect(screen.getByText('Front')).toBeInTheDocument();
    // Non-torso locations should not show "Rear" as a section label
    // (there may still be a Total section showing just front)
    expect(screen.queryByText('Rear')).not.toBeInTheDocument();
  });

  it('should render two spinbutton inputs for torso locations', () => {
    render(
      <LocationArmorEditor
        {...defaultProps}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    // Should have two number inputs - one for front, one for rear
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBe(2);
    expect(inputs[0]).toHaveValue(20); // front
    expect(inputs[1]).toHaveValue(5);  // rear
  });

  it('should call onChange when front value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <LocationArmorEditor
        {...defaultProps}
        onChange={onChange}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    const frontInput = inputs[0];
    await user.clear(frontInput);
    await user.type(frontInput, '22');

    // Verify onChange was called (exact values vary due to intermediate calls during typing)
    expect(onChange).toHaveBeenCalled();
    // Last call should include rear value 5
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[1]).toBe(5); // rear should be preserved
  });

  it('should call onChange when rear value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <LocationArmorEditor
        {...defaultProps}
        onChange={onChange}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    const rearInput = inputs[1];
    await user.clear(rearInput);
    await user.type(rearInput, '8');

    // Verify onChange was called
    expect(onChange).toHaveBeenCalled();
    // Last call should have front value 20 preserved
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe(20); // front should be preserved
  });

  it('should disable inputs in read-only mode', () => {
    render(<LocationArmorEditor {...defaultProps} readOnly={true} />);

    const armorInput = screen.getByRole('spinbutton');
    expect(armorInput).toBeDisabled();
  });

  it('should show total summary for torso locations', () => {
    render(
      <LocationArmorEditor
        {...defaultProps}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    // Total should be 25 (20 front + 5 rear)
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should show max values for front and rear', () => {
    render(
      <LocationArmorEditor
        {...defaultProps}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    // Should show "max X" indicators for both sliders
    // The max for front is maxArmor - rear = 46 - 5 = 41 (but actual is calculated from tonnage)
    // We just verify the "max" text appears
    expect(screen.getAllByText(/max \d+/).length).toBeGreaterThanOrEqual(1);
  });

  it('should disable both inputs in read-only mode for torso', () => {
    render(
      <LocationArmorEditor
        {...defaultProps}
        readOnly={true}
        location={MechLocation.CENTER_TORSO}
        data={{ location: MechLocation.CENTER_TORSO, current: 20, maximum: 46, rear: 5, rearMaximum: 26 }}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toBeDisabled();
    expect(inputs[1]).toBeDisabled();
  });
});
