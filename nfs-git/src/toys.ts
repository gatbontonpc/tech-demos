import {
  LOCK,
  NEW_OID,
  PACK_BYTES,
  PACK_BYTES_NEW,
  PACK_NEW,
  PACK_OLD,
  REF,
  World,
  type Mode,
  type Outcome,
} from "./fs";
import { walkLog, walkShow, type Hop } from "./pack";

export type ToyId = "neg" | "oexcl" | "empty" | "estale" | "pack";

export interface ToyDef {
  id: ToyId;
  n: string;
  title: string;
  blurb: string;
  success: string;
}

export const TOYS: ToyDef[] = [
  {
    id: "neg",
    n: "01",
    title: "Negative cache",
    blurb:
      "A publishes a ref via rename. B still sees ENOENT (or a stale OID) because the NFS negative-dentry / attribute cache has not dropped.",
    success: "Local B reads the new OID (close-to-open). NFS B prints ENOENT after A already returned success.",
  },
  {
    id: "oexcl",
    n: "02",
    title: "O_EXCL race",
    blurb:
      "Two writers both create refs/heads/main.lock via exclusive create. Git uses O_CREAT|O_EXCL, not flock.",
    success: "Local: one wins, the other EEXIST. NFS: two lock inodes and two “I own the lock” banners.",
  },
  {
    id: "empty",
    n: "03",
    title: "Empty ref",
    blurb:
      "Rename without fsync / NFS COMMIT. The name exists; the file is zero bytes. git reads an empty ref.",
    success: "Local fsync+rename is a complete object. NFS: main is present and empty — Git would refuse to parse it.",
  },
  {
    id: "estale",
    n: "04",
    title: "ESTALE",
    blurb:
      "B holds an open fileid to a pack. A gc/replaces that pack (unlink + new inode). B’s next read is ESTALE.",
    success: "Local: same-inode read after unlink is consistent. NFS: B’s handle dies with ESTALE while the name points at a new inode.",
  },
  {
    id: "pack",
    n: "05",
    title: "Pack-walk latency",
    blurb:
      "A tiny commit DAG + a pack strip that is not in DAG order. Most objects are deltas. git log = DAG hops × pack/delta hops × RTT.",
    success: "Same hop count on both sides. Local stays ~0.05 ms/probe. NFS multiplies every probe by the slider. That crawl is why GitHub discarded NFS.",
  },
];

export function toyById(id: ToyId): ToyDef {
  return TOYS.find((t) => t.id === id)!;
}

export interface ToyResult {
  world: World;
  hops?: Hop[];
}

export function runToy(id: ToyId, mode: Mode, packKind: "log" | "show" = "log"): ToyResult {
  const world = new World(mode);
  switch (id) {
    case "neg":
      runNegative(world);
      break;
    case "oexcl":
      runOexcl(world);
      break;
    case "empty":
      runEmpty(world);
      break;
    case "estale":
      runEstale(world);
      break;
    case "pack":
      return runPack(world, packKind);
  }
  return { world };
}

function runNegative(w: World): void {
  w.log("B", "lookup", `${REF}  (prime the cache)`, "mute");
  const primed = w.b.lookup(REF);
  w.log(
    "B",
    "ENOENT",
    primed.fromCache ? "cached miss" : "name does not exist — NFS stores a negative dentry",
    "warn",
  );

  w.log("A", "open", `${LOCK}  O_CREAT|O_EXCL`);
  const created = w.a.createExcl(LOCK);
  if (created.err || created.fd == null) {
    w.log("A", created.err ?? "fail", "could not create lock", "bad");
    return;
  }
  w.log("A", "write", `new OID ${NEW_OID.slice(0, 12)}…`);
  w.a.write(created.fd, `${NEW_OID}\n`);
  w.log("A", "close", w.mode === "local" ? "unified page cache publishes" : "COMMIT + close (A’s view is fresh)");
  w.a.close(created.fd, { commit: true });
  w.log("A", "rename", `${LOCK} → ${REF}   same-dir publish`, "ok");
  w.a.rename(LOCK, REF);
  w.log("A", "ok", "push returned success", "ok");

  const seen = w.b.readPath(REF);
  if (seen.err) {
    w.log("B", "lookup", `${REF} → ${seen.err}${seen.fromCache ? "  (negative cache)" : ""}`, "bad");
  } else {
    w.log(
      "B",
      "read",
      `${REF} → ${(seen.data ?? "").trim().slice(0, 12)}…${seen.fromCache ? "  (attr cache)" : ""}`,
      w.mode === "local" ? "ok" : "warn",
    );
  }

  w.outcome = outcomeNegative(w.mode, seen);
}

