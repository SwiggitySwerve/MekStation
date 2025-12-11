# PowerShell script to set up branch protection for main branch
# Requires GitHub CLI (gh) to be installed and authenticated
# Run: .\.github\scripts\setup-branch-protection.ps1

$ErrorActionPreference = "Stop"

$REPO = (gh repo view --json nameWithOwner -q .nameWithOwner)
$BRANCH = "main"

Write-Host "Setting up branch protection for $REPO`:$BRANCH..." -ForegroundColor Cyan

# Check if gh CLI is installed
try {
    $null = Get-Command gh -ErrorAction Stop
} catch {
    Write-Host "❌ GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "   Install from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
try {
    gh auth status 2>&1 | Out-Null
} catch {
    Write-Host "❌ Not authenticated with GitHub CLI." -ForegroundColor Red
    Write-Host "   Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ GitHub CLI is installed and authenticated" -ForegroundColor Green

# Set branch protection rules
Write-Host "📝 Configuring branch protection rules..." -ForegroundColor Cyan

$statusChecks = @(
    "Lint and Test",
    "Build Test / win",
    "Build Test / mac",
    "Build Test / linux"
)

$requiredStatusChecks = @{
    strict = $true
    contexts = $statusChecks
}

$requiredPRReviews = @{
    required_approving_review_count = 1
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    require_last_push_approval = $false
}

$body = @{
    required_status_checks = $requiredStatusChecks
    enforce_admins = $true
    required_pull_request_reviews = $requiredPRReviews
    restrictions = $null
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_linear_history = $false
    allow_fork_syncing = $false
    lock_branch = $false
    allow_lock_branch = $false
    required_conversation_resolution = $true
}

# Create temporary JSON file
$tempFile = [System.IO.Path]::GetTempFileName()
$body | ConvertTo-Json -Depth 10 | Set-Content -Path $tempFile -Encoding UTF8

try {
    # Apply branch protection
    Get-Content $tempFile | gh api "repos/:owner/:repo/branches/$BRANCH/protection" --method PUT --input -
} finally {
    # Clean up
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✅ Branch protection configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Branch protection rules:" -ForegroundColor Cyan
Write-Host "  - ✅ Require pull request reviews (1 approval)"
Write-Host "  - ✅ Require status checks to pass:"
foreach ($check in $statusChecks) {
    Write-Host "      - $check"
}
Write-Host "  - ✅ Require conversation resolution"
Write-Host "  - ✅ Enforce for administrators"
Write-Host "  - ❌ Block force pushes"
Write-Host "  - ❌ Block deletions"
Write-Host ""
Write-Host "Direct commits to main are now blocked. All changes must go through PRs." -ForegroundColor Green
