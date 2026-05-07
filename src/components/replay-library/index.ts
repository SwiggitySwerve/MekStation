/**
 * Public API barrel for the replay-library UI module. The route file at
 * `src/pages/replay-library.tsx` re-exports the default page from here so
 * the component lives outside the `src/pages/` directory (which Next.js's
 * route-type validator inspects on `next build`). Storybook stories sit
 * next to the component in this directory.
 */

export { ReplayLibraryPage, default } from './ReplayLibraryPage';
