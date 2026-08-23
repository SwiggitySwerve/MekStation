/**
 * Game binding for the kernel. All catalog strings are plugin-owned.
 */
export interface IGamePlugin {
  readonly gameId: string;
  readonly schemaId: string;
  readonly schemaVersion: number;
  readonly libraryContentTypes: readonly string[];
  readonly instanceKind: string;
  readonly libraryEntityType: string;
  readonly instanceEntityType: string;
  readonly saveStreamType: string;
  readonly libraryStreamType: string;
}

export function pluginAllowsContentType(
  plugin: IGamePlugin,
  contentType: string,
): boolean {
  return plugin.libraryContentTypes.includes(contentType);
}
