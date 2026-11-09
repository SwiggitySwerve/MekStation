import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { ToastProvider } from '@/components/shared/Toast';
import { UnitImportDialog } from '@/pages-modules/units/UnitImportDialog';
import { useUnitImport } from '@/pages-modules/units/useUnitImport';
import { getFileService } from '@/services/persistence/FileService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const file = (name: string) => new File(['source'], `${name}.mtf`);
const prepared = (name: string) => ({
  success: true,
  filename: `${name}.mtf`,
  unit: { sourceFormat: 'mtf', sourceText: name },
});
afterEach(() => jest.restoreAllMocks());

it('keeps the newer selection when an older parse finishes last', async () => {
  const old = deferred<ReturnType<typeof prepared>>();
  jest
    .spyOn(getFileService(), 'importUnit')
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(prepared('B'));
  const { result } = renderHook(() => useUnitImport(jest.fn()));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.selectFile(file('A'));
  });
  await act(async () => {
    await result.current.selectFile(file('B'));
  });
  await act(async () => {
    old.resolve(prepared('A'));
    await pending;
  });
  expect(result.current.state).toMatchObject({
    status: 'ready',
    filename: 'B.mtf',
  });
});

it('does not attach an old conflict suggestion to a new unit', async () => {
  jest
    .spyOn(getFileService(), 'importUnit')
    .mockResolvedValueOnce({
      success: true,
      filename: 'A.json',
      unit: { chassis: 'A', variant: '', model: '1' },
    })
    .mockResolvedValueOnce(prepared('B'));
  const suggestion = deferred<{
    chassis: string;
    variant: string;
    suggestedVariant: string;
  }>();
  jest
    .spyOn(customUnitApiService, 'suggestCloneName')
    .mockReturnValue(suggestion.promise);
  const post = jest
    .spyOn(customUnitApiService, 'importUnit')
    .mockResolvedValueOnce({
      success: false,
      requiresRename: true,
      error: 'A exists',
    })
    .mockResolvedValueOnce({ success: true, id: 'custom-B' });
  const { result } = renderHook(() => useUnitImport(jest.fn()));
  await act(async () => {
    await result.current.selectFile(file('A'));
  });
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.submit();
    await Promise.resolve();
  });
  expect(customUnitApiService.suggestCloneName).toHaveBeenCalledWith('A', '1');
  await act(async () => {
    await result.current.selectFile(file('B'));
  });
  await act(async () => {
    suggestion.resolve({
      chassis: 'A',
      variant: '1',
      suggestedVariant: '1-Custom-1',
    });
    await pending;
  });
  expect(result.current.state).toMatchObject({
    status: 'ready',
    filename: 'B.mtf',
  });
  await act(async () => {
    await result.current.submit();
  });
  expect(post.mock.calls[1][0]).toEqual(prepared('B').unit);
});

it('blocks synchronous duplicate submissions and makes success terminal', async () => {
  jest.spyOn(getFileService(), 'importUnit').mockResolvedValue(prepared('A'));
  const response = deferred<{ success: boolean; id: string }>();
  const post = jest
    .spyOn(customUnitApiService, 'importUnit')
    .mockReturnValue(response.promise);
  const saved = jest.fn();
  const { result } = renderHook(() => useUnitImport(saved));
  await act(async () => {
    await result.current.selectFile(file('A'));
  });
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.submit();
    void result.current.submit();
  });
  await act(async () => {
    response.resolve({ success: true, id: 'custom-A' });
    await pending;
  });
  await act(async () => {
    await result.current.submit();
    await result.current.selectFile(file('B'));
  });
  expect(post).toHaveBeenCalledTimes(1);
  expect(saved).toHaveBeenCalledTimes(1);
  expect(saved).toHaveBeenCalledWith('custom-A');
  expect(result.current.state).toMatchObject({
    status: 'success',
    id: 'custom-A',
  });
});

it('invalidates a pending read on reset and allows a fresh session', async () => {
  const old = deferred<ReturnType<typeof prepared>>();
  jest
    .spyOn(getFileService(), 'importUnit')
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(prepared('B'));
  const { result } = renderHook(() => useUnitImport(jest.fn()));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.selectFile(file('A'));
    result.current.reset();
  });
  await act(async () => {
    old.resolve(prepared('A'));
    await pending;
  });
  expect(result.current.state.status).toBe('idle');
  await act(async () => {
    await result.current.selectFile(file('B'));
  });
  expect(result.current.state).toMatchObject({
    status: 'ready',
    filename: 'B.mtf',
  });
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <ToastProvider>
      <button onClick={() => setOpen(true)}>Import Unit</button>
      {open && (
        <UnitImportDialog
          onClose={() => setOpen(false)}
          onImported={jest.fn()}
        />
      )}
    </ToastProvider>
  );
}

