/**
 * Settings Components Index
 * Components for desktop application settings UI.
 */

export { DesktopSettingsDialog } from './DesktopSettingsDialog';
export { DesktopSettingsProvider, useDesktopSettingsDialog } from './DesktopSettingsContext';
export { useDesktopSettings } from './useDesktopSettings';
export { useRecentFiles } from './useRecentFiles';
export { useElectron, isElectron } from './useElectron';
export type {
  IElectronAPI,
  IDesktopSettings,
  IRecentFile,
  IAddRecentFileParams,
  RecentFileUnitType,
  MenuCommand
} from './useElectron';
