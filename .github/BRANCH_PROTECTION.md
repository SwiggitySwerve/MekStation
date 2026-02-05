# Branch Protection Setup

This repository requires all changes to the `main` branch to go through Pull Requests with passing CI checks.

## Automated Setup

### Using GitHub CLI (Recommended)

**Prerequisites:**

- Install [GitHub CLI](https://cli.github.com/)
- Authenticate: `gh auth login`

**Run the setup script:**

**On Linux/macOS:**

```bash
bash .github/scripts/setup-branch-protection.sh
```

**On Windows (PowerShell):**

```powershell
.\.github\scripts\setup-branch-protection.ps1
```

## Manual Setup

If you prefer to set up branch protection manually:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit the existing rule for `main`
4. Configure the following:

### Branch Protection Settings

- **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners: (optional)

- **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - `Lint and Test`
    - `Build Test / win`
    - `Build Test / mac`
    - `Build Test / linux`

- **Require conversation resolution before merging**
  - ✅ Enabled

- **Include administrators**
  - ✅ Enforce for administrators

- **Restrict who can push to matching branches**
  - Leave empty (all authenticated users can create PRs)

- **Allow force pushes**
  - ❌ Disabled

- **Allow deletions**
  - ❌ Disabled

## What This Means

- ✅ All changes to `main` must go through a Pull Request
- ✅ PRs must have at least 1 approval
- ✅ All CI checks must pass before merging
- ✅ All conversations must be resolved before merging
- ❌ Direct commits to `main` are blocked (even for admins)
- ❌ Force pushes to `main` are blocked
- ❌ Deleting the `main` branch is blocked

## Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes and commit
3. Push to your fork: `git push origin feature/my-feature`
4. Open a Pull Request on GitHub
5. Wait for CI checks to pass
6. Get at least 1 approval
7. Resolve any conversations
8. Merge the PR

## Troubleshooting

### "Required status checks are not passing"

- Check the PR checks tab to see which checks failed
- Fix the issues in your branch
- Push new commits to trigger re-runs

### "This branch has conflicts that must be resolved"

- Update your branch with the latest from `main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout your-branch
  git merge main
  # Resolve conflicts, then:
  git push origin your-branch
  ```

### "Merging is blocked"

- Ensure all required status checks have passed
- Ensure you have at least 1 approval
- Ensure all conversations are resolved
- Ensure your branch is up to date with `main`
