# Architecture

Use one repository and one combined frontend/API deployment per hosted environment on Cloudflare Free. The browser uses an authenticated REST API. The Worker enforces identity, authorization, input validation and business rules before typed repositories access D1. The browser has no direct database access.

| Layer | Planned implementation |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS and shadcn/ui |
| API | Cloudflare Workers, REST, Zod request validation and explicit access checks |
| Persistence | Cloudflare D1 (SQLite), prepared statements, typed SQL repositories and versioned migrations |
| Evidence | Private R2 objects for direct uploads and Google Drive links with existing private permissions |
| Login | Cloudflare Access with Google and email one-time PIN, mapped from approved identities to one internal user |
| Quality | TypeScript strict mode, ESLint, Prettier, Vitest and Playwright |

Keep cash-flow, bookkeeping and tax computation as distinct application views over shared source records. Keep domain logic independent of UI and storage. Protect API, file access and any preview route. Local identity support is limited to local development. The PWA may cache its public shell while keeping financial responses and documents out of offline caches.

Local development uses local data. Hosted TEST and PROD use separate D1, document storage, bindings, secrets and Access policies. GitHub flow is `feature/*` to `dev`, then `test` for hosted verification, then `main` for an explicitly approved production release. Verify supported `cf` tooling at scaffolding time. See [Security](SECURITY.md) for environment and deployment controls.
