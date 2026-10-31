import mongoose from "mongoose";

const SuspectSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    role: String,
    profile: String,
    motiveSummary: String,
    alibiSummary: String,
    publicFacts: [String],
    privateTruth: String,
  },
  { _id: false },
);
const EvidenceSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    title: String,
    summary: String,
    content: String,
    assetUrl: String,
    altText: String,
    source: String,
    createdAtInStory: String,
    relatedSuspectIds: [String],
    factIds: [String],
    clueIds: [String],
    reliability: String,
    reviewedByPlayer: Boolean,
  },
  { _id: false },
);
const CaseSchema = new mongoose.Schema(
  {
    accessTokenHash: { type: String, index: true },
    title: String,
    premise: String,
    settings: { difficulty: String, tone: String, evidenceTypes: [String] },
    status: { type: String, index: true },
    generation: {
      stage: String,
      attempts: Number,
      lastErrorCode: String,
      startedAt: Date,
      completedAt: Date,
    },
    incident: { summary: String, occurredAt: String, location: String },
    suspects: [SuspectSchema],
    timeline: [{ id: String, time: String, description: String }],
    evidence: [EvidenceSchema],
    solution: {
      culpritSuspectId: String,
      motive: String,
      method: String,
      opportunity: String,
      narrative: String,
      reasoningSteps: [{ text: String, evidenceIds: [String] }],
    },
    playerState: {
      reviewedEvidenceIds: [String],
      notes: String,
      accusation: { suspectId: String, isCorrect: Boolean, submittedAt: Date },
    },
  },
  { timestamps: true },
);
CaseSchema.index({ createdAt: -1 });
export default mongoose.models.Case || mongoose.model("Case", CaseSchema);
