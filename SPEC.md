<br/>**AI MYSTERY ROOM**

Product Specification & Build Contract

_Spec-driven development | Single Source of Truth for Codex_

| **Document field** | **Value**                                                           |
| ------------------ | ------------------------------------------------------------------- |
| Version            | 1.0                                                                 |
| Status             | Baseline specification — implementation should follow this document |
| Product type       | AI-generated, single-player mystery investigation web application   |
| Frontend           | React + Vite                                                        |
| Backend            | Node.js + Express                                                   |
| Database           | MongoDB + Mongoose                                                  |
| AI provider        | Google Gemini API, called server-side only                          |
| Primary audience   | People who want to create and solve fictional mysteries             |

## Decision policy

This document defines the initial MVP. If a detail is not specified, choose the simplest secure, accessible implementation consistent with this spec, document the assumption, and do not add scope that changes the product model. Treat requirements marked MUST as acceptance criteria.

# 1. Product Summary

AI Mystery Room lets a user submit a fictional scenario, premise, or story. The application uses Gemini to construct a coherent fictional case with a hidden culprit, a consistent timeline, suspects, and evidence artifacts such as chat transcripts, documents, images, and fictional CCTV/transcript records. The user reviews the case file, investigates the evidence, selects a culprit, and receives a verdict with an explanation.

## 1.1 Product goals

- Turn a free-text premise into a playable, internally consistent mystery.
- Present evidence in an immersive investigation-room interface.
- Keep the culprit and solution hidden until the user submits a final accusation or explicitly reveals the answer.
- Make generated evidence traceable to a canonical case solution so the mystery is fair and solvable.
- Keep Gemini API credentials and privileged prompts on the server.
- Provide useful loading, retry, error, and persistence behavior instead of losing a case on refresh.

## 1.2 Non-goals for MVP

- Multiplayer, live co-op, leaderboards, public sharing, user-generated marketplaces, or social feeds.
- Real messaging-service integration, real CCTV integration, real people investigation, or real law-enforcement workflows.
- Training or fine-tuning a model.
- Guaranteeing photorealistic video generation. Video evidence can be represented as a fictional clip card, generated still, or AI-written transcript unless a separate media provider is added.
- Payments, subscriptions, admin analytics dashboards, or native mobile applications.

# 2. Users, Core Journey & UX Principles

## 2.1 Primary user journey

1. Landing page explains the concept and offers "Create a Mystery".
2. User enters a premise and selects difficulty, tone, and evidence preferences.
3. Client validates input and sends a generation request to the API.
4. Backend generates and validates a canonical case plan, then generates evidence tied to that plan.
5. User lands in the investigation room and reviews the case brief, suspects, timeline, and evidence.
6. User may filter/open evidence and optionally maintain private notes.
7. User chooses one suspect and submits a final accusation.
8. Application shows correct/incorrect result, reasoning, evidence links, and the complete solution.
9. User can restart a new case or return to their case list.

## 2.2 UX principles

- Atmospheric but readable: dark investigative workspace, clear hierarchy, strong contrast, restrained accent color.
- Evidence-first: every clue is easy to open, read, revisit, and associate with a suspect.
- Fairness over randomness: evidence must support the answer; red herrings must not contradict core facts.
- No accidental spoilers: culprit, solution, and hidden generation fields must never be returned in player-facing responses before reveal.
- Responsive layout: desktop is the primary experience, but core flows must work on tablet and mobile.
- Accessible controls: keyboard navigation, visible focus, semantic headings, and labels for icons.

# 3. MVP Scope & Requirements

