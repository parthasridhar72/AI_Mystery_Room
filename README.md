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

## Deploy with Render and MongoDB Atlas

The repository includes a Render Blueprint at `render.yaml`. It deploys one Node web service that serves both the built React client and the Express API, with MongoDB Atlas for durable case storage. Serving both from one origin keeps guest access cookies first-party. The mock mystery provider is enabled by default, so no Gemini key is needed for the initial deployment.

1. **Push this repository to GitHub.** Keep `client/.env`, `server/.env`, and all credentials out of Git. Only the `.env.example` files belong in the repository.
2. **Create a MongoDB Atlas deployment.** Create a database user for the application and copy the cluster's application connection string. Replace its username, password, and database name. Encode reserved characters in the username or password as required by MongoDB.
3. **Create the Render service.** In Render, choose **New + > Blueprint**, connect this GitHub repository, and let Render read `render.yaml`. When prompted, provide the Atlas URI for `MONGODB_URI`; do not put it in the YAML file.
4. **Allow the service to reach Atlas.** The first deploy can fail its health check until Atlas allows the network connection. In the Render service, open **Connect > Outbound** and copy its outbound IP ranges. Add those ranges to the Atlas project's **Network Access** IP access list, then redeploy. Avoid opening Atlas to all IPs when you can allowlist the service ranges.
5. **Wait for the deployment to finish.** The health endpoint is `/api/v1/health`. Open the service's `onrender.com` URL; it serves the website and API from the same origin. Create a case and confirm it remains in the archive after refreshing. Case data persists in Atlas across server restarts.
6. **Optionally enable Gemini.** In the Render service's environment settings, set `AI_PROVIDER=gemini`, add `GEMINI_API_KEY`, and set a currently supported `GEMINI_MODEL`. Save and redeploy. The key must only be set on the server, never on the client.
7. **For a custom domain,** attach it to this same Render service. The site and API will continue to share one origin.

The Render service name in the Blueprint should be available in your workspace. If it is already taken, change `name` in `render.yaml`. The client uses its own origin for API requests in production. Locally, `client/.env` points it to `http://localhost:4000` while the Vite development server runs on port 5173.

Official setup references: [Render Blueprints](https://render.com/docs/blueprint-spec), [Render Node web services](https://render.com/docs/web-services), [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses), [MongoDB Atlas IP access list](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/), and [connecting to an Atlas cluster](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

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
