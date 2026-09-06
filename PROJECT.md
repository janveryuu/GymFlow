# Project: GymFlow Mobile

## Architecture
GymFlow Mobile is a production-grade React Native + Expo fitness mobile application built with TypeScript strict mode, running against a realistic MSW mock API layer and an offline-first SQLite synchronization engine.

- **UI & Presentation**: React Native 0.86 / Expo SDK 57, React Navigation (native-stack + custom floating bottom tabs `GymTabBar`), dark-first design system (`#0F0F10` base, `#17171A` cards, `#C8FF3D` electric-lime accents, Archivo headings), Moti/Reanimated spring animations, custom SVG circular progress ring, universal skeleton loaders, intentional empty/error states, and `expo-haptics`.
- **State Management**: TanStack Query (server state & caching), Zustand (local UI and sync status state), React Hook Form + Zod (type-safe form validation).
- **Network & Mock API Layer**: Axios pinned to fetch adapter, connecting to MSW (Mock Service Worker) handlers simulating realistic latency (300–800 ms), HTTP status codes, and error scenarios (401 token expiry, 409 conflict, 422 validation, timeout) with idempotency-key deduplication.
- **Offline & Sync Engine**: Local SQLite database via `expo-sqlite` (tables: `Workout`, `Session`, `ProgressEntry`, `Preferences`, `WriteQueue`) behind a typed `SyncRepository` interface. Features exponential backoff (2s → 5m ±20% jitter), FIFO priority ordering (attendance before progress), 401 queue pause without data loss, 409 rejection preservation with dismissible banners, and 7-day TTL amber indicators.
- **Testing & Verification**: Jest + React Native Testing Library (RNTL) for unit/integration suites (MSW handlers, Auth, SyncEngine, SyncRepository, Screen flows). Detox E2E specifications authored and documented.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Locked Tech Stack & Scaffold | React Native, Expo, TypeScript strict mode, configuration, and dependencies (R7) | M1 | ORIGINAL_REQUEST §R7 |
| 2 | MSW Mock API Engine | Shared mock handlers for Jest and in-app `__DEV__` toggle, 300–800ms latency, timeout simulation | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Confirmed Login API Contract | Byte-for-byte exact `POST /api/v1/auth/login` contract implementation | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Proposed API Endpoints | 10 proposed endpoints with complete mock handlers, status codes, and error responses | M1 | ORIGINAL_REQUEST §R2 |
| 5 | CONTRACT.md Deliverable | Comprehensive API specification documenting every endpoint, shapes, and backend assumptions | M1 | ORIGINAL_REQUEST §R2, §R6 |
| 6 | Idempotency Deduplication | Server-side progress submission deduplication based on `idempotency_key` | M1 | ORIGINAL_REQUEST §R2 |
| 7 | MSW Handler Test Suite | Jest tests covering happy paths and every documented error case (401, 409, 422, timeout) | M1 | ORIGINAL_REQUEST §R2, §R5 |
| 8 | SQLite Local Cache Schema | Tables for `Workout`, `Session`, `ProgressEntry`, `Preferences`, and `WriteQueue` | M2 | ORIGINAL_REQUEST §R3 |
| 9 | SyncRepository Interface | Strongly-typed repository abstraction decoupling UI from network/database details | M2 | ORIGINAL_REQUEST §R3 |
| 10 | Sync Priority Ordering | Queue execution policy enforcing FIFO per entity type and attendance before progress | M2 | ORIGINAL_REQUEST §R3 |
| 11 | Backoff & Jitter Algorithm | Exponential backoff from 2s to 5min with ±20% jitter on network failures | M2 | ORIGINAL_REQUEST §R3 |
| 12 | 401 Queue Pause Policy | Halts sync queue upon 401 without dropping items; resumes automatically upon re-auth | M2 | ORIGINAL_REQUEST §R3 |
| 13 | 409 Conflict Rejection Policy | Marks queue item as rejected (not deleted), surfaces dismissible banner, labels "Cancelled by gym" | M2 | ORIGINAL_REQUEST §R3 |
| 14 | 7-Day TTL Warning | Items pending in write queue for >7 days trigger amber warning in nav shell | M2 | ORIGINAL_REQUEST §R3 |
| 15 | Offline Category Art Fallback | 5 bundled category PNGs (chest, back, leg, arm, full-body) used when images fail or offline | M2 | ORIGINAL_REQUEST §R3 |
| 16 | Dark-First Design System | Palette `#0F0F10`, `#17171A`, `#1F1F24`, borders `#26262B`, surgical `#C8FF3D`, Archivo headings | M3 | ORIGINAL_REQUEST §R4 |
| 17 | Universal Skeleton Shimmers | Structured skeleton loaders for data screens — zero blank screens or raw spinners | M3 | ORIGINAL_REQUEST §R4 |
| 18 | Intentional Empty & Error States | Meaningful empty states (icon + copy) and error boundaries — zero raw exception dumps | M3 | ORIGINAL_REQUEST §R4 |
| 19 | Custom SVG Progress Ring | `PercentRing` component using `react-native-svg` with smooth animation and electric-lime stroke | M3 | ORIGINAL_REQUEST §R4 |
| 20 | Floating Bottom Tab Bar | `GymTabBar` floating navigation bar with spring animations, rounded square indicator, sync slot | M3 | ORIGINAL_REQUEST §R4 |
| 21 | State-Driven Navigation Graph | Root navigator cleanly separating Unauthenticated stack and Authenticated tabs | M3 | ORIGINAL_REQUEST §R1 |
| 22 | Screen 1: Auth Suite | LoginScreen, ForcedPasswordResetScreen, ForgotPasswordScreen with validation and token storage | M3 | ORIGINAL_REQUEST §R1, §R7 |
| 23 | Screen 2: Dashboard | Activity ring, today's session card, one-tap check-in, preference-filtered workouts, pull-to-refresh | M4 | ORIGINAL_REQUEST §R1, §R4 |
| 24 | Screen 3: Workout Catalog | Category pill filters, full-bleed photo cards with dark gradient overlay, % badge, pull-to-refresh | M4 | ORIGINAL_REQUEST §R1, §R4 |
| 25 | Screen 4: Workout Detail & Logging | Hero header, sets/reps breakdown, interactive completion form, haptics, optimistic history | M4 | ORIGINAL_REQUEST §R1, §R4 |
| 26 | Screen 5: Scheduling | Calendar with week-swipe pan gesture + momentum/rubber-banding + test seam, session list, cancel opt-out | M4 | ORIGINAL_REQUEST §R1, §R4 |
| 27 | Screen 6: Progress Tracking | Victory Native charts for workout history, metric cards, null heart-rate renders "—" | M4 | ORIGINAL_REQUEST §R1, §R4 |
| 28 | Screen 7: Profile | Member tier badge, section-level edit/save for contact info & preferences, sign out | M4 | ORIGINAL_REQUEST §R1, §R4 |
| 29 | Screen 8: Offline / Sync Indicators | Persistent status in nav shell, amber TTL indicator, 409 rejection banner | M4 | ORIGINAL_REQUEST §R1, §R3 |
| 30 | Scope Discipline Enforcements | Strict absence of booking UI, recommendation engine UI, push prompts, social logins | M1-M5 | ORIGINAL_REQUEST §R8 |
| 31 | Full E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test suite executed against running app with 100% pass | M5 | ORIGINAL_REQUEST §R5 |
| 32 | Adversarial Hardening (Tier 5) | White-box challenger testing targeting edge cases, race conditions, and error recovery | M5 | ORIGINAL_REQUEST §R5 |
| 33 | Detox E2E Specifications | Formally authored Detox specs labeled "unverified — no emulator in build environment" | M5 | ORIGINAL_REQUEST §R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & MSW API Mock Layer | Expo scaffold, locked dependencies, MSW handlers (happy path + 401/409/422/timeout), CONTRACT.md, MSW test suite | none | DONE |
| M2 | Client-Side Offline SQLite & Sync Engine | SQLite cache schema, SyncRepository interface, priority queue (attendance before progress), backoff/jitter, 401 pause, 409 reject, 7-day TTL, category art fallback, unit tests | M1 | DONE |
| M3 | Design System, Navigation Shell & Auth Flows | Colors, Archivo fonts, PercentRing SVG, GymTabBar, skeletons, empty/error states, Login, Forced Password Reset, Forgot Password screens, secure token storage | M1 | DONE |
| M4 | Feature Screens Suite | Dashboard, Workout Catalog, Workout Detail + Logging, Scheduling (week-swipe), Progress Tracking (Victory Native), Profile, Nav Shell Sync indicators | M2, M3 | DONE |
| M5 | E2E Test Integration & Hardening | 100% pass on E2E test suite (Tiers 1-4), Tier 5 adversarial testing, Detox specs, final verification | M4, TEST_READY | DONE |
| E2E | E2E Testing Track (Parallel Track) | Requirement-driven opaque-box test infrastructure & test cases (Tiers 1-4), publishes TEST_READY.md | M1 | DONE |

