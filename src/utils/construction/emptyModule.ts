// Browser stub for Node.js modules (fs, path)
// Used by Turbopack resolve alias to prevent build failures
export default {};
export const existsSync = () => false;
export const readFileSync = () => '';
export const join = (...args: string[]) => args.join('/');
export const resolve = (...args: string[]) => args.join('/');
export const dirname = (p: string) => p;
