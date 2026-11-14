'use strict';
// Bakery pre-order server. No dependencies: Node 18+ only.
// Orders are stored in data/orders.json. Menu and hours live in menu.json / config.json.

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const STATUSES = ['placed', 'ready', 'collected', 'cancelled'];

// ---------- config & menu (re-read on each request so edits apply without restart) ----------

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}
function loadConfig() { return readJson('config.json'); }
function loadMenu() { return readJson('menu.json'); }

// ---------- time helpers (all in the bakery's timezone) ----------

function nowInTz(tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function fromMinutes(min) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }

function hoursFor(config, dateStr) {
  if ((config.closedDates || []).includes(dateStr)) return null;
  return config.hours[weekdayOf(dateStr)] || null;
}

function slotsFor(config, dateStr) {
  const hours = hoursFor(config, dateStr);
  if (!hours) return [];
  const step = config.slotMinutes || 30;
  const slots = [];
  for (let t = toMinutes(hours[0]); t + step <= toMinutes(hours[1]); t += step) slots.push(fromMinutes(t));
  return slots;
}

// Orders for day D must be placed before the cutoff time on day D-1. No same-day orders.
function pickupDates(config) {
  const now = nowInTz(config.timezone);
  const dates = [];
  for (let i = 1; i <= (config.daysAhead || 14); i++) {
    const date = addDays(now.date, i);
    if (i === 1 && now.time >= config.orderCutoff) continue;
    if (slotsFor(config, date).length) dates.push(date);
  }
  return dates;
}

function itemAvailableOn(item, dateStr) {
  return !item.days || item.days.includes(weekdayOf(dateStr));
}

// ---------- order storage ----------

let orders = [];
let writeChain = Promise.resolve();

function loadOrders() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    orders = [];
  }
}

