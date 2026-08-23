import type { IGamePlugin } from '../types/GamePlugin';

export const TOY_CARD_PLUGIN: IGamePlugin = {
  gameId: 'toy-cards',
  schemaId: 'toy-cards-table',
  schemaVersion: 1,
  libraryContentTypes: ['card'],
  instanceKind: 'card-in-play',
  libraryEntityType: 'card-template',
  instanceEntityType: 'card-in-play',
  saveStreamType: 'table-run',
  libraryStreamType: 'card-library',
};
