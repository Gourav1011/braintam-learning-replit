# Braintam

India's premium EdTech platform for school students in grades 1–10, with live classes, courses, animated videos, homework, assignments, tests, and student dashboards.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/braintam run dev` — run the frontend (port 18817)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + framer-motion + shadcn/ui + wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — database schema (users, subjects, courses, live_classes, recordings, animated_videos, homework, assignments, tests, questions, submissions)
- `lib/api-spec/src/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (auth, subjects, courses, live-classes, recordings, animated-videos, homework, assignments, tests, student)
- `artifacts/braintam/src/pages/` — React pages (landing, login, register, dashboard, live-classes, courses, course-detail, recordings, animated-videos, homework, assignments, tests, test-taking, profile, leaderboard)
- `artifacts/braintam/src/components/` — auth-provider, layout (sidebar), shadcn/ui components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod validation schemas.
- Auth via localStorage tokens (`braintam_token`, `braintam_student`). OTP is generated server-side and logged; in production, integrate an SMS provider (Twilio/Fast2SMS).
- Mock student ID=1 (Arjun Sharma, Grade 6) seeded for demo. All protected routes redirect to `/login` when unauthenticated.
- All routes are prefix-mounted at `/api` via the shared proxy.
- Leaderboard data is currently hardcoded on the backend; in production, compute dynamically from points.

## Product

- **Landing page** — hero, features, stats, CTA
- **Auth** — email+password login, phone OTP login, registration with grade selector
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

- Demo login: email `arjun@example.com`, password `Braintam@123`
- Brand: navy blue (#0B2B6B) + orange (#FF6B1A), Poppins font
- Target: Indian school students, grades 1–10

## Gotchas

- OTP is logged to server console (not sent via SMS). In production, integrate an SMS provider.
- `pnpm --filter @workspace/db run push` must be run after any schema changes in `lib/db/src/schema/`.
- Run codegen after OpenAPI spec changes: `pnpm --filter @workspace/api-spec run codegen`.
- Vite needs `server.allowedHosts: true` for the Replit proxy (already configured).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
