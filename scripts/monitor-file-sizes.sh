#!/bin/bash

# File Size Monitoring Script
# Tracks large files that need refactoring

echo "=== 🔍 Large File Analysis Report ==="
echo "Generated: $(date)"
echo ""

# Set thresholds
CRITICAL_THRESHOLD=1000
HIGH_THRESHOLD=500

# Initialize counters
critical_count=0
high_count=0
total_lines=0
file_count=0

echo "📊 File Size Analysis:"
echo "====================="

# Find and analyze all TypeScript files
{
    find mekstation-app -name "*.ts" -o -name "*.tsx" | \
    grep -v node_modules | \
    grep -v ".backup." | \
    while read file; do
        lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        echo "$lines:$file"
    done | sort -nr
} > /tmp/file_analysis.txt

# Process results
echo "🔴 CRITICAL FILES (>$CRITICAL_THRESHOLD lines):"
echo "=============================================="
while IFS=':' read -r lines file; do
    if [ "$lines" -gt $CRITICAL_THRESHOLD ]; then
        echo "  $lines lines: $file"
        critical_count=$((critical_count + 1))
    fi
    total_lines=$((total_lines + lines))
    file_count=$((file_count + 1))
done < /tmp/file_analysis.txt

echo ""
echo "🟠 HIGH PRIORITY FILES ($HIGH_THRESHOLD-$CRITICAL_THRESHOLD lines):"
echo "================================================="
while IFS=':' read -r lines file; do
    if [ "$lines" -gt $HIGH_THRESHOLD ] && [ "$lines" -le $CRITICAL_THRESHOLD ]; then
        echo "  $lines lines: $file"
        high_count=$((high_count + 1))
    fi
done < /tmp/file_analysis.txt

echo ""
echo "📈 SUMMARY STATISTICS:"
echo "====================="
echo "  Critical files (>$CRITICAL_THRESHOLD lines): $critical_count"
echo "  High priority files ($HIGH_THRESHOLD-$CRITICAL_THRESHOLD lines): $high_count"
echo "  Total files analyzed: $file_count"
echo "  Total lines of code: $total_lines"

if [ $file_count -gt 0 ]; then
    avg_lines=$((total_lines / file_count))
    echo "  Average file size: $avg_lines lines"
fi

echo ""
echo "🎯 REFACTORING TARGETS:"
echo "======================"

# Top 10 largest files
echo "  Top 10 largest files requiring immediate attention:"
head -10 /tmp/file_analysis.txt | while IFS=':' read -r lines file; do
    echo "    $lines lines: $(basename "$file")"
done

echo ""
echo "📋 NEXT ACTIONS:"
echo "==============="

if [ $critical_count -gt 0 ]; then
    echo "  1. 🔴 Address $critical_count critical files immediately"
    echo "     - Focus on UnitCriticalManager.ts (largest file)"
    echo "     - Extract services following SOLID principles"
fi

if [ $high_count -gt 0 ]; then
    echo "  2. 🟠 Plan refactoring for $high_count high-priority files"
    echo "     - Break into focused components"
    echo "     - Extract reusable utilities"
fi

echo "  3. 📚 Update documentation after each refactoring"
echo "  4. 🧪 Ensure all tests pass after extraction"

# Clean up
rm /tmp/file_analysis.txt

echo ""
echo "📖 For detailed refactoring plan, see:"
echo "     ../docs/refactoring/LARGE_FILE_ANALYSIS_AND_BREAKDOWN_PLAN.md"

# Exit with error code if critical files exist
if [ $critical_count -gt 0 ]; then
    echo ""
    echo "❌ CRITICAL: $critical_count files over $CRITICAL_THRESHOLD lines detected!"
    echo "   Refactoring required before production deployment."
    exit 1
else
    echo ""
    echo "✅ No critical files detected. Good job!"
    exit 0
fi
