# Original User Request

## 2026-09-05T04:53:53Z

Build the complete GymFlow Mobile member-facing fitness app — a fully polished, production-grade React Native + Expo frontend running entirely against a realistic MSW mock API layer, with no real backend dependency. Every screen, animation, offline/sync behavior, and client-side architecture deliverable must be complete and App-Store-quality.

Working directory: `c:/Users/LEGION/Documents/GymFlow 2/mobile`

Integrity mode: **development** (original logic only — do not copy or lift core logic from existing open-source implementations)

---

## Requirements

### R1. Complete navigable frontend
Build every screen: Auth (login, forced password reset, forgot-password), Dashboard, Workout Catalog, Workout Detail + completion logging, Scheduling (calendar + list, week-swipe), Progress Tracking (charts), Profile (edit/preferences), and an Offline/Sync indicator in the nav shell. All screens fully reachable via navigation; no placeholder stubs.

### R2. MSW mock API layer + CONTRACT.md
Every API call hits MSW handlers. Handlers must simulate realistic latency (300–800 ms), correct HTTP status codes, and the documented error cases (401 token expiry, 409 session-cancelled conflict, validation errors, network timeout). Idempotency-key deduplication on progress submissions. CONTRACT.md must document every endpoint in enough detail that a backend engineer can implement against it without ambiguity. The confirmed login contract must be matched byte-for-byte; all other endpoints labelled PROPOSED.

Confirmed login contract (match exactly):
- POST /api/v1/auth/login — Body: { email: string, password: string } — 200: { token: "1|abc123...", user: { id: int, name: string, role: "member" } }

All other endpoints are PROPOSED — full list:
- GET /member/profile (includes must_change_password: boolean, membership: { status: string })
- PATCH /member/profile — contact info + photo URL
- PATCH /member/preferences — workout type, intensity, weekly_workout_goal
- GET /member/workouts — full catalog (difficulty, source, duration, calories, reps/sets, media)
- POST /member/attendance — { session_id, checked_in_at }
- POST /member/progress — { workout_id, started_at, completed_at, duration_seconds, calories_burned, idempotency_key }
- GET /member/progress?period= — history for charts
- GET /member/sessions — upcoming sessions (time, trainer, location)
- POST /member/sessions/{id}/cancel
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/change-password

### R3. Client-side offline/sync architecture
Local SQLite cache (Workout, Session, ProgressEntry, Preferences tables + write queue) behind a typed SyncRepository interface. Sync policy: exponential backoff 2 s → 5 min ±20% jitter; FIFO per entity type, attendance before progress; 401 pauses queue without dropping items; idempotency-key dedupe; 7-day TTL triggers amber warning; 409 → rejected (not deleted) queue item + dismissible banner + "Cancelled by gym" history label. Fully simulated against MSW. Bundle ~5 local placeholder category-art images (chest/back/leg/arm/full-body) as offline fallback.

### R4. Visual and interaction quality bar
Dark-first design system: #0F0F10 base, electric-lime #C8FF3D accent used only on progress rings, % badges, success/sync states, active tab glyph. Archivo headings, system body font (SF Pro / Roboto). Rounded-2xl cards, generous padding, subtle border/glow elevation (not muddy RN default shadows on dark backgrounds). Every screen must have skeleton loading states (not spinners), intentional empty states (icon + copy), intentional error states (never a raw error dump). Every transition, tab switch, card tap, and pull-to-refresh must use Moti/Reanimated spring animations. Haptic feedback (expo-haptics) on check-in, workout complete, save. Custom SVG circular progress ring. Floating bottom tab bar (Home/Workouts/Schedule/Progress/Profile), rounded, edge-margined, active tab gets rounded-square highlight. Full-bleed photo workout cards with dark gradient overlay and % completion badge. Pill/chip filters with clear active state. Safe-area and Dynamic Island respected on all screens. Pull-to-refresh on Catalog, Schedule, Dashboard. Swipe gestures on Schedule calendar for week navigation with momentum/rubber-banding. Minimum 44×44 tap targets. Screen-reader labels on all icon-only buttons. Proper contrast ratios throughout.

