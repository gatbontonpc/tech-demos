import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { DEMO_FACTS, DEMO_HITS, DEMO_UPLOADS } from "../fixtures";
import { clearAccessToken } from "../google/oauth";
import { factsFromHits, slotsWithHits } from "../google/extract";
import type { AppState, ConnectorId, DecisionId, DecisionStatus, FactId, FoundHit, SlotId } from "../types";

const EMPTY_CONNECTOR = { status: "idle" as const, detail: "Not connected.", hits: [] as FoundHit[] };

const INITIAL: AppState = {
  mode: "unset",
  connectors: {
    gmail: { ...EMPTY_CONNECTOR },
    drive: { ...EMPTY_CONNECTOR },
    photos: { ...EMPTY_CONNECTOR, detail: "Not opened. Photos arrive only through the Picker." },
  },
  facts: [],
  uploads: [],
  answers: {},
  decisions: {},
  searchedSlots: [],
  oauthError: "",
};

type Action =
  | { type: "load-demo" }
  | { type: "connector-working"; connector: ConnectorId }
  | { type: "connector-error"; connector: ConnectorId; message: string }
  | { type: "connector-ready"; connector: ConnectorId; hits: FoundHit[]; email?: string; detail: string }
  | { type: "oauth-error"; message: string }
  | { type: "clear-oauth-error" }
  | { type: "confirm-fact"; id: FactId }
  | { type: "fix-fact"; id: FactId; value: string }
  | { type: "answer"; id: "geo" | "cost" | "coop"; choice: string }
  | { type: "upload"; slot: SlotId; fileName: string }
  | { type: "decide"; id: DecisionId; status: DecisionStatus };

function mergeLive(state: AppState, connector: ConnectorId, hits: FoundHit[], email: string | undefined, detail: string): AppState {
  const connectors = {
    ...state.connectors,
    [connector]: { status: "ready" as const, detail, email, hits },
  };
  const allHits = (["gmail", "drive", "photos"] as const).flatMap((id) => connectors[id].hits);
  const searched = new Set(state.searchedSlots);
  if (connector === "gmail" || connector === "drive") {
    ["transcript", "scores", "activities", "awards", "essays", "fall-grades"].forEach((slot) => searched.add(slot as SlotId));
  }
  if (connector === "photos") searched.add("photos");
  const filled = new Set(slotsWithHits(allHits));
  const previousUploads = new Map(state.uploads.map((slot) => [slot.id, slot.fileName]));
  const uploads = [...searched]
    .filter((slot) => !filled.has(slot))
    .map((slot) => ({
      id: slot,
      label: SLOT_LABELS[slot],
      why: SLOT_WHY[slot],
      fileName: previousUploads.get(slot),
    }));
  return {
    ...state,
    mode: "live",
    connectors,
    facts: factsFromHits(allHits),
    uploads,
    searchedSlots: [...searched],
    oauthError: "",
  };
}

const SLOT_LABELS: Record<SlotId, string> = {
  transcript: "Transcript",
  scores: "SAT, ACT, or AP score report",
  activities: "Activity evidence",
  awards: "Award evidence",
  essays: "Essay draft",
  photos: "Activity and award photos",
  "fall-grades": "Senior fall grade report",
};

const SLOT_WHY: Record<SlotId, string> = {
  transcript: "The Gmail and Drive searches that already ran did not find a transcript.",
  scores: "No SAT, ACT, or AP score report turned up in the accounts already searched.",
  activities: "No activity evidence turned up in the accounts already searched.",
  awards: "No award evidence turned up in the accounts already searched.",
  essays: "No essay draft turned up in the accounts already searched.",
  photos: "No picked photo is on file. The Picker is the only Google Photos path.",
  "fall-grades": "No senior fall grade or progress report turned up.",
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "load-demo":
      clearAccessToken();
      return {
        ...INITIAL,
        mode: "demo",
        connectors: {
          gmail: {
            status: "demo",
            detail: "Demo fixtures. Not a Google account.",
            hits: DEMO_HITS.filter((hit) => hit.source === "Gmail"),
          },
          drive: {
            status: "demo",
            detail: "Demo fixtures. Not a Google account.",
            hits: DEMO_HITS.filter((hit) => hit.source === "Drive"),
          },
          photos: {
            status: "idle",
            detail: "Not opened. Demo mode does not fake a Photos login.",
            hits: [],
          },
        },
        facts: DEMO_FACTS.map((fact) => ({ ...fact })),
        uploads: DEMO_UPLOADS.map((slot) => ({ ...slot })),
        searchedSlots: ["transcript", "scores", "activities", "awards", "essays", "fall-grades"],
      };
    case "connector-working":
      if (state.mode === "demo") return { ...state, oauthError: "" };
      return {
        ...state,
        oauthError: "",
        connectors: {
          ...state.connectors,
          [action.connector]: { ...state.connectors[action.connector], status: "working", detail: "Waiting on Google…" },
        },
      };
    case "connector-error":
      if (state.mode === "demo") return { ...state, oauthError: action.message };
      return {
        ...state,
        oauthError: action.message,
        connectors: {
          ...state.connectors,
          [action.connector]: {
            ...state.connectors[action.connector],
            status: "error",
            detail: action.message,
          },
        },
      };
    case "connector-ready":
      return mergeLive(state, action.connector, action.hits, action.email, action.detail);
    case "oauth-error":
      return { ...state, oauthError: action.message };
    case "clear-oauth-error":
      return { ...state, oauthError: "" };
    case "confirm-fact":
      return {
        ...state,
        facts: state.facts.map((fact) => (fact.id === action.id ? { ...fact, status: "confirmed" } : fact)),
      };
    case "fix-fact":
      return {
        ...state,
        facts: state.facts.map((fact) =>
          fact.id === action.id ? { ...fact, value: action.value, status: "fixed" } : fact,
        ),
      };
    case "answer":
      return { ...state, answers: { ...state.answers, [action.id]: action.choice } };
    case "upload":
      return {
        ...state,
        uploads: state.uploads.map((slot) => (slot.id === action.slot ? { ...slot, fileName: action.fileName } : slot)),
      };
    case "decide":
      return { ...state, decisions: { ...state.decisions, [action.id]: action.status } };
    default:
      return state;
  }
}

const StateContext = createContext<AppState>(INITIAL);
const DispatchContext = createContext<Dispatch<Action>>(() => undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const value = useMemo(() => state, [state]);
  return (
    <StateContext.Provider value={value}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  return useContext(StateContext);
}

export function useDispatch(): Dispatch<Action> {
  return useContext(DispatchContext);
}
