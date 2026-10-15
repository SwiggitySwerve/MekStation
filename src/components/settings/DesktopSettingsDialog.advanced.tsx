import React, { useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { DialogTemplate } from '@/components/ui/DialogTemplate';

import type { TabContentProps } from './DesktopSettingsDialog.tabs';
import type { IElectronAPI } from './useElectron';

interface CacheDecision {
  readonly id: symbol;
  readonly api: IElectronAPI;
  readonly generation: number;
}

export function AdvancedTab({
  localSettings,
  updateLocalSetting,
  handleSelectDirectory,
  handleReset,
  api,
}: TabContentProps): React.ReactElement {
  const [cacheDecision, setCacheDecision] = useState<CacheDecision | null>(
    null,
  );
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const pendingCache = useRef<CacheDecision | null>(null);
  const cacheBusy = useRef(false);
  const activeClear = useRef<symbol | null>(null);
  const committedApi = useRef<IElectronAPI | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      pendingCache.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    committedApi.current = api;
  });
  useLayoutEffect(() => {
    generation.current += 1;
    pendingCache.current = null;
    setCacheDecision(null);
    setCacheStatus(null);
  }, [api]);

  const dismissCache = () => {
    if (!cacheDecision || pendingCache.current !== cacheDecision) return;
    pendingCache.current = null;
    setCacheDecision(null);
  };
  const clearCache = async () => {
    if (
      !cacheDecision ||
      pendingCache.current !== cacheDecision ||
      !mounted.current ||
      cacheBusy.current ||
      committedApi.current !== cacheDecision.api ||
      generation.current !== cacheDecision.generation
    )
      return;
    const request = cacheDecision;
    dismissCache();
    activeClear.current = request.id;
    cacheBusy.current = true;
    setClearingCache(true);
    setCacheStatus({ error: false, message: 'Clearing cache...' });
    try {
      const result = await request.api.serviceCall('clearCache');
      if (
        !mounted.current ||
        activeClear.current !== request.id ||
        committedApi.current !== request.api ||
        generation.current !== request.generation
      )
        return;
      setCacheStatus(
        result.success
          ? { error: false, message: 'Cache cleared successfully.' }
          : { error: true, message: result.error ?? 'Failed to clear cache.' },
      );
    } catch (error) {
      if (
        mounted.current &&
        activeClear.current === request.id &&
        committedApi.current === request.api &&
        generation.current === request.generation
      ) {
        setCacheStatus({
          error: true,
          message:
            error instanceof Error ? error.message : 'Failed to clear cache.',
        });
      }
    } finally {
      if (activeClear.current === request.id) {
        activeClear.current = null;
        cacheBusy.current = false;
        if (mounted.current) setClearingCache(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Advanced Settings
      </h3>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Data Directory
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localSettings.dataDirectory}
            onChange={(e) =>
              updateLocalSetting('dataDirectory', e.target.value)
            }
            placeholder="Default data location"
            className="bg-surface-raised border-border-theme placeholder-text-theme-secondary text-text-theme-primary flex-1 rounded border px-3 py-2 text-sm"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSelectDirectory('dataDirectory')}
          >
            Browse
          </Button>
        </div>
        <p className="text-text-theme-secondary text-xs">
          Leave empty to use default location
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-text-theme-secondary text-sm font-medium">
          Maximum recent files
        </label>
        <input
          type="number"
          min={5}
          max={50}
          value={localSettings.maxRecentFiles}
          onChange={(e) =>
            updateLocalSetting('maxRecentFiles', parseInt(e.target.value) || 15)
          }
          className="bg-surface-raised border-border-theme text-text-theme-primary w-24 rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="border-border-theme-subtle border-t pt-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.enableDevTools}
            onChange={(e) =>
              updateLocalSetting('enableDevTools', e.target.checked)
            }
            className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
          />
          <span className="text-text-theme-secondary text-sm">
            Enable developer tools in production
          </span>
        </label>
      </div>

      <div className="border-border-theme-subtle space-y-3 border-t pt-4">
        <h4 className="text-text-theme-secondary text-sm font-medium">
          Cache Management
        </h4>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={!api || clearingCache}
            onClick={() => {
              const currentApi = committedApi.current;
              if (
                !mounted.current ||
                !currentApi ||
                cacheBusy.current ||
                pendingCache.current
              )
                return;
              const next: CacheDecision = {
                id: Symbol('cache-decision'),
                api: currentApi,
                generation: generation.current,
              };
              pendingCache.current = next;
              setCacheStatus(null);
              setCacheDecision(next);
            }}
          >
            Clear Cache
          </Button>
          <span className="text-text-theme-secondary text-xs">
            Remove temporary files and cached data
          </span>
        </div>
        {!api && (
          <p className="text-text-theme-secondary text-sm">
            Cache management is available in the desktop application.
          </p>
        )}
        {cacheStatus && (
          <p
            role={cacheStatus.error ? 'alert' : 'status'}
            className="text-text-theme-primary text-sm"
          >
            {cacheStatus.message}
          </p>
        )}
      </div>
      <DialogTemplate
        topLayer
        isOpen={cacheDecision !== null}
        onClose={dismissCache}
        title="Clear application cache?"
        footer={
          <>
            <Button variant="secondary" onClick={dismissCache}>
              Cancel
            </Button>
            <Button variant="danger" onClick={clearCache}>
              Clear cache
            </Button>
          </>
        }
      >
        Remove temporary data? Your saved units will be kept.
      </DialogTemplate>

      <div className="mt-4 border-t border-red-900/50 pt-4">
        <h4 className="mb-3 text-sm font-medium text-red-400">Danger Zone</h4>
        <Button variant="danger" onClick={handleReset}>
          Reset All Settings
        </Button>
      </div>
    </div>
  );
}
