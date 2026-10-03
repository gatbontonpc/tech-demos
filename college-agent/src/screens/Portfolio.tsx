import { ExampleFlag, ProvenanceTag, TierBadge } from "../components/Tags";
import { Next } from "../components/Shell";
import { ZoneStrip } from "../components/ZoneStrip";
import { OFF_LIST_NOTE } from "../fixtures";
import { balance, listConfidence, listedSchools } from "../state/selectors";
import { useAppState } from "../state/store";
import type { TierName } from "../types";

const ORDER: TierName[] = ["reach", "stretch", "target", "fit"];
const TIER_COPY: Record<TierName, string> = {
  reach: "Uncommon for a profile like this. Worth it only if the fit is real.",
  stretch: "Possible. The application itself still matters.",
  target: "Profiles like this are often admitted, inside a range.",
  fit: "Profiles like this are usually admitted, and the campus matches the record.",
};

export function Portfolio() {
  const state = useAppState();
  if (state.mode === "unset") {
    return (
      <section className="card">
        <h1>The portfolio is built from claims.</h1>
        <a className="btn primary" href="#/connect">
          Back to sources
        </a>
      </section>
    );
  }

  const schools = listedSchools(state);
  const counts = balance(state);
  const confidence = listConfidence(state);
  const thinReach = counts.reach === 0;

  return (
    <section data-testid="portfolio-screen">
      <p className="eyebrow">Portfolio before any single school</p>
      <div className="title-row">
        <div>
          <h1>The shape of the list.</h1>
          <p className="lead">
            Reach, stretch, target, and fit are shaded zones. A school is a range inside a zone. Nothing on this page is a single admit percentage.
          </p>
        </div>
        <ExampleFlag>example numbers</ExampleFlag>
      </div>

      <article className="card">
        <ZoneStrip schools={schools} />
        <p className="micro muted zone-note">
          The bar is the range used to place the school in a zone. It is not a prediction. Essays, recommendations, and interviews are not in the model.
        </p>
        <div className="balance-row">
          <span className={thinReach ? "pill warn" : "pill ok"}>{thinReach ? "Thin on reach" : "Balanced"}</span>
          <span>
            {counts.reach} reach · {counts.stretch} stretch · {counts.target} target · {counts.fit} fit
          </span>
          <span className={`tag conf-${confidence.level}`}>
            <span className="dot" />
            list confidence {confidence.level}
          </span>
        </div>
        <ul className="reason-list">
          {confidence.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </article>

      <div className="portfolio-cols">
        {ORDER.map((tier) => {
          const group = schools.filter((school) => school.tier === tier);
          return (
            <section key={tier} className={`pf-col ${tier}`}>
              <TierBadge tier={tier} />
              <p>{TIER_COPY[tier]}</p>
              <ul>
                {group.length === 0 && <li className="muted">None on the list.</li>}
                {group.map((school) => (
                  <li key={school.id}>{school.name}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="micro muted off-list">{OFF_LIST_NOTE}</p>

      <h2 className="section-title">Schools, after the balance</h2>
      <div className="grid g2">
        {schools.map((school) => (
          <article key={school.id} className="card school">
            <div className="row">
              <TierBadge tier={school.tier} />
              <ExampleFlag />
            </div>
            <h3>{school.name}</h3>
            <p className="muted">{school.place}</p>
            <div className="mini-zone" aria-hidden="true">
              <i className="z reach" />
              <i className="z stretch" />
              <i className="z target" />
              <i className="z fit" />
              <b style={{ left: `${school.range[0]}%`, width: `${Math.max(6, school.range[1] - school.range[0])}%` }} />
            </div>
            <div className="stats">
              <Stat label="Net cost / yr" value={`$${school.cost[0]}k to $${school.cost[1]}k`} />
              <Stat label="Graduation" value={school.grad} />
              <Stat label="Earnings" value={school.earn} />
            </div>
            <div className="tag-row">
              {school.sources.map((source) => (
                <ProvenanceTag key={source.detail} tag={source} />
              ))}
            </div>
            {school.flags.length > 0 && (
              <ul className="flags">
                {school.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            )}
            <p className="micro label">Why it is on the list</p>
            <ul className="fitlist">
              {school.why.map((item) => (
                <li key={item} className="plus">
                  {item}
                </li>
              ))}
              {school.notFit.map((item) => (
                <li key={item} className="minus">
                  May not fit: {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <Next href="#/memo">Read Sunday’s memo</Next>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