| **ID** | **Requirement**                    | **Priority** | **Acceptance criteria**                                                                                                     |
| ------ | ---------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| FR-001 | Create a case from a story/premise | MUST         | User can enter a premise and submit; input is validated and a case generation job begins.                                   |
| FR-002 | Configure case generation          | MUST         | User can select difficulty, tone, and evidence types before generation.                                                     |
| FR-003 | Generate a canonical solution      | MUST         | Backend stores culprit, motive, method, timeline, and solution before player-facing evidence is created.                    |
| FR-004 | Generate suspects                  | MUST         | Case has 3–6 distinct suspects, each with a profile and plausible motive/opportunity.                                       |
| FR-005 | Generate evidence                  | MUST         | Case has 6–12 evidence items across selected types, each linked to facts and optionally suspects.                           |
| FR-006 | Validate consistency               | MUST         | Backend checks required fields, suspect references, clue references, timeline coherence, and solvability before publishing. |
| FR-007 | Investigation room                 | MUST         | User can browse case brief, suspects, timeline, and evidence without seeing the answer.                                     |
| FR-008 | Evidence viewer                    | MUST         | Evidence opens in a readable detail view/modal/page with metadata and source context.                                       |
| FR-009 | Accusation                         | MUST         | User selects one suspect and confirms; the server checks against stored solution.                                           |
| FR-010 | Reveal and explanation             | MUST         | After final accusation, user sees outcome, solution, motive, timeline, and supporting clues.                                |
| FR-011 | Persistence                        | MUST         | Case and accusation state survive page refresh for the same browser session/user.                                           |
| FR-012 | Retry and failure handling         | MUST         | Failed generation is visible and retryable without creating a duplicate active case unintentionally.                        |
| FR-013 | Notes and evidence tracking        | SHOULD       | User can add private notes and mark evidence reviewed.                                                                      |
| FR-014 | Case history                       | SHOULD       | User can see previously created cases and statuses.                                                                         |
| FR-015 | Authentication                     | MVP DECISION | MVP may be guest-first using an opaque session/case access token; add accounts only if explicitly scoped later.             |
| FR-016 | Export/share                       | WON'T        | No public case sharing or export in MVP.                                                                                    |

# 4. Case Creation Form

| **Field**         | **Type / options**                                                                                  | **Rules**                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Story / premise   | Textarea                                                                                            | Required; 50–5,000 characters; plain text only; show character count.                                                      |
| Difficulty        | Select: Easy, Medium, Hard                                                                          | Default Medium. Controls clue subtlety, ambiguity, and complexity—not whether the case is solvable.                        |
| Tone              | Select: Classic detective, Noir, Thriller, Cozy, Sci-fi                                             | Default Classic detective. All cases remain fictional.                                                                     |
| Evidence types    | Multi-select: Chat messages, Images, Documents, CCTV/transcript, Audio transcript, Timeline/records | At least 3 evidence items/types selected; backend may use text-based representations when media generation is unavailable. |
| Case title        | Optional text                                                                                       | If omitted, generated by AI; max 80 characters.                                                                            |
| Generation action | Button                                                                                              | Disabled during submit; display progress stages and allow safe retry.                                                      |

Validation: trim whitespace; reject empty prompts, invalid enum values, oversized payloads, and HTML/script injection. Do not use user input as a system prompt. Treat it as untrusted case material.

# 5. Core Domain Model & Mystery Rules

## 5.1 Canonical case plan

The canonical case plan is the server-side source of truth for all generated content. Generate and validate it before generating the player-facing evidence. Never ask separate generation calls to independently invent the culprit or solution. The plan includes case ID, title, premise summary, victim/incident (where appropriate), culprit ID, motive, method, opportunity, event timeline, suspect IDs and profiles, facts, clue map, red herrings, and final explanation.

## 5.2 Mystery fairness invariants

- Exactly one canonical culprit for a standard case.
- At least two independent evidence items materially support the culprit identification.
- At least one evidence item weakens or rules out each non-culprit suspect, directly or by verified timeline conflict.
- No evidence item may contradict a canonical fact unless explicitly classified as a lie, unreliable testimony, forged artifact, or red herring with an explanation.
- Every evidence item has a stable ID, type, title, body/asset reference, timestamp/context where relevant, and clue/fact references.
- Evidence content must not directly reveal the culprit before accusation; avoid fields or titles such as "culprit", "solution", or "killerId" in client payloads.
- The solution explanation must cite evidence IDs and explain why the alternatives are less likely.
- If validation fails, regenerate or repair a limited number of times, then fail gracefully rather than publishing an incoherent case.

