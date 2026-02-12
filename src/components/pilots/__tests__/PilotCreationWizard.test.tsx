import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { PilotCreationWizard } from '../PilotCreationWizard';

// =============================================================================
// Mocks
// =============================================================================

const mockCreateFromTemplate = jest.fn().mockResolvedValue('pilot-1');
const mockCreateRandom = jest.fn().mockResolvedValue('pilot-2');
const mockCreatePilot = jest.fn().mockResolvedValue('pilot-3');
const mockCreateStatblock = jest.fn().mockReturnValue({ id: 'statblock-1' });
const mockShowToast = jest.fn();

jest.mock('@/stores/usePilotStore', () => ({
  usePilotStore: () => ({
    createFromTemplate: mockCreateFromTemplate,
    createRandom: mockCreateRandom,
    createPilot: mockCreatePilot,
    createStatblock: mockCreateStatblock,
    isLoading: false,
  }),
}));

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    preventClose?: boolean;
    children: React.ReactNode;
    className?: string;
  }) => (isOpen ? <div data-testid="modal-overlay">{children}</div> : null),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Render & Step Navigation
// =============================================================================

describe('PilotCreationWizard', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <PilotCreationWizard {...defaultProps} isOpen={false} />,
    );
    expect(container.querySelector('[data-testid="modal-overlay"]')).toBeNull();
  });

  it('should render Create Pilot header', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(screen.getByText('Create Pilot')).toBeInTheDocument();
    expect(
      screen.getByText('MechWarrior personnel record'),
    ).toBeInTheDocument();
  });

  it('should render step indicator', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(screen.getByText('Mode')).toBeInTheDocument();
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('should start on mode selection step', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(screen.getByText('Choose Creation Mode')).toBeInTheDocument();
  });

  it('should render all four mode cards', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
    expect(screen.getByText('Statblock')).toBeInTheDocument();
  });

  it('should render mode descriptions', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(
      screen.getByText(/Quick creation using experience level presets/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Build your pilot from scratch/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Generate a pilot with randomized skills/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Quick NPC creation without persistence/),
    ).toBeInTheDocument();
  });

  it('should show No Persistence badge on statblock mode', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(screen.getByText('No Persistence')).toBeInTheDocument();
  });

  it('should disable Continue when no mode selected', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    const continueButton = screen.getByText('Continue').closest('button');
    expect(continueButton).toBeDisabled();
  });

  it('should enable Continue after selecting a mode', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Template'));

    const continueButton = screen.getByText('Continue').closest('button');
    expect(continueButton).not.toBeDisabled();
  });

  it('should render Cancel button on first step', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<PilotCreationWizard {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// Identity Step
// =============================================================================

describe('PilotCreationWizard - Identity Step', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  function navigateToIdentityStep() {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Template'));
    fireEvent.click(screen.getByText('Continue'));
  }

  it('should navigate to identity step after mode selection', () => {
    navigateToIdentityStep();
    expect(screen.getByText('Pilot Identity')).toBeInTheDocument();
  });

  it('should render name, callsign, and affiliation fields', () => {
    navigateToIdentityStep();
    expect(screen.getByText('Name *')).toBeInTheDocument();
    expect(screen.getByText('Callsign')).toBeInTheDocument();
    expect(screen.getByText('Affiliation')).toBeInTheDocument();
  });

  it('should show Back button on identity step', () => {
    navigateToIdentityStep();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should go back to mode step on Back click', () => {
    navigateToIdentityStep();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Choose Creation Mode')).toBeInTheDocument();
  });

  it('should disable Continue when name is empty', () => {
    navigateToIdentityStep();
    const continueButton = screen.getByText('Continue').closest('button');
    expect(continueButton).toBeDisabled();
  });
});

// =============================================================================
// Skills Step (Template mode)
// =============================================================================

describe('PilotCreationWizard - Skills Step', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  function navigateToSkillsStep() {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Template'));
    fireEvent.click(screen.getByText('Continue'));

    const nameInput = screen.getByPlaceholderText('Enter pilot name');
    fireEvent.change(nameInput, { target: { value: 'Test Pilot' } });
    fireEvent.click(screen.getByText('Continue'));
  }

  it('should show template selector on skills step', () => {
    navigateToSkillsStep();
    expect(screen.getByText('Select Experience Level')).toBeInTheDocument();
  });

  it('should display experience level options', () => {
    navigateToSkillsStep();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('Veteran')).toBeInTheDocument();
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });
});

