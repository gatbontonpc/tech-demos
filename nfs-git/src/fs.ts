/** In-process fake filesystem. Local is one kernel; NFS is two caches + a filer. */

export type Mode = "local" | "nfs";
export type Actor = "A" | "B" | "C" | "filer";

export interface Inode {
  id: number;
  data: string;
  committed: string;
  mtime: number;
  nlink: number;
  generation: number;
  deleted: boolean;
}

export interface LockClaim {
  path: string;
  inodeId: number;
  owner: string;
}

export interface Handle {
  inodeId: number;
  generation: number;
  path: string;
}

export interface CacheRec {
  kind: "neg" | "pos";
  inodeId?: number;
  size?: number;
  preview?: string;
}

export interface TraceEvent {
  seq: number;
  actor: Actor;
  verb: string;
  detail: string;
  tone?: "ok" | "bad" | "warn" | "mute";
}

export interface FileRow {
  path: string;
  inodeId: number;
  size: number;
  preview: string;
  tag?: string;
  heldBy: string[];
}

export class Filer {
  inodes = new Map<number, Inode>();
  names = new Map<string, number>();
  locks: LockClaim[] = [];
  nextId = 1;
  clock = 0;

  tick(): number {
    this.clock += 1;
    return this.clock;
  }

  lookup(path: string): Inode | undefined {
    const id = this.names.get(path);
    if (id == null) return undefined;
    return this.inodes.get(id);
  }

  create(path: string, owner?: string): Inode {
    const ino: Inode = {
      id: this.nextId++,
      data: "",
      committed: "",
      mtime: this.tick(),
      nlink: 1,
      generation: 1,
      deleted: false,
    };
    this.inodes.set(ino.id, ino);
    this.names.set(path, ino.id);
    if (owner) this.locks.push({ path, inodeId: ino.id, owner });
    return ino;
  }

  /** NFS racy exclusive-create: always mint an inode. Extra claims share the name. */
  createRacy(path: string, owner: string): Inode {
    const ino: Inode = {
      id: this.nextId++,
      data: "",
      committed: "",
      mtime: this.tick(),
      nlink: 1,
      generation: 1,
      deleted: false,
    };
    this.inodes.set(ino.id, ino);
    if (!this.names.has(path)) this.names.set(path, ino.id);
    this.locks.push({ path, inodeId: ino.id, owner });
    return ino;
  }

  rename(from: string, to: string): void {
    const id = this.names.get(from);
    if (id == null) throw new Error("ENOENT");
    this.names.delete(from);
    const old = this.names.get(to);
    if (old != null) {
      const oldIno = this.inodes.get(old);
      if (oldIno) oldIno.nlink -= 1;
    }
    this.names.set(to, id);
    const ino = this.inodes.get(id);
    if (ino) ino.mtime = this.tick();
  }

  unlink(path: string): void {
    const id = this.names.get(path);
    if (id == null) throw new Error("ENOENT");
    this.names.delete(path);
    const ino = this.inodes.get(id);
    if (!ino) return;
    ino.nlink -= 1;
    if (ino.nlink <= 0) ino.deleted = true;
  }

  seed(path: string, contents: string): Inode {
    const ino = this.create(path);
    ino.data = contents;
    ino.committed = contents;
    return ino;
  }
}

export class Client {
  handles = new Map<number, Handle>();
  cache = new Map<string, CacheRec>();
  nextFd = 3;
  banners: string[] = [];
  lastErr: string | null = null;

  constructor(
    public name: Actor,
    public mode: Mode,
    public filer: Filer,
  ) {}

  private adopt(ino: Inode, path: string): number {
    const fd = this.nextFd++;
    this.handles.set(fd, { inodeId: ino.id, generation: ino.generation, path });
    return fd;
  }

  visible(ino: Inode): string {
    return this.mode === "local" ? ino.data || ino.committed : ino.committed;
  }

