import { NEW_OID, PACK_OLD, REF } from "./fs";
import { walkLog, walkShow } from "./pack";
import { runToy } from "./toys";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const negL = runToy("neg", "local").world;
const negN = runToy("neg", "nfs").world;
assert(negL.b.readPath(REF).data?.trim() === NEW_OID, "local B must see new OID");
assert(negN.b.readPath(REF).err === "ENOENT", "NFS B must still ENOENT");
assert(negL.outcome?.ok === true, "local neg outcome");
assert(negN.outcome?.ok === false, "nfs neg outcome");

const oxL = runToy("oexcl", "local").world;
const oxN = runToy("oexcl", "nfs").world;
assert(oxL.filer.locks.length === 1, "local one lock");
assert(oxL.c.lastErr === "EEXIST", "local C EEXIST");
assert(oxL.a.banners.length === 1 && oxL.c.banners.length === 0, "local one banner");
assert(oxN.filer.locks.length === 2, "NFS two lock claims");
assert(oxN.a.banners.length === 1 && oxN.c.banners.length === 1, "NFS two banners");

const emL = runToy("empty", "local").world;
const emN = runToy("empty", "nfs").world;
assert(emL.b.readPath(REF).data?.trim() === NEW_OID, "local empty-ref is complete");
assert((emN.b.readPath(REF).data ?? "").trim() === "", "NFS ref is empty");
assert(emN.filer.lookup(REF), "NFS name exists");

const esL = runToy("estale", "local").world;
const esN = runToy("estale", "nfs").world;
const fdL = [...esL.b.handles.keys()][0];
const fdN = [...esN.b.handles.keys()][0];
assert(esL.b.read(fdL).data, "local same-inode read");
assert(esN.b.read(fdN).err === "ESTALE", "NFS ESTALE");
assert(!esN.filer.lookup(PACK_OLD), "old pack name gone");

const logH = walkLog();
const showH = walkShow();
assert(logH.length >= 6, "log has DAG × pack hops");
assert(showH.length > logH.length, "show walks tree+blob too");
assert(logH.some((h) => h.phase === "delta"), "pack has delta hops");
assert(runToy("pack", "local").hops?.length === runToy("pack", "nfs").hops?.length, "same hop count");

console.log("verify: five toys match Local-correct / NFS-bug");
