APPROVE-WITH-NOTES

Independent REL-04 pre-review — 2026-10-17

Reviewed commit: 07a413d318b2f23eecca76dd232778e301c2110e
Parent: 437db72aab57009f2ba5b73a86220cb2dc65615a
Branch: codex/rel04-release-20261017
Worktree: E:/Projects/Personal/MekStation-wt/rel04-release-20261017
Scope: .github/workflows/release.yml only, +52/-24.
Line references below refer to files at that commit.

No blocking defect was established for publishing the configured unsigned installers. Approval applies to this commit's release-pipeline change, not to an untested future merge containing the TypeScript 7 work. The worktree was clean and its local tracking status was ahead 1 / behind 26. No build, dependency install, workflow dispatch/rerun, commit, push, tag creation, or release publication was performed. This audit is the only intentional file write.

Findings and concrete follow-ups

1. [P2, nonblocking] Older-tag selection is fixed for the commit list, but not explicitly applied to GitHub-generated notes.
   References: release.yml:91-96, 473-474, 488-489, 498.
   The awk expression correctly chooses the version-sorted predecessor of the requested tag, rather than the newest unrelated tag. However, releases/generate-notes receives only tag_name. GitHub independently chooses its comparison base; it is not guaranteed to match PREV_TAG, especially when retrying an older release. The explicit compare link and commit appendix can therefore describe a different interval from the generated section.
   Concrete fix: build the gh API arguments with tag_name and, when prev_tag is nonempty, add previous_tag_name. If no predecessor exists, link to the tag's commits page rather than /compare/...TAG. This is release-note accuracy, not an installer-publication blocker.

2. [P2, nonblocking] The new missing-file checks reject an empty collection, not an incomplete release.
   References: release.yml:299-315, 318-324, 441-446, 515-517.
   if-no-files-found: error and fail\*on_unmatched_files: true are useful. But artifacts/\*\*/\_ is one broad glob: one surviving file satisfies it. The staging step likewise accepts any matching file, including a lone YAML manifest. These checks do not individually establish that each expected installer or architecture is present. Normal electron-builder target failures still fail their matrix job, and release waits for all four jobs, so there is no observed first-run failure here.
   Concrete fix: before upload, assert the expected per-platform set: Linux AppImage/deb/tar.gz; Windows x64 NSIS and portable EXEs; macOS DMG and ZIP for each architecture. Validate manifest-referenced assets as a separate check. Keep the existing empty-upload checks.

3. [P2, existing behavior outside the installer fix] Uploading GitHub Release assets does not advance the application's update feed.
   References: release.yml:306-309, 512-522; desktop/electron/main.updater.ts:26-48; desktop/package.json release:\* scripts.
   The application uses a generic feed at https://swiggityswerve.github.io/MekStation/updates with platform/architecture subpaths. This workflow uploads to GitHub Releases but does not invoke the repository's update-metadata preparation/publication scripts. Renaming latest-mac.yml avoids cross-architecture collisions in the release upload; those renamed files alone do not publish the generic feed.
   Concrete fix if v2.1.0 is intended to reach existing clients automatically: include the existing metadata preparation and gh-pages publication process in the release procedure, after asset publication, and verify its URLs. This is not a blocker for the stated installer-publication scope and is not a regression introduced by this diff.

4. [Operational note] Docker independence does not make the entire workflow green.
   References: release.yml:327-368, 370-421, 423-429, 505-508.
   A failed Docker job still produces a failed overall run because neither Docker job uses continue-on-error. The release job can nevertheless succeed because Docker is absent from its dependency chain. Installer publication must be judged by the release job and resulting assets, not only the overall run conclusion. Any separate automation that requires the whole workflow's success will still see failure.
   Concrete follow-up: make the release checklist distinguish installer and container results. If a green installer workflow is an operational requirement, move Docker to a separately reported workflow. Do not silently hide a failed container publication.

Claim-by-claim verification

