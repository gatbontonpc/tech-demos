import { useState } from "react";
import { JOBS, PARENT_CHANGES, PAST_MEMOS, STUDENT, STUDENT_CHANGES } from "../fixtures";
import { useAppState, useDispatch } from "../state/store";
import type { Audience, ChangeLine, DecisionId } from "../types";

const DECISIONS: {
  id: DecisionId;
  studentTitle: string;
  parentTitle: string;
  studentWhy: string;
  parentWhy: string;
  tradeoff: string;
}[] = [
  {
    id: "tidewater",
    studentTitle: "Add Tidewater Institute as a target?",
    parentTitle: "Add Tidewater? It is under the ceiling and farther from home.",
    studentWhy:
      "You can mark co-op as a must-have on the question screen. Tidewater requires one, and the example net price is $14–20k. Three fixture sources: the program page, the price band, and the activities doc.",
    parentWhy:
      "Tidewater’s example net price is $14–20k per year, under a $25k ceiling. The co-op is required, so the cost includes a working year. It is the farthest school from Northline.",
    tradeoff: "Farther from home than anything already on the list. Distance has no confirmed weight yet.",
  },
  {
    id: "ridgeview",
    studentTitle: "Move Ridgeview from target to stretch?",
    parentTitle: "Accept Ridgeview as a stretch, or keep the current plan?",
    studentWhy:
      "The Oct 1 example admit profile, n=64, would place this record in stretch. Low confidence. The list stays put until you choose.",
    parentWhy:
      "This is a tier change, not a bill. Keeping the plan means the family still treats Ridgeview as a target while the underlying profile is thin.",
    tradeoff: "Approving makes the list less comfortable on paper. Keeping the plan leaves a low-confidence target in place.",
  },
];

export function Memo() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [audience, setAudience] = useState<Audience>("student");
  if (state.mode === "unset") {
    return (
      <section className="card">
        <h1>The memo starts after the record is in.</h1>
        <a className="btn primary" href="#/connect">
          Back to sources
        </a>
      </section>
    );
  }

  const changes = audience === "student" ? STUDENT_CHANGES : PARENT_CHANGES;
  const name = state.mode === "demo" ? STUDENT.name : "your file";

  return (
    <section data-testid="memo-screen">
      <p className="eyebrow">Sunday memo · drafted Saturday 6:12am</p>
      <div className="title-row">
        <div>
          <h1>{audience === "student" ? "Two decisions before Harbor Tech’s date." : "The ceiling still holds for most of the list."}</h1>
          <p className="lead">
            {audience === "student"
              ? `Week of October 4, for ${name}. Goes out Sunday 7:00am. The agent proposes. It does not submit.`
              : "The parent copy leads with price and with what would need a signature. Same decisions, different stakes."}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Memo audience">
          <button type="button" className="btn" aria-pressed={audience === "student"} data-testid="audience-student" onClick={() => setAudience("student")}>
            Student
          </button>
          <button type="button" className="btn" aria-pressed={audience === "parent"} data-testid="audience-parent" onClick={() => setAudience("parent")}>
            Parent
          </button>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <article className="card">
            <h2>Since last Sunday</h2>
            <ul className="changes">
              {changes.map((change) => (
                <Change key={change.text} change={change} />
              ))}
            </ul>
          </article>

          {DECISIONS.map((decision, index) => {
            const status = state.decisions[decision.id];
            return (
              <article key={decision.id} className="card decision">
                <p className="eyebrow">Decision {index + 1} of 2 · about 2 minutes</p>
                <h2>{audience === "student" ? decision.studentTitle : decision.parentTitle}</h2>
                <p>{audience === "student" ? decision.studentWhy : decision.parentWhy}</p>
                <p className="tradeoff">
                  <strong>Tradeoff.</strong> {decision.tradeoff}
                </p>
                <div className="choices">
                  <button type="button" className="btn primary" aria-pressed={status === "approve"} onClick={() => dispatch({ type: "decide", id: decision.id, status: "approve" })}>
                    Approve
                  </button>
                  <button type="button" className="btn" aria-pressed={status === "keep"} onClick={() => dispatch({ type: "decide", id: decision.id, status: "keep" })}>
                    Keep plan
                  </button>
                  <button type="button" className="btn" aria-pressed={status === "counselor"} onClick={() => dispatch({ type: "decide", id: decision.id, status: "counselor" })}>
                    Ask counselor
                  </button>
                </div>
                {status && <p className="effect">{decisionResult(decision.id, status, audience)}</p>}
              </article>
            );
          })}

          <article className="card">
            <h2>Earlier Sundays</h2>
            <div className="history">
              {PAST_MEMOS.map((memo) => (
                <details key={memo.id}>
                  <summary>
                    {memo.date} · {memo.title}
                  </summary>
                  <p>{memo.summary}</p>
                </details>
              ))}
            </div>
          </article>
        </div>

        <aside className="card rail">
          <p className="eyebrow">This week’s jobs</p>
          <h2>{JOBS.length} finished · 0 submitted</h2>
          <ol className="jobs">
            {JOBS.map((job) => (
              <li key={job.id}>
                <strong>{job.label}</strong>
                <span>{job.result}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

function Change({ change }: { change: ChangeLine }) {
  return (
    <li>
      <span className="mark">{change.mark}</span>
      <p>{change.text}</p>
      <span className="tag">
        <span className="dot" />
        {change.provenance}
      </span>
    </li>
  );
}

function decisionResult(id: DecisionId, status: "approve" | "keep" | "counselor", audience: Audience): string {
  if (status === "counselor") {
    return audience === "student"
      ? "Sent to the counselor queue. The list is unchanged."
      : "On the counselor roster. No fee, no click on an application.";
  }
  if (id === "tidewater" && status === "approve") {
    return "Tidewater is on the list as a target. Nothing was submitted.";
  }
  if (id === "tidewater" && status === "keep") {
    return "Tidewater stays off the list.";
  }
  if (id === "ridgeview" && status === "approve") {
    return "Ridgeview is now a stretch. The old target label is gone.";
  }
  return "Ridgeview stays a target. The October profile is noted, not applied.";
}