function outcomeNegative(mode: Mode, seen: { err?: string; data?: string }): Outcome {
  if (mode === "local") {
    const oid = (seen.data ?? "").trim();
    return {
      ok: !seen.err && oid.startsWith(NEW_OID.slice(0, 8)),
      title: "B sees the new OID",
      body: "One page cache. After A close()+rename, B’s next lookup is close-to-open consistent.",
    };
  }
  return {
    ok: false,
    title: seen.err === "ENOENT" ? "B still has ENOENT" : "B still has a stale OID",
    body: "A already returned success. B’s negative dentry / attr cache has not dropped. NFS pretended to be a disk.",
  };
}

function runOexcl(w: World): void {
  w.log("A", "open", `${LOCK}  O_CREAT|O_EXCL`);
  const a = w.a.createExcl(LOCK);
  if (a.err) w.log("A", a.err, "create failed", "bad");
  else {
    w.a.banners.push("I own the lock");
    w.log("A", "got lock", `inode ${a.inodeId}  ·  “I own the lock”`, "ok");
  }

  w.log("C", "open", `${LOCK}  O_CREAT|O_EXCL  (same tick)`);
  const c = w.c.createExcl(LOCK);
  if (c.err) w.log("C", c.err, "second exclusive-create refused — one writer", "ok");
  else {
    w.c.banners.push("I own the lock");
    w.log("C", "got lock", `inode ${c.inodeId}  ·  “I own the lock”`, "bad");
  }

  const claims = w.filer.locks.filter((l) => l.path === LOCK);
  w.log("filer", "locks", `${claims.length} claim(s) on ${LOCK}`, claims.length > 1 ? "bad" : "ok");

  w.outcome = outcomeOexcl(w.mode, claims.length, Boolean(c.err));
}

function outcomeOexcl(mode: Mode, claims: number, cLost: boolean): Outcome {
  if (mode === "local") {
    return {
      ok: cLost && claims === 1,
      title: "One lock, one winner",
      body: "O_EXCL is atomic in one inode cache. C gets EEXIST. Git’s lockfile API is exclusive create, not flock.",
    };
  }
  return {
    ok: false,
    title: "Two writers think they won",
    body: "NFS exclusive-create is racy (and was missing before NFSv3/Linux 2.6). Two lock inodes. Last rename wins; the ref can tear.",
  };
}

function runEmpty(w: World): void {
  w.log("A", "open", `${LOCK}  O_CREAT|O_EXCL`);
  const created = w.a.createExcl(LOCK);
  if (created.fd == null) return;
  w.log("A", "write", `OID ${NEW_OID.slice(0, 12)}…  (dirty buffer)`);
  w.a.write(created.fd, `${NEW_OID}\n`);

  if (w.mode === "local") {
    w.log("A", "fsync", "data blocks hit the journal before the name", "ok");
    w.a.fsync(created.fd);
    w.log("A", "close", "then same-dir rename");
    w.a.close(created.fd);
  } else {
    w.log("A", "close", "no fsync · no NFS COMMIT — dirty bytes stay in writeback", "warn");
    w.a.close(created.fd, { commit: false });
  }

  w.log("A", "rename", `${LOCK} → ${REF}`);
  w.a.rename(LOCK, REF);

  const seen = w.b.readPath(REF);
  const bytes = seen.data ?? "";
  if (seen.err) {
    w.log("B", "read", `${REF} → ${seen.err}`, "bad");
  } else if (bytes.trim().length === 0) {
    w.log("B", "read", `${REF} exists, 0 bytes  ·  fatal: empty ref`, "bad");
  } else {
    w.log("B", "read", `${REF} → ${bytes.trim().slice(0, 12)}…  (${bytes.trim().length} hex chars)`, "ok");
  }

  w.outcome = outcomeEmpty(w.mode, bytes);
}

