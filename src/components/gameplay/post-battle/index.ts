/**
 * Post-Battle Review Surface — barrel
 *
 * Six small panels composed into the `/gameplay/games/[id]/review`
 * page. Bridges the tactical session and the campaign queue by
 * showing casualties, pilot XP / wounds, salvage allocation, contract
 * status flip, and the auto-generated repair preview.
 *
 * @spec openspec/changes/add-post-battle-review-ui/specs/post-battle-ui/spec.md
 */

export { PostBattleHeader } from './PostBattleHeader';
export type { PostBattleHeaderProps } from './PostBattleHeader';

export { CasualtyPanel } from './CasualtyPanel';
export type { CasualtyPanelProps } from './CasualtyPanel';

export { PilotXpPanel } from './PilotXpPanel';
export type { PilotXpPanelProps } from './PilotXpPanel';

export { SalvagePanel } from './SalvagePanel';
export type { SalvagePanelProps } from './SalvagePanel';

export { ContractPanel } from './ContractPanel';
export type { ContractPanelProps } from './ContractPanel';

export { RepairPreviewPanel } from './RepairPreviewPanel';
export type { RepairPreviewPanelProps } from './RepairPreviewPanel';