## 5.3 Evidence types

| **Type**           | **MVP representation**                                                                                              | **Required fields**                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Chat messages      | Fictional chat UI resembling a generic messenger; do not impersonate or connect to real accounts.                   | Participants, timestamps, message text, thread context, related clue IDs.              |
| Images             | AI-generated image if provider is configured; otherwise a clearly labelled fictional image placeholder/description. | Caption, asset URL or placeholder, alt text, related clue IDs.                         |
| Documents          | Readable in-app document card/viewer.                                                                               | Document title, author/source, created time, content, authenticity status if relevant. |
| CCTV / recordings  | Fictional clip card, still image, or transcript. No real surveillance integration.                                  | Location, timestamp, duration if applicable, transcript/description, limitations.      |
| Audio transcript   | Text transcript; generated audio is optional and out of MVP.                                                        | Speaker labels, transcript, timestamp, uncertainty notes.                              |
| Timeline / records | Structured event records, access logs, receipts, fictional location records.                                        | Event time, actor, event description, reliability, clue references.                    |

# 6. Pages & UI Specification

| **Page / route**                   | **Purpose**          | **Key UI elements**                                                                                          |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| /                                  | Landing page         | Hero, concise explanation, example evidence preview, CTA to create a case, privacy/fiction disclaimer.       |
| /create                            | Case configuration   | Premise textarea, selectors, evidence types, validation, generation CTA.                                     |
| /cases                             | Case history         | Case cards, status, created date, difficulty; empty state for first-time users.                              |
| /case/:caseId                      | Investigation room   | Case header, incident brief, suspect roster, evidence grid/list, timeline, notes, progress/status.           |
| /case/:caseId/evidence/:evidenceId | Evidence detail      | Artifact viewer, metadata, source context, related clues, reviewed toggle, back navigation.                  |
| /case/:caseId/accuse               | Final accusation     | Suspect selection, confirmation step, warning that submission reveals solution.                              |
| /case/:caseId/result               | Verdict and solution | Correct/incorrect state, culprit, motive, event reconstruction, evidence-backed explanation, play again CTA. |
| \*                                 | Not found            | Helpful 404 with return navigation.                                                                          |

## 6.1 Investigation room layout

- Desktop: left rail for case navigation and suspects; center workspace for evidence; right panel or tab for timeline/notes. Collapse panels at narrower widths.
- Case status badge: Generating, Ready, In Progress, Solved, Failed.
- Evidence cards show type icon, title, short preview, timestamp/source if available, and reviewed state.
- Suspect cards show name, profile, known motive, alibi summary, and relevant facts; do not show a computed guilt score.
- The timeline is based on canonical event data but may hide undiscovered details only if an explicit unlock mechanic is later added. MVP shows all case timeline events that are not solution-only.
- All content is clearly fictional; generated images or transcript cards should not be mistaken for authentic evidence.

# 7. Technical Architecture

## 7.1 Stack

| **Layer**  | **Technology**                                 | **Responsibilities**                                                                                                    |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Frontend   | React, Vite , React Router          | Routing, forms, investigation UI, state, API client.                                                                    |
| Styling    | Tailwind CSS (recommended) or CSS Modules      | Responsive design, design tokens, reusable components.                                                                  |
| Server     | Node.js, Express,                    | REST API, validation, access control, Gemini orchestration, business rules.                                             |
| Database   | MongoDB, Mongoose                              | Persist cases, evidence metadata, game state, generation status, results.                                               |
| AI         | Google Gemini API via official server-side SDK | Structured case plan and evidence generation; optional image generation is a separately configured provider/capability. |
| Validation | Zod                                            | Validate request bodies, environment variables, AI JSON output, and domain invariants.                                  |
| Testing    | Vitest, Supertest, React Testing Library       | Unit, API integration, and frontend behavior tests.                                                                     |
| Logging    | Pino or structured console logger              | Request IDs, generation stages, errors; redact secrets and sensitive prompt data.                                       |

