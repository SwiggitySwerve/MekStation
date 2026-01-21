# Tasks: Awards System

## 1. Data Model

- [x] 1.1 Define `IAward` interface (id, name, description, criteria, rarity)
- [x] 1.2 Define `IAwardCriteria` interface (type, threshold, conditions)
- [x] 1.3 Define `IPilotAward` interface (awardId, earnedAt, context)
- [x] 1.4 Add awards field to pilot data model
- [x] 1.5 Define award rarity tiers (common, uncommon, rare, legendary)

## 2. Award Definitions

- [x] 2.1 Define combat awards (First Blood, Ace, Marksman, etc.)
- [x] 2.2 Define survival awards (Survivor, Iron Will, etc.)
- [x] 2.3 Define campaign awards (Campaign Victor, Veteran, etc.)
- [x] 2.4 Define service awards (100 Games, Year of Service, etc.)
- [x] 2.5 Define special/rare awards (Against All Odds, etc.)
- [x] 2.6 Create award icon/badge assets (placeholder: first letter in circle)

## 3. Award Tracking Service

- [x] 3.1 Create `useAwardStore` Zustand store
- [x] 3.2 Implement criteria evaluation engine
- [x] 3.3 Add hooks for game events (kills, damage, etc.)
- [x] 3.4 Implement award granting logic
- [x] 3.5 Add duplicate prevention (one-time vs repeatable awards)
- [x] 3.6 Integrate with pilot store

## 4. Statistics Tracking

- [x] 4.1 Track kills per pilot
- [x] 4.2 Track damage dealt/received
- [x] 4.3 Track missions participated
- [x] 4.4 Track campaign completions
- [x] 4.5 Track survival rate
- [x] 4.6 Persist statistics across sessions

## 5. UI - Award Display

- [x] 5.1 Create `AwardBadge` component
- [x] 5.2 Create `AwardGrid` component for pilot profile
- [x] 5.3 Create `AwardDetailModal` with lore/requirements
- [ ] 5.4 Add awards section to pilot detail page
- [x] 5.5 Create `AwardRibbon` compact display

## 6. UI - Notifications

- [x] 6.1 Create `AwardEarnedToast` component
- [x] 6.2 Add animation for rare awards
- [ ] 6.3 Create post-game award summary
- [x] 6.4 Add award progress indicators (X/Y kills)

## 7. Testing

- [x] 7.1 Unit tests for criteria evaluation
- [x] 7.2 Unit tests for award granting
- [x] 7.3 Integration tests with game events
- [x] 7.4 Test award persistence
