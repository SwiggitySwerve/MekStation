# Tasks: Force Management System

## 1. Data Model
- [x] 1.1 Define IForce interface
- [x] 1.2 Define IAssignment interface (pilot + mech)
- [x] 1.3 Define force hierarchy types (lance, company, battalion)
- [x] 1.4 Implement BV/tonnage calculation

## 2. Database Schema
- [x] 2.1 Create forces table migration
- [x] 2.2 Create force_assignments junction table
- [x] 2.3 Add database CRUD operations
- [x] 2.4 Implement force hierarchy queries

## 3. Force Service
- [x] 3.1 Create ForceService
- [x] 3.2 Implement create force
- [x] 3.3 Implement add/remove assignment
- [x] 3.4 Implement force hierarchy operations
- [x] 3.5 Implement force cloning
- [x] 3.6 Write tests for force service

## 4. Assignment Management
- [x] 4.1 Implement pilot-mech pairing validation
- [x] 4.2 Implement position assignment (lance lead, etc.)
- [x] 4.3 Implement assignment swap
- [x] 4.4 Write tests for assignments

## 5. Force Builder UI
- [x] 5.1 Create force builder component
- [x] 5.2 Implement pilot selector
- [x] 5.3 Implement mech selector
- [x] 5.4 Implement drag-drop assignment (via swap mode)
- [x] 5.5 Show BV/tonnage totals
- [x] 5.6 Show force validation warnings

## 6. Force Roster UI
- [x] 6.1 Create /gameplay/forces roster page
- [x] 6.2 Create /gameplay/forces/create page
- [x] 6.3 Create /gameplay/forces/[id] detail page
- [x] 6.4 Implement force card component
- [x] 6.5 Implement force hierarchy view (basic - displays via ForceBuilder)

## 7. Integration
- [x] 7.1 Add force store (Zustand)
- [x] 7.2 Add force API routes
- [x] 7.3 Link to pilot roster
- [x] 7.4 Link to unit catalog (placeholder - unit store not yet implemented)
- [ ] 7.5 Write E2E tests (deferred - low priority)
