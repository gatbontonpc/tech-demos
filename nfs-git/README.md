# NFS vs local Git — teaching playground

Interactive demo of why Git-on-NFS fails. Five toys, side-by-side **Local POSIX-ish** vs **NFS-ish**, backed by a fake in-process filesystem (no real NFS mount, no Git binary, no cloud spend).

Git’s one-liner is **exclusive-create + same-dir rename + close-to-open**. NFS pretends to be that disk and is not.

## Run

```bash
cd nfs-git
npm install
npm run dev
```

Binds **http://localhost:5173** (`strictPort`, all interfaces).

Keys `1`–`5` fire the toys. The RTT slider (0.05 ms local-ish → 20 ms NFS) multiplies every pack/idx/delta probe on the NFS column.

## Five toys

1. **Negative cache** — A publishes `refs/heads/main` via rename. Local B sees the new OID (close-to-open). NFS B still has ENOENT from a negative dentry.
2. **O_EXCL race** — A and C both `O_CREAT|O_EXCL` `main.lock`. Local: one winner, `EEXIST`. NFS: two lock inodes and two “I own the lock” banners. Git uses exclusive *create*, not `flock`.
3. **Empty ref** — rename without fsync / NFS COMMIT. Local fsync+rename is a complete object. NFS: the name exists, the file is 0 bytes.
4. **ESTALE** — B holds a fileid to a pack. A gc unlinks it and writes a new inode. Local: same-inode read stays consistent. NFS: next read is `ESTALE`.
5. **Pack-walk latency** — tiny commit DAG + a pack strip *not* in DAG order (most objects are deltas). `git log` / `git show` = DAG hops × pack/delta hops × RTT. Same hop count; NFS crawls.

These match the lesson board at [pure-zenith-32dr.here.now](https://pure-zenith-32dr.here.now/) — not a sixth toy.

## Source

[Cursor, *Git at any scale*](https://cursor.com/blog/git-at-any-scale)

Postgres is the other famous example (WAL + fsync). Same class of lie; not demoed here.

Teaching simulation only.
