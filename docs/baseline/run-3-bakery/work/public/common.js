// Shared helpers for the customer and admin pages.
window.Bakery = (() => {
  let currency = 'USD';
  const setCurrency = (c) => { currency = c || 'USD'; };
  const money = (cents) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);

  // Dates are "YYYY-MM-DD" in the bakery's local calendar; format at noon UTC to avoid TZ shifts.
  const asDate = (d) => new Date(`${d}T12:00:00Z`);
  const fmtDate = (d, opts) => asDate(d).toLocaleDateString(undefined, { timeZone: 'UTC', ...opts });
  const longDate = (d) => fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' });

  const fmtTime = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(undefined, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const bind = (data) => {
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const v = data[el.dataset.bind];
      if (v != null) el.textContent = v;
    });
  };

  return { setCurrency, money, fmtDate, longDate, fmtTime, esc, bind };
})();