---

## Interface Contracts

### Auth & Token Management
- `POST /api/v1/auth/login`
  - Request: `{ email: string, password: string }`
  - Response (200): `{ token: string, user: { id: number, name: string, role: "member" } }`
- Token Storage: `expo-secure-store` with keys `gymflow_auth_token` and `gymflow_user_id`.
- Auth Store: Zustand `useAuthStore` providing `{ token, user, isAuthenticated, mustChangePassword, setAuth, logout }`.

### Sync Engine ↔ UI State
- `SyncRepository`:
  - `getWorkouts(options?: { forceRefresh?: boolean }): Promise<Workout[]>`
  - `getSessions(options?: { forceRefresh?: boolean }): Promise<Session[]>`
  - `getProgressHistory(period: string): Promise<ProgressEntry[]>`
  - `getPreferences(): Promise<UserPreferences>`
  - `updatePreferences(pref: Partial<UserPreferences>): Promise<void>`
  - `recordAttendance(sessionId: string): Promise<{ queueId: string }>`
  - `submitProgress(entry: ProgressSubmission): Promise<{ queueId: string }>`
  - `getSyncState(): Promise<SyncStatus>`
- Zustand `useSyncStore`: provides live queue status, pending item count, 7-day warning flag, and 409 rejected banners.

