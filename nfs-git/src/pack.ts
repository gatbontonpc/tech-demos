/** Tiny commit DAG + a pack strip that is *not* in DAG order. Most objects are deltas. */

export type ObjKind = "commit" | "tree" | "blob";

export interface PackObj {
  id: string;
  kind: ObjKind;
  label: string;
  /** Base object this is a delta against, if any. */
  deltaOf?: string;
  sha: string;
}

export interface CommitNode {
  id: string;
  parent: string | null;
  tree: string;
  msg: string;
  sha: string;
}

export interface Hop {
  i: number;
  phase: "idx" | "pack" | "delta" | "logical";
  target: string;
  note: string;
}

export const COMMITS: Record<string, CommitNode> = {
  c3: { id: "c3", parent: "c2", tree: "t3", msg: "refactor", sha: "c3f7d0" },
  c2: { id: "c2", parent: "c1", tree: "t2", msg: "parser", sha: "c2a718" },
  c1: { id: "c1", parent: null, tree: "t1", msg: "initial", sha: "c1aa42" },
};

export const BLOBS: Record<string, { id: string; deltaOf?: string; sha: string; label: string }> = {
  b3: { id: "b3", deltaOf: "b1", sha: "b3f7a9", label: "parser.ts@c3" },
  b2: { id: "b2", deltaOf: "b1", sha: "b2d431", label: "parser.ts@c2" },
  b1: { id: "b1", sha: "b180a5", label: "parser.ts@c1" },
};

export const TREES: Record<string, { id: string; blob: string; deltaOf?: string; sha: string }> = {
  t3: { id: "t3", blob: "b3", deltaOf: "t1", sha: "t3f021" },
  t2: { id: "t2", blob: "b2", deltaOf: "t1", sha: "t2e8c4" },
  t1: { id: "t1", blob: "b1", sha: "t1b908" },
};

/** Size-minimizing pack order — deliberately not DAG order. */
export const PACK_STRIP: PackObj[] = [
  { id: "readme", kind: "blob", label: "README", sha: "r0c430" },
  { id: "t1", kind: "tree", label: "tree t1", sha: "t1b908" },
  { id: "b3", kind: "blob", label: "parser@c3", deltaOf: "b1", sha: "b3f7a9" },
  { id: "c3", kind: "commit", label: "commit c3", deltaOf: "c1", sha: "c3f7d0" },
  { id: "t3", kind: "tree", label: "tree t3", deltaOf: "t1", sha: "t3f021" },
  { id: "b1", kind: "blob", label: "parser@c1", sha: "b180a5" },
  { id: "c1", kind: "commit", label: "commit c1", sha: "c1aa42" },
  { id: "t2", kind: "tree", label: "tree t2", deltaOf: "t1", sha: "t2e8c4" },
  { id: "c2", kind: "commit", label: "commit c2", deltaOf: "c1", sha: "c2a718" },
  { id: "b2", kind: "blob", label: "parser@c2", deltaOf: "b1", sha: "b2d431" },
];

export const LOCAL_HOP_MS = 0.05;

export function labelOf(id: string): string {
  const p = PACK_STRIP.find((o) => o.id === id);
  return p?.label ?? id;
}

function pushIdx(hops: Hop[], target: string): void {
  hops.push({
    i: hops.length,
    phase: "idx",
    target,
    note: `idx binary-search → ${labelOf(target)}`,
  });
}

function pushPack(hops: Hop[], target: string): void {
  const obj = PACK_STRIP.find((o) => o.id === target);
  hops.push({
    i: hops.length,
    phase: "pack",
    target,
    note: `pack read ${labelOf(target)} @ random offset`,
  });
  if (obj?.deltaOf) {
    hops.push({
      i: hops.length,
      phase: "delta",
      target: obj.deltaOf,
      note: `Δ chain ${labelOf(target)} ← ${labelOf(obj.deltaOf)}`,
    });
  }
}

/** `git log` from HEAD: you do not know the next SHA until this commit is unpacked. */
export function walkLog(): Hop[] {
  const hops: Hop[] = [];
  let id: string | null = "c3";
  while (id) {
    hops.push({
      i: hops.length,
      phase: "logical",
      target: id,
      note: `DAG hop HEAD… → ${id} (${COMMITS[id].msg})`,
    });
    pushIdx(hops, id);
    pushPack(hops, id);
    id = COMMITS[id].parent;
  }
  return hops;
}

/** `git show` a commit: commit + tree + blob, each with idx/pack/delta hops. */
export function walkShow(commitId = "c3"): Hop[] {
  const c = COMMITS[commitId];
  const hops: Hop[] = [];
  hops.push({
    i: 0,
    phase: "logical",
    target: commitId,
    note: `git show ${commitId} — commit → tree → blob`,
  });
  pushIdx(hops, commitId);
  pushPack(hops, commitId);

  hops.push({
    i: hops.length,
    phase: "logical",
    target: c.tree,
    note: `DAG hop ${commitId} → tree ${c.tree}`,
  });
  pushIdx(hops, c.tree);
  pushPack(hops, c.tree);

  const tree = TREES[c.tree];
  hops.push({
    i: hops.length,
    phase: "logical",
    target: tree.blob,
    note: `DAG hop ${c.tree} → ${BLOBS[tree.blob].label}`,
  });
  pushIdx(hops, tree.blob);
  pushPack(hops, tree.blob);
  return hops;
}

export function estimateMs(hops: number, rttMs: number): number {
  return hops * rttMs;
}
