import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { createNewUnitStore } from '@/stores/unit/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

import { StoreEditControls } from '../UnitEditControls';

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
const makeStore = () =>
  createNewUnitStore({
    name: 'Test Mech',
    tonnage: 75,
    techBase: TechBase.INNER_SPHERE,
  });

it('names the next operation and routes buttons and shortcuts to the selected unit', () => {
  const one = makeStore(),
    two = makeStore();
  const { rerender } = render(<StoreEditControls store={one} />);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  for (const name of ['Undo', 'Redo']) {
    expect(screen.getByRole('button', { name })).toHaveClass(
      'disabled:!text-text-theme-muted',
      'disabled:!opacity-50',
    );
  }
  act(() => one.getState().setYear(3040));
  fireEvent.click(screen.getByRole('button', { name: 'Undo: Change Year' }));
  expect(one.getState().year).toBe(3145);
  fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
  expect(one.getState().year).toBe(3040);
  rerender(<StoreEditControls store={two} />);
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
  expect(one.getState().year).toBe(3040);
  act(() => two.getState().setYear(3050));
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
  expect(two.getState().year).toBe(3145);
  fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
  expect(two.getState().year).toBe(3050);
});

it('draws compact undo and redo as borderless ghost icon buttons', () => {
  render(<StoreEditControls store={makeStore()} compact />);
  for (const name of ['Undo', 'Redo']) {
    const button = screen.getByRole('button', { name });
    expect(button).toHaveClass('bg-transparent', 'border-transparent');
    expect(button).toHaveClass(
      'disabled:!border-transparent',
      '!h-11',
      '!w-11',
    );
    // Enabled reads in the primary colour; disabled stays dimmed.
    expect(button).toHaveClass(
      'enabled:!text-text-theme-primary',
      'disabled:!opacity-50',
    );
    expect(button).not.toHaveClass('border-border-theme');
    expect(button).toHaveTextContent('');
  }
});

it('leaves text editing, composition, and modal shortcuts alone', () => {
  const store = makeStore();
  render(
    <>
      <StoreEditControls store={store} />
      <input aria-label="Name" />
      <div contentEditable data-testid="editable" />
    </>,
  );
  act(() => store.getState().setYear(3040));
  fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'z', ctrlKey: true });
  fireEvent.keyDown(screen.getByTestId('editable'), {
    key: 'z',
    ctrlKey: true,
  });
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true, isComposing: true });
  expect(store.getState().year).toBe(3040);
  const dialog = document.createElement('div');
  dialog.setAttribute('aria-modal', 'true');
  document.body.append(dialog);
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
  expect(store.getState().year).toBe(3040);
  dialog.remove();
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
  expect(store.getState().year).toBe(3145);
});

it('handles construction undo while a native dropdown has focus', () => {
  const store = makeStore();
  render(
    <>
      <StoreEditControls store={store} />
      <select aria-label="Engine">
        <option>Standard</option>
      </select>
    </>,
  );
  const original = store.getState().year;
  act(() => store.getState().setYear(3040));
  const select = screen.getByLabelText('Engine');
  select.focus();
  const handled = fireEvent.keyDown(select, { key: 'z', ctrlKey: true });
  expect(handled).toBe(false);
  expect(store.getState().year).toBe(original);
});
