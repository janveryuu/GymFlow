# E2E Test Infra: GymFlow Mobile

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md`, exercising the application as an end-user without internal implementation Coupling.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory & Test Tier Mapping
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Workloads) |
|---|---------|----------------------|:-----------------:|:-------------------:|:---------------------:|:------------------:|
| 1 | Auth Flow (Login & Tokens) | ORIGINAL_REQUEST §R1, §R2 | ≥5 tests | ≥5 tests | Pairwise with M3/M4 | Scenario S1 |
| 2 | Forced Password Reset | ORIGINAL_REQUEST §R1, §R2 | ≥5 tests | ≥5 tests | Pairwise with Login | Scenario S1 |
| 3 | Forgot Password Recovery | ORIGINAL_REQUEST §R1, §R2 | ≥5 tests | ≥5 tests | Pairwise with Auth | Scenario S1 |
| 4 | MSW Mock API Latency & Codes | ORIGINAL_REQUEST §R2 | ≥5 tests | ≥5 tests | Pairwise with Sync | Scenario S2 |
| 5 | SQLite Offline Caching | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Catalog | Scenario S2 |
| 6 | Sync Priority (Attendance > Progress) | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Checkin | Scenario S2, S4 |
| 7 | Exponential Backoff with Jitter | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Network | Scenario S2 |
| 8 | 401 Queue Pause Policy | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Auth | Scenario S3 |
| 9 | 409 Conflict & Banner | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Cancel | Scenario S3 |
| 10 | 7-Day TTL Amber Warning | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Nav | Scenario S3 |
| 11 | Category Art Offline Fallback | ORIGINAL_REQUEST §R3 | ≥5 tests | ≥5 tests | Pairwise with Catalog | Scenario S2 |
| 12 | Dashboard Activity Ring & Summary | ORIGINAL_REQUEST §R1, §R4 | ≥5 tests | ≥5 tests | Pairwise with Logging | Scenario S4 |
| 13 | Workout Catalog & Category Filters | ORIGINAL_REQUEST §R1, §R4 | ≥5 tests | ≥5 tests | Pairwise with Filters | Scenario S4 |
| 14 | Workout Detail & Completion Logging | ORIGINAL_REQUEST §R1, §R4 | ≥5 tests | ≥5 tests | Pairwise with Progress | Scenario S4 |
| 15 | Schedule Week Calendar & Swipe | ORIGINAL_REQUEST §R1, §R4 | ≥5 tests | ≥5 tests | Pairwise with Sessions | Scenario S5 |
| 16 | Session Cancellation Opt-Out | ORIGINAL_REQUEST §R1, §R2 | ≥5 tests | ≥5 tests | Pairwise with 409 Conflict | Scenario S3, S5 |
| 17 | Progress Tracking Charts (Victory Native) | ORIGINAL_REQUEST §R1, §R4 | ≥5 tests | ≥5 tests | Pairwise with History | Scenario S4 |
| 18 | Null Heart-Rate Displays "—" | ORIGINAL_REQUEST §R4, AC | ≥5 tests | ≥5 tests | Pairwise with Progress | Scenario S4 |
| 19 | Profile & Preference Editing | ORIGINAL_REQUEST §R1, §R2 | ≥5 tests | ≥5 tests | Pairwise with Dashboard | Scenario S5 |
| 20 | Persistent Nav Shell Sync Slot | ORIGINAL_REQUEST §R1, §R3 | ≥5 tests | ≥5 tests | Pairwise with Sync | Scenario S2, S3 |
| 21 | Universal Skeleton Loading States | ORIGINAL_REQUEST §R4, AC | ≥5 tests | ≥5 tests | Pairwise with Network | Scenario S2 |
| 22 | Intentional Empty & Error States | ORIGINAL_REQUEST §R4, AC | ≥5 tests | ≥5 tests | Pairwise with API 500 | Scenario S2 |
| 23 | Scope Discipline Guardrails (R8) | ORIGINAL_REQUEST §R8, AC | ≥5 tests | ≥5 tests | Negative inspection | Scenario S1-S5 |

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| S1 | New/Expired Member Onboarding & First Login | F1, F2, F3, F21, F23 | Medium |
| S2 | Full Offline Workout & Sync Recovery Cycle | F4, F5, F6, F7, F11, F20, F21 | High |
| S3 | Conflicted Schedule & Token Expiry Recovery | F8, F9, F10, F16, F20, F22 | High |
| S4 | Daily Fitness Routine (Browse, Complete, Track) | F12, F13, F14, F17, F18, F6 | High |
| S5 | Member Profile Customization & Schedule Rebalancing | F15, F16, F19, F12, F23 | Medium |

## Coverage Thresholds
- Tier 1: ≥ 115 test cases (≥5 per feature across 23 features)
- Tier 2: ≥ 115 test cases (boundary & edge cases)
- Tier 3: ≥ 23 cross-feature combination test cases
- Tier 4: ≥ 5 end-to-end realistic application scenarios
- Total Target: ≥ 258 test cases
