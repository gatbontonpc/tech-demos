import type { Confidence, Fact, FactId, FoundHit, SlotId } from "../types";

const FACT_FROM_SLOT: { id: FactId; label: string; slots: SlotId[] }[] = [
  { id: "gpa", label: "GPA and trend", slots: ["transcript", "fall-grades"] },
  { id: "rigor", label: "Course rigor", slots: ["transcript"] },
  { id: "scores", label: "Scores", slots: ["scores"] },
  { id: "activities", label: "Activities", slots: ["activities", "photos"] },
  { id: "awards", label: "Awards", slots: ["awards", "photos"] },
  { id: "major", label: "Intended major", slots: ["essays", "activities"] },
];

function shortWhen(value: string): string {
  if (!value) return "undated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 42);
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" });
}

function confidenceFor(hits: FoundHit[]): Confidence {
  if (hits.length >= 2) return "medium";
  return "low";
}

export function factsFromHits(hits: FoundHit[]): Fact[] {
  return FACT_FROM_SLOT.map((spec) => {
    const matched = hits.filter((hit) => spec.slots.includes(hit.slot));
    const first = matched[0];
    if (!first) {
      return {
        id: spec.id,
        label: spec.label,
        value: "Not found in the accounts that were searched.",
        hint: "Fix this if you know it. Leaving it blank keeps the confidence low. It does not block the list.",
        provenance: {
          source: "Search",
          detail: "no matching file",
          when: "this session",
          confidence: "low" as const,
        },
        status: "unreviewed" as const,
      };
    }
    const names = matched
      .slice(0, 3)
      .map((hit) => hit.title)
      .join("; ");
    return {
      id: spec.id,
      label: spec.label,
      value: `Matched ${matched.length} item${matched.length === 1 ? "" : "s"}: ${names}. This build records the file. It does not parse a GPA, a score, or an essay out of the document.`,
      hint: "Replace this with the number or sentence from the file if you want the dossier to carry it.",
      provenance: {
        source: first.source,
        detail: first.title,
        when: shortWhen(first.when),
        confidence: confidenceFor(matched),
      },
      status: "unreviewed" as const,
    };
  });
}

export const DOCUMENT_SLOTS: SlotId[] = [
  "transcript",
  "scores",
  "activities",
  "awards",
  "essays",
  "fall-grades",
  "photos",
];

export function slotsWithHits(hits: FoundHit[]): SlotId[] {
  return DOCUMENT_SLOTS.filter((slot) => hits.some((hit) => hit.slot === slot));
}
