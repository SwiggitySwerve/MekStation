import { useEffect, useId, useRef, useState } from 'react';

import { useToast } from '@/components/shared/Toast';
import { Button, Input } from '@/components/ui';
import { DialogTemplate } from '@/components/ui/DialogTemplate';

import { useUnitImport } from './useUnitImport';

export function UnitImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (id: string) => void;
}): React.ReactElement {
  const { showToast } = useToast();
  const { state, selectFile, submit, reset } = useUnitImport((id) => {
    showToast({ message: 'Unit imported', variant: 'success' });
    onImported(id);
  });
  const [variant, setVariant] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputId = useId();
  const successMessage = useRef<HTMLParagraphElement>(null);
  const close = () => {
    reset();
    onClose();
  };
  const busy = state.status === 'importing';
  const success = state.status === 'success';
  useEffect(() => {
    document.getElementById(fileInputId)?.focus();
  }, [fileInputId, fileInputKey]);
  useEffect(() => {
    if (success) successMessage.current?.focus();
  }, [success]);
  const choose = () => {
    reset();
    setVariant(null);
    setFileInputKey((key) => key + 1);
  };
  const canSubmit =
    state.status === 'ready' ||
    (state.status === 'conflict' &&
      Boolean((variant ?? state.suggestion).trim())) ||
    (state.status === 'error' && Boolean(state.selection));
  const warnings = 'warnings' in state ? state.warnings : undefined;
  return (
    <DialogTemplate
      isOpen
      onClose={close}
      title="Import Unit"
      subtitle="Select or drop a JSON, MTF or BLK file. Unsupported units will show a reason."
      footer={
        <>
          <Button onClick={close} variant="secondary">
            {success ? 'Done' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              type="submit"
              form="unit-import"
              disabled={!canSubmit || busy}
              isLoading={busy}
            >
              {state.status === 'error'
                ? 'Retry'
                : busy
                  ? 'Importing…'
                  : 'Import'}
            </Button>
          )}
        </>
      }
    >
      <form
        id="unit-import"
        aria-label="Import unit file"
        className="min-w-0 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(
            state.status === 'conflict'
              ? (variant ?? state.suggestion)
              : undefined,
          );
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file && !busy && !success) {
            setVariant(null);
            void selectFile(file);
          }
        }}
      >
        {!success && (
          <Input
            key={fileInputKey}
            id={fileInputId}
            label="Unit file"
            type="file"
            accept=".json,.mtf,.blk"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setVariant(null);
                void selectFile(file);
              }
            }}
          />
        )}
        {state.status === 'reading' && <p role="status">Reading file…</p>}
        {'filename' in state && <p className="break-all">{state.filename}</p>}
        {state.status === 'error' && (
          <>
            <p role="alert" className="break-words whitespace-pre-wrap">
              {state.message}
            </p>
            <Button type="button" onClick={choose}>
              Choose another file
            </Button>
          </>
        )}
        {state.status === 'conflict' && (
          <>
            <p role="alert">{state.message}</p>
            <Input
              label="New variant"
              value={variant ?? state.suggestion}
              onChange={(event) => setVariant(event.target.value)}
            />
            <Button type="button" onClick={choose}>
              Choose another file
            </Button>
          </>
        )}
        {success && (
          <p role="status" ref={successMessage} tabIndex={-1}>
            Imported. The unit is now in your library.
          </p>
        )}
        {warnings?.map((warning, index) => (
          <p key={`${index}-${warning}`} className="break-words">
            {warning}
          </p>
        ))}
      </form>
    </DialogTemplate>
  );
}
