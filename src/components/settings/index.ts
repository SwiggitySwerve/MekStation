/**
 * Settings Components Index
 * Components for desktop application settings UI.
 */

export { DesktopSettingsDialog } from './DesktopSettingsDialog';
export {
  DesktopSettingsProvider,
  useDesktopSettingsDialog,
} from './DesktopSettingsContext';
export { useDesktopSettings } from './useDesktopSettings';
export { useRecentFiles } from './useRecentFiles';
export { useElectron, isElectron } from './useElectron';
export type {
  IElectronAPI,
  IDesktopSettings,
  IRecentFile,
  IAddRecentFileParams,
  RecentFileUnitType,
  MenuCommand,
} from './useElectron';

export { AppearanceSettings } from './AppearanceSettings';
export { CustomizerSettings } from './CustomizerSettings';
export { VaultSettings } from './VaultSettings';
export { P2PSyncSettings } from './P2PSyncSettings';
export { UIBehaviorSettings } from './UIBehaviorSettings';
export { AccessibilitySettings } from './AccessibilitySettings';
export { AuditSettings } from './AuditSettings';
export { ResetSettings } from './ResetSettings';
export {
  QuickNavigation,
  isValidSectionId,
  type SectionId,
  type SettingsSectionProps,
} from './SettingsShared';
