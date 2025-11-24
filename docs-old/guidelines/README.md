# Development Guidelines

This directory contains authoritative best practices and guidelines for the BattleTech Editor project. All developers should familiarize themselves with these documents and follow them when contributing code.

---

## 📚 Available Guidelines

### **Code Quality & Type Safety**

#### **[CODE_STYLING_BEST_PRACTICES.md](./CODE_STYLING_BEST_PRACTICES.md)** ⭐ **START HERE**
Comprehensive code style guide covering:
- TypeScript conventions and type safety
- React/Next.js component patterns
- Code formatting and organization
- Naming conventions
- Error handling patterns
- Performance best practices
- Testing standards

**When to use:** Before writing new code, when refactoring, or when reviewing code.

---

#### **[TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md)** ⭐ **CRITICAL**
Authoritative standards for the type system:
- Import strategy (`src/types/core` as single source of truth)
- Type safety and casting rules
- Type guards and runtime validation
- Migration from legacy types
- Constants vs. string literals

**When to use:** When working with types, interfaces, or migrating legacy code.

**Related:** See [COMPLETE_TYPE_SYSTEM_VIOLATIONS_INVENTORY.md](../analysis/COMPLETE_TYPE_SYSTEM_VIOLATIONS_INVENTORY.md) for known violations.

---

### **Documentation Standards**

#### **[DOCUMENTATION_GUIDELINES.md](./DOCUMENTATION_GUIDELINES.md)**
Standards for writing and organizing documentation:
- Documentation structure and content rules
- Where to place different types of content
- Documentation formatting standards
- Markdown conventions

**When to use:** When writing or updating documentation files.

---

#### **[CUSTOM_INSTRUCTIONS_FOR_DOCUMENTATION.md](./CUSTOM_INSTRUCTIONS_FOR_DOCUMENTATION.md)**
Custom instructions for documentation generation:
- Documentation templates
- Style preferences
- Formatting requirements
- Content organization

**When to use:** When generating or updating documentation programmatically.

---

### **Migration & Examples**

#### **[DROPDOWN_MIGRATION_EXAMPLES.md](./DROPDOWN_MIGRATION_EXAMPLES.md)**
Examples and patterns for migrating dropdown components:
- Migration patterns
- Code examples
- Common pitfalls
- Best practices

**When to use:** When migrating dropdown components to new patterns.

---

## 🎯 Quick Reference

### **For New Developers**
1. Read **[CODE_STYLING_BEST_PRACTICES.md](./CODE_STYLING_BEST_PRACTICES.md)** first
2. Review **[TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md)** for type system
3. Check **[DOCUMENTATION_GUIDELINES.md](./DOCUMENTATION_GUIDELINES.md)** for docs

### **For Code Reviews**
- Verify adherence to **[CODE_STYLING_BEST_PRACTICES.md](./CODE_STYLING_BEST_PRACTICES.md)**
- Check type usage against **[TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md)**
- Ensure proper error handling and type guards

### **For Refactoring**
- Follow **[TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md)** for type migrations
- Use **[CODE_STYLING_BEST_PRACTICES.md](./CODE_STYLING_BEST_PRACTICES.md)** for code organization
- Reference **[DROPDOWN_MIGRATION_EXAMPLES.md](./DROPDOWN_MIGRATION_EXAMPLES.md)** for component migrations

---

## 📋 Guidelines Checklist

When submitting code, ensure:

- [ ] Code follows **[CODE_STYLING_BEST_PRACTICES.md](./CODE_STYLING_BEST_PRACTICES.md)**
- [ ] Types imported from `src/types/core` (per **[TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md)**)
- [ ] No `as any` casts (use type guards instead)
- [ ] Constants used instead of string literals (`TechBase.INNER_SPHERE` not `'Inner Sphere'`)
- [ ] Proper error handling implemented
- [ ] Code is properly documented
- [ ] ESLint passes (`npm run lint`)

---

## 🔗 Related Documentation

### **Analysis & Reports**
- **[TYPE_SYSTEM_VIOLATIONS_REPORT.md](../analysis/TYPE_SYSTEM_VIOLATIONS_REPORT.md)** - Summary of violations
- **[COMPLETE_TYPE_SYSTEM_VIOLATIONS_INVENTORY.md](../analysis/COMPLETE_TYPE_SYSTEM_VIOLATIONS_INVENTORY.md)** - Detailed violations inventory

### **Architecture**
- **[CORE_ARCHITECTURE_PRINCIPLES.md](../analysis/CORE_ARCHITECTURE_PRINCIPLES.md)** - Core architecture principles
- **[TECHNICAL_ARCHITECTURE.md](../technical/TECHNICAL_ARCHITECTURE.md)** - System architecture

### **Implementation**
- **[DEVELOPER_GUIDE.md](../implementation/DEVELOPER_GUIDE.md)** - Developer onboarding guide
- **[QUICK_REFERENCE.md](../QUICK_REFERENCE.md)** - Quick reference for common tasks

---

## 📝 Contributing

When adding new guidelines:

1. Create a new markdown file in this directory
2. Follow the format of existing guidelines
3. Update this README to include the new guideline
4. Link from relevant sections in the main [docs/README.md](../README.md)

---

**Last Updated:** January 2025  
**Maintained By:** Development Team