it('ignores a POST completing after close and permits import after a successful session resets', async () => {
  jest.spyOn(getFileService(), 'importUnit').mockResolvedValue(prepared('A'));
  const response = deferred<{ success: boolean; id: string }>();
  jest
    .spyOn(customUnitApiService, 'importUnit')
    .mockReturnValueOnce(response.promise)
    .mockResolvedValue({ success: true, id: 'custom-new' });
  const saved = jest.fn();
  const { result } = renderHook(() => useUnitImport(saved));
  await act(async () => {
    await result.current.selectFile(file('A'));
  });
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.submit();
    result.current.reset();
  });
  await act(async () => {
    response.resolve({ success: true, id: 'custom-old' });
    await pending;
  });
  expect(saved).not.toHaveBeenCalled();
  expect(result.current.state.status).toBe('idle');
  await act(async () => {
    await result.current.selectFile(file('B'));
    await result.current.submit();
  });
  expect(result.current.state).toMatchObject({
    status: 'success',
    id: 'custom-new',
  });
  act(() => result.current.reset());
  expect(result.current.state.status).toBe('idle');
});

it('retries a source conflict with its own alternate variant and exact source text', async () => {
  jest.spyOn(getFileService(), 'importUnit').mockResolvedValue(prepared('A'));
  const post = jest
    .spyOn(customUnitApiService, 'importUnit')
    .mockResolvedValueOnce({
      success: false,
      requiresRename: true,
      suggestedName: {
        chassis: '',
        variant: '',
        suggestedVariant: 'A-Custom-1',
      },
    })
    .mockResolvedValueOnce({ success: true, id: 'custom-renamed' });
  const { result } = renderHook(() => useUnitImport(jest.fn()));
  await act(async () => {
    await result.current.selectFile(file('A'));
    await result.current.submit();
  });
  expect(result.current.state).toMatchObject({
    status: 'conflict',
    suggestion: 'A-Custom-1',
  });
  await act(async () => {
    await result.current.submit('  A-Custom-1  ');
  });
  expect(post.mock.calls[1][0]).toEqual({
    ...prepared('A').unit,
    variant: 'A-Custom-1',
  });
});

it('labels the input, traps focus, restores it and clears state on reopen', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Import Unit' });
  // jsdom has no layout; the shared modal correctly restores only visible openers.
  jest
    .spyOn(trigger, 'getClientRects')
    .mockReturnValue({ length: 1 } as DOMRectList);
  await user.click(trigger);
  expect(screen.getByLabelText('Unit file')).toHaveAttribute('type', 'file');
  const close = screen.getByRole('button', { name: 'Close dialog' });
  close.focus();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.tab();
  expect(close).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  expect(screen.getByLabelText('Unit file')).toHaveValue('');
});

it('shows recoverable diagnostics and never reposts on double-click or Enter after success', async () => {
  jest.spyOn(getFileService(), 'importUnit').mockResolvedValue(prepared('A'));
  const post = jest
    .spyOn(customUnitApiService, 'importUnit')
    .mockResolvedValueOnce({
      success: false,
      error: 'Unsupported BLK unit type HandheldWeapon',
      validationErrors: ['family not admitted'],
    })
    .mockResolvedValueOnce({ success: false, error: 'Malformed source' })
    .mockRejectedValueOnce(new Error('Server unavailable'))
    .mockResolvedValueOnce({ success: true, id: 'custom-A' });
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Import Unit' }));
  await user.upload(screen.getByLabelText('Unit file'), file('A'));
  expect(screen.getByLabelText('Unit file')).toHaveFocus();
  await user.click(screen.getByRole('button', { name: /^Import$/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'family not admitted',
  );
  expect(
    screen.getByRole('button', { name: 'Choose another file' }),
  ).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Malformed source',
  );
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Server unavailable',
  );
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Imported'),
  );
  const calls = post.mock.calls.length;
  fireEvent.submit(screen.getByRole('form', { name: 'Import unit file' }));
  await user.keyboard('{Enter}');
  expect(post).toHaveBeenCalledTimes(calls);
});
