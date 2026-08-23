import type { IGamePlugin } from '@/kernel';

/**
 * MekStation is the first GamePlugin. Kernel types stay game-agnostic;
 * these strings are the BattleTech catalog.
 */
export const MEKSTATION_GAME_PLUGIN: IGamePlugin = {
  gameId: 'mekstation',
  schemaId: 'mekstation-campaign',
  schemaVersion: 1,
  libraryContentTypes: ['unit', 'pilot', 'force', 'encounter'],
  instanceKind: 'campaign-instance',
  libraryEntityType: 'saved-design',
  instanceEntityType: 'campaign-instance',
  saveStreamType: 'campaign',
  libraryStreamType: 'library-item',
};

/** Canonical catalog items have no vault counter; pin published version 1. */
export const CANONICAL_LIBRARY_SOURCE_VERSION = 1;
