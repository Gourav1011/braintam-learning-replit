# Braintam

India's premium EdTech platform for school students in grades 1–10, with live classes, courses, animated videos, homework, assignments, tests, and student dashboards.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/braintam run dev` — run the frontend (port 18817)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: the production VPS PostgreSQL connection used by the API server, plus `SESSION_SECRET` for session signing. Do not reintroduce Neon connection variables.
- **Production database**: PostgreSQL on the team's own VPS. Replit is used to build and modify the application; production does not run on Replit.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + framer-motion + shadcn/ui + wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — database schema (users, subjects, courses, live_classes, recordings, animated_videos, homework, assignments, tests, questions, submissions, academic_years, chapters, topics, demo_batches, demo_sessions, demo_batch_enrollments, student_progress)
- `lib/api-spec/src/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, subjects, courses, live-classes, recordings, animated-videos, homework, assignments, tests, student)
- `artifacts/braintam/src/pages/` — React pages (landing, login, register, dashboard, live-classes, courses, course-detail, recordings, animated-videos, homework, assignments, tests, test-taking, profile, leaderboard)
- `artifacts/braintam/src/components/` — auth-provider, layout (sidebar), shadcn/ui components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod validation schemas.
- **Custom auth system:** Students use phone number + password through `POST /api/auth/login` and `POST /api/auth/register`. Staff use role-specific email/password forms through the same custom auth API. Student tokens are stored under `braintam_student_token`; staff tokens are stored under `braintam_staff_token`; protected API calls use `Authorization: Bearer <token>`.
- `auth-provider.tsx` resolves custom student and staff tokens from local storage. There is no active Clerk authentication flow.
- Role-based routing: `/admin` → requires `role=admin`, `/teacher` → requires `role=teacher|admin`, `/mentor` → requires the applicable mentor role. Unauthenticated staff redirect to their role-specific login; students redirect to `/login`.
- Teacher/admin login pages are custom email/password forms at `/teacher/login` and `/admin/login` — NOT Clerk. They call `/api/auth/login`, check role, store token, redirect to portal.
- All routes prefix-mounted at `/api` via the shared proxy.
- Leaderboard data computed dynamically from real student submissions. Points recalculated after every submission.
- Password hashing: SHA-256 of `password + "braintam_salt"` (see `artifacts/api-server/src/routes/auth.ts`).

## Staff accounts

**Important:** production account data lives in the VPS PostgreSQL database. Verify or manage staff and student accounts against the same VPS database used by the production API. Do not use Neon.

### Teacher portal (`/teacher/login`) — role=teacher or super_admin
| Name         | Email                     | Role        | Password    |
|--------------|---------------------------|-------------|-------------|
| Gourav Manhas| gourav.manhas10@gmail.com | super_admin | (set by admin) |
| Priya Sharma | priya@braintam.com        | teacher     | teacher2026 |

### Admin portal (`/admin/login`)
| Name          | Email               | Role        | Password       |
|---------------|---------------------|-------------|----------------|
| Braintam Super| super@braintam.com  | admin       | (set by admin) |
| Gourav Manhas | gourav.manhas10@gmail.com | super_admin | (set by admin) |

### Mentor/Sales SSM portal (`/mentor/login`) — role=mentor
| Name         | Email                     | mentor_type | Password       |
|--------------|---------------------------|-------------|----------------|
| Mentor Moses | mosesmentor@braintam.com  | sales       | (set by admin) |

Passwords marked "(set by admin)" were created outside this session and are unknown — use the admin panel's password reset flow if access is needed. Teacher account `priya@braintam.com` was created in this session specifically because no `role=teacher` account existed in production, which is why `/teacher/login` previously had no valid account to sign in with.

## Product

- **Landing page** — hero, features, stats, CTA
- **Auth** — custom phone/password student login and registration at `/login` and `/register`, with legacy `/sign-in` and `/sign-up` aliases redirecting to the custom pages. Staff login remains separate at `/admin/login`, `/teacher/login`, and `/mentor/login`.
- **Dashboard** — stat cards (upcoming classes, pending homework, assignments, tests), subject progress bars, leaderboard preview, recent activity feed
- **Live Classes** — filterable grid with countdown timers, join button
- **Courses** — searchable, filterable course grid with thumbnails and ratings; course detail with lesson list
- **Recordings** — past live class recordings with view counts
- **Animated Videos** — subject-wise animated explainer videos
- **Homework** — pending/submitted/graded homework with inline submission dialog
- **Assignments** — assignment list with inline submission
- **Tests & Quizzes** — test list; full test-taking experience with timer, question navigator, and results screen
- **Leaderboard** — top-3 podium with medal styling + full ranked list
- **Profile** — edit name/school, view stats and subject progress

## User preferences

- Auth: students sign in with phone number and password at `/login`; new students register at `/register`. Staff use their role-specific login pages.
- Brand: navy blue (#0B2B6B) + orange (#FF6B1A), Poppins font
- Target: Indian school students, grades 1–10

## Gotchas

- Tailwind v4 requires the configured layer declaration before `@import "tailwindcss"` in index.css and `tailwindcss({ optimize: false })` in vite.config.ts — both already set.
- `pnpm --filter @workspace/db run push` must be run after any schema changes in `lib/db/src/schema/`.
- Run codegen after OpenAPI spec changes: `pnpm --filter @workspace/api-spec run codegen`.
- Vite needs `server.allowedHosts: true` for the Replit proxy (already configured).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