// =============================================================================
// Review & Create
// =============================================================================

describe('PilotCreationWizard - Review Step', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };

  function navigateToReviewStep() {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Template'));
    fireEvent.click(screen.getByText('Continue'));

    const nameInput = screen.getByPlaceholderText('Enter pilot name');
    fireEvent.change(nameInput, { target: { value: 'Commander Kerensky' } });

    const callsignInput = screen.getByPlaceholderText(
      'Enter callsign (optional)',
    );
    fireEvent.change(callsignInput, { target: { value: 'Wolverine' } });

    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Continue'));
  }

  it('should display review page with pilot details', () => {
    navigateToReviewStep();
    expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
    expect(screen.getByText('Commander Kerensky')).toBeInTheDocument();
  });

  it('should display callsign on review', () => {
    navigateToReviewStep();
    expect(screen.getByText(/"Wolverine"/)).toBeInTheDocument();
  });

  it('should show Persistent badge for template mode', () => {
    navigateToReviewStep();
    expect(screen.getByText('Persistent')).toBeInTheDocument();
  });

  it('should display Create Pilot button on review step', () => {
    navigateToReviewStep();
    const createButtons = screen.getAllByText('Create Pilot');
    const button = createButtons.find((el) => el.closest('button'));
    expect(button).toBeDefined();
  });

  it('should display Gunnery/Piloting label', () => {
    navigateToReviewStep();
    expect(screen.getByText('Gunnery/Piloting')).toBeInTheDocument();
  });

  it('should display Combat Skills section', () => {
    navigateToReviewStep();
    expect(screen.getByText('Combat Skills')).toBeInTheDocument();
    expect(screen.getByText('Gunnery')).toBeInTheDocument();
    expect(screen.getByText('Piloting')).toBeInTheDocument();
  });

  it('should call createFromTemplate and onCreated on Create Pilot click', async () => {
    navigateToReviewStep();

    const createButtons = screen.getAllByText('Create Pilot');
    const button = createButtons.find((el) => el.closest('button'))!;
    fireEvent.click(button.closest('button')!);

    await waitFor(() => {
      expect(mockCreateFromTemplate).toHaveBeenCalled();
      expect(defaultProps.onCreated).toHaveBeenCalledWith('pilot-1');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      );
    });
  });
});

// =============================================================================
// Statblock Mode
// =============================================================================

describe('PilotCreationWizard - Statblock Mode', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  it('should show skill sliders on identity step for statblock mode', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Statblock'));
    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('Combat Skills')).toBeInTheDocument();
    expect(screen.getByText('Gunnery')).toBeInTheDocument();
    expect(screen.getByText('Piloting')).toBeInTheDocument();
  });

  it('should skip skills step for statblock mode (go straight to review)', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Statblock'));
    fireEvent.click(screen.getByText('Continue'));

    const nameInput = screen.getByPlaceholderText('Enter pilot name');
    fireEvent.change(nameInput, { target: { value: 'NPC Guard' } });
    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
    expect(screen.getByText('NPC Guard')).toBeInTheDocument();
  });

  it('should show statblock warning on review', () => {
    render(<PilotCreationWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Statblock'));
    fireEvent.click(screen.getByText('Continue'));

    const nameInput = screen.getByPlaceholderText('Enter pilot name');
    fireEvent.change(nameInput, { target: { value: 'NPC Guard' } });
    fireEvent.click(screen.getByText('Continue'));

    expect(
      screen.getByText(/Statblock pilots are not saved to the database/),
    ).toBeInTheDocument();
  });
});