function outcomeEmpty(mode: Mode, bytes: string): Outcome {
  if (mode === "local") {
    return {
      ok: bytes.trim() === NEW_OID,
      title: "Complete object",
      body: "fsync then rename. The crash mode Git did not want is mixed OIDs; the crash mode it got on a sloppy disk is an empty file. Local hardened the write.",
    };
  }
  return {
    ok: false,
    title: "Name exists. File is 0 bytes.",
    body: "ext4 delayed allocation and NFS without COMMIT can publish the dirent before the data. GitLab hit empty loose refs after a hard reset.",
  };
}

function runEstale(w: World): void {
  w.filer.seed(PACK_OLD, PACK_BYTES);
  w.log("filer", "seed", `${PACK_OLD}  inode holds a pack`, "mute");

  const opened = w.b.open(PACK_OLD);
  w.log("B", "open", `${PACK_OLD}  fd=${opened.fd}  fileid=inode ${opened.inodeId}`, "ok");

  w.log("A", "gc", `unlink ${PACK_OLD} + create ${PACK_NEW}  (new inode)`);
  w.a.unlink(PACK_OLD);
  const neu = w.a.createExcl(PACK_NEW);
  if (neu.fd != null) {
    w.a.write(neu.fd, PACK_BYTES_NEW);
    w.a.close(neu.fd, { commit: true });
  }
  w.log("filer", "replace", `name ${PACK_NEW} is a new inode; old fileid is gone`, "warn");

  const read = opened.fd != null ? w.b.read(opened.fd) : { err: "EBADF" };
  if (read.err) {
    w.log("B", "read", `fd=${opened.fd} → ${read.err}`, "bad");
  } else {
    w.log("B", "read", `same inode still readable  ·  ${String(read.data).slice(0, 28)}…`, "ok");
  }

  w.outcome = outcomeEstale(w.mode, read.err, read.data);
}

function outcomeEstale(mode: Mode, err?: string, data?: string): Outcome {
  if (mode === "local") {
    return {
      ok: !err && Boolean(data),
      title: "Same inode, consistent bytes",
      body: "Unlink of an open file keeps the inode until the last close. B finishes the object. A fresh open of the new pack is also consistent.",
    };
  }
  return {
    ok: false,
    title: "ESTALE",
    body: "B’s fileid pointed at the old inode. gc unlinked it. The next read returns ESTALE (git-lfs #5676 is this class of failure on a shared NFS store).",
  };
}

function runPack(w: World, kind: "log" | "show"): ToyResult {
  const hops = kind === "show" ? walkShow("c3") : walkLog();
  w.log("A", kind === "show" ? "git show" : "git log", `HEAD=c3  ·  ${hops.length} sequential probes`, "mute");
  for (const hop of hops) {
    w.log("A", hop.phase, hop.note, hop.phase === "logical" ? "ok" : hop.phase === "delta" ? "warn" : "mute");
  }
  w.outcome =
    w.mode === "local"
      ? {
          ok: true,
          title: "Page cache hides the random walk",
          body: `${hops.length} hops × 0.05 ms ≈ ${(hops.length * 0.05).toFixed(2)} ms. A laptop is fine. You cannot cache every pack for every repo on a filer.`,
        }
      : {
          ok: false,
          title: "Every probe is an RTT",
          body: "You cannot prefetch the next SHA. DAG order is not pack order. Most objects are deltas. GitHub discarded NFS because this crawl is the whole product.",
        };
  return { world: w, hops };
}
