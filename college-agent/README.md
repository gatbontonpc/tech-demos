# Waypoint — admissions agent

A clickable prototype of a college-admissions agent. The family connects the record they already have, corrects a day-one dossier, answers the three questions that would move the school list, and reads a Sunday memo. There is no chat box.

The visual system is Waypoint: paper `#F7F6F2`, deep teal `#1F4E5F`, burnt orange `#B5541C`, Okabe-Ito tier colors, serif headings, sans UI, mono source tags.

Avery Chen of Northline High is fictional. Every school, score, and dollar figure in the fixtures is invented. Do not put a real transcript in this repo.

## Run

From this folder:

```bash
cd college-agent
npm install
npm run dev
```

From the repo root, the same commands delegate here:

```bash
npm install
npm run dev
```

Vite serves the app at <http://localhost:5173>. The first screen is **Connect Gmail, Drive, and Google Photos**.

Open [`explainer.html`](explainer.html) directly in a browser. It has no build step. With the dev server running it is also at <http://localhost:5173/explainer.html>.

## Demo mode and real Google

If `VITE_GOOGLE_CLIENT_ID` is empty, use **Load fictional fixtures**. That path is labeled demo mode in a banner on every later screen. It does not call Google and it does not mark an account as connected.

The Connect buttons always call the real OAuth code. Without a client ID they stop with an error: “This did not connect a Google account.” They never fall through into the fixtures.

## OAuth setup

1. In Google Cloud Console, create an **OAuth client ID** of type **Web application**.
2. Authorized JavaScript origin: `http://localhost:5173`
3. Authorized redirect URI: `http://localhost:5173`
4. Enable the **Gmail API**, the **Google Drive API**, and the **Google Photos Picker API** on that project.
5. Copy `college-agent/.env.example` to `college-agent/.env` and set:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

6. Restart `npm run dev`. Vite only reads `VITE_` variables at startup.

There is no client secret. The browser uses the [Google Identity Services token client](https://developers.google.com/identity/oauth2/web/guides/use-token-model). The access token is kept in memory for the tab and is not written to `localStorage` or to disk.

Scopes, requested one connector at a time:

| Connector | Scope | What the app does with it |
| --- | --- | --- |
| Gmail | `https://www.googleapis.com/auth/gmail.readonly` | `users.messages.list` for transcript, score, activity, award, essay, and fall-grade queries, then `messages.get?format=metadata` for Subject, From, and Date. `users.getProfile` is used only to show the address. |
| Drive | `https://www.googleapis.com/auth/drive.readonly` | `files.list` on file name and `fullText` for the same kinds of documents. |
| Photos | `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` | Picker session only. The library is not listed. |

## Google Photos Picker API

Photos are not searched. The app can read only the items someone picks.

1. **Create a session.** `POST https://photospicker.googleapis.com/v1/sessions` with the picker scope. The response includes `id`, `pickerUri`, `pollingConfig` (`pollInterval`, `timeoutIn`), and `mediaItemsSet`.
2. **Send the picker URI.** The app opens `pickerUri` in a new tab and appends `/autoclose` so the tab closes when the person finishes. The URI cannot be iframed. The Google account in that browser tab has to be the account that owns the session.
3. **Poll.** `GET https://photospicker.googleapis.com/v1/sessions/{id}` on `pollInterval` until `mediaItemsSet` is true, or until `timeoutIn` elapses. A timeout leaves the connector in an error state. It does not invent photos.
4. **List media items.** `GET https://photospicker.googleapis.com/v1/mediaItems?sessionId={id}`, following `nextPageToken`. The prototype keeps filename and create time. It does not download bytes.

The picked photos count as activity and award evidence. If the session returns nothing, the photo upload slot stays open.

## Upload slots

Slots render only for categories a finished search did not find. In the demo that is award photos and the senior fall grade report. A chosen file stays in the tab. Nothing is posted to a server. Ignored paths, if you ever keep local extracts: `college-agent/.data/`, `*.local.json`, and `.env`.

## What is real, and what is stubbed

**Real**

- Google Identity Services token flow, read-only scopes, incremental per connector.
- Gmail search and metadata fetch.
- Drive file search.
- Photos Picker session create, poll, and `mediaItems.list`.
- Confirm, fix, skip, and the three decision buttons. Skipping widens ranges and lowers list confidence. Approve can add Tidewater or move Ridgeview. Nothing is submitted.

**Stubbed or fixture**

- Demo mode: Avery Chen and every school, score, and dollar amount.
- Claim extraction. The live path matches subjects and file names. It does not parse a PDF, an essay, or a score report. Live claims say that, at low confidence.
- The weekly agent. The fourteen jobs, the two memo drafts, and the three past Sundays are fixtures. There is no scheduler and no email send.
- College data. Zone placement, net-price bands, graduation, and earnings are example numbers, tagged as such. There is no College Scorecard request.
- Ask counselor updates the optional roster. It does not message a person.

## Screens

Sources, dossier, three questions, portfolio (zone balance before school cards), Sunday memo (student and parent, plus earlier weeks), and an optional counselor roster. Link the roster from the header. It is not on the family’s critical path.

## Privacy

Do not commit transcripts, exports, `.env`, or files under `.data/`. Load a real mailbox only at runtime, in the browser, against your own OAuth client.
