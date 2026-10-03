import { useState } from "react";
import { Next } from "../components/Shell";
import {
  createPickerSession,
  fetchGmailAddress,
  listPickedMedia,
  pollPickerSession,
  searchDrive,
  searchGmail,
} from "../google/api";
import { hasGoogleClientId, requestGoogleScope, SCOPES } from "../google/oauth";
import { useAppState, useDispatch } from "../state/store";
import type { ConnectorId, SlotId } from "../types";

const CONNECTORS: {
  id: ConnectorId;
  title: string;
  scope: string;
  body: string;
  action: string;
}[] = [
  {
    id: "gmail",
    title: "Gmail",
    scope: "gmail.readonly",
    body: "Search subjects for transcripts, SAT, ACT, and AP score reports, activity and award mail, and essay drafts. Read-only. Nothing is sent, labeled, or deleted.",
    action: "Connect Gmail",
  },
  {
    id: "drive",
    title: "Drive",
    scope: "drive.readonly",
    body: "Search file names and text for the same records. Read-only. The search does not edit or share files.",
    action: "Connect Drive",
  },
  {
    id: "photos",
    title: "Google Photos",
    scope: "photospicker.mediaitems.readonly",
    body: "Activity and award photos only. The Picker API can read the photos you choose in the Google Photos tab. It cannot browse the library.",
    action: "Pick photos",
  },
];

export function Connect() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState<ConnectorId | null>(null);
  const configured = hasGoogleClientId();

  async function connect(id: ConnectorId) {
    setBusy(id);
    dispatch({ type: "connector-working", connector: id });
    try {
      if (id === "gmail") {
        const token = await requestGoogleScope(SCOPES.gmail);
        const [hits, email] = await Promise.all([searchGmail(token), fetchGmailAddress(token)]);
        dispatch({
          type: "connector-ready",
          connector: "gmail",
          hits,
          email,
          detail: email ? `Connected as ${email}. ${hits.length} matching messages.` : `${hits.length} matching messages.`,
        });
      } else if (id === "drive") {
        const token = await requestGoogleScope(SCOPES.drive);
        const hits = await searchDrive(token);
        dispatch({
          type: "connector-ready",
          connector: "drive",
          hits,
          detail: `${hits.length} matching files.`,
        });
      } else {
        const token = await requestGoogleScope(SCOPES.photos);
        const session = await createPickerSession(token);
        if (!session.pickerUri || !session.id) {
          throw new Error("Google did not return a picker URI.");
        }
        const pickerUrl = session.pickerUri.endsWith("/autoclose") ? session.pickerUri : `${session.pickerUri}/autoclose`;
        window.open(pickerUrl, "_blank", "noopener,noreferrer");
        const done = await pollPickerSession(token, session.id, session.pollingConfig);
        const hits = await listPickedMedia(token, done.id);
        dispatch({
          type: "connector-ready",
          connector: "photos",
          hits,
          detail: `${hits.length} photo${hits.length === 1 ? "" : "s"} picked. The rest of the library was not read.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google connection failed.";
      dispatch({ type: "connector-error", connector: id, message });
    } finally {
      setBusy(null);
    }
  }

  function onUpload(slot: SlotId, file: File | undefined) {
    if (!file) return;
    dispatch({ type: "upload", slot, fileName: file.name });
  }

  const ready = state.mode === "demo" || state.mode === "live";

  return (
    <section data-testid="connect-screen">
      <p className="eyebrow">Day one · connect the record</p>
      <h1>Connect Gmail, Drive, and Google Photos.</h1>
      <p className="lead">
        The agent reads what you already have, then shows you the claims. You correct them. There is no interview and no message box.
      </p>

      <div className="grid g3">
        {CONNECTORS.map((connector) => {
          const current = state.connectors[connector.id];
          return (
            <article key={connector.id} className="card connector">
              <div className="row">
                <h2>{connector.title}</h2>
                <StatusPill status={current.status} />
              </div>
              <p>{connector.body}</p>
              <p className="scope">{connector.scope}</p>
              <p className="detail">{current.detail}</p>
              {current.hits.length > 0 && (
                <ul className="hit-list">
                  {current.hits.slice(0, 4).map((hit) => (
                    <li key={hit.id}>
                      <span>{hit.title}</span>
                      <span className="muted">{hit.when}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn primary" type="button" disabled={busy !== null} onClick={() => void connect(connector.id)}>
                {busy === connector.id ? "Waiting on Google…" : connector.action}
              </button>
            </article>
          );
        })}
      </div>

      {!configured && (
        <p className="micro muted creds">
          This build has no <code>VITE_GOOGLE_CLIENT_ID</code>. The connect buttons run the real OAuth path and stop with an error. They will not sign you in.
        </p>
      )}
      {configured && (
        <p className="micro muted creds">
          A client ID is configured. Connecting opens Google’s own consent screen for that read-only scope. The first successful token is kept in memory only.
        </p>
      )}

      {state.oauthError && (
        <div className="callout danger" role="alert">
          <strong>Google was not connected.</strong> {state.oauthError}
        </div>
      )}

      <aside className="callout demo-callout">
        <p className="eyebrow">Demo mode · separate from Google</p>
        <h2>Load fictional fixtures</h2>
        <p>
          Avery Chen, a senior at Northline High, is invented. The transcript lines, scores, and school list are example data. Choosing this does not call Google and does not mark any account as connected.
        </p>
        <button className="btn" type="button" data-testid="load-demo" onClick={() => dispatch({ type: "load-demo" })}>
          Load fictional fixtures
        </button>
      </aside>

      {state.uploads.length > 0 && (
        <section className="uploads">
          <h2>Only the gaps</h2>
          <p className="muted">
            Upload slots open for categories the finished searches did not find. Files stay in this tab. They are not uploaded to a server.
          </p>
          <div className="grid g2">
            {state.uploads.map((slot) => (
              <label key={slot.id} className="card upload">
                <strong>{slot.label}</strong>
                <span>{slot.why}</span>
                <input
                  type="file"
                  onChange={(event) => onUpload(slot.id, event.target.files?.[0])}
                />
                {slot.fileName && <span className="file-name">Held locally: {slot.fileName}</span>}
              </label>
            ))}
          </div>
        </section>
      )}

      {ready && <Next href="#/dossier">Review the dossier</Next>}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "demo"
      ? "Fixture"
      : status === "ready"
        ? "Connected"
        : status === "working"
          ? "Working"
          : status === "error"
            ? "Not connected"
            : "Not connected";
  return <span className={`pill status-${status}`}>{label}</span>;
}
