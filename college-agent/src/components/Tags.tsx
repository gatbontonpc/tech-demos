import type { Confidence, Provenance, TierName } from "../types";

const TIER_LABEL: Record<TierName, string> = {
  reach: "Reach",
  stretch: "Stretch",
  target: "Target",
  fit: "Strong fit",
};

export function TierBadge({ tier }: { tier: TierName }) {
  return (
    <span className={`tier ${tier}`}>
      <TierIcon tier={tier} />
      {TIER_LABEL[tier]}
    </span>
  );
}

function TierIcon({ tier }: { tier: TierName }) {
  if (tier === "reach") {
    return (
      <svg viewBox="0 0 14 14" aria-hidden="true">
        <path d="M7 1 L13 12 H1 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (tier === "stretch") {
    return (
      <svg viewBox="0 0 14 14" aria-hidden="true">
        <path d="M7 1 L13 7 L7 13 L1 7 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (tier === "target") {
    return (
      <svg viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="7" cy="7" r="2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 7.5 L5.5 11 L12 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const CONF_WORD: Record<Confidence, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export function ProvenanceTag({ tag }: { tag: Provenance }) {
  return (
    <span className={`tag conf-${tag.confidence}`} title={`${tag.source}. ${tag.detail}. ${tag.when}. ${CONF_WORD[tag.confidence]} confidence.`}>
      <span className="dot" />
      {tag.source} · “{tag.detail}” · {tag.when} · {CONF_WORD[tag.confidence]}
    </span>
  );
}

export function ExampleFlag({ children = "example numbers" }: { children?: string }) {
  return <span className="example-flag">{children}</span>;
}
