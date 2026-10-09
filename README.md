# Career Intel API

NestJS API for the Career Intel web app. It stores profiles, job opportunities, and applications in PostgreSQL using Drizzle.

## Local setup

1. Run PostgreSQL with database `devdb`, user `admin`, and password `admin` on `127.0.0.1:5432`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` if you need to change defaults. NestJS loads `.env` on startup.
4. Run `npm run db:migrate`.
5. Start `job-description-agent` with `pnpm start:api` (see its README), then run `npm run start:dev`.
6. In `../career-intel`, run `npm run dev`. Vite proxies `/api` to port 3000. Set `VITE_USE_MOCKS=true` only to use the browser mocks.

The API binds to loopback by default and has no user authentication. Keep it local; add account authentication and record ownership before exposing it to a network. NestJS rate limiting, Helmet headers, restricted CORS, request validation, UUID checks, and 5 MB CV upload limits are enabled.

Job analysis sends the pasted description to the private `job-description-agent` service on port 3002. Configure `JOB_AGENT_URL` and the same `JOB_AGENT_TOKEN` in both services. The returned analysis becomes a reviewable draft; invalid postings are rejected and failed analysis does not save a draft. The description is sent to TypeSafe for validation and to OpenAI for analysis.

A deliberate `POST /api/jobs/:jobId/evaluate-match` reads the saved complete profile and confirmed job, then sends them to the private `oportunity-match-agent` service on port 3003. Configure `MATCH_AGENT_URL` and matching `MATCH_AGENT_TOKEN` in both services. JEV scores documented required skills; only a score strictly above 65% reaches the recruiter model. Results are returned to the job page and are not saved.

CV import extracts text from PDF or DOCX, sends it to the private `career-intel-ai` service for OpenAI extraction, and saves the structured result as an incomplete profile for review. The server does not retain the uploaded document. Configure `PROFILE_EXTRACTOR_URL` and the same `EXTRACTOR_TOKEN` in both services; keep the AI service on a private interface. CV text is sent to OpenAI for processing. Skills without an explicit level are marked `Unspecified`.

## Commands

- `npm run db:generate` — generate a migration after schema changes.
- `npm run db:migrate` — apply migrations.
- `npm run build` — compile the server.
- `npm test` and `npm run test:e2e` — run unit and route tests.

## API

- `GET /api/dashboard`
- `GET /api/insights` — demand, gaps, priorities, and career insights from confirmed opportunities and their applications
- `GET/PUT /api/profile`, `POST /api/profile/reset`, `POST /api/profile/import`
- `GET /api/jobs`, `GET/PUT /api/jobs/:jobId`, `POST /api/jobs/analyze`, `POST /api/jobs/:jobId/evaluate-match`, `POST /api/jobs/:jobId/confirm`, `GET /api/jobs/:jobId/match`
- `GET/POST /api/applications`, `GET/PUT /api/applications/:applicationId`, `GET /api/applications/by-job/:jobId`, `GET /api/applications/source/:jobId`
