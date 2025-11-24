# [Rule Category Name] - BattleTech Rules

## 📋 **Metadata**
- **Category**: [Category Name]
- **Source**: [TechManual / Implementation / Both]
- **Last Updated**: [Date]
- **Related Files**:
  - Code: `[file paths]`
  - Docs: `[documentation paths]`
- **Related Rules**: 
  - [Link to related agents.md files]

---

## 🔍 **Overview**

[Brief description of what this rule category covers and why it's important]

---

## 📜 **Core Rules**

### **Rule Name**

- **Type**: [Constraint | Calculation | Validation | Restriction]
- **Priority**: [Critical | High | Medium | Low]
- **Source**: [TechManual Section / Code File]
- **Description**: [Human-readable description of the rule]
- **Formula**: [If applicable, mathematical formula or algorithm]
- **Code Reference**:
  ```typescript
  // File: path/to/file.ts
  // Function: functionName()
  ```
- **Examples**:
  - Example 1: [Description]
  - Example 2: [Description]
- **Exceptions**: [Any exceptions or special cases]
- **Related Rules**: [Links to other rules that interact with this one]

---

## 🛠️ **Implementation Details**

### **Code Location**

**Primary Implementation:**
- File: `[file path]`
- Class/Function: `[name]`
- Lines: `[line range]`

**Supporting Code:**
- File: `[file path]`
- Purpose: `[description]`

### **Validation Logic**

```typescript
// Pseudocode or actual code showing how rule is validated
function validateRule(config: UnitConfiguration): ValidationResult {
  // Validation logic
}
```

### **Edge Cases**

1. **Edge Case Name**
   - Description: [What makes this an edge case]
   - Handling: [How it's handled in code]
   - Example: [Concrete example]

---

## ⚡ **Quick Reference**

### **Formulas**

| Rule | Formula | Notes |
|------|---------|-------|
| Rule Name | `formula` | Description |

### **Tables**

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1 | Value 2 | Value 3 |

### **Constants**

```typescript
export const CONSTANT_NAME = {
  'Value1': 10,
  'Value2': 20
} as const;
```

---

## 🔗 **Related Rules**

### **Dependencies**
- [Rule Name](link) - This rule depends on...
- [Rule Name](link) - This rule depends on...

### **Dependents**
- [Rule Name](link) - Depends on this rule
- [Rule Name](link) - Depends on this rule

### **Interactions**
- [Rule Name](link) - Interacts with this rule in...
- [Rule Name](link) - Interacts with this rule in...

---

## ✅ **Validation Checklist**

- [ ] Rule is documented in code
- [ ] Rule has unit tests
- [ ] Rule is validated in ConstructionRulesValidator
- [ ] Rule has examples
- [ ] Edge cases are handled
- [ ] Related rules are cross-referenced

---

## 📝 **Notes**

[Any additional notes, considerations, or future work]

---

**Document Version**: 1.0  
**Last Updated**: [Date]
**Status**: [Draft | Review | Complete]

