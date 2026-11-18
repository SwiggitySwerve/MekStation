/**
 * A save click is never dropped: while checks are pending it waits visibly and
 * submits with the values shown when they settle; every refusal says why.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import {
  SaveUnitDialog,
  type SaveUnitDialogProps,
} from '@/components/customizer/dialogs/SaveUnitDialog';
import {
  getSaveBlockedReason,
  OVERWRITE_CONSENT_MESSAGE,
} from '@/components/customizer/dialogs/SaveUnitDialogSaveProgress';
import {
  DEFERRED_SAVE_TIMEOUT_MESSAGE,
  DEFERRED_SAVE_TIMEOUT_MS,
  DEFERRED_SAVE_WAITING_MESSAGE,
} from '@/components/customizer/dialogs/useDeferredSave';
import { unitNameValidator } from '@/services/units/UnitNameValidator';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

jest.mock('@/services/units/UnitNameValidator', () => ({
  unitNameValidator: {
    validateUnitName: jest.fn(),
    generateUniqueName: jest.fn(),
    buildFullName: jest.fn(
      (chassis: string, variant: string) => `${chassis} ${variant}`,
    ),
  },
}));

const SETTLED = {
  isValid: true,
  isLoading: false,
  isValidating: false,
  errorCount: 0,
};
const PENDING = { ...SETTLED, isValidating: true };
const LOSS: readonly IUnrecoveredCriticalSlot[] = [
  {
    text: 'CLDoubleHeatSink (OMNIPOD)',
    location: MechLocation.RIGHT_TORSO,
    slot: 4,
  },
];

const onSave = jest.fn();
const onCancel = jest.fn();

function props(
  overrides: Partial<SaveUnitDialogProps> = {},
): SaveUnitDialogProps {
  return {
    isOpen: true,
    initialChassis: 'Mad Cat Mk IV',
    initialVariant: 'A2',
    currentUnitId: 'tab-1',
    constructionValidation: SETTLED,
    onSave,
    onCancel,
    ...overrides,
  };
}

/** Let the dialog's on-open name check resolve. */
async function settleName() {
  await act(async () => undefined);
}

const waiting = () => screen.queryByText(DEFERRED_SAVE_WAITING_MESSAGE);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(unitNameValidator.validateUnitName).mockResolvedValue({
    isValid: false,
    isCanonicalConflict: false,
    isCustomConflict: true,
    conflictingUnitId: 'library-1',
  });
});