## 7.2 Architecture rules

- Use a monorepo: /client and /server, with a root README and shared API/domain types where practical.
- All Gemini calls happen in the Express server; never expose GEMINI_API_KEY in Vite/client variables.
- Use JSON REST APIs under /api/v1.
- Use one canonical service layer for case generation, validation, evidence access, and accusation checking.
- Separate player-safe DTOs from private canonical solution models. Never serialize raw Mongoose documents directly to the client.
- Use asynchronous generation status even if the initial implementation is synchronous internally; API shape must support polling and future job queue migration.
- Use database indexes for case lookup, access token hash, and createdAt sorting.
- Store image binaries in object storage if a media provider is added; MongoDB stores metadata and asset URLs, not large binary blobs.

## 7.3 Suggested repository structure

/  
README.md  
SPEC.md  
.env.example  
package.json  
client/  
src/  
app/ components/ features/cases/ features/investigation/  
features/evidence/ features/accusation/ lib/api.ts styles/  
server/  
src/  
app.ts server.ts  
config/ routes/ controllers/ services/  
models/ schemas/ middleware/ prompts/  
utils/ tests/  
shared/  
types/ schemas/

# 8. API Contract

Base path: /api/v1. Use JSON request/response bodies unless returning a binary asset. All error responses use a consistent envelope.

| **Endpoint**                              | **Purpose**                      | **Request / response notes**                                                                                                           |
| ----------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| POST /cases                               | Create case and start generation | Body: premise, difficulty, tone, evidenceTypes, optional title. Returns 202 with caseId, status, and polling URL.                      |
| GET /cases                                | List accessible cases            | Returns case summary DTOs only; paginated with limit/cursor.                                                                           |
| GET /cases/:caseId                        | Get player-safe case             | Returns brief, suspects, timeline-safe events, evidence summaries, status, player progress. Never includes canonical culprit/solution. |
| GET /cases/:caseId/status                 | Poll generation                  | Returns status, stage, safe progress message, retryable flag, and error code if failed.                                                |
| POST /cases/:caseId/retry-generation      | Retry failed generation          | Only allowed for authorized case in failed state; idempotency key recommended.                                                         |
| GET /cases/:caseId/evidence/:evidenceId   | Read evidence detail             | Checks case access and evidence membership; returns player-safe artifact.                                                              |
| PATCH /cases/:caseId/evidence/:evidenceId | Mark evidence reviewed           | Body: { reviewed: boolean }. Does not change evidence content.                                                                         |
| PATCH /cases/:caseId/notes                | Save notes                       | Body: { notes: string }. Max 10,000 characters; private to case access holder.                                                         |
| POST /cases/:caseId/accusation            | Submit final accusation          | Body: { suspectId }. Server records one final accusation by default and returns result DTO including solution.                         |
| POST /cases/:caseId/abandon               | Abandon case                     | Optional MVP endpoint; marks case abandoned without deleting it.                                                                       |
| DELETE /cases/:caseId                     | Delete case                      | Deletes case and associated generated assets/metadata where supported; requires access authorization.                                  |

## 8.1 Error envelope

{  
"error": {  
"code": "VALIDATION_ERROR",  
"message": "A human-readable message",  
"requestId": "req_...",  
"details": \[\]  
}  
}

Use appropriate HTTP codes: 400 invalid request, 401/403 unauthorized, 404 missing or inaccessible resource, 409 invalid state/duplicate submission, 413 payload too large, 429 rate limited, 502 upstream AI failure, 500 unexpected server failure.

# 9. Data Models

## 9.1 Case (MongoDB)