  lookup(path: string): {
    err?: string;
    inode?: Inode;
    fromCache?: boolean;
    preview?: string;
  } {
    if (this.mode === "nfs") {
      const cached = this.cache.get(path);
      if (cached?.kind === "neg") {
        this.lastErr = "ENOENT";
        return { err: "ENOENT", fromCache: true };
      }
      if (cached?.kind === "pos") {
        const ino = cached.inodeId != null ? this.filer.inodes.get(cached.inodeId) : undefined;
        return { inode: ino, fromCache: true, preview: cached.preview };
      }
    }

    const ino = this.filer.lookup(path);
    if (!ino) {
      if (this.mode === "nfs") this.cache.set(path, { kind: "neg" });
      this.lastErr = "ENOENT";
      return { err: "ENOENT" };
    }
    const preview = this.visible(ino);
    if (this.mode === "nfs") {
      this.cache.set(path, {
        kind: "pos",
        inodeId: ino.id,
        size: preview.length,
        preview,
      });
    }
    this.lastErr = null;
    return { inode: ino, preview };
  }

  createExcl(path: string): { err?: string; fd?: number; inodeId?: number; racy?: boolean } {
    if (this.mode === "local") {
      if (this.filer.lookup(path)) {
        this.lastErr = "EEXIST";
        return { err: "EEXIST" };
      }
      const ino = this.filer.create(path, this.name);
      this.cache.set(path, { kind: "pos", inodeId: ino.id, size: 0, preview: "" });
      this.lastErr = null;
      return { fd: this.adopt(ino, path), inodeId: ino.id };
    }

    const cached = this.cache.get(path);
    if (cached?.kind === "pos") {
      this.lastErr = "EEXIST";
      return { err: "EEXIST" };
    }
    const ino = this.filer.createRacy(path, this.name);
    this.cache.set(path, { kind: "pos", inodeId: ino.id, size: 0, preview: "" });
    const claims = this.filer.locks.filter((l) => l.path === path).length;
    this.lastErr = null;
    return { fd: this.adopt(ino, path), inodeId: ino.id, racy: claims > 1 };
  }

  open(path: string): { err?: string; fd?: number; inodeId?: number } {
    const ino = this.filer.lookup(path);
    if (!ino) {
      if (this.mode === "nfs") this.cache.set(path, { kind: "neg" });
      this.lastErr = "ENOENT";
      return { err: "ENOENT" };
    }
    if (this.mode === "nfs") {
      this.cache.set(path, {
        kind: "pos",
        inodeId: ino.id,
        size: ino.committed.length,
        preview: ino.committed,
      });
    }
    this.lastErr = null;
    return { fd: this.adopt(ino, path), inodeId: ino.id };
  }

  write(fd: number, data: string): { err?: string } {
    const h = this.handles.get(fd);
    if (!h) return { err: "EBADF" };
    const ino = this.filer.inodes.get(h.inodeId);
    if (!ino || ino.generation !== h.generation) return { err: "ESTALE" };
    ino.data = data;
    ino.mtime = this.filer.tick();
    return {};
  }

  fsync(fd: number): { err?: string } {
    const h = this.handles.get(fd);
    if (!h) return { err: "EBADF" };
    const ino = this.filer.inodes.get(h.inodeId);
    if (!ino) return { err: "ESTALE" };
    ino.committed = ino.data;
    return {};
  }

  close(fd: number, opts?: { commit?: boolean }): { err?: string } {
    const h = this.handles.get(fd);
    if (!h) return { err: "EBADF" };
    const ino = this.filer.inodes.get(h.inodeId);
    if (ino) {
      if (this.mode === "local" || opts?.commit) ino.committed = ino.data;
    }
    this.handles.delete(fd);
    return {};
  }

  rename(from: string, to: string): { err?: string } {
    try {
      this.filer.rename(from, to);
    } catch {
      this.lastErr = "ENOENT";
      return { err: "ENOENT" };
    }
    if (this.mode === "nfs") {
      this.cache.delete(from);
      const ino = this.filer.lookup(to);
      if (ino) {
        this.cache.set(to, {
          kind: "pos",
          inodeId: ino.id,
          size: ino.committed.length,
          preview: ino.committed,
        });
      }
    }
    return {};
  }

  unlink(path: string): { err?: string } {
    try {
      this.filer.unlink(path);
    } catch {
      return { err: "ENOENT" };
    }
    this.cache.delete(path);
    return {};
  }

  read(fd: number): { err?: string; data?: string } {
    const h = this.handles.get(fd);
    if (!h) return { err: "EBADF" };
    const ino = this.filer.inodes.get(h.inodeId);
    if (!ino || ino.generation !== h.generation) {
      this.lastErr = "ESTALE";
      return { err: "ESTALE" };
    }
    if (this.mode === "nfs" && (ino.deleted || ino.nlink <= 0)) {
      this.lastErr = "ESTALE";
      return { err: "ESTALE" };
    }
    return { data: this.visible(ino) };
  }

