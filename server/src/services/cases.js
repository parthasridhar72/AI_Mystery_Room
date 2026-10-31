import crypto from "node:crypto";
import Case from "../models/Case.js";
import { generateMystery } from "./mysteryProvider.js";

const memory = new Map();
export const hashToken = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const dbReady = () => Boolean(Case.db?.readyState === 1);
const put = async (doc) => {
  memory.set(String(doc._id), doc);
  if (dbReady()) return doc.save();
  return doc;
};
const find = async (id) => {
  const cached = memory.get(String(id));
  if (cached) return cached;
  return dbReady() ? Case.findById(id) : null;
};
const all = async (tokenHash) => {
  const cached = [...memory.values()].filter(
    (c) => c.accessTokenHash === tokenHash,
  );
  if (!dbReady()) {
    return cached.sort((a, b) => b.createdAt - a.createdAt);
  }

  const stored = await Case.find({ accessTokenHash: tokenHash }).sort({
    createdAt: -1,
  });
  const knownIds = new Set(cached.map((c) => String(c._id)));
  return [
    ...cached,
    ...stored.filter((c) => !knownIds.has(String(c._id))),
  ].sort((a, b) => b.createdAt - a.createdAt);
};
const touch = async (c) => {
  c.updatedAt = new Date();
  return put(c);
};

