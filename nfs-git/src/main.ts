import "./style.css";
import { LOCAL_HOP_MS, PACK_STRIP, estimateMs, type Hop } from "./pack";
import { TOYS, runToy, toyById, type ToyId } from "./toys";
import type { Mode, TraceEvent, World } from "./fs";

const RTT_MIN = 0.05;
const RTT_MAX = 20;

interface AppState {
  toy: ToyId;
  rtt: number;
  packKind: "log" | "show";
  playing: boolean;
}

const state: AppState = {
  toy: "neg",
  rtt: 2.5,
  packKind: "log",
  playing: false,
};

const app = document.querySelector<HTMLDivElement>("#app")!;
let playGen = 0;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hopDelayMs(): number {
  const t = (state.rtt - RTT_MIN) / (RTT_MAX - RTT_MIN);
  return 55 + t * 280;
}

app.innerHTML = `
  <header class="mast">
    <div>
      <p class="kicker">Teaching playground · five toys</p>
      <h1>Git assumes a local disk.<br />NFS pretends to be one.</h1>
      <p class="one-liner">
        Git’s one-liner is <strong>exclusive-create + same-dir rename + close-to-open</strong>.
        NFS is a pretender: two client caches, a filer, and a COMMIT that is a real disk sync plus an RTT.
      </p>
      <p class="cite">
        Source: <a href="https://cursor.com/blog/git-at-any-scale" target="_blank" rel="noreferrer">Cursor, <cite>Git at any scale</cite></a>
        — NFS was “slow, and it was buggy,” and discarded first.
      </p>
    </div>
    <div class="protocol" aria-label="Git lockfile protocol">
      <span><b>1</b> O_CREAT|O_EXCL <i>.lock</i></span>
      <span><b>2</b> write OID</span>
      <span><b>3</b> close</span>
      <span><b>4</b> rename → dest</span>
      <span>not flock · readers never lock</span>
    </div>
  </header>

  <p class="note">
    <em>Fake in-process filesystem only.</em>
    Two clients share a dict. Local is one kernel / one page cache.
    NFS-ish is per-client negative dentries + attribute cache, racy exclusive-create, rename-without-COMMIT, and ESTALE fileids.
    No real NFS mount, no Git binary, no cloud spend.
  </p>

  <div class="controls">
    <div class="toys" id="toys"></div>
    <div class="rtt">
      <label>
        <span>one-way RTT</span>
        <output id="rtt-out">${state.rtt.toFixed(2)} ms</output>
      </label>
      <input id="rtt" type="range" min="${RTT_MIN}" max="${RTT_MAX}" step="0.05" value="${state.rtt}" />
      <div class="ticks"><span>0.05 local-ish</span><span>20 ms NFS</span></div>
    </div>
  </div>

  <div class="blurb">
    <p id="blurb"></p>
    <div class="actions">
      <button class="cmd primary" id="fire" type="button">Fire toy</button>
      <button class="cmd" id="show" type="button">git show</button>
      <button class="cmd" id="log" type="button">git log</button>
      <button class="cmd" id="reset" type="button">Reset</button>
    </div>
  </div>

  <div class="columns">
    <section class="col local" id="col-local"></section>
    <section class="col nfs" id="col-nfs"></section>
  </div>

  <footer class="foot">
    <p class="disclaimer">
      Teaching simulation. Not a real NFS mount or Git binary. Outcomes are produced by the in-process
      Local vs NFS-ish clients above — they are not canned slides.
    </p>
    <p>
      Postgres is the other famous example (WAL + fsync / COMMIT), same class of lie, different process.
      Not demoed here.
    </p>
    <p>
      <a href="https://cursor.com/blog/git-at-any-scale">cursor.com/blog/git-at-any-scale</a>
      · lesson board these five toys match:
      <a href="https://pure-zenith-32dr.here.now/">pure-zenith-32dr.here.now</a>
    </p>
  </footer>
`;

const toysEl = app.querySelector("#toys")!;
toysEl.innerHTML = TOYS.map(
  (t) => `
    <button type="button" class="toy" data-toy="${t.id}">
      <span class="n">${t.n}</span>
      <span class="t">${esc(t.title)}</span>
    </button>
  `,
).join("");

function setBlurb(): void {
  const t = toyById(state.toy);
  app.querySelector("#blurb")!.innerHTML = `<strong>${t.title}.</strong> ${esc(t.blurb)} ${esc(t.success)}`;
  const pack = state.toy === "pack";
  (app.querySelector("#show") as HTMLButtonElement).hidden = !pack;
  (app.querySelector("#log") as HTMLButtonElement).hidden = !pack;
}

