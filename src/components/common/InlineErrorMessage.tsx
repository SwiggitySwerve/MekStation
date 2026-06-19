import React from 'react';

type InlineErrorMessageVariant =
  | 'page'
  | 'panel'
  | 'form'
  | 'dialog'
  | 'dialogSoft'
  | 'identity';

interface InlineErrorMessageProps {
  message: string | null | undefined;
  variant?: InlineErrorMessageVariant;
}

const variantClasses: Record<
  InlineErrorMessageVariant,
  { container: string; message?: string }
> = {
  page: {
    container: 'mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4',
    message: 'text-sm text-red-400',
  },
  panel: {
    container: 'mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3',
    message: 'text-sm text-red-400',
  },
  form: {
    container: 'rounded-lg border border-red-600/30 bg-red-900/20 p-4',
    message: 'text-sm text-red-400',
  },
  dialog: {
    container:
      'mb-4 rounded border border-red-500 bg-red-900/50 px-4 py-2 text-red-200',
  },
  dialogSoft: {
    container:
      'mb-4 rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-300',
  },
  identity: {
    container:
      'rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200',
  },
};

export function InlineErrorMessage({
  message,
  variant = 'page',
}: InlineErrorMessageProps): React.ReactElement | null {
  if (!message) return null;

  const classes = variantClasses[variant];
  return (
    <div className={classes.container}>
      {classes.message ? <p className={classes.message}>{message}</p> : message}
    </div>
  );
}
