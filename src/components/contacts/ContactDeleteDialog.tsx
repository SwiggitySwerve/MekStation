import { Button } from '@/components/ui';

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function ShieldExclamationIcon({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z"
      />
    </svg>
  );
}

export interface ContactDeleteConfirmProps {
  isProcessing: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function ContactDeleteConfirm({
  isProcessing,
  onConfirmDelete,
  onCancelDelete,
}: ContactDeleteConfirmProps): React.ReactElement {
  return (
    <>
      <span className="text-text-theme-muted mr-2 text-sm">
        Delete this contact?
      </span>
      <Button
        variant="danger"
        size="sm"
        onClick={onConfirmDelete}
        disabled={isProcessing}
        isLoading={isProcessing}
      >
        <CheckIcon className="h-4 w-4" />
        Confirm
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancelDelete}
        disabled={isProcessing}
      >
        Cancel
      </Button>
    </>
  );
}

export interface ContactCardActionsProps {
  isTrusted: boolean;
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onEdit: () => void;
  onToggleTrust: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function ContactCardActions({
  isTrusted,
  isProcessing,
  showDeleteConfirm,
  onEdit,
  onToggleTrust,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: ContactCardActionsProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle/50 mt-4 flex items-center justify-end gap-2 border-t pt-4">
      {showDeleteConfirm ? (
        <ContactDeleteConfirm
          isProcessing={isProcessing}
          onConfirmDelete={onConfirmDelete}
          onCancelDelete={onCancelDelete}
        />
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={isProcessing}
            title="Edit nickname & notes"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTrust}
            disabled={isProcessing}
            title={isTrusted ? 'Remove trust' : 'Mark as trusted'}
            className={isTrusted ? 'text-emerald-400' : 'text-text-theme-muted'}
          >
            {isTrusted ? (
              <ShieldCheckIcon className="h-4 w-4" />
            ) : (
              <ShieldExclamationIcon className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isProcessing}
            title="Delete contact"
            className="text-red-400/70 hover:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
