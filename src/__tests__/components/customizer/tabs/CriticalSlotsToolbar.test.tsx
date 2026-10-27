import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';

import { CriticalSlotsToolbar } from '@/components/customizer/tabs/CriticalSlotsToolbar';

const makeProps = () => ({
  autoFillUnhittables: false,
  autoCompact: false,
  autoSort: false,
  onAutoFillToggle: jest.fn(),
  onAutoCompactToggle: jest.fn(),
  onAutoSortToggle: jest.fn(),
  onFill: jest.fn(),
  onCompact: jest.fn(),
  onSort: jest.fn(),
  onReset: jest.fn(),
  readOnly: false,
});

it('runs the existing sort action directly without resetting equipment', () => {
  const props = makeProps();
  render(<CriticalSlotsToolbar {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Auto-arrange' }));
  expect(props.onSort).toHaveBeenCalledTimes(1);
  expect(props.onReset).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('keeps destructive reset out of slot tools and preserves manual actions', () => {
  const props = makeProps();
  render(<CriticalSlotsToolbar {...props} />);
  const trigger = screen.getByRole('button', { name: 'Critical slot tools' });
  fireEvent.click(trigger);
  const tools = screen.getByRole('group', { name: 'Critical slot tools' });
  expect(
    within(tools).queryByRole('button', { name: /Reset/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    within(tools).getByRole('button', { name: 'Automatically fill slots' }),
  );
  expect(props.onAutoFillToggle).toHaveBeenCalledTimes(1);
  fireEvent.click(within(tools).getByRole('button', { name: 'Fill' }));
  expect(props.onFill).toHaveBeenCalledTimes(1);
  expect(trigger).toHaveFocus();
});

it('cancels without mutation and resets only after the existing confirmation flow', async () => {
  const props = makeProps();
  const view = render(<CriticalSlotsToolbar {...props} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Reset slot assignments' }),
  );
  expect(props.onReset).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(props.onReset).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Reset slot assignments' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Reset' }));
  expect(props.onReset).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Reset' }));
  await waitFor(() => expect(props.onReset).toHaveBeenCalledTimes(1));
  view.unmount();
});

it('disables arrangement and reset in read-only mode', () => {
  const props = makeProps();
  render(<CriticalSlotsToolbar {...props} readOnly />);
  expect(screen.getByRole('button', { name: 'Auto-arrange' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Reset slot assignments' }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Critical slot tools' }));
  for (const button of within(
    screen.getByRole('group', { name: 'Critical slot tools' }),
  ).getAllByRole('button')) {
    expect(button).toBeDisabled();
  }
});