function paintToyButtons(): void {
  toysEl.querySelectorAll<HTMLButtonElement>(".toy").forEach((b) => {
    b.classList.toggle("on", b.dataset.toy === state.toy);
  });
}

function emptyColumn(mode: Mode, note: string): string {
  const title = mode === "local" ? "Local POSIX-ish" : "NFS-ish";
  const sub = mode === "local" ? "one kernel · one page cache" : "two caches · one filer";
  return `
    <div class="col-head">
      <h2>${title}</h2>
      <span class="sub">${sub}</span>
    </div>
    <p class="why" style="padding:14px">${esc(note)}</p>
  `;
}

function renderColumn(
  mode: Mode,
  world: World | null,
  opts: { hops?: Hop[]; hopAt?: number; revealed?: number },
): void {
  const el = app.querySelector(mode === "local" ? "#col-local" : "#col-nfs")!;
  if (!world) {
    el.innerHTML = emptyColumn(
      mode,
      "Fire a toy. Both columns run the same Git-shaped operations against different fake disks.",
    );
    return;
  }

  const title = mode === "local" ? "Local POSIX-ish" : "NFS-ish";
  const sub =
    mode === "local"
      ? `close-to-open · 0.05 ms / probe`
      : `attr + neg-dentry · ${state.rtt.toFixed(2)} ms / probe`;

  const events = world.events.slice(0, opts.revealed ?? world.events.length);
  const outcome = (opts.revealed ?? 0) >= world.events.length ? world.outcome : null;
  const owners = [...world.a.banners, ...world.c.banners];

  const files = world
    .files()
    .map(
      (f) => `
      <div class="file">
        <span class="path">${esc(f.path)}</span>
        <span class="ino">ino ${f.inodeId}${f.heldBy.length ? ` · held ${f.heldBy.join(",")}` : ""}</span>
        <span class="sz ${f.size === 0 ? "empty" : ""}">${f.size}b  ${esc(f.preview)}</span>
        ${f.tag ? `<span class="tag">${esc(f.tag)}</span>` : ""}
      </div>`,
    )
    .join("");

  const clientBlock = (who: "A" | "B" | "C") => {
    const caches = world.caches(who);
    const handles = [...world.client(who).handles.entries()];
    if (!caches.length && !handles.length && !world.client(who).banners.length) return "";
    return `
      <div class="client-row">
        <div class="who">${who}</div>
        <div class="cache">
          ${caches.map((c) => `<div class="${c.kind === "neg-dentry" ? "neg" : ""}">${esc(c.kind)} ${esc(c.path)} → ${esc(c.detail)}</div>`).join("")}
          ${handles.map(([fd, h]) => `<div>fd ${fd} → ino ${h.inodeId} ${esc(h.path)}</div>`).join("")}
        </div>
      </div>`;
  };

  let packHtml = "";
  if (state.toy === "pack" && opts.hops) {
    const hops = opts.hops;
    const at = opts.hopAt ?? -1;
    const current = at >= 0 ? hops[at] : undefined;
    const hopCount = at >= 0 ? at + 1 : 0;
    const per = mode === "local" ? LOCAL_HOP_MS : state.rtt;
    const ms = estimateMs(hopCount, per);
    const dagIds = ["c3", "c2", "c1"];
    packHtml = `
      <div class="pack-ui">
        <h3>Logical DAG · then pack / Δ</h3>
        <div class="dag">
          ${dagIds
            .map((id, i) => {
              const on = current?.target === id;
              return `<div class="node ${on ? "on" : ""}">${id}<small>${id === "c3" ? "HEAD · refactor" : id === "c2" ? "parser" : "initial"}</small></div>${i < 2 ? `<span class="arrow">←</span>` : ""}`;
            })
            .join("")}
        </div>
        <div class="strip">
          ${PACK_STRIP.map((o) => {
            const on = current?.target === o.id;
            return `<div class="cell ${on ? "on" : ""} ${o.deltaOf ? "delta" : ""}"><span class="k">${o.kind}${o.deltaOf ? " Δ" : ""}</span>${esc(o.label)}</div>`;
          }).join("")}
        </div>
        <div class="score">
          <div><span>hops so far</span><b>${hopCount}</b></div>
          <div><span>estimated</span><b>${ms.toFixed(2)} ms</b></div>
          <div><span>per probe</span><b>${per} ms</b></div>
        </div>
        <p class="why">${
          mode === "local"
            ? "Warm page cache. The random walk is still there; it just costs ~0.05 ms."
            : "NFS pays an RTT per idx probe, pack read, and delta hop. You cannot prefetch the next SHA. GitHub discarded NFS because this crawl is every Git operation."
        }</p>
      </div>`;
  }

  el.innerHTML = `
    <div class="col-head">
      <h2>${title}</h2>
      <span class="sub">${sub}</span>
    </div>
    ${
      outcome
        ? `<div class="banner ${outcome.ok ? "ok" : "bad"}"><strong>${esc(outcome.title)}</strong>${esc(outcome.body)}</div>`
        : ""
    }
    ${
      owners.length
        ? `<div class="lock-banners">${owners
            .map((b, i) => `<div class="own ${mode === "local" ? "ok" : ""}">${esc(i === 0 ? "A" : "C")}: ${esc(b)}</div>`)
            .join("")}</div>`
        : ""
    }
    ${packHtml}
    <div class="files">
      <h3>Filer · ${mode === "local" ? "unified cache" : "durable bytes"}</h3>
      ${files || `<div class="cache">∅</div>`}
    </div>
    <div class="clients">
      <h3>Client caches / handles</h3>
      ${clientBlock("A")}${clientBlock("B")}${clientBlock("C") || ""}
    </div>
    <div class="log">
      <h3>Trace</h3>
      ${events
        .map(
          (e: TraceEvent) =>
            `<div class="ev ${e.tone ?? ""}"><span class="who">${e.actor}</span><span class="verb">${esc(e.verb)}</span><span class="detail">${esc(e.detail)}</span></div>`,
        )
        .join("")}
    </div>
  `;
}

