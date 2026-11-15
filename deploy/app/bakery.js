// The bakery's data and rules. Plain node:sqlite; every write is one short synchronous transaction,
// so two people racing for the last loaf are always decided one after the other.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const SHELF = [
  { id: 'sourdough', name: 'Sourdough', tier: 'rare', start: 3,
    description: 'Two days of patience in every loaf. Blistered crust, a little tang. I only make a few.' },
  { id: 'rye', name: 'Seeded rye', tier: 'medium', start: 8,
    description: 'Dark, dense and thick with seeds. Lovely with butter and not much else.' },
  { id: 'brioche', name: 'Butter brioche', tier: 'plentiful', start: 40,
    description: 'Soft, buttery, still warm at 7. There is plenty to go round.' },
];

export const NAME_MAX = 30;
export const RATE_LIMIT = 10;
export const RATE_WINDOW_MS = 60_000;

export function openBakery(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;');
  migrate(db);
  return makeBakery(db);
}

function migrate(db) {
  const v = db.prepare('PRAGMA user_version').get().user_version;
  if (v < 1) {
    db.exec(`
      BEGIN;
      CREATE TABLE loaves (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, tier TEXT NOT NULL, description TEXT NOT NULL, sort INTEGER NOT NULL,
        start INTEGER NOT NULL,          -- the stock this drop started with
        next_start INTEGER NOT NULL,     -- what the next Restock will put back (set on the admin page)
        remaining INTEGER NOT NULL CHECK (remaining >= 0)
      );
      CREATE TABLE reservations (
        id TEXT PRIMARY KEY,
        loaf_id TEXT NOT NULL REFERENCES loaves(id),
        first_name TEXT NOT NULL,
        device TEXT NOT NULL,            -- random id from the cookie; no account, nothing else
        drop_no INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('reserved','delivered','released')),
        created_at INTEGER NOT NULL
      );
      -- One of each loaf per device per drop. A released reservation frees the place again.
      CREATE UNIQUE INDEX one_per_device_per_drop ON reservations (device, loaf_id, drop_no) WHERE status <> 'released';
      CREATE INDEX reservations_status ON reservations (status, created_at);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      INSERT INTO settings VALUES ('drop', 1), ('hold_minutes', 15);
      COMMIT;
    `);
    const ins = db.prepare('INSERT INTO loaves VALUES (?,?,?,?,?,?,?,?)');
    SHELF.forEach((l, i) => ins.run(l.id, l.name, l.tier, l.description, i, l.start, l.start, l.start));
    db.exec('PRAGMA user_version = 1');
  }
}

export function loafWord(name) { return name.toLowerCase(); }

export function messageFor(r, loafName) {
  const loaf = loafWord(loafName);
  if (r.status === 'delivered') return `Delivered: your ${loaf} is here`;
  if (r.status === 'released') return `Your ${loaf} has gone back on the shelf, ${r.first_name}. You can try again at the next bake.`;
  return `Your ${loaf} is reserved, ${r.first_name}. It'll be with you before the end of this talk.`;
}