export function playerDTO(c) {
  const obj = c.toObject ? c.toObject() : c;
  return {
    id: String(obj._id),
    title: obj.title,
    status: obj.status,
    difficulty: obj.settings.difficulty,
    tone: obj.settings.tone,
    incident: obj.incident,
    suspects: obj.suspects.map(
      ({
        id,
        name,
        role,
        profile,
        motiveSummary,
        alibiSummary,
        publicFacts,
      }) => ({
        id,
        name,
        role,
        profile,
        motiveSummary,
        alibiSummary,
        publicFacts,
      }),
    ),
    timeline: obj.timeline,
    evidence: obj.evidence.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      summary: e.summary,
      source: e.source,
      createdAtInStory: e.createdAtInStory,
      reviewedByPlayer: e.reviewedByPlayer,
    })),
    playerState: {
      reviewedEvidenceIds: obj.playerState.reviewedEvidenceIds || [],
      notes: obj.playerState.notes || "",
      accusation: obj.playerState.accusation || null,
    },
    createdAt: obj.createdAt,
  };
}
export async function createCase(input, tokenHash) {
  const c = new Case({
    _id: new (await import("mongoose")).default.Types.ObjectId(),
    accessTokenHash: tokenHash,
    title: input.title || "Generating case…",
    premise: input.premise,
    settings: input.settings,
    status: "queued",
    generation: { stage: "queued", attempts: 0 },
    suspects: [],
    timeline: [],
    evidence: [],
    playerState: { reviewedEvidenceIds: [], notes: "" },
  });
  await put(c);
  generateInBackground(String(c._id), input);
  return c;
}
async function generateInBackground(id, input) {
  let c;
  try {
    c = await find(id);
    if (!c) return;
    c.status = "generating_plan";
    c.generation.stage = "Creating the case plan";
    c.generation.startedAt = new Date();
    c.generation.attempts = (c.generation.attempts || 0) + 1;
    await touch(c);

    const plan = await generateMystery(input);
    c.status = "validating";
    c.generation.stage = "Checking clues and timeline";
    await touch(c);
    c.title = plan.title;
    c.incident = plan.incident;
    c.suspects = plan.suspects;
    c.timeline = plan.timeline;
    c.evidence = plan.evidence.map((e) => ({
      ...e,
      reviewedByPlayer: false,
      altText: e.altText || "",
    }));
    c.solution = plan.solution;
    c.status = "ready";
    c.generation.stage = "Ready";
    c.generation.completedAt = new Date();
    await touch(c);
  } catch (err) {
    if (!c) c = await find(id);
    if (!c) return;
    c.status = "failed";
    c.generation.stage = "Generation failed";
    c.generation.lastErrorCode = "GENERATION_FAILED";
    try {
      await touch(c);
    } catch {
      // Keep the failure state in the in-memory cache if MongoDB is unavailable.
      memory.set(String(c._id), c);
    }
  }
}
export async function getOwned(id, tokenHash) {
  const c = await find(id);
  if (!c || c.accessTokenHash !== tokenHash) return null;
  return c;
}
export async function listCases(tokenHash) {
  return (await all(tokenHash)).map((c) => ({
    id: String(c._id),
    title: c.title,
    status: c.status,
    difficulty: c.settings.difficulty,
    createdAt: c.createdAt,
  }));
}
export async function statusDTO(c) {
  return {
    status: c.status,
    stage: c.generation.stage,
    message: c.generation.stage,
    retryable: c.status === "failed",
    errorCode: c.generation.lastErrorCode || null,
  };
}
export async function retryCase(c) {
  if (c.status !== "failed")
    throw Object.assign(new Error("Case is not in a failed state"), {
      status: 409,
    });
  c.status = "queued";
  c.generation.lastErrorCode = "";
  await touch(c);
  generateInBackground(String(c._id), {
    premise: c.premise,
    title: c.title,
    settings: c.settings,
  });
}
export async function evidenceDTO(c, evidenceId) {
  const e = c.evidence.find((item) => item.id === evidenceId);
  if (!e) return null;
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    summary: e.summary,
    content: e.content,
    assetUrl: e.assetUrl,
    altText: e.altText,
    source: e.source,
    createdAtInStory: e.createdAtInStory,
    relatedSuspectIds: e.relatedSuspectIds,
    reliability: e.reliability,
    reviewedByPlayer: e.reviewedByPlayer,
  };
}
export async function setReviewed(c, evidenceId, reviewed) {
  const e = c.evidence.find((item) => item.id === evidenceId);
  if (!e) return false;
  e.reviewedByPlayer = reviewed;
  c.playerState.reviewedEvidenceIds = c.evidence
    .filter((x) => x.reviewedByPlayer)
    .map((x) => x.id);
  await touch(c);
  return true;
}
export async function saveNotes(c, notes) {
  c.playerState.notes = notes;
  await touch(c);
}
export async function saveCase(c) {
  await touch(c);
}
export async function accuse(c, suspectId) {
  if (c.playerState.accusation)
    throw Object.assign(new Error("An accusation has already been submitted"), {
      status: 409,
    });
  if (!c.suspects.some((s) => s.id === suspectId))
    throw Object.assign(new Error("Unknown suspect"), { status: 422 });
  const isCorrect = c.solution.culpritSuspectId === suspectId;
  c.playerState.accusation = { suspectId, isCorrect, submittedAt: new Date() };
  c.status = "solved";
  await touch(c);
  const culprit = c.suspects.find((s) => s.id === c.solution.culpritSuspectId);
  return {
    caseId: String(c._id),
    accusedSuspectId: suspectId,
    isCorrect,
    culprit: { id: culprit.id, name: culprit.name },
    solution: {
      motive: c.solution.motive,
      method: c.solution.method,
      opportunity: c.solution.opportunity,
      narrative: c.solution.narrative,
      reasoningSteps: c.solution.reasoningSteps,
    },
  };
}
export async function resultDTO(c) {
  if (!c.playerState.accusation) return null;
  const a = c.playerState.accusation;
  const culprit = c.suspects.find((s) => s.id === c.solution.culpritSuspectId);
  return {
    caseId: String(c._id),
    accusedSuspectId: a.suspectId,
    isCorrect: a.isCorrect,
    culprit: { id: culprit.id, name: culprit.name },
    solution: {
      motive: c.solution.motive,
      method: c.solution.method,
      opportunity: c.solution.opportunity,
      narrative: c.solution.narrative,
      reasoningSteps: c.solution.reasoningSteps,
    },
  };
}
export async function deleteCase(c) {
  if (dbReady()) await c.deleteOne();
  else memory.delete(String(c._id));
}
