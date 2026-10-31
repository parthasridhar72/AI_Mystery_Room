import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "./Icon.jsx";

const evidenceTypeNames = {
  chat: "Chat transcript",
  images: "Image description",
  documents: "Document",
  cctv: "CCTV transcript",
  audio: "Audio transcript",
  timeline: "Timeline record",
};

export function InvestigationPage({ request }) {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSuspectId, setSelectedSuspectId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    let timer;

    async function checkStatus() {
      try {
        const nextStatus = await request(`/cases/${caseId}/status`);
        if (!active) return;

        setStatus(nextStatus);
        setError("");

        if (["ready", "solved"].includes(nextStatus.status)) {
          const nextCase = await request(`/cases/${caseId}`);
          if (!active) return;
          setData(nextCase);
          setNotes(nextCase.playerState.notes || "");
          return;
        }

        if (nextStatus.status === "failed") {
          setError(
            "The case could not be generated. You can retry generation.",
          );
          return;
        }

        timer = setTimeout(checkStatus, 1600);
      } catch (requestError) {
        if (!active) return;
        setStatus(null);
        setError(
          requestError.message === "Failed to fetch"
            ? "The API server is unreachable. Make sure the server is running, then check again."
            : requestError.message,
        );
      }
    }

    checkStatus();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [caseId, refreshKey, request]);

  useEffect(() => {
    if (!data) return undefined;

    const timer = setTimeout(() => {
      request(`/cases/${caseId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [caseId, data, notes, request]);

  async function retryGeneration() {
    try {
      setError("");
      await request(`/cases/${caseId}/retry-generation`, {
        method: "POST",
        body: "{}",
      });
      setStatus({ status: "queued", retryable: false });
      setData(null);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setStatus(null);
      setError(requestError.message);
      setRefreshKey((key) => key + 1);
    }
  }

  async function markEvidenceReviewed(evidenceId, reviewed) {
    try {
      await request(`/cases/${caseId}/evidence/${evidenceId}`, {
        method: "PATCH",
        body: JSON.stringify({ reviewed }),
      });
      setData(await request(`/cases/${caseId}`));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!data) {
    const caseWasLost = error === "Case not found";

    return (
      <div className="app-shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Icon name="sparkle" size={19} />
            </span>{" "}
            CASEFILE
            <span className="brand-sub">/ AI MYSTERY ROOM</span>
          </Link>
          <nav>
            <Link to="/cases">Your cases</Link>
            <Link className="new-case" to="/create">
              <Icon name="plus" size={14} /> New case
            </Link>
          </nav>
        </header>
        <main className="content-page loading">
          <div className="eyebrow">
            {status?.stage ||
              (caseWasLost ? "CASE UNAVAILABLE" : "CASE INTAKE")}
          </div>
          <h1>{error ? "The file is closed." : "Building your case…"}</h1>
          <p className="lead">
            {error ||
              status?.message ||
              "Gathering the facts and assembling the evidence."}
          </p>
          {caseWasLost ? (
            <p className="error">
              This case is no longer available. If MongoDB was not running, the
              temporary case may have been lost when the API server restarted.
            </p>
          ) : status?.retryable ? (
            <button className="button primary" onClick={retryGeneration}>
              Retry generation <Icon name="arrow" />
            </button>
          ) : error ? (
            <button
              className="button primary"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Check server connection <Icon name="arrow" />
            </button>
          ) : null}
          {caseWasLost && (
            <Link className="button primary" to="/create">
              Create a new case <Icon name="arrow" />
            </Link>
          )}
          <div className="loading-line">
            <i />
          </div>
        </main>
        <footer>All cases and evidence are fictional and AI-generated.</footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="sparkle" size={19} />
          </span>{" "}
          CASEFILE
          <span className="brand-sub">/ AI MYSTERY ROOM</span>
        </Link>
        <nav>
          <Link to="/cases">Your cases</Link>
          <Link className="new-case" to="/create">
            <Icon name="plus" size={14} /> New case
          </Link>
        </nav>
      </header>

      <main className="investigation">
        <div className="case-heading">
          <div>
            <div className="eyebrow">
              CASE FILE / {caseId.slice(-6).toUpperCase()} - FICTIONAL
            </div>
            <h1>{data.title}</h1>
            <p>
              {data.incident?.location} - {data.difficulty} - {data.tone}
            </p>
          </div>
          <div className="status">
            <span className="status-dot" />{" "}
            {data.status === "solved" ? "SOLVED" : "IN PROGRESS"}
          </div>
        </div>

        <div className="investigation-grid">
          <aside>
            <div className="panel-label">THE INCIDENT</div>
            <p>{data.incident?.summary}</p>
            <div className="panel-label spaced">
              PERSONS OF INTEREST <span>{data.suspects.length}</span>
            </div>
            {data.suspects.map((suspect, index) => (
              <button
                className="suspect"
                key={suspect.id}
                onClick={() =>
                  setSelectedSuspectId(
                    selectedSuspectId === suspect.id ? null : suspect.id,
                  )
                }
              >
                <span className="avatar">0{index + 1}</span>
                <span>
                  <b>{suspect.name}</b>
                  <small>{suspect.role}</small>
                  {selectedSuspectId === suspect.id && (
                    <small className="suspect-more">
                      {suspect.profile}
                      <br />
                      <br />
                      Possible motive: {suspect.motiveSummary}
                      <br />
                      <br />
                      Alibi: {suspect.alibiSummary}
                    </small>
                  )}
                </span>
                <span className="expand-caret" aria-hidden="true" />
              </button>
            ))}
            <div className="fiction-note">
              <Icon name="sparkle" size={13} /> Fictional case material
            </div>
          </aside>

          <section className="evidence-area">
            <div className="section-heading">
              <div>
                <div className="panel-label">EVIDENCE BOARD</div>
                <p>
                  {data.evidence.filter((item) => item.reviewedByPlayer).length}{" "}
                  / {data.evidence.length} reviewed
                </p>
              </div>
              <button
                className="button quiet"
                onClick={() => navigate(`/case/${caseId}/accuse`)}
              >
                Make accusation <Icon name="arrow" />
              </button>
            </div>

            <div className="evidence-grid">
              {data.evidence.map((item, index) => (
                <Link
                  to={`/case/${caseId}/evidence/${item.id}`}
                  className={`evidence-card ${item.reviewedByPlayer ? "reviewed" : ""}`}
                  key={item.id}
                >
                  <div className="evidence-top">
                    <span>
                      {String(index + 1).padStart(2, "0")} /{" "}
                      {evidenceTypeNames[item.type] || item.type}
                    </span>
                    {item.reviewedByPlayer && (
                      <span>
                        <Icon name="check" size={12} /> REVIEWED
                      </span>
                    )}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="evidence-source">
                    {item.source} <Icon name="arrow" size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="side-panel">
            <div className="panel-label">EVENT TIMELINE</div>
            <div className="timeline">
              {data.timeline.map((event) => (
                <div className="event" key={event.id}>
                  <time>{event.time}</time>
                  <p>{event.description}</p>
                </div>
              ))}
            </div>
            <div className="panel-label spaced">
              PRIVATE NOTES <span>ONLY YOU</span>
            </div>
            <textarea
              className="notes"
              value={notes}
              maxLength="10000"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Keep track of details, questions, and theories…"
            />
          </aside>
        </div>
      </main>
      <footer>All cases and evidence are fictional and AI-generated.</footer>
    </div>
  );
}
