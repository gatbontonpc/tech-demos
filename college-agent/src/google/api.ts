import type { FoundHit, SlotId } from "../types";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailList {
  messages?: { id: string }[];
}

interface GmailMessage {
  id: string;
  payload?: { headers?: GmailHeader[] };
}

interface DriveList {
  files?: { id: string; name: string; modifiedTime?: string }[];
}

interface PickerSession {
  id: string;
  pickerUri?: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
}

interface PickedMedia {
  id: string;
  createTime?: string;
  mediaFile?: { filename?: string; mimeType?: string };
}

const GMAIL_QUERIES: { slot: SlotId; q: string }[] = [
  {
    slot: "transcript",
    q: "newer_than:5y (transcript OR \"grade report\" OR \"academic record\" OR \"progress report\")",
  },
  {
    slot: "fall-grades",
    q: "newer_than:1y (\"progress report\" OR \"quarter grades\" OR \"fall grades\" OR \"senior grades\")",
  },
  {
    slot: "scores",
    q: "newer_than:5y (SAT OR ACT OR \"score report\" OR \"AP score\" OR CollegeBoard OR \"Advanced Placement\")",
  },
  {
    slot: "activities",
    q: "newer_than:5y (robotics OR volunteer OR internship OR \"honor society\" OR \"activity list\" OR captain)",
  },
  {
    slot: "awards",
    q: "newer_than:5y (award OR scholarship OR \"national merit\" OR finalist OR \"honor roll\" OR medalist)",
  },
  {
    slot: "essays",
    q: "newer_than:3y (essay OR \"personal statement\" OR \"common app\" OR supplement)",
  },
];

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  const snippet = text.replace(/\s+/g, " ").slice(0, 180);
  return `${response.status}${snippet ? ` · ${snippet}` : ""}`;
}

export async function fetchGmailAddress(token: string): Promise<string | undefined> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: authHeaders(token),
  });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { emailAddress?: string };
  return body.emailAddress;
}

export async function searchGmail(token: string): Promise<FoundHit[]> {
  const hits: FoundHit[] = [];
  for (const query of GMAIL_QUERIES) {
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("q", query.q);
    listUrl.searchParams.set("maxResults", "5");
    const listResponse = await fetch(listUrl, { headers: authHeaders(token) });
    if (!listResponse.ok) {
      throw new Error(`Gmail search failed (${await readError(listResponse)}).`);
    }
    const list = (await listResponse.json()) as GmailList;
    for (const message of list.messages ?? []) {
      const metaUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`);
      metaUrl.searchParams.set("format", "metadata");
      metaUrl.searchParams.append("metadataHeaders", "Subject");
      metaUrl.searchParams.append("metadataHeaders", "From");
      metaUrl.searchParams.append("metadataHeaders", "Date");
      const metaResponse = await fetch(metaUrl, { headers: authHeaders(token) });
      if (!metaResponse.ok) continue;
      const meta = (await metaResponse.json()) as GmailMessage;
      const headers = Object.fromEntries((meta.payload?.headers ?? []).map((header) => [header.name, header.value]));
      hits.push({
        id: `gmail-${message.id}-${query.slot}`,
        slot: query.slot,
        source: "Gmail",
        title: headers.Subject || "(no subject)",
        when: headers.Date || "",
        from: headers.From,
      });
    }
  }
  return hits;
}

export async function searchDrive(token: string): Promise<FoundHit[]> {
  const clauses = [
    "name contains 'transcript'",
    "name contains 'grade'",
    "name contains 'SAT'",
    "name contains 'ACT'",
    "name contains 'essay'",
    "name contains 'personal statement'",
    "name contains 'activity'",
    "name contains 'award'",
    "fullText contains 'score report'",
  ];
  const q = `trashed = false and (${clauses.join(" or ")})`;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("fields", "files(id,name,modifiedTime)");
  url.searchParams.set("q", q);
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Drive search failed (${await readError(response)}).`);
  }
  const body = (await response.json()) as DriveList;
  return (body.files ?? []).map((file) => ({
    id: `drive-${file.id}`,
    slot: slotFromName(file.name),
    source: "Drive" as const,
    title: file.name,
    when: file.modifiedTime ? file.modifiedTime.slice(0, 10) : "",
  }));
}

function slotFromName(name: string): SlotId {
  const lower = name.toLowerCase();
  if (lower.includes("essay") || lower.includes("statement") || lower.includes("supplement")) return "essays";
  if (lower.includes("sat") || lower.includes("act") || lower.includes("score") || lower.includes(" ap")) return "scores";
  if (lower.includes("award") || lower.includes("honor") || lower.includes("scholarship")) return "awards";
  if (lower.includes("activity") || lower.includes("resume") || lower.includes("cv")) return "activities";
  if (lower.includes("progress") || lower.includes("quarter") || lower.includes("fall")) return "fall-grades";
  return "transcript";
}

function parseDuration(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const seconds = Number.parseFloat(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackMs;
  return seconds * 1000;
}

export async function createPickerSession(token: string): Promise<PickerSession> {
  const response = await fetch("https://photospicker.googleapis.com/v1/sessions", {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(`Photos Picker session create failed (${await readError(response)}).`);
  }
  return (await response.json()) as PickerSession;
}

export async function pollPickerSession(
  token: string,
  sessionId: string,
  polling: { pollInterval?: string; timeoutIn?: string } | undefined,
): Promise<PickerSession> {
  const interval = parseDuration(polling?.pollInterval, 3000);
  const timeout = parseDuration(polling?.timeoutIn, 5 * 60 * 1000);
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const response = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`Photos Picker poll failed (${await readError(response)}).`);
    }
    const session = (await response.json()) as PickerSession;
    if (session.mediaItemsSet) return session;
    await new Promise((resolve) => window.setTimeout(resolve, interval));
  }
  throw new Error("The Photos Picker session timed out before any photos were selected.");
}

export async function listPickedMedia(token: string, sessionId: string): Promise<FoundHit[]> {
  const hits: FoundHit[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://photospicker.googleapis.com/v1/mediaItems");
    url.searchParams.set("sessionId", sessionId);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: authHeaders(token) });
    if (!response.ok) {
      throw new Error(`Photos mediaItems.list failed (${await readError(response)}).`);
    }
    const body = (await response.json()) as { mediaItems?: PickedMedia[]; nextPageToken?: string };
    for (const item of body.mediaItems ?? []) {
      hits.push({
        id: `photo-${item.id}`,
        slot: "photos",
        source: "Google Photos",
        title: item.mediaFile?.filename || "Picked photo",
        when: item.createTime ? item.createTime.slice(0, 10) : "picked just now",
      });
    }
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return hits;
}
