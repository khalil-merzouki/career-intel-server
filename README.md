# Career Intel API

NestJS API for the Career Intel web app. It stores profiles, job opportunities, and applications in PostgreSQL using Drizzle.

## Local setup

1. Run PostgreSQL with database `devdb`, user `admin`, and password `admin` on `127.0.0.1:5432`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` if you need to change defaults. NestJS loads `.env` on startup.
4. Run `npm run db:migrate`.
5. Run `npm run start:dev`.
6. In `../career-intel`, run `npm run dev`. Vite proxies `/api` to port 3000. Set `VITE_USE_MOCKS=true` only to use the browser mocks.

The API binds to loopback by default and has no user authentication. Keep it local; add account authentication and record ownership before exposing it to a network. NestJS rate limiting, Helmet headers, restricted CORS, request validation, UUID checks, and 5 MB CV upload limits are enabled.

CV import extracts text from PDF or DOCX and fills only a role explicitly labeled in the document. The user must review and finish the profile. The server does not retain the uploaded document.

## Commands

- `npm run db:generate` — generate a migration after schema changes.
- `npm run db:migrate` — apply migrations.
- `npm run build` — compile the server.
- `npm test` and `npm run test:e2e` — run unit and route tests.

## API

- `GET/PUT /api/profile`, `POST /api/profile/reset`, `POST /api/profile/import`
- `GET /api/jobs`, `GET/PUT /api/jobs/:jobId`, `POST /api/jobs/analyze`, `POST /api/jobs/:jobId/confirm`, `GET /api/jobs/:jobId/match`
- `GET/POST /api/applications`, `GET/PUT /api/applications/:applicationId`, `GET /api/applications/by-job/:jobId`, `GET /api/applications/source/:jobId`
