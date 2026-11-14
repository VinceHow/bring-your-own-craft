(() => {
  const { money, fmtDate, longDate, fmtTime, esc, bind, setCurrency } = window.Bakery;
  const $ = (id) => document.getElementById(id);

  const state = { shop: null, items: [], date: null, cart: new Map() };

  // Remember the customer's contact details and cart between visits (best effort).
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const maxFor = (item) => {
    if (!item.available) return 0;
    return item.remaining == null ? 50 : Math.min(50, item.remaining);
  };

  async function getJson(url, opts) {
    const res = await fetch(url, opts);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error('Request failed'), { body, status: res.status });
    return body;
  }

  // ---------- rendering ----------

  function renderShopInfo() {
    const s = state.shop;
    bind(s);
    document.title = `Order Ahead · ${s.bakeryName}`;
    $('cutoff-notice').textContent = `Order by ${fmtTime(s.orderCutoff)} for pickup the next day`;
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    $('hours').innerHTML = order.map((d) => {
      const h = s.hours[d];
      return `<dt>${d}</dt><dd>${h ? `${fmtTime(h[0])} – ${fmtTime(h[1])}` : 'Closed'}</dd>`;
    }).join('');
  }

  function renderDays() {
    $('days').innerHTML = state.shop.dates.map((d) => `
      <button type="button" class="day" data-date="${d}" aria-pressed="${d === state.date}"
        aria-label="${esc(longDate(d))}">
        <small>${esc(fmtDate(d, { weekday: 'short' }))}</small>
        <strong>${esc(fmtDate(d, { day: 'numeric' }))}</strong>
        <small>${esc(fmtDate(d, { month: 'short' }))}</small>
      </button>`).join('');
  }

  function renderTimes() {
    const sel = $('pickup-time');
    const prev = sel.value;
    const slots = state.shop.slots[state.date] || [];
    sel.innerHTML = '<option value="">Choose a time…</option>' +
      slots.map((t) => `<option value="${t}">${esc(fmtTime(t))}</option>`).join('');
    if (slots.includes(prev)) sel.value = prev;
  }

  function stockLabel(item) {
    if (!item.available) return '<span class="stock out">Not baked this day</span>';
    if (item.remaining === 0) return '<span class="stock out">Sold out</span>';
    if (item.remaining != null && item.remaining <= 5) return `<span class="stock low">Only ${item.remaining} left</span>`;
    return '<span class="stock"></span>';
  }

  function renderMenu() {
    const groups = new Map();
    for (const item of state.items) {
      const c = item.category || 'Menu';
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(item);
    }
    $('menu').innerHTML = [...groups].map(([cat, items]) => `
      <section class="category">
        <h2>${esc(cat)}</h2>
        <div class="menu-grid">
          ${items.map((item) => {
            const qty = state.cart.get(item.id) || 0;
            const max = maxFor(item);
            return `
            <article class="item ${qty ? 'in-cart' : ''} ${max === 0 ? 'unavailable' : ''}" data-id="${esc(item.id)}">
              ${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : ''}
              <div class="item-head"><h3>${esc(item.name)}</h3><span class="price">${money(item.price)}</span></div>
              <p>${esc(item.description)}</p>
              <div class="item-foot">
                ${stockLabel(item)}
                <div class="stepper" role="group" aria-label="Quantity of ${esc(item.name)}">
                  <button type="button" data-step="-1" aria-label="Remove one" ${qty === 0 ? 'disabled' : ''}>−</button>
                  <output aria-live="polite">${qty}</output>
                  <button type="button" data-step="1" aria-label="Add one" ${qty >= max ? 'disabled' : ''}>+</button>
                </div>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>`).join('');
  }

  function cartLines() {
    return state.items.filter((i) => state.cart.get(i.id)).map((i) => ({ item: i, qty: state.cart.get(i.id) }));
  }

  function renderCart() {
    const lines = cartLines();
    const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    $('cart-lines').innerHTML = lines.map(({ item, qty }) =>
      `<li><span><span class="qty">${qty}×</span>${esc(item.name)}</span><span>${money(item.price * qty)}</span></li>`).join('');
    $('cart-empty').hidden = lines.length > 0;
    $('cart-total-row').hidden = lines.length === 0;
    $('cart-total').textContent = money(total);

    const bar = $('mobile-bar');
    bar.hidden = count === 0;
    document.body.classList.toggle('has-bar', count > 0);
    $('mobile-bar-btn').textContent = `Review order · ${count} item${count === 1 ? '' : 's'} · ${money(total)}`;

    store.set('cart', Object.fromEntries(state.cart));
  }

  function showErrors(errors) {
    const box = $('errors');
    if (!errors || !errors.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = `<ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- data ----------

  async function loadMenu() {
    const url = state.date ? `/api/menu?date=${state.date}` : '/api/menu';
    const { items } = await getJson(url);
    state.items = items;

    // Drop or trim anything that isn't available on the chosen day.
    const adjusted = [];
    for (const [id, qty] of state.cart) {
      const item = items.find((i) => i.id === id);
      const max = item ? maxFor(item) : 0;
      if (qty > max) {
        if (max === 0) state.cart.delete(id); else state.cart.set(id, max);
        if (item) adjusted.push(item.name);
      }
    }
    renderMenu();
    renderCart();
    showErrors(adjusted.length && state.date
      ? [`Updated for ${longDate(state.date)}: ${adjusted.join(', ')} ${adjusted.length === 1 ? 'is' : 'are'} limited or unavailable that day.`]
      : null);
  }

  async function selectDate(date) {
    state.date = date;
    renderDays();
    renderTimes();
    await loadMenu();
  }

  // ---------- events ----------

  $('menu').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-step]');
    if (!btn) return;
    const id = btn.closest('.item').dataset.id;
    const item = state.items.find((i) => i.id === id);
    const next = Math.max(0, Math.min(maxFor(item), (state.cart.get(id) || 0) + Number(btn.dataset.step)));
    if (next) state.cart.set(id, next); else state.cart.delete(id);
    renderMenu();
    renderCart();
    // keep keyboard focus on the same button after re-render
    document.querySelector(`.item[data-id="${CSS.escape(id)}"] button[data-step="${btn.dataset.step}"]`)?.focus();
  });

  $('days').addEventListener('click', (e) => {
    const btn = e.target.closest('.day');
    if (btn && btn.dataset.date !== state.date) selectDate(btn.dataset.date);
  });

  $('mobile-bar-btn').addEventListener('click', () => {
    $('order-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      pickupDate: state.date,
      pickupTime: $('pickup-time').value,
      name: $('name').value,
      phone: $('phone').value,
      email: $('email').value,
      notes: $('notes').value,
      items: [...state.cart].map(([id, qty]) => ({ id, qty })),
    };

    const errors = [];
    if (!payload.items.length) errors.push('Your order is empty — add something from the menu.');
    if (!payload.pickupDate) errors.push('Please choose a pickup day.');
    else if (!payload.pickupTime) errors.push('Please choose a pickup time.');
    if (!payload.name.trim()) errors.push('Please enter your name.');
    if (!payload.phone.trim()) errors.push('Please enter your phone number.');
    if (errors.length) return showErrors(errors);

    const submit = $('submit');
    submit.disabled = true;
    submit.textContent = 'Placing order…';
    try {
      const { code, token } = await getJson('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      store.set('contact', { name: payload.name, phone: payload.phone, email: payload.email });
      store.set('cart', {});
      location.href = `/order?id=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}`;
    } catch (err) {
      showErrors(err.body?.errors || ['Couldn’t reach the bakery. Check your connection and try again.']);
      if (err.status === 422) loadMenu().catch(() => {}); // refresh stock counts
      submit.disabled = false;
      submit.textContent = 'Place order';
    }
  });

  // ---------- boot ----------

  (async () => {
    try {
      state.shop = await getJson('/api/shop');
      setCurrency(state.shop.currency);
      renderShopInfo();

      const contact = store.get('contact');
      if (contact) for (const k of ['name', 'phone', 'email']) if (contact[k]) $(k).value = contact[k];
      const savedCart = store.get('cart');
      if (savedCart) for (const [id, qty] of Object.entries(savedCart)) if (Number.isInteger(qty) && qty > 0) state.cart.set(id, qty);

      if (!state.shop.dates.length) {
        $('days').innerHTML = '<p class="empty">No pickup days are open right now — please check back soon.</p>';
        $('submit').disabled = true;
        await loadMenu();
        return;
      }
      await selectDate(state.shop.dates[0]);
    } catch {
      $('menu').innerHTML = '<p class="empty">Sorry, the menu couldn’t be loaded. Please refresh the page.</p>';
    }
  })();
})();