- Release no longer depends on Docker: VERIFIED. release.needs is exactly [release-context, build] at line 425; build depends only on release-context and prepare-build at line 179. Neither direct nor transitive dependency includes Docker. GitHub's needs semantics support this; an unrelated failed job does not force the release job to skip. Keeping the ordinary success condition correctly prevents publication after an installer build fails.

- Resolve the tag at the triggering workflow's head: VERIFIED. Lines 40-54 use github.event.workflow_run.head_sha and git tag --points-at, after fetching tags; lines 80-88 peel and compare the tag to that head. This avoids selecting a newer tag minted elsewhere while main advances. Each build/release checkout uses the resolved tag ref. Read-only verification against the actual mint commit returned v2.0.0 for 099258f23dca66e2b2e9b3bba92a90108765ca29, and refs/tags/v2.0.0^{commit} returned that same SHA. An absent tag produces no outputs and downstream jobs skip. This is a commit-match guard, not proof that a particular rerun newly minted the tag: rerunning auto-version at an already tagged head can rebuild that tag.

- GITHUB_TOKEN tag pushes do not trigger push workflows, so workflow_run supplies the automatic path: VERIFIED. auto-version.yml:30-34 checks out with GITHUB_TOKEN and lines 163-172 create/push the annotated tag. GitHub explicitly documents suppression of push-triggered workflow recursion with that token. The successful mint run and following workflow_run release run provide repository-specific corroboration. release.yml must be merged to the default branch before relying on this event. workflow_dispatch remains another supported route.

- Hidden .next artifacts require include-hidden-files: VERIFIED. The upload-artifact v7 action metadata defaults include-hidden-files to false. release.yml:169 enables it for the selected .next/standalone and .next/static paths, including nested hidden directories. The other selected paths have workspace root as their common ancestor, preserving the expected layout on download. Lines 260-265 explicitly check that layout. This is required by the currently referenced action, regardless of what older historical runs accepted.

- macOS runners and caches are architecture-separated: VERIFIED FOR THE COMMIT; THE SUPPLIED SUMMARY IS STALE. The diff uses macos-15 for arm64 and macos-15-intel for x64 at lines 192-198, not macos-13/macOS-latest. The current runner-images catalog explicitly maps those labels to arm64/x64. GitHub's macOS 13 retirement announcement places removal in December 2025, well before this October 2026 review; using macos-13 now would be wrong. The macos-15-intel announcement provides availability through August 2027. Both cache keys and the Electron cache restore prefix include runner.arch (lines 130, 230-232, 241). desktop/scripts/rebuild-next-standalone.js passes process.arch to @electron/rebuild, so matching hosts are appropriate. Availability was established from the live catalog and announcements, not a newly queued runner.

- Windows x64 only: VERIFIED. Line 282 explicitly supplies --win --x64. This restricts the CLI target architecture despite the shared electron-builder.yml NSIS configuration also listing ia32. The standalone native payload is rebuilt for the x64 host. No 32-bit Windows installer should be promised for this release.

- Release notes fit GitHub's 125,000-character body ceiling: VERIFIED FOR THE CURRENT ACTION; THE WORKFLOW-ONLY BOUND IS QUALIFIED. Lines 470/474 limit the appendix to 100 commits, and line 492 limits generated notes to 50,000 characters. The inspected commit's last 100 entries since v2.0.0 total 8,252 characters excluding a trailing newline; the longest entry is 104 characters. That leaves ample room for the fixed prose. A count of commits alone is not a mathematical character bound because Git subjects have no corresponding short maximum. Crucially, the actual softprops v3 implementation additionally truncates the final body to 124,999 JavaScript string units for both create and update requests. Thus oversized subjects should not produce the claimed body-limit failure with the inspected v3. A local final-body cap could preserve the footer deterministically, but is not required to cure an established blocker. The exact comment that generated notes from v2.0.0 to main already exceed 125k was not independently reproduced; no generate-notes request was made for the not-yet-created v2.1.0 tag.

