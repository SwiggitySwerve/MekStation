# Documentation Cleanup Recommendations

**Date:** January 2025

## 🔴 **Files to Remove (Temporary/Outdated)**

### 1. Development Logs (Should not be in docs/)
- `docs/development/eslint-compact.txt` - Temporary ESLint output
- `docs/development/lint_issues.txt` - Temporary lint output

**Reason:** These are temporary development artifacts, not documentation. Should be in `.gitignore` or removed entirely.

---

### 2. Outdated Test Reports (Historical, not current)
- `docs/reports/VICTORY_REPORT.md` - Celebration document, not technical documentation
- `docs/reports/FINAL_COMPREHENSIVE_REPORT.md` - Outdated test report
- `docs/reports/FINAL_TEST_COMPLETION_SUMMARY.md` - Outdated test report  
- `docs/reports/FINAL_TEST_REPORT.md` - Outdated test report
- `docs/reports/TEST_COMPLETION_SUMMARY.md` - Likely duplicate/outdated
- `docs/reports/TEST_FAILURE_SUMMARY.md` - Historical failure report

**Reason:** These are historical test reports from past work. Current test status should be tracked in code, not old reports.

**Keep:** `TEST_ANALYSIS_REPORT.md` (if it's a reference guide, not a historical report)

---

### 3. Root Level Duplicate/Outdated Files
- `docs/implementation-progress.md` - Duplicate of information in `implementation/` folder
- `docs/implementation-task-list.md` - Duplicate/outdated task list
- `docs/component-documentation.md` - May be outdated, check if still relevant
- `docs/component-name-refactor.md` - Historical refactor doc, likely completed
- `docs/customizer-architecture-analysis.md` - Very long (2600+ lines), check if still relevant
- `docs/PROJECT_REORGANIZATION_SUMMARY.md` - Historical reorganization doc (already done)

**Reason:** These are either duplicates, outdated, or historical documents that are no longer actively maintained.

---

### 4. Meta-Documentation Files (About organizing docs, not actual docs)
- `docs/DOCUMENTATION_CONSOLIDATION_SUMMARY.md` - Meta-doc about consolidation
- `docs/DOCUMENTATION_ORGANIZATION_SUMMARY.md` - Meta-doc about organization
- `docs/PRE_OCTOBER_SUMMARIES_CLEANUP.md` - Meta-doc about cleanup

**Reason:** These are documentation about documentation organization. Useful for reference but could be consolidated into a single "Documentation Maintenance" doc or removed after cleanup is complete.

---

### 5. Planning/TODO Documents (May be outdated)
- `docs/battletech/TODO_CODIFICATION.md` - TODO list, check if still relevant
- `docs/battletech/DOCUMENTATION_PLAN_SUMMARY.md` - Planning document
- `docs/battletech/AGENT_SETUP_SUMMARY.md` - Setup summary
- `docs/battletech/AGENTS_MD_PLAN.md` - Planning document

**Reason:** Planning documents that may be outdated. Check if plans were completed or are still active.

---

## 🟡 **Files to Consider Moving/Consolidating**

### 1. Rules Documentation
- `docs/rules/CONSTRUCTION_RULES_AGENTS.md` - Only file in `rules/` folder, might belong in `battletech/rules/`

**Reason:** Single file in a folder suggests it might be misplaced or the folder structure could be simplified.

---

### 2. Performance Guide
- `docs/performance-integration-guide.md` - Root level file, might belong in `implementation/` or `guidelines/`

**Reason:** Root level file that could be better organized in a subdirectory.

---

### 3. Phase Documentation
- All files in `docs/phases/` - Historical phase documentation

**Reason:** These are historical records. Consider if they're still needed or should be archived.

---

## 📊 **Summary**

### Files to Remove: ~20 files
- 2 development log files (.txt)
- 6 outdated test reports
- 6 root level duplicate/outdated files
- 3 meta-documentation files
- 4 planning/TODO documents

### Files to Move/Consolidate: ~5 files
- 1 rules file (move to battletech/rules/)
- 1 performance guide (move to implementation/)
- 3 phase docs (consider archiving)

---

## ✅ **Recommended Actions**

1. **Immediate Removal:**
   - Development log files (.txt)
   - Outdated test reports (VICTORY_REPORT, FINAL_* reports)
   - Meta-documentation files (after cleanup is complete)

2. **Review Before Removal:**
   - Root level duplicate files (check if still referenced)
   - Planning documents (check if plans are still active)
   - Component documentation files (verify if still relevant)

3. **Move/Reorganize:**
   - Rules file to battletech/rules/
   - Performance guide to implementation/
   - Consider archiving phase documentation

---

## 🎯 **Expected Impact**

- **Reduction:** ~20-25 files removed
- **Clarity:** Cleaner documentation structure
- **Maintenance:** Less outdated information to maintain
- **Navigation:** Easier to find current, relevant documentation

