# Standalone multiplayer runtime packages

The hydration script owns additions to Next's standalone image. Next owns its
framework deployment. The custom `server.js` also loads raw TypeScript through
`tsx/cjs`; its CommonJS package requirements must not depend on which import
conditions Next's application bundler traced.

`runtime-packages.mjs` analyzes the actual server entry with esbuild without
executing it. Only emitted external imports seed package discovery, so type-only
imports and local TypeScript modules are not mistaken for npm packages. Existing
runtime loaders also seed discovery. Follow installed dependencies, installed
optional dependencies, and peers from each package's location; missing required
packages fail. Preserve nested versions and complete package contents, including
conditional CommonJS entries and native binaries. Copy parents before children.

The hydration owner preflights every destination and source/target identity
before writing anything, using its existing symlink/junction protections. Resolve
the server's CommonJS entry requests after copying and reject ancestor checkout
fallback. The isolated fixture test proves that an incomplete ESM trace is
repaired without relying on the checkout's node_modules.

Do not replace this discovery with a hand-maintained package list or change the
server's imports to accommodate a bundler. Keep the frozen built-server A1 and
combined 34-row proofs unchanged; both must pass for packaging changes.