Case {  
\_id: ObjectId,  
accessTokenHash: string, // for guest access; never return stored hash  
title: string,  
premise: string,  
settings: { difficulty, tone, evidenceTypes\[\] },  
status: "queued" | "generating_plan" | "generating_evidence" |  
"validating" | "ready" | "failed" | "solved" | "abandoned",  
generation: { stage, attempts, lastErrorCode?, startedAt?, completedAt? },  
incident: { summary, occurredAt?, location? },  
suspects: Suspect\[\],  
timeline: TimelineEvent\[\],  
evidence: Evidence\[\],  
solution: { culpritSuspectId, motive, method, opportunity, narrative,  
reasoningSteps\[\], evidenceReferences\[\] }, // PRIVATE  
playerState: { reviewedEvidenceIds\[\], notes, accusation? },  
createdAt: Date,  
updatedAt: Date  
}

## 9.2 Suspect

Suspect {  
id: string, name: string, ageRange?: string, role: string,  
profile: string, motiveSummary: string, alibiSummary: string,  
publicFacts: string\[\], privateTruth?: string  
}

Do not return privateTruth to the client before solution reveal. Avoid generating sensitive personal data about real people; suspects should be fictional.

## 9.3 Evidence

Evidence {  
id: string, type: EvidenceType, title: string, summary: string,  
content: string, assetUrl?: string, altText?: string,  
source: string, createdAtInStory?: string, discoveredAt?: string,  
relatedSuspectIds: string\[\], factIds: string\[\], clueIds: string\[\],  
reliability: "high" | "medium" | "low",  
reviewedByPlayer: boolean  
}

Use a separate PlayerCaseDTO/PlayerEvidenceDTO that omits solution, privateTruth, internal prompt content, validation notes, and any secret clue annotations not intended for players.

# 10. Gemini Orchestration & Prompt Contract

## 10.1 Generation pipeline

10. Validate and normalize the user premise and settings.
11. Generate a structured canonical case plan using a server-owned system instruction and strict JSON schema.
12. Parse JSON and validate with Zod. Reject extra keys and malformed references.
13. Run deterministic domain checks: suspect count, exactly one culprit, valid IDs, timeline ordering, clue references, minimum supporting clues, alternate-suspect disconfirmation, and no missing evidence fields.
14. If invalid, send a constrained repair request or regenerate, up to 2 retries after the initial attempt. Log failure code, not secrets.
15. Generate evidence artifacts from the validated canonical plan. Evidence generation must be instructed to preserve facts and not invent a different solution.
16. Validate each artifact against the canonical plan and sanitize user-visible text.
17. Persist the complete case atomically or mark failed; only expose status=ready after all required data is saved.
18. Return player-safe DTOs; never return the canonical plan directly.

## 10.2 Prompt design rules

- Use separate prompt templates for plan creation, evidence generation, repair, and final explanation.
- Clearly separate trusted system instructions from untrusted user premise using structured fields or delimiters.
- Require schema-constrained JSON output where supported; otherwise parse and validate strictly.
- Do not include the solution in any user-visible generated artifact unless it is intended as an explicit post-accusation reveal.
- Tell the model all content is fictional, avoid real people and real allegations, and use invented names/places.
- Keep prompts versioned in source control and record promptVersion/modelName in generation metadata.
- Set request timeouts, bounded retries, and maximum output sizes. Respect provider quotas and handle 429/5xx responses.

## 10.3 Image and video realism

Gemini text generation does not automatically guarantee that the application can generate every media type. MVP MUST work without a separate image/video model: show text-based artifacts and clearly marked fictional placeholders where necessary. If image generation is integrated, isolate it behind a MediaProvider interface, save assets to configured storage, and provide descriptive alt text. Treat actual video generation as a later capability; CCTV evidence may be a transcript or generated still.

# 11. Security, Privacy & Safety