describe('SaveUnitDialog deferred save', () => {
  it('keeps Save anyway enabled while validation re-runs and saves once it settles', async () => {
    const { rerender } = render(
      <SaveUnitDialog {...props({ unrecoveredCriticalSlots: LOSS })} />,
    );
    await settleName();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
    // The registry becoming ready re-runs validation after the dialog opened.
    rerender(
      <SaveUnitDialog
        {...props({
          unrecoveredCriticalSlots: LOSS,
          constructionValidation: PENDING,
        })}
      />,
    );
    const saveAnyway = screen.getByRole('button', { name: 'Save anyway' });
    expect(saveAnyway).toBeEnabled();
    fireEvent.click(saveAnyway);
    expect(onSave).not.toHaveBeenCalled();
    expect(waiting()).toBeInTheDocument();
    expect(screen.getByText(DEFERRED_SAVE_WAITING_MESSAGE)).toHaveAttribute(
      'aria-live',
      'polite',
    );
    rerender(<SaveUnitDialog {...props({ unrecoveredCriticalSlots: LOSS })} />);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Mad Cat Mk IV', 'A2', 'library-1');
    expect(waiting()).toBeNull();
  });

  it('never disables Save for any pending check, so no click is dropped', async () => {
    const pendingStates: Partial<SaveUnitDialogProps>[] = [
      { constructionValidation: PENDING },
      { constructionValidation: { ...SETTLED, isLoading: true } },
      { isRefreshingLossDiagnostics: true },
    ];
    for (const pending of pendingStates) {
      const view = render(<SaveUnitDialog {...props(pending)} />);
      await settleName();
      expect(screen.getByRole('button', { name: 'Overwrite' })).toBeEnabled();
      view.unmount();
    }
  });

  it('queues a double click once and saves once', async () => {
    const { rerender } = render(
      <SaveUnitDialog {...props({ constructionValidation: PENDING })} />,
    );
    await settleName();
    const overwrite = screen.getByRole('button', { name: 'Overwrite' });
    fireEvent.click(overwrite);
    fireEvent.click(overwrite);
    rerender(<SaveUnitDialog {...props()} />);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'the loss confirmation is cancelled',
      () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' })),
      props({ unrecoveredCriticalSlots: LOSS }),
    ],
    [
      'the dialog closes',
      (rerender: (ui: React.ReactElement) => void) =>
        rerender(
          <SaveUnitDialog
            {...props({
              isOpen: false,
              unrecoveredCriticalSlots: LOSS,
              constructionValidation: PENDING,
            })}
          />,
        ),
      // Reopened on the same unit with every check settled.
      props({ unrecoveredCriticalSlots: LOSS }),
    ],
    [
      'the target tab changes',
      (rerender: (ui: React.ReactElement) => void) =>
        rerender(
          <SaveUnitDialog
            {...props({
              currentUnitId: 'tab-2',
              unrecoveredCriticalSlots: LOSS,
              constructionValidation: PENDING,
            })}
          />,
        ),
      props({ currentUnitId: 'tab-2', unrecoveredCriticalSlots: LOSS }),
    ],
  ])(
    'sends no ghost save when %s while checks are pending',
    async (_case, backOut, settled) => {
      const { rerender } = render(
        <SaveUnitDialog {...props({ unrecoveredCriticalSlots: LOSS })} />,
      );
      await settleName();
      fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
      rerender(
        <SaveUnitDialog
          {...props({
            unrecoveredCriticalSlots: LOSS,
            constructionValidation: PENDING,
          })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
      expect(waiting()).toBeInTheDocument();
      backOut(rerender);
      rerender(<SaveUnitDialog {...settled} />);
      await settleName();
      expect(onSave).not.toHaveBeenCalled();
      expect(waiting()).toBeNull();
    },
  );

  it('re-arms on an edit made while pending and saves the values shown at settle time', async () => {
    jest.mocked(unitNameValidator.validateUnitName).mockResolvedValue({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    });
    const { rerender } = render(
      <SaveUnitDialog {...props({ constructionValidation: PENDING })} />,
    );
    await settleName();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(waiting()).toBeInTheDocument();
    // The user edits the designation; its new check keeps the save waiting.
    fireEvent.change(screen.getByLabelText('Variant Designation'), {
      target: { value: 'A3' },
    });
    rerender(<SaveUnitDialog {...props()} />);
    expect(onSave).not.toHaveBeenCalled();
    expect(waiting()).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Mad Cat Mk IV', 'A3');
  });

  it('shows the actual reason in an alert and sends nothing when checks settle invalid', async () => {
    const { rerender } = render(
      <SaveUnitDialog
        {...props({
          unrecoveredCriticalSlots: LOSS,
          constructionValidation: PENDING,
        })}
      />,
    );
    await settleName();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
    expect(onSave).not.toHaveBeenCalled();
    rerender(
      <SaveUnitDialog
        {...props({
          unrecoveredCriticalSlots: LOSS,
          constructionValidation: { ...SETTLED, isValid: false, errorCount: 1 },
        })}
      />,
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getAllByRole('alert').map((alert) => alert.textContent),
    ).toContain('Fix the construction errors before saving.');
  });

  it('surfaces a visible error when a check never settles', async () => {
    jest.useFakeTimers();
    try {
      render(
        <SaveUnitDialog
          {...props({
            // A registry that never finishes loading keeps validation loading.
            constructionValidation: { ...SETTLED, isLoading: true },
          })}
        />,
      );
      await act(async () => undefined);
      fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
      expect(waiting()).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(DEFERRED_SAVE_TIMEOUT_MS - 1));
      expect(screen.queryByText(DEFERRED_SAVE_TIMEOUT_MESSAGE)).toBeNull();
      act(() => jest.advanceTimersByTime(1));
      expect(screen.getByRole('alert')).toHaveTextContent(
        DEFERRED_SAVE_TIMEOUT_MESSAGE,
      );
      expect(waiting()).toBeNull();
      expect(onSave).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('SaveUnitDialog deferred overwrite consent', () => {
  function conflictAfterCheck(conflictingUnitId: string) {
    let finish!: () => void;
    jest.mocked(unitNameValidator.validateUnitName).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              isValid: false,
              isCanonicalConflict: false,
              isCustomConflict: true,
              conflictingUnitId,
            });
        }),
    );
    return () => finish();
  }

  it('never overwrites a library unit the user did not see when the click was queued', async () => {
    const finish = conflictAfterCheck('library-1');
    render(<SaveUnitDialog {...props()} />);
    // The name is still being checked, so the button says Save, not Overwrite.
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(waiting()).toBeInTheDocument();
    await act(async () => finish());
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      OVERWRITE_CONSENT_MESSAGE,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
    expect(onSave).toHaveBeenCalledWith('Mad Cat Mk IV', 'A2', 'library-1');
  });

  it('asks again when an edit while pending changes which unit would be overwritten', async () => {
    const { rerender } = render(
      <SaveUnitDialog {...props({ constructionValidation: PENDING })} />,
    );
    await settleName();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
    const finish = conflictAfterCheck('library-2');
    fireEvent.change(screen.getByLabelText('Variant Designation'), {
      target: { value: 'A3' },
    });
    rerender(<SaveUnitDialog {...props()} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    await act(async () => finish());
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      OVERWRITE_CONSENT_MESSAGE,
    );
  });
});

