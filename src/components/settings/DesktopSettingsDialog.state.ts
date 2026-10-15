import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { logger } from '@/utils/logger';

import type { IDesktopSettings } from './useElectron';

import { useDesktopSettings } from './useDesktopSettings';
import { useElectron } from './useElectron';

export type SettingsTab = 'general' | 'backups' | 'updates' | 'advanced';
type Decision = 'reset' | 'discard';
interface DecisionRequest {
  readonly id: symbol;
  readonly action: Decision;
  readonly session: number;
  readonly api: ReturnType<typeof useElectron>;
  readonly draftRevision: number;
}

export interface DesktopSettingsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog is closed */
  onClose: () => void;
}

export interface DesktopSettingsDialogState {
  readonly api: ReturnType<typeof useElectron>;
  readonly activeTab: SettingsTab;
  readonly hasChanges: boolean;
  readonly isElectron: boolean;
  readonly isOpen: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly decision: DecisionRequest | null;
  readonly resetStatus: { error: boolean; message: string } | null;
  readonly dismissDecision: () => void;
  readonly approveDecision: () => Promise<void>;
  readonly localSettings: IDesktopSettings | null;
  readonly setActiveTab: (tab: SettingsTab) => void;
  readonly updateLocalSetting: <K extends keyof IDesktopSettings>(
    key: K,
    value: IDesktopSettings[K],
  ) => void;
  readonly handleApply: () => Promise<void>;
  readonly handleClose: () => void;
  readonly handleReset: () => Promise<void>;
  readonly handleSave: () => Promise<void>;
  readonly handleSelectDirectory: (
    key: 'defaultSaveDirectory' | 'backupDirectory' | 'dataDirectory',
  ) => Promise<void>;
}