- Keep Gemini and storage credentials in server environment variables; never commit secrets.
- Use HTTPS in production, strict CORS allowlist, Helmet, request size limits, and rate limiting on generation and accusation endpoints.
- Validate all inputs and AI outputs. Render generated text as text, not trusted HTML; sanitize any rich content.
- Guest access must use a high-entropy random token; store only a cryptographic hash and deliver the token in a secure, HttpOnly cookie where feasible. Do not rely on guessable case IDs as authorization.
- Apply authorization checks to every case/evidence/notes/delete request. Do not leak whether an inaccessible case ID exists.
- Do not log API keys, access tokens, raw private notes, or complete prompts containing user content by default.
- Clearly label the experience and all artifacts as fictional, AI-generated mystery content. Do not present them as authentic WhatsApp messages, actual CCTV footage, or real evidence.
- Block or safely redirect prompts that target real identifiable people with accusations of serious wrongdoing. Avoid creating content that could be mistaken for real evidence or used to defame a person.
- Provide delete-case functionality and document retention behavior. Keep uploaded/generated media access-controlled.
- Add a content disclaimer: "All cases and evidence in this experience are fictional and AI-generated."

# 12. Visual Design System

| **Token**      | **Baseline**                                                                              |
| -------------- | ----------------------------------------------------------------------------------------- |
| Theme          | Dark investigation workspace with light text and muted secondary text.                    |
| Background     | #0B1020 or equivalent deep navy.                                                          |
| Surface        | #121A2B / #182338.                                                                        |
| Primary accent | Electric cyan or cool blue; reserve warm amber/red for clue warnings and verdict states.  |
| Typography     | Readable sans-serif such as Inter; use mono font only for timestamps/log-style artifacts. |
| Spacing        | 4px base scale; consistent 8/12/16/24/32px spacing.                                       |
| Radius         | 8–14px cards; consistent buttons and inputs.                                              |
| Motion         | Subtle transitions; respect prefers-reduced-motion.                                       |
| States         | Loading skeleton, empty, error, success, disabled, focus, selected, reviewed.             |

Avoid excessive neon, low-contrast gray text, tiny evidence typography, or decorative effects that compete with clues. All important states must also use text/icons, not color alone.

# 13. Loading, Errors & Edge Cases

- Generation progress messages should describe stages, not invent precise percent complete unless measured.
- If Gemini times out or returns malformed output, retry within a bounded policy and show a retry option.
- If a case fails after partial generation, do not expose a half-valid case as Ready.
- Disable duplicate submit while an accusation request is pending; use idempotency or a unique final-accusation constraint.
- If a user refreshes during generation, poll the persisted case status.
- If an evidence asset fails to load, show alt text/description and a retry or fallback placeholder.
- If the user submits an invalid suspect ID, return 400/422 without revealing the culprit.
- If the user opens a result route before submitting an accusation, redirect to the investigation room.
- If a deleted or expired guest case is accessed, show a clear not-found/expired state.
- If user input asks for impossible/contradictory constraints, either simplify with a visible note or fail with a helpful explanation; never silently publish an invalid case.

# 14. Testing & Quality Gates

| **Test layer**  | **Must-cover cases**                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit            | Request schemas; AI JSON parsing; domain invariants; clue support checks; timeline consistency; DTO redaction; accusation scoring.             |
| API integration | Create case; poll status; unauthorized access; evidence access; notes persistence; accusation; result reveal; retry behavior; delete behavior. |
| Frontend        | Form validation; loading state; investigation navigation; evidence viewer; mobile layout; final accusation confirmation; error/empty states.   |
| AI contract     | Fixture outputs that are valid, malformed, contradictory, missing culprit, missing evidence refs, or leaking solution fields.                  |
| Security        | Rate limit, oversized payload, XSS payload rendered as text, case ID enumeration, token leakage, unauthorized cross-case access.               |
| End-to-end      | Create mystery → wait for ready → inspect evidence → accuse correctly/incorrectly → verify explanation and persistence.                        |