async function play(id: ToyId): Promise<void> {
  const gen = ++playGen;
  state.playing = true;
  const local = runToy(id, "local", state.packKind);
  const nfs = runToy(id, "nfs", state.packKind);
  const hops = nfs.hops ?? local.hops;
  const max = Math.max(local.world.events.length, nfs.world.events.length);
  const delay = id === "pack" ? hopDelayMs() : 140;

  for (let i = 1; i <= max; i++) {
    if (gen !== playGen) return;
    renderColumn("local", local.world, { hops, hopAt: hopIndex(local.world, i, hops), revealed: i });
    renderColumn("nfs", nfs.world, { hops, hopAt: hopIndex(nfs.world, i, hops), revealed: i });
    await sleep(delay);
  }
  if (gen !== playGen) return;
  renderColumn("local", local.world, { hops, hopAt: (hops?.length ?? 1) - 1, revealed: max });
  renderColumn("nfs", nfs.world, { hops, hopAt: (hops?.length ?? 1) - 1, revealed: max });
  state.playing = false;
}

function hopIndex(world: World, revealed: number, hops?: Hop[]): number {
  if (!hops) return -1;
  const ev = world.events[revealed - 1];
  if (!ev) return Math.min(revealed - 1, hops.length - 1);
  const idx = hops.findIndex((h, i) => i < revealed && h.note === ev.detail);
  if (idx >= 0) return idx;
  return Math.min(revealed - 1, hops.length - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fire(): void {
  void play(state.toy);
}

function reset(): void {
  playGen += 1;
  state.playing = false;
  renderColumn("local", null, {});
  renderColumn("nfs", null, {});
}

toysEl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-toy]");
  if (!btn?.dataset.toy) return;
  state.toy = btn.dataset.toy as ToyId;
  paintToyButtons();
  setBlurb();
  fire();
});

app.querySelector("#fire")!.addEventListener("click", fire);
app.querySelector("#reset")!.addEventListener("click", reset);
app.querySelector("#show")!.addEventListener("click", () => {
  state.packKind = "show";
  state.toy = "pack";
  paintToyButtons();
  setBlurb();
  fire();
});
app.querySelector("#log")!.addEventListener("click", () => {
  state.packKind = "log";
  state.toy = "pack";
  paintToyButtons();
  setBlurb();
  fire();
});

const rtt = app.querySelector<HTMLInputElement>("#rtt")!;
const rttOut = app.querySelector<HTMLOutputElement>("#rtt-out")!;
rtt.addEventListener("input", () => {
  state.rtt = Number(rtt.value);
  rttOut.textContent = `${state.rtt.toFixed(2)} ms`;
});

window.addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= 5) {
    state.toy = TOYS[n - 1].id;
    paintToyButtons();
    setBlurb();
    fire();
  }
});

paintToyButtons();
setBlurb();
reset();
