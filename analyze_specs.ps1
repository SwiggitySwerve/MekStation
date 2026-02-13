# PowerShell script to analyze spec implementation status

$specsDir = "E:\Projects\MekStation\openspec\specs"
$srcDir = "E:\Projects\MekStation\src"

# Get all spec directories
$specs = Get-ChildItem -Path $specsDir -Directory | Where-Object { $_.Name -ne "README.md" } | Sort-Object Name

$results = @{
    "IMPLEMENTED" = @()
    "PARTIALLY_IMPLEMENTED" = @()
    "NOT_IMPLEMENTED" = @()
    "ROADMAP_ONLY" = @()
}

foreach ($spec in $specs) {
    $specName = $spec.Name
    $specFile = Join-Path $spec.FullName "spec.md"
    
    if (-not (Test-Path $specFile)) {
        continue
    }
    
    # Read spec file to check for roadmap markers
    $content = Get-Content $specFile -Raw
    $isRoadmap = $content -match "(roadmap|planned|future|TBD)" -and $content -match "Status.*Draft"
    
    # Check for implementation in src
    # Look for files/folders matching spec name pattern
    $searchPatterns = @(
        $specName,
        ($specName -replace "-", ""),
        ($specName -replace "-", "_"),
        ($specName -split "-" | ForEach-Object { $_ } | Select-Object -First 1)
    )
    
    $found = $false
    foreach ($pattern in $searchPatterns) {
        $matches = Get-ChildItem -Path $srcDir -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -like "*$pattern*" -and $_.Name -like "*.ts" -or $_.Name -like "*.tsx" }
        
        if ($matches) {
            $found = $true
            break
        }
    }
    
    if ($isRoadmap) {
        $results["ROADMAP_ONLY"] += $specName
    } elseif ($found) {
        $results["IMPLEMENTED"] += $specName
    } else {
        $results["NOT_IMPLEMENTED"] += $specName
    }
}

# Output results
Write-Host "=== SPEC IMPLEMENTATION ANALYSIS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPLEMENTED: $($results['IMPLEMENTED'].Count)" -ForegroundColor Green
Write-Host "PARTIALLY_IMPLEMENTED: $($results['PARTIALLY_IMPLEMENTED'].Count)" -ForegroundColor Yellow
Write-Host "NOT_IMPLEMENTED: $($results['NOT_IMPLEMENTED'].Count)" -ForegroundColor Red
Write-Host "ROADMAP_ONLY: $($results['ROADMAP_ONLY'].Count)" -ForegroundColor Blue
Write-Host ""

Write-Host "NOT IMPLEMENTED SPECS:" -ForegroundColor Red
$results["NOT_IMPLEMENTED"] | Sort-Object | ForEach-Object { Write-Host "  - $_" }
