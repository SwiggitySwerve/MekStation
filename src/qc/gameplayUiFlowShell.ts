import rawGameplayUiFlowShell from './gameplayUiFlowShell.json';

export type GameplayUiFlowRole = 'player' | 'gm';
export type GameplayUiFlowCheckpointVisibility = 'player' | 'gm' | 'both';

export interface IGameplayUiFlowAction {
  readonly label: string;
  readonly href: string;
}

export interface IGameplayUiFlowCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly visibility: GameplayUiFlowCheckpointVisibility;
}

export interface IGameplayUiFlow {
  readonly journeyId: string;
  readonly displayName: string;
  readonly module: string;
  readonly roleIntent: readonly GameplayUiFlowRole[];
  readonly primaryAction: IGameplayUiFlowAction;
  readonly qcCommand: string;
  readonly inspectionNotes: readonly string[];
  readonly checkpoints: readonly IGameplayUiFlowCheckpoint[];
}

export interface IGameplayUiFlowShell {
  readonly version: 1;
  readonly title: string;
  readonly sourceCatalog: string;
  readonly sourceGraph: string;
  readonly requiredJourneyIds: readonly string[];
  readonly flows: readonly IGameplayUiFlow[];
}

export const GAMEPLAY_UI_FLOW_SHELL: IGameplayUiFlowShell =
  rawGameplayUiFlowShell as IGameplayUiFlowShell;

export const GAMEPLAY_UI_FLOWS = GAMEPLAY_UI_FLOW_SHELL.flows;
