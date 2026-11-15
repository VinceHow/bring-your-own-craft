// Acceptance: the baker's login never shows or stores the passphrase (Vincent's P0, 15 Nov). Over HTTP only, like
// bakery.acceptance.js, against BASE_URL with ADMIN_TOKEN. Builder 6 wrote this beside builder 1's suite.
//   BASE_URL=… ADMIN_TOKEN=… node --test deploy/acceptance/admin-login.acceptance.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL;
const TOKEN = process.env.ADMIN_TOKEN;
const need = t => { if (!BASE) return t.skip('BASE_URL is not set'); if (!TOKEN) return t.skip('ADMIN_TOKEN is not set'); return false; };
const get = (p, headers = {}) => fetch(BASE + p, { redirect: 'manual', headers });
const login = (pass, headers = {}) => fetch(BASE + '/admin/login', {
  method: 'POST', redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
  body: new URLSearchParams({ passphrase: pass }).toString(),
});
const cookieOf = r => (r.headers.getSetCookie?.() || [r.headers.get('set-cookie') || '']).find(c => /^admin=/.test(c)) || '';

test('the login page: a password field, autocomplete current-password, posting to /admin/login, 401', async t => {
  if (need(t)) return;
  const r = await get('/admin');
  assert.equal(r.status, 401);
  const html = await r.text();
  assert.match(html, /<form[^>]*method="post"[^>]*action="\/admin\/login"/i);
  assert.match(html, /<input[^>]*type="password"/i);
  assert.match(html, /autocomplete="current-password"/i);
  assert.ok(!html.includes(TOKEN), 'the page never contains the passphrase');
});

test('the form: right passphrase -> 303 to a clean /admin with a session cookie that is not the passphrase', async t => {
  if (need(t)) return;
  const r = await login(TOKEN);
  assert.equal(r.status, 303);
  const loc = r.headers.get('location') || '';
  assert.equal(new URL(loc, BASE).pathname, '/admin');
  assert.ok(!loc.includes(TOKEN) && !/[?&]t=/.test(loc), 'no passphrase in Location');
  const c = cookieOf(r);
  assert.match(c, /HttpOnly/i); assert.match(c, /SameSite=Strict/i);
  const value = c.split(';')[0].slice('admin='.length);
  assert.ok(value && !decodeURIComponent(value).includes(TOKEN), 'the cookie holds a derived value, not the passphrase');
  const page = await get('/admin', { Cookie: `admin=${value}` });
  assert.equal(page.status, 200, 'the session cookie opens the admin page');
  assert.ok(!(await page.text()).includes(TOKEN), 'the admin page never echoes the passphrase');
});

test('the form: a wrong passphrase -> 401, no cookie, and nothing echoed', async t => {
  if (need(t)) return;
  const wrong = 'not-the-passphrase-' + Math.random().toString(36).slice(2);
  const r = await login(wrong);
  assert.equal(r.status, 401);
  assert.equal(cookieOf(r), '', 'no cookie on a wrong passphrase');
  const html = await r.text();
  assert.ok(!html.includes(wrong) && !html.includes(TOKEN));
});

test('the phone link: ?t= swaps for the same derived cookie and lands on /admin with no t= in the address', async t => {
  if (need(t)) return;
  const r = await get('/admin?t=' + encodeURIComponent(TOKEN));
  assert.ok([302, 303].includes(r.status));
  const loc = r.headers.get('location') || '';
  assert.equal(new URL(loc, BASE).pathname, '/admin');
  assert.ok(!/[?&]t=/.test(loc) && !loc.includes(TOKEN), 'the final URL has no t=');
  const value = cookieOf(r).split(';')[0].slice('admin='.length);
  assert.ok(value && !decodeURIComponent(value).includes(TOKEN));
  // Following the redirect for real ends on a clean address.
  const followed = await fetch(BASE + '/admin?t=' + encodeURIComponent(TOKEN), { redirect: 'manual' });
  assert.ok(!new URL(followed.headers.get('location'), BASE).search.includes('t='));
});

test('behind an HTTPS proxy (x-forwarded-proto: https), the session cookie is Secure; over plain http it is not', async t => {
  if (need(t)) return;
  assert.match(cookieOf(await login(TOKEN, { 'X-Forwarded-Proto': 'https' })), /;\s*Secure/i);
  assert.match(cookieOf(await login(TOKEN, { 'X-Forwarded-Proto': 'https,http' })), /;\s*Secure/i);
  if (new URL(BASE).protocol === 'http:') assert.doesNotMatch(cookieOf(await login(TOKEN)), /;\s*Secure/i);
});
