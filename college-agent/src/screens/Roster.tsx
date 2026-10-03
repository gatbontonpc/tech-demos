import { ROSTER_OTHERS, STUDENT } from "../fixtures";
import { balance, counselorAsks, listConfidence } from "../state/selectors";
import { useAppState } from "../state/store";
import type { TierName } from "../types";

const TIERS: TierName[] = ["reach", "stretch", "target", "fit"];

function wordFor(value: number): "high" | "medium" | "low" {
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

export function Roster() {
  const state = useAppState();
  const counts = state.mode === "unset" ? null : balance(state);
  const confidence = state.mode === "unset" ? null : listConfidence(state);
  const asks = counselorAsks(state);
  const averyBalance: [number, number, number, number] = counts
    ? [counts.reach, counts.stretch, counts.target, counts.fit]
    : [1, 2, 2, 1];
  const averyConfidence = confidence ? (confidence.level === "high" ? 0.82 : confidence.level === "medium" ? 0.64 : 0.41) : 0.5;
  const averyStatus = asks > 0 ? "Waiting on you" : state.mode === "unset" ? "Sources not connected" : "Memo drafted";
  const averyTone = asks > 0 ? "warn" : "ok";
  const openQuestion =
    state.answers.geo === "skip" || !state.answers.geo
      ? "Would you leave the West Coast?"
      : state.answers.cost === "skip" || !state.answers.cost
        ? "Is there a hard cost ceiling?"
        : state.answers.coop === "skip" || !state.answers.coop
          ? "Is a required co-op a must-have?"
          : "No open question";

  const rows = [
    {
      name: state.mode === "demo" ? STUDENT.name : "This family",
      balance: averyBalance,
      confidence: averyConfidence,
      status: averyStatus,
      tone: averyTone as "ok" | "warn" | "bad",
      gain: openQuestion,
      href: "#/memo",
    },
    ...ROSTER_OTHERS.map((row) => ({ ...row, href: undefined as string | undefined })),
  ];

  return (
    <section data-testid="roster-screen">
      <p className="eyebrow">Optional · counselor queue</p>
      <div className="title-row">
        <div>
          <h1>Caseload, class of 2027</h1>
          <p className="lead">
            Five fictional students. The dense view is the same claims and the same decision cards, without the Sunday letter. It is off the family’s path on purpose.
          </p>
        </div>
        <span className="example-flag">fictional caseload</span>
      </div>
      <div className="card table-wrap">
        <table className="roster">
          <thead>
            <tr>
              <th>Student</th>
              <th>Balance · reach, stretch, target, fit</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Biggest open question</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const total = row.balance.reduce((sum, value) => sum + value, 0) || 1;
              return (
                <tr key={row.name}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>
                    <div className="balance-bar" title={row.balance.join(" · ")}>
                      {TIERS.map((tier, index) => (
                        <i key={tier} className={tier} style={{ width: `${(row.balance[index] / total) * 100}%` }} />
                      ))}
                    </div>
                    <span className="micro muted">{row.balance.join(" · ")}</span>
                  </td>
                  <td>
                    <span className={`tag conf-${wordFor(row.confidence)}`}>
                      <span className="dot" />
                      {wordFor(row.confidence)}
                    </span>
                    <span className="conf-track">
                      <i style={{ width: `${row.confidence * 100}%` }} />
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${row.tone}`}>{row.status}</span>
                  </td>
                  <td className="gain">{row.gain}</td>
                  <td>{row.href && <a className="btn" href={row.href}>Open memo</a>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="micro muted">
        A counselor note does not silently change a tier. “Ask counselor” on a decision card is what puts a family in the waiting column.
      </p>
    </section>
  );
}
