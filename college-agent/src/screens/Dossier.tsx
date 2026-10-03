import { useState } from "react";
import { ProvenanceTag } from "../components/Tags";
import { Next } from "../components/Shell";
import { JOBS, STUDENT } from "../fixtures";
import { useAppState, useDispatch } from "../state/store";
import type { Fact } from "../types";

export function Dossier() {
  const state = useAppState();
  if (state.mode === "unset") return <NeedSources />;

  const confirmed = state.facts.filter((fact) => fact.status !== "unreviewed").length;

  return (
    <section data-testid="dossier-screen">
      <p className="eyebrow">Day-one dossier · claims, not a transcript</p>
      <div className="title-row">
        <div>
          <h1>Here is who we think {state.mode === "demo" ? "Avery" : "you"} {state.mode === "demo" ? "is" : "are"}.</h1>
          <p className="lead">
            {confirmed} of {state.facts.length} facts confirmed or fixed. Each line keeps the source it was extracted from. Fixing a line does not erase that source.
          </p>
        </div>
        {state.mode === "demo" && <span className="example-flag">fictional student</span>}
      </div>

      <div className="split">
        <div className="stack">
          {state.mode === "demo" && (
            <p className="identity">
              <strong>{STUDENT.name}</strong> · {STUDENT.grade} · {STUDENT.school}, {STUDENT.place}. {STUDENT.note}
            </p>
          )}
          {state.facts.map((fact) => (
            <FactCard key={fact.id} fact={fact} />
          ))}
          <Next href="#/questions">These are the 3 questions</Next>
        </div>
        <aside className="card rail">
          <p className="eyebrow">Background work</p>
          <h2>What already ran</h2>
          <p className="micro muted">
            {state.mode === "demo"
              ? "Scripted jobs for the fixture week. A live connect replaces the claims, not this week’s memo history."
              : "Search results from this session. Parsing document bodies is not part of this build."}
          </p>
          <ol className="jobs">
            {JOBS.slice(0, 8).map((job) => (
              <li key={job.id}>
                <strong>{job.label}</strong>
                <span>{job.result}</span>
              </li>
            ))}
          </ol>
          <p className="micro muted">6 more routine checks are in the Sunday memo.</p>
        </aside>
      </div>
    </section>
  );
}

function FactCard({ fact }: { fact: Fact }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fact.value);

  return (
    <article className="card fact">
      <div className="row">
        <h2>{fact.label}</h2>
        <FactState status={fact.status} />
      </div>
      {editing ? (
        <div className="edit">
          <label>
            Correct this fact
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
          </label>
          <div className="row">
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                dispatch({ type: "fix-fact", id: fact.id, value: draft.trim() || fact.value });
                setEditing(false);
              }}
            >
              Save correction
            </button>
            <button className="btn ghost" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="fact-value">{fact.value}</p>
      )}
      <p className="micro muted">{fact.hint}</p>
      <ProvenanceTag tag={fact.provenance} />
      <div className="row actions">
        <button
          className="btn primary"
          type="button"
          disabled={fact.status === "confirmed"}
          onClick={() => dispatch({ type: "confirm-fact", id: fact.id })}
        >
          {fact.status === "confirmed" ? "Confirmed" : "Confirm"}
        </button>
        <button className="btn" type="button" onClick={() => setEditing(true)}>
          Fix
        </button>
      </div>
    </article>
  );
}

function FactState({ status }: { status: Fact["status"] }) {
  const label = status === "confirmed" ? "Confirmed by you" : status === "fixed" ? "Fixed by you" : "Needs a look";
  return <span className={`pill status-${status}`}>{label}</span>;
}

function NeedSources() {
  return (
    <section className="card">
      <p className="eyebrow">Dossier</p>
      <h1>Connect a source first.</h1>
      <p>The dossier is the claims extracted from Gmail, Drive, Photos, or the labeled demo fixtures. It is empty until one of those runs.</p>
      <a className="btn primary" href="#/connect">
        Back to sources
      </a>
    </section>
  );
}
