import type {
  ILibraryItem,
  IPublishLibraryItemInput,
  LibraryPublishResult,
} from '../types/LibraryItem';

export interface ILibraryRepository {
  publish(input: IPublishLibraryItemInput): Promise<LibraryPublishResult>;
  get(itemId: string): Promise<ILibraryItem | null>;
  getVersion(itemId: string, version: number): Promise<ILibraryItem | null>;
  listLatest(): Promise<readonly ILibraryItem[]>;
}
