import { QUESTIONS, SCHOOLS } from "../fixtures";
import type { AppState, Confidence, School, TierName } from "../types";

export interface DisplaySchool extends School {
  flags: string[];
  range: [number, number];
}

function cloneSchools(): DisplaySchool[] {
  return SCHOOLS.map((school) => ({ ...school, flags: [] as string[], range: [...school.range] as [number, number] }));
}

export function skipCount(state: AppState): number {
  return QUESTIONS.filter((question) => state.answers[question.id] === "skip").length;
}

export function displaySchools(state: AppState): DisplaySchool[] {
  const schools = cloneSchools();
  const widen = skipCount(state) * 4 + (state.answers.geo === "unsure" || state.answers.cost === "none" ? 3 : 0);

  for (const school of schools) {
    if (widen) {
      school.range = [
        Math.max(0, school.range[0] - widen),
        Math.min(100, school.range[1] + widen),
      ];
    }
    if (state.answers.geo === "stay" && school.coast === "other") {
      school.onList = false;
      school.flags.push("Off the list: you said West Coast only.");
    }
    if (state.answers.cost === "25" && school.cost[0] > 25) {
      school.flags.push("Above the $25k ceiling.");
    }
    if (state.answers.cost === "25" && school.cost[0] <= 25 && school.cost[1] > 25) {
      school.flags.push("Straddles the $25k ceiling.");
    }
    if (state.answers.cost === "15" && school.cost[0] > 15) {
      school.flags.push("Above the $15k ceiling.");
    }
    if (state.answers.coop === "must" && school.coop) {
      school.flags.push("Required co-op, which you marked as a must-have.");
    }
    if (school.id === "tidewater" && state.decisions.tidewater === "approve") {
      school.onList = state.answers.geo === "stay" ? false : true;
      if (state.answers.geo === "stay") {
        school.flags.push("Approved, then held off because the list is West Coast only.");
      }
    }
    if (school.id === "ridgeview" && state.decisions.ridgeview === "approve" && school.proposedTier) {
      school.tier = school.proposedTier;
      school.flags.push("You approved the move to stretch.");
    }
    if (school.id === "ridgeview" && state.decisions.ridgeview === "keep") {
      school.flags.push("You kept the target plan. The Oct 1 profile was not applied.");
    }
    if (school.id === "ridgeview" && !state.decisions.ridgeview && school.proposedTier) {
      school.flags.push("Sunday memo proposes stretch. The tier stays target until you choose.");
    }
  }

  return schools;
}

export function listedSchools(state: AppState): DisplaySchool[] {
  return displaySchools(state).filter((school) => school.onList);
}

export function balance(state: AppState): Record<TierName, number> {
  const counts: Record<TierName, number> = { reach: 0, stretch: 0, target: 0, fit: 0 };
  for (const school of listedSchools(state)) counts[school.tier] += 1;
  return counts;
}

export function listConfidence(state: AppState): { level: Confidence; reasons: string[] } {
  const reasons: string[] = [];
  const openFacts = state.facts.filter((fact) => fact.status === "unreviewed").length;
  const skips = skipCount(state);
  let level: Confidence = "medium";

  if (state.mode === "live") {
    level = "low";
    reasons.push("Live search matched file names and subjects. Document bodies were not parsed.");
  }

  if (openFacts === 0 && state.facts.length > 0 && skips === 0 && state.answers.cost && state.answers.cost !== "none" && state.answers.geo && state.answers.geo !== "unsure") {
    level = state.mode === "live" ? "medium" : "high";
    reasons.push("Every extracted fact was confirmed or fixed, and the three questions have a definite answer.");
  } else {
    if (openFacts > 0) reasons.push(`${openFacts} fact${openFacts === 1 ? "" : "s"} still unreviewed.`);
    if (skips > 0) reasons.push(`${skips} question${skips === 1 ? "" : "s"} skipped. Ranges are wider.`);
    if (state.answers.geo === "unsure") reasons.push("Geography is still unsure.");
    if (state.answers.cost === "none") reasons.push("No cost ceiling, so price cannot sort the list.");
    if (!state.answers.geo || !state.answers.cost || !state.answers.coop) {
      reasons.push("An unanswered question stays open. It does not block the portfolio.");
    }
  }

  if (skips >= 2) level = "low";
  else if (skips === 1 && level === "high") level = "medium";

  if (reasons.length === 0) reasons.push("Fixture claims, fictional student.");
  return { level, reasons };
}

export function counselorAsks(state: AppState): number {
  return Object.values(state.decisions).filter((status) => status === "counselor").length;
}
