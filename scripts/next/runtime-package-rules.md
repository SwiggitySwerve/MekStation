# Standalone multiplayer runtime packages

The hydration script owns additions to Next's standalone image. Next owns its
framework deployment. The custom `server.js` also loads raw TypeScript through
`tsx/cjs`; its CommonJS package requirements must not depend on which import
conditions Next's application bundler traced.

`runtime-packages.mjs` analyzes the actual server entry with esbuild without
executing it. Only emitted external imports seed package discovery, so type-only
imports and local TypeScript modules are not mistaken for npm packages. Existing
runtime loaders also seed discovery. Follow installed dependencies, installed
optional dependencies, and peers from each package's location, searching only
inside the checkout and rejecting linked packages; missing required packages
fail. Preserve nested versions and complete package contents, including
conditional CommonJS entries and native binaries. Copy parents before children.

Package source preflight resolves every descendant, including manifests and
links, against the real checkout boundary before reading manifests or writing
output. Escaping entries and directory cycles fail; repeated validated targets
are visited once per hydration pass. Both runtime closure and external package
sources use this preflight, including the copied runtime loader scope.

The hydration owner preflights every destination and source/target identity
before writing anything, using its existing symlink/junction protections. Resolve
the server's CommonJS entry requests after copying and reject ancestor checkout
fallback. The isolated fixture test proves that an incomplete ESM trace is
repaired without relying on the checkout's node_modules.

Next preserves Turbopack's external-package links: absolute checkout targets on
Windows and relative targets into the standalone package tree on Linux. Map a
standalone target to its exact installed counterpart; refuse outside-checkout
targets, noncanonical sources and linked installed packages. The traced and
installed package names and string versions must match. Preflight the
canonical installed package sources and physical parent paths,
then replace those links with complete package directories. A native CommonJS
package without conditional exports can instead forward its entry to the exact
canonical package already copied by the runtime closure, matched by realpath
regardless of Windows cwd casing. A native external without that canonical
closure package is refused. This keeps one native
binding for Node and Electron's isolated ABI rebuild. Packages with ESM or
conditional exports retain complete contents. An isolated image must resolve
both the generated alias and its dependencies inside the image.

Full-copied aliases are a second module instance of any package also in the
server closure (today yjs, zod, uuid, ws, js-sha256, y-indexeddb, y-webrtc).
Do not rely on `instanceof` or module-level state of these packages across the
Next/tsx boundary; extend forwarding to CommonJS-resolvable closure packages
before adding such a dependency. Forwarding non-native closure packages is
follow-up work for PR C or later.

Do not replace this discovery with a hand-maintained package list or change the
server's imports to accommodate a bundler. Keep the frozen built-server A1 and
combined 34-row proofs unchanged; both must pass for packaging changes.
