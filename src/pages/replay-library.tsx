/**
 * Replay Library page route. Thin re-export so the component lives at
 * `src/components/replay-library/ReplayLibraryPage.tsx` alongside its
 * storybook story — Next.js's route-type validator inspects every file
 * under `src/pages/` on `next build` and would treat a colocated story
 * as a malformed route.
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

export { default } from '@/components/replay-library/ReplayLibraryPage';