Quality gates: lint passes, typecheck passes, unit/API tests pass, production build succeeds, .env.example is complete, and README explains local setup. No known critical/high security issue may remain for release.

# 15. Environment Variables & Local Development

\# server/.env  
NODE_ENV=development  
PORT=4000  
MONGODB_URI=mongodb://127.0.0.1:27017/ai-mystery-room  
GEMINI_API_KEY=  
GEMINI_MODEL= # choose a currently supported model; do not hard-code a deprecated model  
CLIENT_ORIGIN=<http://localhost:5173>  
SESSION_SECRET=  
CASE_ACCESS_TOKEN_TTL_DAYS=30  
GENERATION_TIMEOUT_MS=90000  
GENERATION_MAX_RETRIES=2  
RATE_LIMIT_WINDOW_MS=60000  
RATE_LIMIT_MAX_REQUESTS=10  
MEDIA_PROVIDER=placeholder  
MEDIA_STORAGE_BUCKET=  
MEDIA_STORAGE_BASE_URL=

- Commit .env.example only; ignore .env and credential files.
- Pin dependencies and provide npm scripts for dev, build, lint, typecheck, test, and start.
- README must describe MongoDB setup, Gemini API key configuration, startup commands, tests, and known media limitations.
- Do not assume the selected Gemini model supports image/video generation; verify model capability at implementation time.

# 16. Analytics & Observability (MVP-light)

- Record generation duration, retry count, status, model identifier, prompt version, and failure code.
- Track funnel events locally/server-side where useful: case_started, case_ready, evidence_opened, accusation_submitted, case_completed.
- Do not collect analytics that include full premise text, notes, API keys, or evidence contents by default.
- Include a request ID in server logs and error responses; avoid exposing stack traces in production.

# 17. Definition of Done

19. A user can create a fictional mystery from a premise and settings.
20. Gemini generation runs server-side and persists a canonical case solution plus evidence.
21. The case is not marked Ready until validation passes.
22. The investigation room displays case brief, suspects, timeline-safe data, and evidence cards.
23. The player can open evidence, mark it reviewed, and save notes.
24. The player can submit one final accusation and receive a supported verdict/explanation.
25. The culprit and private solution fields never appear in pre-accusation API responses or frontend bundles/state.
26. Cases persist across refresh and access is protected with a non-guessable token/session mechanism.
27. Errors, retries, empty states, mobile layout, and loading states are implemented.
28. Tests, lint, typecheck, and production build pass; setup documentation is complete.

# 18. Codex Implementation Instructions

- Treat this SPEC.md / spec sheet as the primary product contract. Do not silently change requirements.
- Before implementation, inspect the repository. Preserve existing conventions unless they conflict with this spec; if so, explain and use the spec.
- Implement in vertical slices: (1) scaffold/config, (2) schemas/models/API, (3) deterministic mock generation, (4) Gemini pipeline, (5) investigation UI, (6) accusation/result, (7) tests and hardening.
- Build a deterministic MockMysteryProvider for local tests and development so the product can run without a Gemini key. Mock data must obey the same schema and mystery invariants.
- Keep provider calls behind an interface so Gemini can be swapped or mocked.
- Do not fabricate working image/video generation. Use clearly labelled placeholders unless a real configured provider is available.
- After each slice, run relevant tests and typecheck. Fix failures before moving on.
- When a spec ambiguity blocks implementation, choose the least surprising secure default and document it in README under "Implementation decisions". Ask before making a decision that materially expands scope.

# 19. Recommended Build Phases

