import type {
  ICreateEncounterInput,
  IEncounter,
  IUpdateEncounterInput,
  EncounterStatus,
} from '@/types/encounter';

export enum EncounterErrorCode {
  NotFound = 'NOT_FOUND',
  DuplicateName = 'DUPLICATE_NAME',
  ValidationError = 'VALIDATION_ERROR',
  DatabaseError = 'DATABASE_ERROR',
  InvalidStatus = 'INVALID_STATUS',
}

export interface IEncounterOperationResult {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly errorCode?: EncounterErrorCode;
}

export interface IEncounterWithRawForceIds {
  readonly encounter: IEncounter;
  readonly rawForceIds: {
    readonly playerForceId: string | null;
    readonly opponentForceId: string | null;
  };
}

export interface IEncounterRepository {
  initialize(): void;
  createEncounter(input: ICreateEncounterInput): IEncounterOperationResult;
  getEncounterById(id: string): IEncounter | null;
  getEncounterWithRawIds(id: string): IEncounterWithRawForceIds | null;
  getAllEncounters(): readonly IEncounter[];
  getAllEncountersWithRawIds(): readonly IEncounterWithRawForceIds[];
  getEncountersByStatus(status: EncounterStatus): readonly IEncounter[];
  updateEncounter(
    id: string,
    input: IUpdateEncounterInput,
  ): IEncounterOperationResult;
  deleteEncounter(id: string): IEncounterOperationResult;
  setEncounterStatus(
    id: string,
    status: EncounterStatus,
  ): IEncounterOperationResult;
  linkGameSession(
    encounterId: string,
    gameSessionId: string,
  ): IEncounterOperationResult;
  clearForceReference(forceId: string): {
    affectedEncounterIds: readonly string[];
  };
}
