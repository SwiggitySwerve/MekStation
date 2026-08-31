/**
 * Thin route shell: the handler lives in `pages-modules` because jest's
 * module ignore patterns exclude any path containing an `e2e/` segment,
 * and the guard/one-shot logic deserves unit coverage.
 */

export { default } from '@/pages-modules/api/e2eFaultRoute';