export function useDesktopSettingsDialogState({
  isOpen,
  onClose,
}: DesktopSettingsDialogProps): DesktopSettingsDialogState {
  const api = useElectron();
  const { settings, isLoading, updateSettings, resetSettings, isElectron } =
    useDesktopSettings();
  const [localSettings, setLocalSettings] = useState<IDesktopSettings | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [decision, setDecision] = useState<DecisionRequest | null>(null);
  const [resetStatus, setResetStatus] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const pending = useRef<DecisionRequest | null>(null);
  const resetBusy = useRef(false);
  const activeReset = useRef<symbol | null>(null);
  const session = useRef(0);
  const draftRevision = useRef(0);
  const mounted = useRef(false);
  const committed = useRef<{
    readonly api: typeof api;
    readonly isOpen: boolean;
    readonly isSaving: boolean;
    readonly hasChanges: boolean;
    readonly onClose: () => void;
    readonly resetSettings: typeof resetSettings;
  } | null>(null);

  const invalidateDecision = useCallback(() => {
    pending.current = null;
    setDecision(null);
  }, []);
  const dismissDecision = useCallback(() => {
    if (decision && pending.current === decision) invalidateDecision();
  }, [decision, invalidateDecision]);

  useLayoutEffect(() => {
    committed.current = {
      api,
      isOpen,
      isSaving,
      hasChanges,
      onClose,
      resetSettings,
    };
  });

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      session.current += 1;
      pending.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    session.current += 1;
    invalidateDecision();
    setResetStatus(null);
  }, [isOpen, api, invalidateDecision]);

  useLayoutEffect(() => {
    draftRevision.current += 1;
    invalidateDecision();
    if (isOpen && settings) {
      setLocalSettings({ ...settings });
      setHasChanges(false);
    }
  }, [isOpen, settings, invalidateDecision]);

  const updateLocalSetting = useCallback(
    <K extends keyof IDesktopSettings>(key: K, value: IDesktopSettings[K]) => {
      if (resetBusy.current) return;
      draftRevision.current += 1;
      invalidateDecision();
      setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
      setHasChanges(true);
    },
    [invalidateDecision],
  );

  const handleSave = useCallback(async () => {
    if (!localSettings || resetBusy.current) return;

    setIsSaving(true);
    try {
      const result = await updateSettings(localSettings);
      if (result.success) {
        setHasChanges(false);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, updateSettings, onClose]);

  const handleApply = useCallback(async () => {
    if (!localSettings || resetBusy.current) return;

    setIsSaving(true);
    try {
      const result = await updateSettings(localSettings);
      if (result.success) {
        setHasChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, updateSettings]);

  const requestDecision = useCallback((action: Decision) => {
    const current = committed.current;
    if (
      !mounted.current ||
      !current?.isOpen ||
      current.isSaving ||
      resetBusy.current ||
      pending.current
    )
      return;
    const next: DecisionRequest = {
      id: Symbol('desktop-decision'),
      action,
      session: session.current,
      api: current.api,
      draftRevision: draftRevision.current,
    };
    pending.current = next;
    setDecision(next);
  }, []);
  const handleReset = useCallback(async () => {
    requestDecision('reset');
  }, [requestDecision]);

  const handleClose = useCallback(() => {
    const current = committed.current;
    if (
      !mounted.current ||
      !current?.isOpen ||
      current.isSaving ||
      resetBusy.current ||
      pending.current
    )
      return;
    if (current.hasChanges) {
      requestDecision('discard');
      return;
    }
    current.onClose();
  }, [requestDecision]);

  const approveDecision = useCallback(async () => {
    const current = committed.current;
    if (
      !decision ||
      pending.current !== decision ||
      !mounted.current ||
      !current?.isOpen ||
      current.isSaving ||
      resetBusy.current ||
      session.current !== decision.session ||
      current.api !== decision.api ||
      draftRevision.current !== decision.draftRevision
    )
      return;
    const request = decision;
    invalidateDecision();
    switch (request.action) {
      case 'discard':
        current.onClose();
        return;
      case 'reset':
        break;
      default: {
        const unreachable: never = request.action;
        return unreachable;
      }
    }
    activeReset.current = request.id;
    resetBusy.current = true;
    setIsSaving(true);
    setResetStatus({ error: false, message: 'Resetting settings...' });
    try {
      const result = await current.resetSettings();
      if (
        !mounted.current ||
        activeReset.current !== request.id ||
        session.current !== request.session ||
        committed.current?.api !== request.api
      )
        return;
      if (result.success) {
        if (draftRevision.current === request.draftRevision)
          setHasChanges(false);
        setResetStatus({
          error: false,
          message: 'Settings reset successfully.',
        });
      } else {
        setResetStatus({
          error: true,
          message: result.error ?? 'Failed to reset settings.',
        });
      }
    } catch (error) {
      if (
        mounted.current &&
        activeReset.current === request.id &&
        session.current === request.session &&
        committed.current?.api === request.api
      ) {
        setResetStatus({
          error: true,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to reset settings.',
        });
      }
    } finally {
      if (activeReset.current === request.id) {
        activeReset.current = null;
        resetBusy.current = false;
        if (mounted.current) setIsSaving(false);
      }
    }
  }, [decision, invalidateDecision]);

  const handleSelectDirectory = useCallback(
    async (
      key: 'defaultSaveDirectory' | 'backupDirectory' | 'dataDirectory',
    ) => {
      if (!api) return;

      try {
        const result = await api.selectDirectory();
        if (!result.canceled && result.filePaths.length > 0) {
          updateLocalSetting(key, result.filePaths[0]);
        }
      } catch (error) {
        logger.error('Failed to select directory:', error);
      }
    },
    [api, updateLocalSetting],
  );

  return {
    api,
    activeTab,
    hasChanges,
    isElectron,
    isOpen,
    isLoading,
    isSaving,
    decision,
    resetStatus,
    dismissDecision,
    approveDecision,
    localSettings,
    setActiveTab,
    updateLocalSetting,
    handleApply,
    handleClose,
    handleReset,
    handleSave,
    handleSelectDirectory,
  };
}
