import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/Button';
import { DialogTemplate } from '@/components/ui/DialogTemplate';

export interface CustomizerConfirmationScope {
  readonly unitId: string | null;
  readonly unitType: string | null;
}

export interface CustomizerConfirmationRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly isCurrent: () => boolean;
  readonly onConfirm: () => void;
}

interface Requester {
  alive: boolean;
}

interface PendingConfirmation {
  readonly id: symbol;
  readonly requester: Requester;
  readonly scope: CustomizerConfirmationScope;
  readonly request: CustomizerConfirmationRequest;
}

interface ConfirmationContextValue {
  request: (
    requester: Requester,
    options: CustomizerConfirmationRequest,
  ) => boolean;
  dispose: (requester: Requester) => void;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(
  null,
);

function sameScope(
  left: CustomizerConfirmationScope,
  right: CustomizerConfirmationScope,
): boolean {
  return left.unitId === right.unitId && left.unitType === right.unitType;
}

export function CustomizerConfirmationProvider({
  scope,
  children,
}: {
  scope: CustomizerConfirmationScope;
  children: React.ReactNode;
}): React.ReactElement {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);
  const currentScope = useRef(scope);
  const mounted = useRef(false);

  const clearMatching = useCallback((id: symbol): boolean => {
    if (pendingRef.current?.id !== id) return false;
    pendingRef.current = null;
    if (mounted.current) setPending(null);
    return true;
  }, []);

  useLayoutEffect(() => {
    currentScope.current = { unitId: scope.unitId, unitType: scope.unitType };
    const displayed = pendingRef.current;
    if (displayed && !sameScope(displayed.scope, currentScope.current)) {
      clearMatching(displayed.id);
    }
  }, [scope.unitId, scope.unitType, clearMatching]);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingRef.current = null;
    };
  }, []);

  const request = useCallback(
    (requester: Requester, options: CustomizerConfirmationRequest): boolean => {
      if (!mounted.current || !requester.alive || pendingRef.current)
        return false;
      const next: PendingConfirmation = {
        id: Symbol('customizer-confirmation'),
        requester,
        scope: { ...currentScope.current },
        request: options,
      };
      pendingRef.current = next;
      setPending(next);
      return true;
    },
    [],
  );

  const dispose = useCallback(
    (requester: Requester) => {
      const displayed = pendingRef.current;
      if (displayed?.requester === requester) clearMatching(displayed.id);
    },
    [clearMatching],
  );

  const context = useMemo(() => ({ request, dispose }), [request, dispose]);

  const approve = (displayed: PendingConfirmation) => {
    if (!clearMatching(displayed.id)) return;
    if (
      !mounted.current ||
      !displayed.requester.alive ||
      !sameScope(displayed.scope, currentScope.current) ||
      !displayed.request.isCurrent()
    )
      return;
    displayed.request.onConfirm();
  };

  return (
    <ConfirmationContext.Provider value={context}>
      {children}
      {pending && (
        <DialogTemplate
          topLayer
          isOpen
          title={pending.request.title}
          onClose={() => clearMatching(pending.id)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => clearMatching(pending.id)}
              >
                Cancel
              </Button>
              <Button onClick={() => approve(pending)}>
                {pending.request.confirmLabel ?? 'Confirm'}
              </Button>
            </>
          }
        >
          <p>{pending.request.message}</p>
        </DialogTemplate>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useCustomizerConfirmation(): {
  requestConfirmation: (request: CustomizerConfirmationRequest) => boolean;
} {
  const context = useContext(ConfirmationContext);
  const requester = useRef<Requester>({ alive: false });
  useLayoutEffect(() => {
    const owner = requester.current;
    owner.alive = true;
    return () => {
      owner.alive = false;
      context?.dispose(owner);
    };
  }, [context]);

  const requestConfirmation = useCallback(
    (options: CustomizerConfirmationRequest): boolean => {
      if (!context)
        throw new Error(
          'CustomizerConfirmationProvider is required to request confirmation.',
        );
      return context.request(requester.current, options);
    },
    [context],
  );

  return useMemo(() => ({ requestConfirmation }), [requestConfirmation]);
}