function makeBakery(db) {
  const q = {
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    setSetting: db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
    loaves: db.prepare('SELECT * FROM loaves ORDER BY sort'),
    loaf: db.prepare('SELECT * FROM loaves WHERE id = ?'),
    existing: db.prepare("SELECT 1 FROM reservations WHERE device = ? AND loaf_id = ? AND drop_no = ? AND status <> 'released'"),
    take: db.prepare('UPDATE loaves SET remaining = remaining - 1 WHERE id = ? AND remaining > 0'),
    insert: db.prepare('INSERT INTO reservations (id, loaf_id, first_name, device, drop_no, status, created_at) VALUES (?,?,?,?,?,?,?)'),
    byId: db.prepare('SELECT r.*, l.name AS loaf_name FROM reservations r JOIN loaves l ON l.id = r.loaf_id WHERE r.id = ?'),
    orders: db.prepare('SELECT id, first_name, loaf_id, created_at, status FROM reservations ORDER BY created_at DESC, rowid DESC'),
    expired: db.prepare("SELECT id, loaf_id, drop_no FROM reservations WHERE status = 'reserved' AND created_at + ? <= ?"),
    release: db.prepare("UPDATE reservations SET status = 'released' WHERE id = ? AND status = 'reserved'"),
    giveBack: db.prepare('UPDATE loaves SET remaining = remaining + 1 WHERE id = ?'),
    deliver: db.prepare("UPDATE reservations SET status = 'delivered' WHERE status = 'reserved' RETURNING id"),
    allIds: db.prepare('SELECT id FROM reservations'),
  };

  const setting = (k) => q.getSetting.get(k).value;
  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const out = fn(); db.exec('COMMIT'); return out; }
    catch (e) { try { db.exec('ROLLBACK'); } catch { /* already rolled back */ } throw e; }
  }

  const label = (left) => (left === 0 ? 'Sold out for today' : `${left} left`);
  const stockRows = () => q.loaves.all().map((l) => ({ id: l.id, name: l.name, start: l.start, left: l.remaining, sold_out: l.remaining === 0 }));

  // Rate limit: attempts per device in the last minute, kept in memory (a restart forgives everyone, which is fine).
  const attempts = new Map();
  function allowAttempt(device, now = Date.now()) {
    const recent = (attempts.get(device) || []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) { attempts.set(device, recent); return false; }
    recent.push(now); attempts.set(device, recent);
    return true;
  }
  function tidyAttempts(now = Date.now()) {
    for (const [d, ts] of attempts) if (!ts.some((t) => now - t < RATE_WINDOW_MS)) attempts.delete(d);
  }

  return {
    db,
    close: () => db.close(),
    drop: () => setting('drop'),
    holdMinutes: () => setting('hold_minutes'),
    allowAttempt, tidyAttempts,

    /** Release every reservation whose hold has run out at `now`. Returns the ids released. */
    sweep(now) {
      const holdMs = setting('hold_minutes') * 60_000;
      const due = q.expired.all(holdMs, now);
      if (!due.length) return [];
      const drop = setting('drop');
      return tx(() => {
        const done = [];
        for (const r of due) {
          if (q.release.run(r.id).changes === 1) {
            if (r.drop_no === drop) q.giveBack.run(r.loaf_id); // an old drop's loaf is not on this shelf any more
            done.push(r.id);
          }
        }
        return done;
      });
    },

    loaves() {
      return {
        drop: setting('drop'),
        loaves: q.loaves.all().map((l) => ({
          id: l.id, name: l.name, tier: l.tier, description: l.description,
          start: l.start, left: l.remaining, sold_out: l.remaining === 0, label: label(l.remaining),
        })),
      };
    },

    reserve(device, loafId, firstName, now) {
      return tx(() => {
        const loaf = q.loaf.get(loafId);
        const drop = setting('drop');
        if (q.existing.get(device, loafId, drop)) return { error: 'already_reserved', loaf };
        if (q.take.run(loafId).changes === 0) return { error: 'sold_out', loaf };
        const id = crypto.randomBytes(9).toString('base64url');
        q.insert.run(id, loafId, firstName, device, drop, 'reserved', now);
        const r = { id, loaf_id: loafId, first_name: firstName, status: 'reserved', drop };
        return { ok: true, reservation: { ...r, message: messageFor(r, loaf.name) }, loaf };
      });
    },

    loafExists: (id) => !!q.loaf.get(id),

    reservation(id) {
      const r = q.byId.get(id);
      return r ? { id: r.id, loaf_id: r.loaf_id, first_name: r.first_name, status: r.status, message: messageFor(r, r.loaf_name) } : null;
    },

    orders() {
      return q.orders.all().map((o) => ({ id: o.id, first_name: o.first_name, loaf_id: o.loaf_id, at: new Date(o.created_at).toISOString(), status: o.status }));
    },

    stock: stockRows,

    /** Delivers every reserved order. Expired holds were released by the sweep just before, so they are skipped. */
    deliver() { return tx(() => q.deliver.all().map((r) => r.id)); },

    restock() {
      return tx(() => {
        db.exec('UPDATE loaves SET start = next_start, remaining = next_start');
        q.setSetting.run('drop', setting('drop') + 1);
        return { drop: setting('drop'), loaves: stockRows() };
      });
    },

    settings() {
      const stock = {};
      for (const l of q.loaves.all()) stock[l.id] = l.next_start;
      return { hold_minutes: setting('hold_minutes'), stock };
    },

    /** Returns null when applied, or a message when the input is not acceptable. Nothing is applied on a bad input. */
    updateSettings(body) {
      if (!body || typeof body !== 'object' || Array.isArray(body)) return 'body must be an object';
      for (const k of Object.keys(body)) if (k !== 'hold_minutes' && k !== 'stock') return `unknown field ${k}`;
      const whole = (v, lo, hi) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
      if ('hold_minutes' in body && !whole(body.hold_minutes, 1, 240)) return 'hold_minutes must be a whole number from 1 to 240';
      if ('stock' in body) {
        const s = body.stock;
        if (!s || typeof s !== 'object' || Array.isArray(s)) return 'stock must be an object';
        for (const [id, n] of Object.entries(s)) {
          if (!q.loaf.get(id)) return `unknown item ${id}`;
          if (!whole(n, 0, 500)) return 'each stock value must be a whole number from 0 to 500';
        }
      }
      tx(() => {
        if ('hold_minutes' in body) q.setSetting.run('hold_minutes', body.hold_minutes);
        if ('stock' in body) for (const [id, n] of Object.entries(body.stock)) db.prepare('UPDATE loaves SET next_start = ? WHERE id = ?').run(n, id);
      });
      return null;
    },

    /** Clears every order, restocks with the saved starting stock, back to drop 1, and forgives the rate limit. Returns the ids cleared. */
    reset() {
      const ids = q.allIds.all().map((r) => r.id);
      tx(() => {
        db.exec('DELETE FROM reservations; UPDATE loaves SET start = next_start, remaining = next_start');
        q.setSetting.run('drop', 1);
      });
      attempts.clear();
      return ids;
    },
  };
}