function saveOrders() {
  const snapshot = JSON.stringify(orders, null, 2);
  writeChain = writeChain.then(async () => {
    const tmp = `${ORDERS_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, snapshot);
    await fsp.rename(tmp, ORDERS_FILE);
  });
  return writeChain;
}

function soldCounts(dateStr) {
  const counts = {};
  for (const o of orders) {
    if (o.pickupDate !== dateStr || o.status === 'cancelled') continue;
    for (const line of o.items) counts[line.id] = (counts[line.id] || 0) + line.qty;
  }
  return counts;
}

function newOrderCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(crypto.randomBytes(5), (b) => alphabet[b % alphabet.length]).join('');
  } while (orders.some((o) => o.code === code));
  return code;
}

function publicOrder(o) {
  const { token, ...rest } = o;
  return rest;
}

// ---------- HTTP helpers ----------

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Request too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isAdmin(req) {
  if (!ADMIN_PASSWORD) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const password = decoded.slice(decoded.indexOf(':') + 1);
  return safeEqual(password, ADMIN_PASSWORD);
}

// Simple in-memory rate limit for order placement: 10 orders per IP per hour.
const recentOrders = new Map();
function rateLimited(ip) {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const list = (recentOrders.get(ip) || []).filter((t) => t > cutoff);
  recentOrders.set(ip, list);
  if (list.length >= 10) return true;
  list.push(Date.now());
  return false;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

async function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  if (pathname === '/order') pathname = '/order.html';
  const file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, 'Not found');
  try {
    const data = await fsp.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    send(res, 404, 'Not found');
  }
}

// ---------- API ----------

function menuForDate(config, menu, date) {
  const sold = date ? soldCounts(date) : {};
  return menu.map((item) => {
    const available = date ? itemAvailableOn(item, date) : true;
    const remaining = item.maxPerDay == null ? null : Math.max(0, item.maxPerDay - (sold[item.id] || 0));
    return { ...item, available, remaining };
  });
}

function validateOrder(body, config, menu) {
  const errors = [];
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email);
  const notes = str(body.notes);
  const { pickupDate, pickupTime } = body;

  if (!name || name.length > 80) errors.push('Please enter your name.');
  if (!/^[0-9+()\-.\s]{7,20}$/.test(phone)) errors.push('Please enter a valid phone number.');
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push('That email address doesn’t look right.');
  if (notes.length > 500) errors.push('Notes must be 500 characters or fewer.');

  if (!pickupDates(config).includes(pickupDate)) errors.push('That pickup day is no longer available. Please choose another.');
  else if (!slotsFor(config, pickupDate).includes(pickupTime)) errors.push('Please choose a pickup time.');

  if (!Array.isArray(body.items) || body.items.length === 0) errors.push('Your order is empty.');
  const lines = [];
  if (Array.isArray(body.items) && errors.length === 0) {
    const sold = soldCounts(pickupDate);
    const seen = new Set();
    let totalQty = 0;
    for (const raw of body.items) {
      const item = menu.find((m) => m.id === raw?.id);
      const qty = raw?.qty;
      if (!item || seen.has(item.id) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
        errors.push('Your order contains an invalid item.');
        break;
      }
      seen.add(item.id);
      totalQty += qty;
      if (!itemAvailableOn(item, pickupDate)) { errors.push(`${item.name} isn’t baked on that day.`); continue; }
      if (item.maxPerDay != null) {
        const left = item.maxPerDay - (sold[item.id] || 0);
        if (qty > left) {
          errors.push(left > 0 ? `Only ${left} ${item.name} left for that day.` : `${item.name} is sold out for that day.`);
          continue;
        }
      }
      lines.push({ id: item.id, name: item.name, price: item.price, qty });
    }
    if (totalQty > 100) errors.push('For orders over 100 items, please call us.');
  }

  return { errors, order: { name, phone, email, notes, pickupDate, pickupTime, items: lines } };
}

async function handleApi(req, res, url) {
  const config = loadConfig();
  const menu = loadMenu();
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/shop') {
    const dates = pickupDates(config);
    const slots = Object.fromEntries(dates.map((d) => [d, slotsFor(config, d)]));
    const { bakeryName, tagline, address, phone, currency, orderCutoff, hours } = config;
    return send(res, 200, { bakeryName, tagline, address, phone, currency, orderCutoff, hours, dates, slots });
  }

  if (req.method === 'GET' && pathname === '/api/menu') {
    const date = url.searchParams.get('date');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return send(res, 400, { error: 'Bad date' });
    return send(res, 200, { items: menuForDate(config, menu, date) });
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return send(res, 429, { errors: ['Too many orders from this device. Please call us instead.'] });
    const body = await readBody(req);
    const { errors, order } = validateOrder(body, config, menu);
    if (errors.length) return send(res, 422, { errors });

    const record = {
      code: newOrderCode(),
      token: crypto.randomBytes(16).toString('hex'),
      ...order,
      total: order.items.reduce((s, l) => s + l.price * l.qty, 0),
      status: 'placed',
      createdAt: new Date().toISOString(),
    };
    orders.push(record);
    await saveOrders();
    return send(res, 201, { code: record.code, token: record.token });
  }

  let m = pathname.match(/^\/api\/orders\/([A-Z0-9]+)$/);
  if (req.method === 'GET' && m) {
    const order = orders.find((o) => o.code === m[1]);
    const token = url.searchParams.get('t') || '';
    if (!order || !safeEqual(token, order.token)) return send(res, 404, { error: 'Order not found' });
    return send(res, 200, { order: publicOrder(order), shop: { bakeryName: config.bakeryName, address: config.address, phone: config.phone } });
  }

  // ----- admin -----
  if (pathname.startsWith('/api/admin/')) {
    if (!ADMIN_PASSWORD) return send(res, 503, { error: 'Admin is disabled. Set the ADMIN_PASSWORD environment variable and restart.' });
    if (!isAdmin(req)) return send(res, 401, { error: 'Wrong password' });

    if (req.method === 'GET' && pathname === '/api/admin/orders') {
      const date = url.searchParams.get('date') || nowInTz(config.timezone).date;
      const list = orders.filter((o) => o.pickupDate === date)
        .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime) || a.createdAt.localeCompare(b.createdAt))
        .map(publicOrder);
      const upcoming = {};
      for (const o of orders) {
        if (o.status === 'cancelled' || o.pickupDate < nowInTz(config.timezone).date) continue;
        upcoming[o.pickupDate] = (upcoming[o.pickupDate] || 0) + 1;
      }
      return send(res, 200, { date, today: nowInTz(config.timezone).date, orders: list, upcoming, menu });
    }

    m = pathname.match(/^\/api\/admin\/orders\/([A-Z0-9]+)$/);
    if (req.method === 'PATCH' && m) {
      const order = orders.find((o) => o.code === m[1]);
      if (!order) return send(res, 404, { error: 'Order not found' });
      const body = await readBody(req);
      if (!STATUSES.includes(body.status)) return send(res, 400, { error: 'Bad status' });
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      await saveOrders();
      return send(res, 200, { order: publicOrder(order) });
    }
  }

  return send(res, 404, { error: 'Not found' });
}

// ---------- server ----------

loadOrders();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return await serveStatic(req, res, url.pathname);
  } catch (err) {
    if (err.status) return send(res, err.status, { errors: [err.message] });
    console.error(err);
    return send(res, 500, { errors: ['Something went wrong. Please try again or call us.'] });
  }
});

server.listen(PORT, () => {
  console.log(`Bakery ordering site running at http://localhost:${PORT}`);
  console.log(ADMIN_PASSWORD
    ? `Admin dashboard: http://localhost:${PORT}/admin`
    : 'Admin dashboard is DISABLED — set ADMIN_PASSWORD to enable it.');
});