| **Phase**       | **Deliverables**                                                                          | **Exit criteria**                                               |
| --------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P0 — Foundation | Monorepo,  lint, tests, env validation, health endpoint, DB connection.        | App boots locally and CI-quality commands work.                 |
| P1 — Domain/API | Mongoose models, Zod schemas, case access, player-safe DTOs, mock provider.               | API integration tests pass without Gemini credentials.          |
| P2 — Core UI    | Landing, create, cases list, investigation room, evidence viewer.                         | Mock cases are playable end-to-end.                             |
| P3 — Gemini     | Plan generation, evidence generation, validation/repair, retry and status polling.        | Real generated cases pass invariants and no secret fields leak. |
| P4 — Verdict    | Accusation flow, solution reveal, notes/review state.                                     | Correct and incorrect accusation paths pass.                    |
| P5 — Hardening  | Responsive/accessibility review, rate limits, error handling, docs, deployment readiness. | Definition of Done fully met.                                   |

# 20. Open Decisions / Explicit MVP Defaults

| **Topic**              | **MVP default**                                                             | **Change only if**                                                              |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Authentication         | Guest-first, secure per-case access token                                   | User explicitly requests account management.                                    |
| Number of attempts     | One final accusation per case; allow inspection before submit               | Product owner defines multiple attempts/scoring.                                |
| Difficulty             | Changes complexity and clue subtlety, never solvability                     | A different difficulty rubric is agreed.                                        |
| Image/video generation | Text-first; optional images via separate provider; CCTV as transcript/still | A media provider, budget, and storage are selected.                             |
| Case retention         | Retain until user deletes or configured TTL expires; document actual policy | Hosting/storage policy is finalized.                                            |
| Generation sync        | 202 + persisted status polling                                              | A queue/worker architecture is later introduced without changing API semantics. |
| Scoring                | Correct/incorrect plus explanation; no points or leaderboard                | Gamification is separately scoped.                                              |

# Appendix A — Player-safe Case DTO example

{  
"id": "case_123",  
"title": "The Last Train at Briar Station",  
"status": "ready",  
"difficulty": "Medium",  
"tone": "Classic detective",  
"incident": { "summary": "A fictional incident summary..." },  
"suspects": \[  
{  
"id": "suspect_a",  
"name": "Morgan Vale",  
"role": "Station manager",  
"profile": "A short public profile...",  
"motiveSummary": "A publicly known possible motive...",  
"alibiSummary": "Their stated alibi..."  
}  
\],  
"timeline": \[  
{ "id": "event_1", "time": "21:10", "description": "A public case event..." }  
\],  
"evidence": \[  
{  
"id": "evidence_1",  
"type": "chat",  
"title": "Messages from 20:45",  
"summary": "A conversation excerpt...",  
"reviewedByPlayer": false  
}  
\],  
"playerState": { "reviewedEvidenceIds": \[\], "notes": "" }  
}

This DTO intentionally excludes culpritSuspectId, privateTruth, hidden clue annotations, prompt text, and solution narrative.

# Appendix B — Example result DTO (after accusation)

{  
"caseId": "case_123",  
"accusedSuspectId": "suspect_a",  
"isCorrect": true,  
"culprit": { "id": "suspect_a", "name": "Morgan Vale" },  
"solution": {  
"motive": "Fictional motive...",  
"method": "Fictional method...",  
"narrative": "The complete explanation...",  
"reasoningSteps": \[  
{ "text": "A key deduction...", "evidenceIds": \["evidence_1", "evidence_4"\] }  
\]  
}  
}

# Appendix C — Acceptance Checklist

- \[ \] Spec copied to repository root as SPEC.md and treated as authoritative.
- \[ \] Mock provider allows full local demo without API credentials.
- \[ \] Gemini key is server-only and absent from client build.
- \[ \] Generated case passes schema and mystery-fairness validation.
- \[ \] Player-safe DTO has automated tests proving solution redaction.
- \[ \] Access checks cover all case and evidence endpoints.
- \[ \] Evidence, notes, and accusation persist.
- \[ \] Correct and incorrect accusation paths are tested.
- \[ \] UI handles generation pending, failed, ready, and solved states.
- \[ \] All fictional artifacts have clear fiction labeling.
- \[ \] README, .env.example, scripts, and deployment notes are complete.