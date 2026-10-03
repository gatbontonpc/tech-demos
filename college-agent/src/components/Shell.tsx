import type { ReactNode } from "react";
import { JOBS, STUDENT } from "../fixtures";
import { useAppState } from "../state/store";
import { Wordmark } from "./Wordmark";

const LINKS = [
  ["connect", "Sources"],
  ["dossier", "Dossier"],
  ["questions", "Questions"],
  ["portfolio", "Portfolio"],
  ["memo", "Sunday memo"],
] as const;

export function Shell({ screen, children }: { screen: string; children: ReactNode }) {
  const state = useAppState();
  const openDecisions = Math.max(0, 2 - Object.keys(state.decisions).length);

  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <a className="brand" href="#/connect" aria-label="Waypoint home">
            <Wordmark />
          </a>
          <nav>
            {LINKS.map(([id, label]) => (
              <a key={id} href={`#/${id}`} className={screen === id ? "on" : ""}>
                {label}
              </a>
            ))}
          </nav>
          <a className="roster-link" href="#/roster">
            Counselor roster <span>optional</span>
          </a>
        </div>
      </header>
      {state.mode === "demo" && (
        <div className="demo-banner" role="status">
          <strong>Demo mode.</strong> Avery Chen is fictional. Gmail, Drive, and Google Photos are not connected. Fixtures are labeled and are not a Google login.
        </div>
      )}
      {state.mode === "live" && (
        <div className="live-banner" role="status">
          <strong>Live Google session.</strong> Read-only scopes. The token stays in this tab’s memory and is not written to disk.
        </div>
      )}
      {state.mode !== "unset" && (
        <div className="agent-status">
          <div className="wrap agent-row">
            <span className="pulse" aria-hidden="true" />
            <span>
              Saturday 6:12am · {JOBS.length} jobs finished · {openDecisions} decision{openDecisions === 1 ? "" : "s"} waiting
            </span>
            <a href="#/memo">Open the memo</a>
            <span className="muted">{state.mode === "demo" ? STUDENT.name : "Your sources"}</span>
          </div>
        </div>
      )}
      <main className="wrap page" data-screen={screen}>
        {children}
      </main>
      <footer>
        <div className="wrap">
          Waypoint does not submit applications. School names, odds bands, and dollar figures in this prototype are fictional example data.
          <a href="/explainer.html"> Why the pieces work</a>
        </div>
      </footer>
    </>
  );
}

export function Next({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="next-row">
      <a className="btn primary" href={href}>
        {children}
      </a>
    </div>
  );
}
