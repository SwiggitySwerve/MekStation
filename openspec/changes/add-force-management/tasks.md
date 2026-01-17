# Tasks: Force Management System

## 1. Data Model
- [ ] 1.1 Define IForce interface
- [ ] 1.2 Define IAssignment interface (pilot + mech)
- [ ] 1.3 Define force hierarchy types (lance, company, battalion)
- [ ] 1.4 Implement BV/tonnage calculation

## 2. Database Schema
- [ ] 2.1 Create forces table migration
- [ ] 2.2 Create force_assignments junction table
- [ ] 2.3 Add database CRUD operations
- [ ] 2.4 Implement force hierarchy queries

## 3. Force Service
- [ ] 3.1 Create ForceService
- [ ] 3.2 Implement create force
- [ ] 3.3 Implement add/remove assignment
- [ ] 3.4 Implement force hierarchy operations
- [ ] 3.5 Implement force cloning
- [ ] 3.6 Write tests for force service

## 4. Assignment Management
- [ ] 4.1 Implement pilot-mech pairing validation
- [ ] 4.2 Implement position assignment (lance lead, etc.)
- [ ] 4.3 Implement assignment swap
- [ ] 4.4 Write tests for assignments

## 5. Force Builder UI
- [ ] 5.1 Create force builder component
- [ ] 5.2 Implement pilot selector
- [ ] 5.3 Implement mech selector
- [ ] 5.4 Implement drag-drop assignment
- [ ] 5.5 Show BV/tonnage totals
- [ ] 5.6 Show force validation warnings

## 6. Force Roster UI
- [ ] 6.1 Create /gameplay/forces roster page
- [ ] 6.2 Create /gameplay/forces/create page
- [ ] 6.3 Create /gameplay/forces/[id] detail page
- [ ] 6.4 Implement force card component
- [ ] 6.5 Implement force hierarchy view

## 7. Integration
- [ ] 7.1 Add force store (Zustand)
- [ ] 7.2 Add force API routes
- [ ] 7.3 Link to pilot roster
- [ ] 7.4 Link to unit catalog
- [ ] 7.5 Write E2E tests