- softprops/action-gh-release v1 -> v3 / Node 24: VERIFIED. release.yml:513 selects v3. Upstream action.yml declares runs.using: node24 and supports the supplied body_path, files and fail_on_unmatched_files inputs. During review, v3 resolved through annotated tag object 5113cdc90fd4d541c801c55356214017bf5ae34b to commit efb35369e0ad2afab669f228072c1b0d510eae64, tagged 2026-08-30. The action runtime is separate from the Node 22 application build runtime. This review does not assume that a movable major tag's implementation is immutable.

- Missing-artifact match explicitly fails: VERIFIED WITH THE LIMITATION IN FINDING 2. A totally unmatched release glob now fails, as do empty platform uploads. It is not an asset inventory assertion.

- Older-tag retry previous-tag fix: VERIFIED for numeric v\* ordering and the commit appendix. The awk expression consumes the sorted list, finds the requested tag by equality, and selects the following entry. This avoids both the old newest-tag selection and early pipe closure. It is version ordering, not a nearest-ancestor calculation; GitHub-generated notes still need the explicit base noted above. The repository currently has v2.0.0 followed by v1.8.17.

- Lightweight tags: VERIFIED BY GIT OBJECT SEMANTICS AND THE EXPRESSIONS. Lines 71, 456 and 462 use refs/tags/...^{commit}, which accepts both a lightweight commit ref and an annotated tag that peels to a commit. The old ^{tag} check rejected lightweight tags. No temporary tags were created. The existing annotated v2.0.0 tag was directly checked as described above.

Signing, package outputs, and first-run considerations

No extra signing secrets are required for this configured unsigned build. release.yml:182-183 disables automatic macOS certificate discovery. electron-builder.yml:55-56 disables hardened runtime/Gatekeeper assessment, line 64 disables DMG signing, and lines 89-92 disable Windows executable signing/editing and update signature verification. No forceCodeSigning option is set. The locked app-builder-lib/electron-builder version is 26.15.7, not merely the package.json minimum 26.15.3. Its macOS implementation reports a missing identity without failing unless signing is forced; missing notarization credentials are skipped. Its publish manager sets isPublish=false for --publish never while still generating update information from configured publish metadata. Adding dummy Apple credentials or a GH_TOKEN to packaging is unnecessary.

This establishes packaging behavior, not successful OS launch or trusted/notarized distribution. In particular, disabling certificate discovery does not establish that the final macOS arm64 bundle has a valid ad-hoc signature. No macOS/Windows installation or launch was exercised here.

The staging globs cover all configured installer targets: .dmg/.zip, .exe, .AppImage/.deb/.tar.gz, plus .yml update metadata and .blockmap files. Generic artifact names include OS/architecture; the portable EXE is Windows-only and Windows is now x64-only; macOS update manifests are renamed per architecture before merge-multiple. --publish never prevents electron-builder from uploading independently, while softprops uploads the staged files. No configured installer suffix is missing from the globs. Do not confuse that coverage with complete-inventory validation (finding 2).

The preparer should not assume Docker will repeat the July missing-securityPolicy failure at this commit: the reviewed .dockerignore now explicitly includes desktop/electron/securityPolicy.ts. Docker may succeed or fail for other reasons; independence is valuable in either case.

For the first intended v2.1.0 run, merge the release fix and finished TypeScript changes before minting the tag on the intended commit. Auto Version and Release with bump_type=minor is the existing minting path from the observed latest v2.0.0. Dispatching Build and Release with no input selects an existing tag; it does not mint v2.1.0. If a tag already exists, use the release workflow's explicit release_tag input to target it. These are procedural observations only; no workflows were run.

The full auto-version.yml was read. Its remaining head pipelines at lines 43 and 145 are not the same demonstrated pipefail failure: its unspecified Linux shell is documented as bash -e, and it does not enable pipefail. Release tag resolution explicitly enables pipefail and appropriately uses consumers that read the entire stream. This does not warrant a new blocker based on head alone.

