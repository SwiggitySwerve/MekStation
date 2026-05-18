/**
 * NonMechIdentityPanel — presentational Overview-editor tests.
 *
 * The panel holds no store; every value and setter is a prop. These tests
 * exercise the rendering branches (tonnage shown vs. hidden), the input
 * sanitisation rules (MUL-ID digits/hyphen only, year integer parsing) and the
 * read-only mode.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

import {
  NonMechIdentityPanel,
  type NonMechIdentityPanelProps,
} from '../NonMechIdentityPanel';

/** Build props with all callbacks stubbed; override per test. */
function makeProps(
  overrides: Partial<NonMechIdentityPanelProps> = {},
): NonMechIdentityPanelProps {
  return {
    unitTypeLabel: 'Vehicle',
    chassis: 'Manticore',
    model: 'Heavy Tank',
    mulId: '2099',
    year: 3025,
    rulesLevel: RulesLevel.STANDARD,
    techBase: TechBase.INNER_SPHERE,
    onChassisChange: jest.fn(),
    onModelChange: jest.fn(),
    onMulIdChange: jest.fn(),
    onYearChange: jest.fn(),
    onRulesLevelChange: jest.fn(),
    ...overrides,
  };
}

describe('NonMechIdentityPanel', () => {
  it('renders the identity fields with the supplied values', () => {
    render(<NonMechIdentityPanel {...makeProps()} />);
    expect(screen.getByLabelText('Chassis')).toHaveValue('Manticore');
    expect(screen.getByLabelText('Model')).toHaveValue('Heavy Tank');
    expect(screen.getByLabelText('MUL ID')).toHaveValue('2099');
    expect(screen.getByLabelText('Year')).toHaveValue(3025);
  });

  it('always renders the tech base read-only', () => {
    render(<NonMechIdentityPanel {...makeProps()} />);
    expect(screen.getByTestId('non-mech-tech-base')).toHaveTextContent(
      TechBase.INNER_SPHERE,
    );
  });

  it('fires onChassisChange when the chassis input changes', () => {
    const onChassisChange = jest.fn();
    render(<NonMechIdentityPanel {...makeProps({ onChassisChange })} />);
    fireEvent.change(screen.getByLabelText('Chassis'), {
      target: { value: 'Bulldog' },
    });
    expect(onChassisChange).toHaveBeenCalledWith('Bulldog');
  });

  it('strips non-numeric characters from the MUL ID', () => {
    const onMulIdChange = jest.fn();
    render(<NonMechIdentityPanel {...makeProps({ onMulIdChange })} />);
    fireEvent.change(screen.getByLabelText('MUL ID'), {
      target: { value: '12ab3' },
    });
    expect(onMulIdChange).toHaveBeenCalledWith('123');
  });

  it('collapses an empty MUL ID to the -1 custom-unit sentinel', () => {
    const onMulIdChange = jest.fn();
    render(<NonMechIdentityPanel {...makeProps({ onMulIdChange })} />);
    fireEvent.change(screen.getByLabelText('MUL ID'), {
      target: { value: '' },
    });
    expect(onMulIdChange).toHaveBeenCalledWith('-1');
  });

  it('ignores a non-numeric year and forwards a valid one', () => {
    const onYearChange = jest.fn();
    render(<NonMechIdentityPanel {...makeProps({ onYearChange })} />);
    const yearInput = screen.getByLabelText('Year');
    fireEvent.change(yearInput, { target: { value: 'abc' } });
    expect(onYearChange).not.toHaveBeenCalled();
    fireEvent.change(yearInput, { target: { value: '3067' } });
    expect(onYearChange).toHaveBeenCalledWith(3067);
  });

  it('fires onRulesLevelChange when the tech level select changes', () => {
    const onRulesLevelChange = jest.fn();
    render(<NonMechIdentityPanel {...makeProps({ onRulesLevelChange })} />);
    fireEvent.change(screen.getByLabelText('Tech Level'), {
      target: { value: RulesLevel.ADVANCED },
    });
    expect(onRulesLevelChange).toHaveBeenCalledWith(RulesLevel.ADVANCED);
  });

  it('renders the tonnage field only when onTonnageChange is supplied', () => {
    const { rerender } = render(<NonMechIdentityPanel {...makeProps()} />);
    expect(screen.queryByLabelText('Tonnage')).not.toBeInTheDocument();

    const onTonnageChange = jest.fn();
    rerender(
      <NonMechIdentityPanel {...makeProps({ tonnage: 50, onTonnageChange })} />,
    );
    const tonnageInput = screen.getByLabelText('Tonnage');
    expect(tonnageInput).toHaveValue(50);
    fireEvent.change(tonnageInput, { target: { value: '65' } });
    expect(onTonnageChange).toHaveBeenCalledWith(65);
  });

  it('disables every input and shows a notice in read-only mode', () => {
    render(<NonMechIdentityPanel {...makeProps({ readOnly: true })} />);
    expect(screen.getByLabelText('Chassis')).toBeDisabled();
    expect(screen.getByLabelText('Model')).toBeDisabled();
    expect(screen.getByLabelText('MUL ID')).toBeDisabled();
    expect(screen.getByLabelText('Year')).toBeDisabled();
    expect(screen.getByLabelText('Tech Level')).toBeDisabled();
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
  });
});