describe('SaveUnitDialog refusals are visible', () => {
  it('keeps Saving... visible on the disabled button during a save', async () => {
    render(<SaveUnitDialog {...props({ isSaving: true })} />);
    await settleName();
    const saving = screen.getByRole('button', { name: 'Saving...' });
    expect(saving).toBeDisabled();
    fireEvent.click(saving);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the settled reason beside a disabled Save anyway', async () => {
    const { rerender } = render(
      <SaveUnitDialog {...props({ unrecoveredCriticalSlots: LOSS })} />,
    );
    await settleName();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));
    rerender(
      <SaveUnitDialog
        {...props({
          unrecoveredCriticalSlots: LOSS,
          constructionValidation: { ...SETTLED, isValid: false, errorCount: 1 },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save anyway' })).toBeDisabled();
    expect(
      screen.getByText('Fix the construction errors before saving.'),
    ).toBeVisible();
  });

  type BlockedCase = [
    string,
    Parameters<typeof getSaveBlockedReason>,
    string | null,
  ];
  it.each<BlockedCase>([
    [
      'missing names',
      ['valid', null, SETTLED, false],
      'Enter a chassis and a variant name to save.',
    ],
    [
      'an official-unit conflict',
      ['canonical-conflict', null, SETTLED, true],
      'This name conflicts with an official unit. Choose another variant name.',
    ],
    [
      'an invalid name',
      ['error', null, SETTLED, true],
      'This name cannot be used.',
    ],
    [
      'construction errors',
      ['valid', null, { ...SETTLED, isValid: false }, true],
      'Fix the construction errors before saving.',
    ],
    ['nothing', ['custom-conflict', null, SETTLED, true], null],
  ])('names the reason for %s', (_case, args, reason) => {
    expect(getSaveBlockedReason(...args)).toBe(reason);
  });
});
