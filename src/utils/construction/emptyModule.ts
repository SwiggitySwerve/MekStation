// Browser stub for Node.js modules (fs, path)
// Used by Turbopack resolve alias to prevent build failures
const emptyModule: Record<string, never> = {};

export default emptyModule;
export const existsSync = (): boolean => false;
export const readFileSync = (): string => '';
export const join = (...args: string[]): string => args.join('/');
export const resolve = (...args: string[]): string => args.join('/');
export const dirname = (p: string): string => p;
