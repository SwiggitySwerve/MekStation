# Local test result seeds

`test:seed` prepares the local result cache using successful tests run on clean
main with this machine's platform, architecture and **full Node version**.
Linux/Node CI caches cannot seed a Windows or different-Node checkout.

Use an existing clean checkout whose HEAD equals its `origin/main`. Update only
your own prepared checkout; the command never creates, switches, fetches or
cleans a worktree, and never installs dependencies. Keep artifacts outside the
source checkout. Ensure its dependencies match its lockfile.

```powershell
npm run test:seed -- --source E:/work/clean-main --artifact E:/cache/unit-seed.json --project unit --shard 1/6 -- --ci --maxWorkers=2
npm run test:cached -- --project unit --shard 1/6 --verify-hits 3 -- --ci --maxWorkers=2
```

Repeat for each shard, using a different artifact filename. By default, no
project, shard or filter is selected, so all registered Jest projects/files run.
`--filter <repo-path-regex>` is available for scoped experiments; it produces a
partial seed and never claims a full run. Every requested source file executes
cold, including unkeyable files. The existing Jest executor batches Windows
command lines. Child stdin is closed and each batch has a ten-minute timeout;
choose enough shards to keep a whole queue ticket below fifteen minutes.

To adopt a previously captured **local** artifact without rerunning clean main:

```powershell
npm run test:seed -- --import E:/cache/unit-seed.json --project unit -- --ci --maxWorkers=2
npm run test:cached -- --project unit --verify-hits 3 -- --ci --maxWorkers=2
```

Shard/filter selections limit the census; the ordered project selection and
result-affecting Jest options must match. Result-neutral options such as worker
count and transform-cache directory may differ. The artifact includes source
SHA, complete requested file census, cold-run report, execution options,
runtime and cache-engine digest. Import requires the source commit to be a
known ancestor of local `origin/main`, checks the artifact checksum, and
recomputes every candidate key against the destination's actual inputs using
the existing cache keyer. Source/config/environment changes invalidate exactly
as they do for a native local cache; unkeyable files always execute.

An unsuccessful run or a source change during capture publishes no artifact.
Missing, corrupt, foreign or mismatched imports leave misses to execute through
`test:cached`. Existing local cache files, including rejected-hit tombstones,
take precedence. Only a fresh test pass can replace a tombstone. Import itself
does not prove destination tests pass; use `--verify-hits` on the subsequent run.
Checksums detect damaged files, not maliciously forged test proof: use artifacts
you produced or obtained from a trusted local source.

`--cache-dir` selects the destination cache and `--report` writes an adoption
report. Main/nightly/coverage behavior remains owned by `cached-tests.js`:
those runs execute every selected file even when a seed exists. No environment
keying policy or workflow gate changes are part of local seeding.
