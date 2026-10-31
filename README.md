# AI Mystery Room

A single-player fictional mystery investigation app. The workspace uses **plain JavaScript** throughout: React + Vite in `client/`, and Node.js + Express in `server/`. No TypeScript is used.

## Requirements

- Node.js 20 or newer and npm
- MongoDB for durable case storage (the server falls back to process memory if MongoDB is unavailable; those temporary cases are lost on restart)
- A Gemini API key only when enabling Gemini generation; the deterministic mock provider is the default

## Run locally

1. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Keep credentials server-side.
2. Start MongoDB locally if durable storage is needed.
3. In a terminal opened in `client/`, run `npm install`.
4. In a terminal opened in `server/`, run `npm install`.
5. Start the API from the `server/` terminal with `npm run dev`.
6. Start the client from the `client/` terminal with `npm run dev`.
7. Open `http://localhost:5173`; the API listens on `http://localhost:4000`.

With no AI provider selected, the app uses a deterministic mock mystery and requires no Gemini key. To enable Gemini, set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` in `server/.env`. The Gemini model is configurable with `GEMINI_MODEL`. Gemini generation is server-side only. The MVP represents image, CCTV, and audio evidence as labeled fictional text artifacts; it does not generate real image or video assets.

## Commands

Run each command from its app directory.

Client: `npm run dev`, `npm run build`, `npm run lint`.

Server: `npm run dev`, `npm start`, `npm run lint`, `npm test` (no test suite has been added yet).

## Implementation decisions

- The SPEC.md architecture mentions TypeScript, but this project follows the request to use JavaScript only.
- Guest access is represented by an opaque, HTTP-only cookie. The server stores a SHA-256 hash of the cookie token, not the token itself.
- Case creation returns `202 Accepted`; generation runs asynchronously and clients poll the status endpoint.
- MongoDB is the durable store. An in-memory fallback allows quick local UI exploration if MongoDB is unavailable, but it is not persistent.
- The mock provider supplies a stable, fair fictional case for development. Gemini output is validated for structural integrity and references before publication. Media stays text-first.

## API overview

All routes are under `/api/v1`: health, case creation/list/detail/status/retry, evidence detail/review, notes, accusation, result reveal, abandon, and delete. Case and result DTOs are built explicitly so canonical solution fields remain private until an accusation has been recorded.

## Privacy and fiction

Do not submit real allegations or identifying information. Cases and artifacts are fictional. No premise, notes, API key, or full evidence content is logged by default.