---

## Code Layout
```
c:/Users/LEGION/Documents/GymFlow 2/
├── CONTRACT.md                     # Backend API Specification deliverable
├── PROJECT.md                      # Global architecture and milestone tracker
├── TEST_INFRA.md                   # E2E test architecture and coverage matrix
├── mobile/
│   ├── app.json                    # Expo app configuration (slug: gymflow-mobile)
│   ├── package.json                # Locked dependencies (R7)
│   ├── tsconfig.json               # TypeScript strict configuration
│   ├── assets/
│   │   ├── fonts/                  # Archivo font family
│   │   └── category/               # 5 offline fallback category PNGs
│   ├── handlers/                   # MSW request handlers (living API docs)
│   │   ├── auth.ts
│   │   ├── member.ts
│   │   └── index.ts
│   ├── e2e/                        # Detox E2E specifications
│   │   ├── auth.e2e.ts
│   │   ├── catalog.e2e.ts
│   │   └── schedule.e2e.ts
│   └── src/
│       ├── api/                    # Axios instance (fetch adapter) & MSW server setup
│       ├── components/             # Reusable UI (PercentRing, Skeletons, EmptyState, ErrorCard)
│       ├── db/                     # expo-sqlite schemas & migrations
│       ├── navigation/             # RootNavigator, GymTabBar, navigation types
│       ├── screens/                # All 8 named screen implementations
│       │   ├── auth/               # Login, ForcedPasswordReset, ForgotPassword
│       │   ├── DashboardScreen.tsx
│       │   ├── CatalogScreen.tsx
│       │   ├── WorkoutDetailScreen.tsx
│       │   ├── ScheduleScreen.tsx
│       │   ├── ProgressScreen.tsx
│       │   └── ProfileScreen.tsx
│       ├── store/                  # Zustand stores (auth, sync, ui)
│       ├── sync/                   # SyncRepository, WriteQueue, backoff scheduler
│       ├── theme/                  # Design system tokens (#0F0F10, #C8FF3D, spacing, typography)
│       └── types/                  # Domain, API, and Navigation TypeScript models
└── tests/                          # Integration and test harness files
```
