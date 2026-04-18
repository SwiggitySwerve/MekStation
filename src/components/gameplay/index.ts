export { ArmorPip, ArmorPipGroup } from './ArmorPip';
export type { ArmorPipProps, ArmorPipGroupProps, PipState } from './ArmorPip';
export { HeatTracker } from './HeatTracker';
export type { HeatTrackerProps, HeatScale } from './HeatTracker';
export { AmmoCounter } from './AmmoCounter';
export type { AmmoCounterProps } from './AmmoCounter';

// Gameplay UI Components
export { PhaseBanner } from './PhaseBanner';
export type { PhaseBannerProps } from './PhaseBanner';
export { ActionBar } from './ActionBar';
export type { ActionBarProps } from './ActionBar';
export { ConcedeButton } from './ConcedeButton';
export type { ConcedeButtonProps } from './ConcedeButton';
export { MvpDisplay } from './MvpDisplay';
export type { MvpDisplayProps } from './MvpDisplay';
export { EventLogDisplay } from './EventLogDisplay';
export type { EventLogDisplayProps } from './EventLogDisplay';
export { HexMapDisplay } from './HexMapDisplay';
export type { HexMapDisplayProps } from './HexMapDisplay';
export { RecordSheetDisplay } from './RecordSheetDisplay';
export type { RecordSheetDisplayProps } from './RecordSheetDisplay';
export { GameplayLayout } from './GameplayLayout';
export type { GameplayLayoutProps } from './GameplayLayout';
export { ScenarioGenerator } from './ScenarioGenerator';
export type { ScenarioGeneratorProps } from './ScenarioGenerator';
export { GenerateScenarioModal } from './GenerateScenarioModal';
export type { GenerateScenarioModalProps } from './GenerateScenarioModal';
export { SpectatorView } from './SpectatorView';

// add-damage-feedback-ui — polish components (CritHitOverlay,
// PilotWoundFlash, DamageFloater) wired into UnitToken so any token
// on the hex map auto-renders feedback when the matching event fires.
export { CritHitOverlay } from './CritHitOverlay';
export type { CritHitOverlayProps } from './CritHitOverlay';
export { PilotWoundFlash } from './PilotWoundFlash';
export type { PilotWoundFlashProps } from './PilotWoundFlash';
export { DamageFloater } from './DamageFloater';
export type { DamageFloaterProps, DamageFloaterEntry } from './DamageFloater';
export {
  formatHeadHitEntry,
  formatPilotKilledEntry,
  formatPilotUnconsciousEntry,
  isHeadHit,
  isPilotKilled,
  isPilotUnconscious,
} from './damageFeedback';
export type { IFormattedHeadOrPilotEntry } from './damageFeedback';

// add-combat-phase-ui-flows components
export { MovementTypeSwitcher } from './MovementTypeSwitcher';
export type { MovementTypeSwitcherProps } from './MovementTypeSwitcher';
export { FacingPicker } from './FacingPicker';
export type { FacingPickerProps } from './FacingPicker';
export { CommitMoveButton } from './CommitMoveButton';
export type { CommitMoveButtonProps } from './CommitMoveButton';
export { WeaponSelector } from './WeaponSelector';
export type { WeaponSelectorProps } from './WeaponSelector';
export { ToHitForecastModal } from './ToHitForecastModal';
export type { ToHitForecastModalProps } from './ToHitForecastModal';
export { CombatPlanningPanel } from './CombatPlanningPanel';
export type { CombatPlanningPanelProps } from './CombatPlanningPanel';

// add-skirmish-setup-ui pickers (per-side unit + pilot, deployment preview)
export { UnitPicker } from './UnitPicker';
export type { UnitPickerProps } from './UnitPicker';
export { PilotPicker } from './PilotPicker';
export type { PilotPickerProps } from './PilotPicker';
export { DeploymentZonePreview } from './DeploymentZonePreview';
export type { DeploymentZonePreviewProps } from './DeploymentZonePreview';
