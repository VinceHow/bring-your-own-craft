(() => {
  const { money, fmtDate, longDate, fmtTime, esc } = window.Bakery;
  const $ = (id) => document.getElementById(id);

  let auth = null;
  try { auth = sessionStorage.getItem('bakery-auth'); } catch { /* ignore */ }
  let data = null;
  let date = null;
  let filter = 'active';

  const NEXT = {
    placed: [['ready', 'Mark ready', ''], ['cancelled', 'Cancel', 'secondary']],
    ready: [['collected', 'Picked up', ''], ['placed', 'Undo ready', 'secondary']],
    collected: [['ready', 'Undo pickup', 'secondary']],
    cancelled: [['placed', 'Restore', 'secondary']],
  };

  const addDays = (d, n) => {
    const t = new Date(`${d}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };

  async function api(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { ...opts.headers, Authorization: `Basic ${auth}` } });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) { signOut('Wrong password.'); throw new Error('unauthorized'); }
    if (!res.ok) throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status });
    return body;
  }

  function signOut(message) {
    auth = null;
    try { sessionStorage.removeItem('bakery-auth'); } catch { /* ignore */ }
    $('dash').hidden = true;
    $('login').hidden = false;
    const err = $('login-error');
    err.hidden = !message;
    err.textContent = message || '';
    $('password').focus();
  }

  async function load(d) {
    data = await api(`/api/admin/orders${d ? `?date=${d}` : ''}`);
    date = data.date;
    $('login').hidden = true;
    $('dash').hidden = false;
    render();
  }

  function render() {
    $('date').value = date;
    $('day-title').textContent = date === data.today ? `Today · ${longDate(date)}` : longDate(date);

    const days = Object.keys(data.upcoming).sort();
    $('upcoming').innerHTML = days.length
      ? days.map((d) => `<button type="button" class="day" data-date="${d}" aria-pressed="${d === date}">
          <small>${esc(fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' }))}</small>
          <strong>${data.upcoming[d]}</strong> <small>order${data.upcoming[d] === 1 ? '' : 's'}</small></button>`).join('')
      : '<p class="empty">No upcoming orders yet.</p>';

    // Bake list: totals per item across non-cancelled orders.
    const live = data.orders.filter((o) => o.status !== 'cancelled');
    const totals = new Map();
    for (const o of live) for (const l of o.items) totals.set(l.name, (totals.get(l.name) || 0) + l.qty);
    const revenue = live.reduce((s, o) => s + o.total, 0);
    $('bake').innerHTML = totals.size
      ? `<table class="bake"><tbody>${[...totals].sort((a, b) => b[1] - a[1]).map(([n, q]) => `<tr><td>${esc(n)}</td><td><strong>${q}</strong></td></tr>`).join('')}</tbody></table>
         <p class="order-meta" style="margin-top:12px">${live.length} order${live.length === 1 ? '' : 's'} · ${money(revenue)} expected</p>`
      : '<p class="empty">Nothing to bake for this day.</p>';

    const counts = { active: 0, all: data.orders.length };
    for (const o of data.orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
      if (o.status === 'placed' || o.status === 'ready') counts.active++;
    }
    const filters = [['active', 'To hand out'], ['ready', 'Ready'], ['collected', 'Picked up'], ['cancelled', 'Cancelled'], ['all', 'All']];
    $('filters').innerHTML = filters.map(([k, label]) =>
      `<button type="button" class="btn small ${filter === k ? '' : 'secondary'}" data-filter="${k}">${label} (${counts[k] || 0})</button>`).join('');

    const shown = data.orders.filter((o) => filter === 'all' || (filter === 'active' ? ['placed', 'ready'].includes(o.status) : o.status === filter));
    $('orders').innerHTML = shown.length ? shown.map((o) => `
      <article class="order ${o.status}">
        <div class="order-head">
          <span class="time">${esc(fmtTime(o.pickupTime))}</span>
          <span class="who">${esc(o.name)}</span>
          <span class="code">${esc(o.code)}</span>
          <span class="badge ${o.status}">${esc(o.status)}</span>
        </div>
        <div class="order-meta">
          <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>${o.email ? ` · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ''}
          · ${money(o.total)}
        </div>
        <ul class="cart-lines">${o.items.map((l) => `<li><span><span class="qty">${l.qty}×</span>${esc(l.name)}</span></li>`).join('')}</ul>
        ${o.notes ? `<div class="notes">📝 ${esc(o.notes)}</div>` : ''}
        <div class="actions">
          ${NEXT[o.status].map(([s, label, cls]) => `<button type="button" class="btn small ${cls}" data-code="${esc(o.code)}" data-status="${s}">${label}</button>`).join('')}
        </div>
      </article>`).join('') : '<div class="box"><p class="empty">No orders here.</p></div>';
  }

  // ---------- events ----------

  $('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    auth = btoa(unescape(encodeURIComponent(`staff:${$('password').value}`)));
    try {
      await load(date);
      try { sessionStorage.setItem('bakery-auth', auth); } catch { /* ignore */ }
      $('password').value = '';
    } catch (err) {
      if (err.message !== 'unauthorized') signOut(err.message);
    }
  });

  $('date').addEventListener('change', (e) => e.target.value && load(e.target.value));
  $('prev').addEventListener('click', () => load(addDays(date, -1)));
  $('next').addEventListener('click', () => load(addDays(date, 1)));
  $('today').addEventListener('click', () => load(data.today));
  $('refresh').addEventListener('click', () => load(date));
  $('upcoming').addEventListener('click', (e) => { const b = e.target.closest('[data-date]'); if (b) load(b.dataset.date); });
  $('filters').addEventListener('click', (e) => { const b = e.target.closest('[data-filter]'); if (b) { filter = b.dataset.filter; render(); } });

  $('orders').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-status]');
    if (!b) return;
    if (b.dataset.status === 'cancelled' && !confirm(`Cancel order ${b.dataset.code}?`)) return;
    b.disabled = true;
    try {
      await api(`/api/admin/orders/${b.dataset.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: b.dataset.status }),
      });
      await load(date);
    } catch (err) {
      if (err.message !== 'unauthorized') { alert(err.message); b.disabled = false; }
    }
  });

  // Auto-refresh every minute so new orders show up during service.
  setInterval(() => { if (auth && !$('dash').hidden && !document.hidden) load(date).catch(() => {}); }, 60_000);

  if (auth) load().catch((err) => { if (err.message !== 'unauthorized') signOut(err.message); });
  else signOut();
})();
