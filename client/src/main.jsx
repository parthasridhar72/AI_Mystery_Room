import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./styles.css";
import { InvestigationPage } from "./Investigation.jsx";
import Icon from "./Icon.jsx";

const API_ROOT = (
  import.meta.env.VITE_API_URL || window.location.origin
).replace(/\/+$/, "");
const API = API_ROOT.endsWith("/api/v1") ? API_ROOT : `${API_ROOT}/api/v1`;
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error?.message || "Something went wrong. Please try again.",
    );
  }
  return response.status === 204 ? null : response.json();
}
const typeNames = {
  chat: "Chat transcript",
  images: "Image description",
  documents: "Document",
  cctv: "CCTV transcript",
  audio: "Audio transcript",
  timeline: "Timeline record",
};
function Shell({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="sparkle" size={19} />
          </span>{" "}
          CASEFILE <span className="brand-sub">/ AI MYSTERY ROOM</span>
        </Link>
        <nav>
          <Link to="/cases">Your cases</Link>
          <Link className="new-case" to="/create">
            <Icon name="plus" size={14} /> New case
          </Link>
        </nav>
      </header>
      {children}
      <footer>All cases and evidence are fictional and AI-generated.</footer>
    </div>
  );
}
function Home() {
  return (
    <Shell>
      <main className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <i /> AN INVESTIGATION BEGINS
          </div>
          <h1>
            Every story
            <br />
            hides a <em>secret.</em>
          </h1>
          <p>
            Build a mystery from a single idea. Follow the evidence, question
            every alibi, and decide who did it.
          </p>
          <Link className="button primary" to="/create">
            Create a mystery <Icon name="arrow" />
          </Link>
          <div className="hero-meta">
            <span>
              <Icon name="sparkle" size={12} /> FICTIONAL CASES
            </span>
            <span>
              <Icon name="search" size={12} /> EVIDENCE FIRST
            </span>
            <span>
              <Icon name="clock" size={12} /> YOUR OWN PACE
            </span>
          </div>
        </div>
        <div className="case-preview">
          <div className="preview-head">
            <span>CASE PREVIEW</span>
            <span className="status">
              <i /> UNSOLVED
            </span>
          </div>
          <div className="preview-art">
            <div className="moon" />
            <div className="house" aria-hidden="true">
              <div className="house-roof" />
              <div className="house-body">
                <span />
                <span />
              </div>
            </div>
            <div className="art-label">BRIAR HOUSE - 21:30</div>
          </div>
          <div className="preview-title">The last light at Briar House</div>
          <p>
            A storm cuts the power. One key goes missing. Three people have a
            reason to lie.
          </p>
          <div className="preview-stats">
            <div>
              <b>03</b>
              <span>SUSPECTS</span>
            </div>
            <div>
              <b>06</b>
              <span>CLUES</span>
            </div>
            <div>
              <b>01</b>
              <span>TRUTH</span>
            </div>
          </div>
          <div className="redacted" aria-label="Solution hidden" />
          <small>SOLUTION SEALED UNTIL YOUR ACCUSATION</small>
        </div>
      </main>
      <section className="home-note">
        <span>01 / THE METHOD</span>
        <p>Notice the details. The truth is always in the file.</p>
        <span>02 / FICTIONAL BY DESIGN</span>
      </section>
    </Shell>
  );
}
function Create() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    premise: "",
    difficulty: "Medium",
    tone: "Classic detective",
    evidenceTypes: ["chat", "documents", "cctv", "audio"],
    title: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.premise.trim().length < 50) {
      setError(
        "Give your premise at least 50 characters so there is enough to build a case.",
      );
      return;
    }
    setBusy(true);
    try {
      const r = await request("/cases", {
        method: "POST",
        body: JSON.stringify({ ...form, premise: form.premise.trim() }),
      });
      nav(`/case/${r.caseId}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  const types = [
    ["chat", "Chat messages"],
    ["images", "Image descriptions"],
    ["documents", "Documents"],
    ["cctv", "CCTV / transcript"],
    ["audio", "Audio transcript"],
    ["timeline", "Timeline records"],
  ];
  return (
    <Shell>
      <main className="form-page">
        <Link to="/" className="back">
          <Icon name="back" /> Back to home
        </Link>
        <div className="eyebrow">CASE INTAKE / 01</div>
        <h1>
          Start with a <em>story.</em>
        </h1>
        <p className="lead">
          A place, a secret, a suspicious moment. Give us the beginning; the
          evidence will follow.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="premise">
            THE PREMISE <span>REQUIRED - 50 TO 5,000 CHARACTERS</span>
          </label>
          <textarea
            id="premise"
            maxLength="5000"
            minLength="50"
            value={form.premise}
            onChange={(e) => set("premise", e.target.value)}
            placeholder="At the winter gala in an old seaside hotel, the owner is found missing just as the lighthouse goes dark..."
            required
          />
          <div className="char-count">{form.premise.length} / 5,000</div>
          <div className="form-grid">
            <div>
              <label htmlFor="title">
                CASE TITLE <span>OPTIONAL</span>
              </label>
              <input
                id="title"
                maxLength="80"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Generated if left blank"
              />
            </div>
            <div>
              <label htmlFor="difficulty">DIFFICULTY</label>
              <select
                id="difficulty"
                value={form.difficulty}
                onChange={(e) => set("difficulty", e.target.value)}
              >
                {["Easy", "Medium", "Hard"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tone">TONE</label>
              <select
                id="tone"
                value={form.tone}
                onChange={(e) => set("tone", e.target.value)}
              >
                {[
                  "Classic detective",
                  "Noir",
                  "Thriller",
                  "Cozy",
                  "Sci-fi",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
          </div>
          <fieldset>
            <legend>
              EVIDENCE TYPES <span>CHOOSE AT LEAST 3</span>
            </legend>
            <div className="type-grid">
              {types.map(([id, label]) => (
                <label className="check" key={id}>
                  <input
                    type="checkbox"
                    checked={form.evidenceTypes.includes(id)}
                    onChange={(e) =>
                      set(
                        "evidenceTypes",
                        e.target.checked
                          ? [...form.evidenceTypes, id]
                          : form.evidenceTypes.filter((t) => t !== id),
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="fiction-note">
            <Icon name="sparkle" size={13} /> &nbsp; All cases and evidence in
            this experience are fictional and AI-generated.
          </div>
          <button
            className="button primary"
            disabled={busy || form.evidenceTypes.length < 3}
          >
            {busy ? "Opening the case..." : "Generate case file"}{" "}
            <Icon name="arrow" />
          </button>
        </form>
      </main>
    </Shell>
  );
}
function Cases() {
  const [cases, setCases] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    request("/cases")
      .then((r) => setCases(r.cases))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Shell>
      <main className="content-page">
        <div className="eyebrow">YOUR ARCHIVE</div>
        <h1>
          Case <em>files.</em>
        </h1>
        <p className="lead">
          Every mystery you have started, all in one place.
        </p>
        {error && <div className="error">{error}</div>}
        {cases.length === 0 && !error ? (
          <div className="empty">
            <Icon name="search" size={28} />
            <h2>No open files.</h2>
            <p>Your first investigation is waiting to begin.</p>
            <Link className="button primary" to="/create">
              Create a mystery <Icon name="arrow" />
            </Link>
          </div>
        ) : (
          <div className="case-list">
            {cases.map((c) => (
              <Link className="case-row" key={c.id} to={`/case/${c.id}`}>
                <span className="case-index">
                  CASE / {c.id.slice(-5).toUpperCase()}
                </span>
                <b>{c.title}</b>
                <span>
                  {c.difficulty} - {c.status}
                </span>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </Shell>
  );
}
function Investigation() {
  return <InvestigationPage request={request} />;
}
function Evidence() {
  const { caseId, evidenceId } = useParams();
  const [item, setItem] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    request(`/cases/${caseId}/evidence/${evidenceId}`)
      .then(setItem)
      .catch((e) => setError(e.message));
  }, [caseId, evidenceId]);
  if (error)
    return (
      <Shell>
        <main className="content-page">
          <p className="error">{error}</p>
          <Link to={`/case/${caseId}`}>
            <Icon name="back" /> Return to case
          </Link>
        </main>
      </Shell>
    );
  if (!item)
    return (
      <Shell>
        <main className="content-page">Opening evidence...</main>
      </Shell>
    );
  return (
    <Shell>
      <main className="evidence-detail">
        <Link className="back" to={`/case/${caseId}`}>
          <Icon name="back" /> Back to investigation
        </Link>
        <div className="eyebrow">
          EVIDENCE / {typeNames[item.type] || item.type} - FICTIONAL ARTIFACT
        </div>
        <h1>{item.title}</h1>
        <p className="lead">{item.summary}</p>
        <article>
          <div className="panel-label">{item.source}</div>
          <p>{item.content}</p>
          {item.altText && <small>{item.altText}</small>}
        </article>
        <div className="artifact-meta">
          <span>SOURCE: {item.source}</span>
          <span>RELIABILITY: {item.reliability}</span>
        </div>
        <button
          className="button quiet"
          onClick={async () => {
            await request(`/cases/${caseId}/evidence/${evidenceId}`, {
              method: "PATCH",
              body: JSON.stringify({ reviewed: !item.reviewedByPlayer }),
            });
            setItem({ ...item, reviewedByPlayer: !item.reviewedByPlayer });
          }}
        >
          {item.reviewedByPlayer ? (
            <>
              <Icon name="check" /> Reviewed
            </>
          ) : (
            "Mark as reviewed"
          )}
        </button>
      </main>
    </Shell>
  );
}
function Accuse() {
  const { caseId } = useParams(),
    nav = useNavigate();
  const [data, setData] = useState(null),
    [chosen, setChosen] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    request(`/cases/${caseId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [caseId]);
  async function submit() {
    try {
      const result = await request(`/cases/${caseId}/accusation`, {
        method: "POST",
        body: JSON.stringify({ suspectId: chosen }),
      });
      sessionStorage.setItem(`result_${caseId}`, JSON.stringify(result));
      nav(`/case/${caseId}/result`);
    } catch (e) {
      setError(e.message);
      setConfirm(false);
    }
  }
  return (
    <Shell>
      <main className="content-page">
        <Link className="back" to={`/case/${caseId}`}>
          <Icon name="back" /> Return to investigation
        </Link>
        <div className="eyebrow">FINAL ACCUSATION</div>
        <h1>
          Who did <em>it?</em>
        </h1>
        <p className="lead">
          Choose carefully. Your accusation reveals the complete solution and
          cannot be changed.
        </p>
        {error && <div className="error">{error}</div>}
        {data && (
          <div className="accuse-list">
            {data.suspects.map((s) => (
              <button
                className={`accuse-option ${chosen === s.id ? "selected" : ""}`}
                key={s.id}
                onClick={() => setChosen(s.id)}
              >
                <span className="avatar">
                  <Icon name="sparkle" />
                </span>
                <span>
                  <b>{s.name}</b>
                  <small>{s.role}</small>
                </span>
                <span className="radio" />
              </button>
            ))}
          </div>
        )}
        {!confirm ? (
          <button
            className="button primary"
            disabled={!chosen}
            onClick={() => setConfirm(true)}
          >
            Submit final accusation <Icon name="arrow" />
          </button>
        ) : (
          <div className="confirm-box">
            <b>Seal this accusation?</b>
            <p>The solution will be revealed after you submit.</p>
            <button className="button primary" onClick={submit}>
              Yes, accuse {data?.suspects.find((s) => s.id === chosen)?.name}
            </button>{" "}
            <button className="button quiet" onClick={() => setConfirm(false)}>
              Go back
            </button>
          </div>
        )}
      </main>
    </Shell>
  );
}
function Result() {
  const { caseId } = useParams(),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    request(`/cases/${caseId}/result`)
      .then(setResult)
      .catch((e) => setError(e.message));
  }, [caseId]);
  if (error)
    return (
      <Shell>
        <main className="content-page">
          <div className="eyebrow">CASE RESULT</div>
          <h1>{error}</h1>
          <Link className="button primary" to="/cases">
            Return to cases <Icon name="arrow" />
          </Link>
        </main>
      </Shell>
    );
  if (!result)
    return (
      <Shell>
        <main className="content-page">Reconstructing the case...</main>
      </Shell>
    );
  return (
    <Shell>
      <main className="result-page">
        <div className="eyebrow">CASE CLOSED / VERDICT</div>
        <div
          className={`verdict ${result.isCorrect ? "correct" : "incorrect"}`}
        >
          {result.isCorrect ? "THE DEDUCTION HOLDS" : "THE TRAIL WENT COLD"}
        </div>
        <h1>
          {result.isCorrect ? "Well observed." : "The culprit was"}{" "}
          <em>{result.culprit.name}.</em>
        </h1>
        <p className="lead">{result.solution.narrative}</p>
        <div className="solution-grid">
          <div>
            <div className="panel-label">MOTIVE</div>
            <p>{result.solution.motive}</p>
          </div>
          <div>
            <div className="panel-label">METHOD & OPPORTUNITY</div>
            <p>
              {result.solution.method} {result.solution.opportunity}
            </p>
          </div>
        </div>
        <div className="panel-label spaced">THE RECONSTRUCTION</div>
        {result.solution.reasoningSteps.map((s, i) => (
          <div className="reason" key={i}>
            <b>0{i + 1}</b>
            <p>
              {s.text}
              <small>SUPPORTED BY {s.evidenceIds.join(", ")}</small>
            </p>
          </div>
        ))}
        <Link className="button primary" to="/create">
          Open another case <Icon name="arrow" />
        </Link>
      </main>
    </Shell>
  );
}
function NotFound() {
  return (
    <Shell>
      <main className="content-page">
        <div className="eyebrow">404 / FILE NOT FOUND</div>
        <h1>
          This trail ends <em>here.</em>
        </h1>
        <Link className="button primary" to="/">
          Return to the desk <Icon name="arrow" />
        </Link>
      </main>
    </Shell>
  );
}
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/case/:caseId" element={<Investigation />} />
        <Route
          path="/case/:caseId/evidence/:evidenceId"
          element={<Evidence />}
        />
        <Route path="/case/:caseId/accuse" element={<Accuse />} />
        <Route path="/case/:caseId/result" element={<Result />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
