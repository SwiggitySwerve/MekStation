# Tasks: Awards System

## 1. Data Model

- [ ] 1.1 Define `IAward` interface (id, name, description, criteria, rarity)
- [ ] 1.2 Define `IAwardCriteria` interface (type, threshold, conditions)
- [ ] 1.3 Define `IPilotAward` interface (awardId, earnedAt, context)
- [ ] 1.4 Add awards field to pilot data model
- [ ] 1.5 Define award rarity tiers (common, uncommon, rare, legendary)

## 2. Award Definitions

- [ ] 2.1 Define combat awards (First Kill, Ace, Marksman, etc.)
- [ ] 2.2 Define survival awards (Survivor, Iron Will, etc.)
- [ ] 2.3 Define campaign awards (Campaign Victor, Veteran, etc.)
- [ ] 2.4 Define service awards (100 Games, Year of Service, etc.)
- [ ] 2.5 Define special/rare awards (Against All Odds, etc.)
- [ ] 2.6 Create award icon/badge assets

## 3. Award Tracking Service

- [ ] 3.1 Create `AwardService` class
- [ ] 3.2 Implement criteria evaluation engine
- [ ] 3.3 Add hooks for game events (kills, damage, etc.)
- [ ] 3.4 Implement award granting logic
- [ ] 3.5 Add duplicate prevention (one-time vs repeatable awards)
- [ ] 3.6 Integrate with pilot store

## 4. Statistics Tracking

- [ ] 4.1 Track kills per pilot
- [ ] 4.2 Track damage dealt/received
- [ ] 4.3 Track missions participated
- [ ] 4.4 Track campaign completions
- [ ] 4.5 Track survival rate
- [ ] 4.6 Persist statistics across sessions

## 5. UI - Award Display

- [ ] 5.1 Create `AwardBadge` component
- [ ] 5.2 Create `AwardGrid` component for pilot profile
- [ ] 5.3 Create `AwardDetailModal` with lore/requirements
- [ ] 5.4 Add awards section to pilot detail page
- [ ] 5.5 Create `AwardRibbon` compact display

## 6. UI - Notifications

- [ ] 6.1 Create `AwardEarnedToast` component
- [ ] 6.2 Add animation for rare awards
- [ ] 6.3 Create post-game award summary
- [ ] 6.4 Add award progress indicators (X/Y kills)

## 7. Testing

- [ ] 7.1 Unit tests for criteria evaluation
- [ ] 7.2 Unit tests for award granting
- [ ] 7.3 Integration tests with game events
- [ ] 7.4 Test award persistence