  readPath(path: string): { err?: string; data?: string; fromCache?: boolean } {
    const r = this.lookup(path);
    if (r.err) return { err: r.err, fromCache: r.fromCache };
    return { data: r.preview ?? (r.inode ? this.visible(r.inode) : ""), fromCache: r.fromCache };
  }
}

export interface Outcome {
  ok: boolean;
  title: string;
  body: string;
}

export class World {
  filer = new Filer();
  a: Client;
  b: Client;
  c: Client;
  events: TraceEvent[] = [];
  outcome: Outcome | null = null;
  seq = 0;

  constructor(public mode: Mode) {
    this.a = new Client("A", mode, this.filer);
    this.b = new Client("B", mode, this.filer);
    this.c = new Client("C", mode, this.filer);
  }

  client(actor: "A" | "B" | "C"): Client {
    if (actor === "A") return this.a;
    if (actor === "B") return this.b;
    return this.c;
  }

  log(actor: Actor, verb: string, detail: string, tone?: TraceEvent["tone"]): void {
    this.seq += 1;
    this.events.push({ seq: this.seq, actor, verb, detail, tone });
  }

  files(): FileRow[] {
    const held = new Map<number, string[]>();
    for (const cli of [this.a, this.b, this.c]) {
      for (const h of cli.handles.values()) {
        const list = held.get(h.inodeId) ?? [];
        list.push(cli.name);
        held.set(h.inodeId, list);
      }
    }

    const rows: FileRow[] = [];
    const seen = new Set<number>();
    for (const [path, id] of [...this.filer.names.entries()].sort(([x], [y]) => x.localeCompare(y))) {
      const ino = this.filer.inodes.get(id);
      if (!ino) continue;
      seen.add(id);
      const durable = this.mode === "local" ? ino.data || ino.committed : ino.committed;
      const racy = this.filer.locks.filter((l) => l.path === path && l.inodeId !== id);
      rows.push({
        path,
        inodeId: id,
        size: durable.length,
        preview: previewOf(durable),
        tag: durable.length === 0 && this.filer.locks.every((l) => l.path !== path) ? "empty" : undefined,
        heldBy: held.get(id) ?? [],
      });
      for (const extra of racy) {
        const extraIno = this.filer.inodes.get(extra.inodeId);
        if (!extraIno) continue;
        seen.add(extra.inodeId);
        rows.push({
          path,
          inodeId: extra.inodeId,
          size: extraIno.committed.length,
          preview: previewOf(extraIno.committed),
          tag: `racy O_EXCL · ${extra.owner}`,
          heldBy: held.get(extra.inodeId) ?? [],
        });
      }
    }
    return rows;
  }

  caches(actor: "A" | "B" | "C"): { path: string; kind: string; detail: string }[] {
    const out: { path: string; kind: string; detail: string }[] = [];
    for (const [path, rec] of this.client(actor).cache) {
      out.push({
        path,
        kind: rec.kind === "neg" ? "neg-dentry" : "attr",
        detail: rec.kind === "neg" ? "ENOENT" : (rec.preview || `${rec.size ?? 0}b · inode ${rec.inodeId}`),
      });
    }
    return out;
  }
}

function previewOf(s: string): string {
  if (!s) return "∅";
  const one = s.replace(/\n/g, " ");
  return one.length > 42 ? `${one.slice(0, 40)}…` : one;
}

export const NEW_OID = "b0bca7e51de4a11ce00d9e8f7c3142aa81f0c2d1";
export const OLD_OID = "a11ce00d9e8f0142b70e8c487ab19b4d5c277b22";
export const PACK_OLD = "pack-aaa.pack";
export const PACK_NEW = "pack-bbb.pack";
export const REF = "refs/heads/main";
export const LOCK = "refs/heads/main.lock";
export const TMP = "refs/heads/main.lock";
export const PACK_BYTES =
  "PACK\\0  ofs=0x1a4  obj=c3  Δ←c1  [pack-aaa inode]";
export const PACK_BYTES_NEW =
  "PACK\\0  ofs=0x00c  obj=c3  whole  [pack-bbb inode]";
