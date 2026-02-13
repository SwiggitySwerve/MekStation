#!/bin/bash

# Comprehensive spec analysis
SPECS_DIR="E:\Projects\MekStation\openspec\specs"
SRC_DIR="E:\Projects\MekStation\src"

# High-risk specs to check
HIGH_RISK_SPECS=(
  "campaign-finances"
  "campaign-hud"
  "campaign-instances"
  "campaign-management"
  "campaign-presets"
  "campaign-system"
  "campaign-ui"
  "contract-types"
  "day-progression"
  "faction-standing"
  "markets-system"
  "medical-system"
  "mission-contracts"
  "random-events"
  "scenario-generation"
  "simulation-system"
  "turnover-retention"
  "awards"
  "audit-timeline"
)

echo "=== HIGH-RISK SPEC IMPLEMENTATION ANALYSIS ==="
echo ""

for spec in "${HIGH_RISK_SPECS[@]}"; do
  spec_file="$SPECS_DIR/$spec/spec.md"
  
  if [ ! -f "$spec_file" ]; then
    echo "MISSING: $spec"
    continue
  fi
  
  # Check for TBD marker
  if grep -q "TBD - created by archiving" "$spec_file"; then
    status="TBD"
  else
    status="DEFINED"
  fi
  
  # Check for implementation
  # Look for key terms in src
  found_impl=0
  
  # Convert spec name to search patterns
  pattern1=$(echo "$spec" | tr '-' '_')
  pattern2=$(echo "$spec" | tr '-' '')
  
  if grep -r "$pattern1\|$pattern2\|$spec" "$SRC_DIR" --include="*.ts" --include="*.tsx" -q 2>/dev/null; then
    found_impl=1
  fi
  
  if [ $found_impl -eq 1 ]; then
    impl_status="IMPLEMENTED"
  else
    impl_status="NOT_FOUND"
  fi
  
  echo "$spec | Status: $status | Implementation: $impl_status"
done
