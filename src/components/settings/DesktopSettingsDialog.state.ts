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
  const activeSave = useRef<{
    readonly session: number;
    readonly api: typeof api;
    readonly updates: Partial<IDesktopSettings>;
  } | null>(null);
  const savedSettings = useRef(settings);
  const draftUpdates = useRef<Partial<IDesktopSettings>>({});
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
    readonly updateSettings: typeof updateSettings;
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
      updateSettings,
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
    activeSave.current = null;
    draftUpdates.current = {};
    if (!resetBusy.current) setIsSaving(false);
    invalidateDecision();
    setResetStatus(null);
  }, [isOpen, api, invalidateDecision]);

  const refreshDraft = useCallback(() => {
    setLocalSettings({ ...savedSettings.current, ...draftUpdates.current });
    setHasChanges(Object.keys(draftUpdates.current).length > 0);
  }, []);

  useLayoutEffect(() => {
    draftRevision.current += 1;
    invalidateDecision();
    savedSettings.current = settings;
    if (isOpen && settings) {
      refreshDraft();
    }
  }, [isOpen, api, settings, invalidateDecision, refreshDraft]);

  const updateLocalSetting = useCallback(
    <K extends keyof IDesktopSettings>(key: K, value: IDesktopSettings[K]) => {
      if (!mounted.current || !committed.current?.isOpen || resetBusy.current)
        return;
      draftRevision.current += 1;
      invalidateDecision();
      const savedValue =
        activeSave.current && Object.hasOwn(activeSave.current.updates, key)
          ? activeSave.current.updates[key]
          : savedSettings.current[key];
      if (Object.is(value, savedValue)) delete draftUpdates.current[key];
      else draftUpdates.current[key] = value;
      refreshDraft();
    },
    [invalidateDecision, refreshDraft],
  );

  const writeSettings = useCallback(
    async (closeAfterSave: boolean) => {
      const current = committed.current;
      if (
        !mounted.current ||
        !current?.isOpen ||
        !current.api ||
        activeSave.current ||
        resetBusy.current ||
        pending.current
      )
        return;
      const keys = Object.keys(
        draftUpdates.current,
      ) as (keyof IDesktopSettings)[];
      for (const key of keys) {
        if (Object.is(draftUpdates.current[key], savedSettings.current[key]))
          delete draftUpdates.current[key];
      }
      if (!Object.keys(draftUpdates.current).length) {
        refreshDraft();
        return;
      }
      const request = {
        session: session.current,
        api: current.api,
        updates: { ...draftUpdates.current },
      };
      activeSave.current = request;
      const isCurrent = () =>
        mounted.current &&
        activeSave.current === request &&
        session.current === request.session &&
        committed.current?.isOpen === true &&
        committed.current.api === request.api;
      setIsSaving(true);
      try {
        const result = await current.updateSettings(request.updates, isCurrent);
        if (!isCurrent() || !result.success) return;
        savedSettings.current = {
          ...savedSettings.current,
          ...request.updates,
        };
        for (const key of Object.keys(
          request.updates,
        ) as (keyof IDesktopSettings)[]) {
          if (Object.is(draftUpdates.current[key], request.updates[key]))
            delete draftUpdates.current[key];
        }
        refreshDraft();
        if (closeAfterSave && !Object.keys(draftUpdates.current).length)
          committed.current?.onClose();
      } catch (error) {
        if (isCurrent())
          logger.error('Failed to save desktop settings:', error);
      } finally {
        if (isCurrent()) {
          activeSave.current = null;
          setIsSaving(false);
        }
      }
    },
    [refreshDraft],
  );
  const handleSave = useCallback(() => writeSettings(true), [writeSettings]);
  const handleApply = useCallback(() => writeSettings(false), [writeSettings]);

  const requestDecision = useCallback((action: Decision) => {
    const current = committed.current;
    if (
      !mounted.current ||
      !current?.isOpen ||
      current.isSaving ||
      activeSave.current ||
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
      activeSave.current ||
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
      activeSave.current ||
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
        // Edits are blocked during reset; settings events may still advance the revision.
        draftUpdates.current = {};
        refreshDraft();
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
  }, [decision, invalidateDecision, refreshDraft]);

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