Visual reference: rebrand LyfeFit → GymFlow, invert to dark theme. Structure and composition copied from the mockup: login splash, dashboard with activity ring + workout program cards + pill filters, workout catalog with full-bleed photo cards + % completion badges, floating bottom tab bar. Do NOT carry over light-mode styling, social login buttons, or heart-rate data fabrication (render "—" if mock returns null).

### R5. Test suite
Jest + React Native Testing Library covering: all MSW handlers (happy path + every error case), auth flow, sync queue policy (attendance-before-progress ordering, 401 pause, 409 rejection, idempotency dedupe), SyncRepository interface. Detox E2E specs written but clearly labelled "unverified — no emulator in build environment."

### R6. Handoff deliverables
- CONTRACT.md — complete proposed API spec, detailed enough for a backend engineer with no other context
- handlers/ directory — MSW handlers realistic enough to serve as living API documentation
- Architecture/handoff note listing: what's built, what CONTRACT.md currently specifies, every assumption the real backend will need to satisfy (auth token refresh behavior, real vs. mock latency/error handling, any mock simplification that a real API would handle differently)

### R7. Tech stack (locked — do not substitute any item)
React Native + Expo (TypeScript strict mode), Expo Go compatible. React Navigation (native-stack + bottom-tabs). Axios pinned to fetch adapter. expo-secure-store for auth tokens. TanStack Query for server state. expo-sqlite for local persistence. Zustand for local UI state. Victory Native for charts. Moti + React Native Reanimated for animation. lucide-react-native for icons. React Hook Form + Zod for forms/validation. MSW for mock API (one shared handlers/ directory, consumed by both Jest and a __DEV__-gated in-app mock-mode toggle). Jest + RNTL for unit/integration. Detox for E2E specs. Archivo font (bundled) for headings, system font for body.

### R8. Deferred — document only, do not build or mock as working features
Session booking/slot-claiming, server-driven workout recommendations, push notifications, social login.

---

## Acceptance Criteria

### App boots and navigates
- [ ] `npx expo start` completes without fatal errors; all 8 named screens reachable via navigation
- [ ] Auth flow (login → forced password reset → dashboard) completes end-to-end against MSW without crash

### Mock API correctness
- [ ] All MSW endpoints return correct status codes and documented response shapes
- [ ] Jest tests cover happy path + every documented error case (401, 409, validation error, network timeout) for every handler

### Offline / sync policy
- [ ] Workout catalog readable with mock network disabled (served from SQLite cache)
- [ ] Attendance queue item sent before progress item
- [ ] 401 pauses queue without dropping items; items resume after re-auth
- [ ] 409 marks queue item rejected (not deleted); dismissible banner shown; history label reads "Cancelled by gym"
- [ ] Items older than 7 days trigger amber indicator in nav shell

### Contract completeness
- [ ] CONTRACT.md documents every endpoint with request/response shapes, all status codes, error cases, and PROPOSED labels where applicable
- [ ] Confirmed login endpoint shape matched byte-for-byte in both CONTRACT.md and the MSW handler

### UI quality
- [ ] Zero raw error or exception dumps visible in the UI for any documented error case
- [ ] All tap targets ≥ 44×44 px; all icon-only buttons have screen-reader labels
- [ ] Every data-fetching screen shows skeleton state (not a spinner or blank screen) while loading
- [ ] Empty states present (icon + copy) for: no upcoming sessions, no matching workouts, no progress data yet
- [ ] Heart rate renders "—" when mock data is null, never a fabricated number

### Scope discipline
- [ ] No booking/slot-claiming UI present anywhere in the app
- [ ] No server-driven recommendation UI present anywhere in the app
- [ ] No push notification permission prompts present anywhere in the app
- [ ] No social login buttons (Apple, Google, etc.) present anywhere in the app
