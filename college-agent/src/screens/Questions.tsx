import { QUESTIONS } from "../fixtures";
import { Next } from "../components/Shell";
import { listConfidence, skipCount } from "../state/selectors";
import { useAppState, useDispatch } from "../state/store";

export function Questions() {
  const state = useAppState();
  const dispatch = useDispatch();
  if (state.mode === "unset") {
    return (
      <section className="card">
        <h1>Questions wait on the dossier.</h1>
        <p>Connect sources, or load the fictional fixtures, before ranking what would move the list.</p>
        <a className="btn primary" href="#/connect">
          Back to sources
        </a>
      </section>
    );
  }

  const confidence = listConfidence(state);
  const skips = skipCount(state);

  return (
    <section data-testid="questions-screen">
      <p className="eyebrow">Only the questions that move the list</p>
      <h1>Three questions. The other ones can wait.</h1>
      <p className="lead">
        Each one is here because the answer changes who stays on the list. Skipping lowers confidence and widens the ranges. It never blocks the portfolio.
      </p>
      <p className={`confidence conf-${confidence.level}`}>
        List confidence: <strong>{confidence.level}</strong>
        {skips > 0 ? ` · ${skips} skipped` : ""}
      </p>

      <div className="stack">
        {QUESTIONS.map((question, index) => {
          const selected = state.answers[question.id];
          const skipped = selected === "skip";
          const choice = question.choices.find((item) => item.id === selected);
          return (
            <article key={question.id} className="card question">
              <div className="row">
                <p className="eyebrow">Question {index + 1} of 3</p>
                <span className="impact">{question.impact}</span>
              </div>
              <h2>{question.prompt}</h2>
              <p className="why">
                <strong>Why this matters.</strong> {question.why}
              </p>
              <div className="choices">
                {question.choices.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="btn choice"
                    data-testid={`choice-${question.id}-${item.id}`}
                    aria-pressed={selected === item.id}
                    onClick={() => dispatch({ type: "answer", id: question.id, choice: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  data-testid={`skip-${question.id}`}
                  aria-pressed={skipped}
                  onClick={() => dispatch({ type: "answer", id: question.id, choice: "skip" })}
                >
                  Skip
                </button>
              </div>
              {choice && <p className="effect">{choice.effect}</p>}
              {skipped && (
                <p className="effect">
                  Skipped. This does not stop you. The range on every school gets wider, and list confidence drops.
                </p>
              )}
            </article>
          );
        })}
      </div>
      <Next href="#/portfolio">See the portfolio</Next>
    </section>
  );
}