Historical evidence checked

- Run 29079648253 — https://github.com/SwiggitySwerve/MekStation/actions/runs/29079648253
  Created 2026-07-10T08:23:58Z, event workflow_run, head 099258f23dca66e2b2e9b3bba92a90108765ca29, overall failure. gh run view job metadata confirms release-context and prepare success; all four mac-arm64/mac-x64/Windows/Linux jobs success; Docker build failure; Docker push and release skipped. Thus the claimed dependency failure is corroborated. Requests for its logs returned HTTP 410; its exact Docker error was not reconstructed from another run.

- Run 29086738187 — https://github.com/SwiggitySwerve/MekStation/actions/runs/29086738187
  Created 2026-07-10T10:34:08Z, event workflow_run, head 648098a88cf75fbe3cf14303b741b8f1042c44fa, overall failure. Same installer-success / Docker-failure / release-skipped pattern in job metadata. gh run view --log-failed returned the fatal npm run build error: "Cannot find module './desktop/electron/securityPolicy'", followed by exit code 1. An earlier missing /app/scripts/mm-data/check-assets.js message also appears, but the securityPolicy failure is the fatal build-stage evidence.

- Run 29079630633 — https://github.com/SwiggitySwerve/MekStation/actions/runs/29079630633
  Created 2026-07-10T08:23:38Z, event push on main, head 099258f23dca66e2b2e9b3bba92a90108765ca29, success. Log output reports latest v1.8.17, bump major, new v2.0.0, and successful tag push. The following release run shares the head and starts after completion.

- Run 25949768939 — https://github.com/SwiggitySwerve/MekStation/actions/runs/25949768939
  Created 2026-05-16T01:54:01Z, event workflow_run, head 5ffd74139d001b297f256710afac47dcc02ecd10, overall success. All installer, Docker and release jobs succeeded; Create Release specifically succeeded. Detailed log retrieval returned HTTP 410. This establishes historical workflow success, not current artifact availability or correctness of today's dependencies.

Primary references consulted

- GitHub workflow triggering / GITHUB_TOKEN:
  https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
- workflow_run event and default-branch behavior:
  https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run
- needs, shell invocation, and continue-on-error semantics:
  https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Runner label/architecture catalog:
  https://github.com/actions/runner-images/blob/main/README.md
- macOS 13 retirement and macos-15-intel availability:
  https://github.com/actions/runner-images/issues/13046
  https://github.com/actions/runner-images/issues/13045
- upload-artifact input defaults:
  https://github.com/actions/upload-artifact/blob/v7/action.yml
- Inspected gh-release action metadata and final-body truncation:
  https://github.com/softprops/action-gh-release/blob/efb35369e0ad2afab669f228072c1b0d510eae64/action.yml
  https://github.com/softprops/action-gh-release/blob/efb35369e0ad2afab669f228072c1b0d510eae64/src/github.ts
- Corroborating recorded GitHub API response for the 125,000-character ceiling:
  https://github.com/softprops/action-gh-release/issues/374
- Locked electron-builder implementation:
  https://unpkg.com/app-builder-lib@26.15.7/out/macPackager.js
  https://unpkg.com/app-builder-lib@26.15.7/out/mac/MacTargetHelper.js
  https://unpkg.com/app-builder-lib@26.15.7/out/codeSign/macCodeSign.js
  https://unpkg.com/app-builder-lib@26.15.7/out/publish/PublishManager.js

Validation limits

This was a source/API review with lightweight Git inspection, including a clean git diff --check. It did not exercise runner scheduling, npm installation, TypeScript compilation, native ABI rebuilds, packaging, signing, release upload, update-feed publication, or application startup. Historical green jobs are supporting evidence, not proof that this commit or a later integrated v2.1.0 commit will build. The retained limitations do not identify a concrete blocker in the reviewed REL-04 diff.
