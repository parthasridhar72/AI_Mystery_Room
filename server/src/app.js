import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import {
  hashToken,
  createCase,
  getOwned,
  listCases,
  playerDTO,
  statusDTO,
  retryCase,
  evidenceDTO,
  setReviewed,
  saveNotes,
  saveCase,
  accuse,
  resultDTO,
  deleteCase,
} from "./services/cases.js";

const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
if (process.env.CLIENT_ORIGIN) {
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
}
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  req.requestId = `req_${crypto.randomBytes(8).toString("hex")}`;
  res.setHeader("X-Request-Id", req.requestId);
  next();
});
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError)
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        requestId: req.requestId,
        details: [],
      },
    });
  next(err);
});
const caseMutationLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const sendError = (res, req, status, code, message) =>
  res
    .status(status)
    .json({ error: { code, message, requestId: req.requestId, details: [] } });
const schema = z
  .object({
    premise: z.string().trim().min(50).max(5000),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
    tone: z
      .enum(["Classic detective", "Noir", "Thriller", "Cozy", "Sci-fi"])
      .default("Classic detective"),
    evidenceTypes: z
      .array(
        z.enum(["chat", "images", "documents", "cctv", "audio", "timeline"]),
      )
      .min(3),
    title: z.string().trim().max(80).optional(),
  })
  .strict();
const getToken = (req, res) => {
  let token = req.cookies.case_access;
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie("case_access", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: (Number(process.env.CASE_ACCESS_TOKEN_TTL_DAYS) || 30) * 86400000,
    });
  }
  return hashToken(token);
};
const owned = async (req, res) => {
  const c = await getOwned(req.params.caseId, getToken(req, res));
  if (!c) sendError(res, req, 404, "NOT_FOUND", "Case not found");
  return c;
};
app.get("/api/v1/health", (req, res) => res.json({ status: "ok" }));
app.post("/api/v1/cases", caseMutationLimiter, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return sendError(
      res,
      req,
      400,
      "VALIDATION_ERROR",
      "Please check your premise and case settings",
    );
  const { premise, difficulty, tone, evidenceTypes, title } = parsed.data;
  if (/<\s*script|javascript:/i.test(premise))
    return sendError(
      res,
      req,
      400,
      "VALIDATION_ERROR",
      "Please submit plain text case material",
    );
  try {
    const tokenHash = getToken(req, res);
    const c = await createCase(
      { premise, title, settings: { difficulty, tone, evidenceTypes } },
      tokenHash,
    );
    res.status(202).json({
      caseId: String(c._id),
      status: c.status,
      pollingUrl: `/api/v1/cases/${c._id}/status`,
    });
  } catch {
    sendError(res, req, 500, "INTERNAL_ERROR", "Could not create case");
  }
});
app.get("/api/v1/cases", async (req, res) => {
  try {
    res.json({ cases: await listCases(getToken(req, res)) });
  } catch {
    sendError(res, req, 500, "INTERNAL_ERROR", "Could not load cases");
  }
});
app.get("/api/v1/cases/:caseId/status", async (req, res) => {
  const c = await owned(req, res);
  if (c) res.json(await statusDTO(c));
});
app.get("/api/v1/cases/:caseId", async (req, res) => {
  const c = await owned(req, res);
  if (c) res.json(playerDTO(c));
});
app.post(
  "/api/v1/cases/:caseId/retry-generation",
  caseMutationLimiter,
  async (req, res) => {
    const c = await owned(req, res);
    if (!c) return;
    try {
      await retryCase(c);
      res.status(202).json(await statusDTO(c));
    } catch (e) {
      sendError(res, req, e.status || 500, "INVALID_STATE", e.message);
    }
  },
);
app.get("/api/v1/cases/:caseId/evidence/:evidenceId", async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  const e = await evidenceDTO(c, req.params.evidenceId);
  if (!e) return sendError(res, req, 404, "NOT_FOUND", "Evidence not found");
  res.json(e);
});
app.patch("/api/v1/cases/:caseId/evidence/:evidenceId", async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  if (typeof req.body?.reviewed !== "boolean")
    return sendError(
      res,
      req,
      400,
      "VALIDATION_ERROR",
      "reviewed must be a boolean",
    );
  if (!(await setReviewed(c, req.params.evidenceId, req.body.reviewed)))
    return sendError(res, req, 404, "NOT_FOUND", "Evidence not found");
  res.json(playerDTO(c).playerState);
});
app.patch("/api/v1/cases/:caseId/notes", async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  if (typeof req.body?.notes !== "string" || req.body.notes.length > 10000)
    return sendError(
      res,
      req,
      400,
      "VALIDATION_ERROR",
      "Notes must be text up to 10,000 characters",
    );
  await saveNotes(c, req.body.notes);
  res.json({ notes: c.playerState.notes });
});
app.post(
  "/api/v1/cases/:caseId/accusation",
  caseMutationLimiter,
  async (req, res) => {
    const c = await owned(req, res);
    if (!c) return;
    if (typeof req.body?.suspectId !== "string")
      return sendError(res, req, 400, "VALIDATION_ERROR", "Choose a suspect");
    try {
      res.json(await accuse(c, req.body.suspectId));
    } catch (e) {
      sendError(
        res,
        req,
        e.status || 500,
        e.status === 422 ? "INVALID_SUSPECT" : "INVALID_STATE",
        e.message,
      );
    }
  },
);
app.get("/api/v1/cases/:caseId/result", async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  const result = await resultDTO(c);
  if (!result)
    return sendError(
      res,
      req,
      409,
      "INVALID_STATE",
      "Submit an accusation to reveal the solution",
    );
  res.json(result);
});
app.post("/api/v1/cases/:caseId/abandon", async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  c.status = "abandoned";
  await saveCase(c);
  res.json({ status: c.status });
});
app.delete("/api/v1/cases/:caseId", async (req, res) => {
  const c = await owned(req, res);
  if (!c) return;
  await deleteCase(c);
  res.status(204).end();
});
if (process.env.NODE_ENV === "production") {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const clientDirectory = path.resolve(currentDirectory, "../../client/dist");
  app.use(express.static(clientDirectory));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDirectory, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}
app.use((req, res) => sendError(res, req, 404, "NOT_FOUND", "Route not found"));
app.use((err, req, res, next) => {
  console.error(
    JSON.stringify({ requestId: req.requestId, error: err.message }),
  );
  sendError(res, req, 500, "INTERNAL_ERROR", "An unexpected error occurred");
});
export default app;
