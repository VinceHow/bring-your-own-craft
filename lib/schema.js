// Minimal JSON Schema check: type, required, properties, items, enum. Returns a list of error strings.
export function validate(v, s, path = '$') {
  const errs = [];
  if (!s) return errs;
  const t = s.type;
  const typeOf = x => Array.isArray(x) ? 'array' : x === null ? 'null' : Number.isInteger(x) ? 'integer' : typeof x;
  if (t) {
    const ok = (Array.isArray(t) ? t : [t]).some(tt => tt === typeOf(v) || (tt === 'number' && typeof v === 'number'));
    if (!ok) { errs.push(`${path}: expected ${t}, got ${typeOf(v)}`); return errs; }
  }
  if (s.enum && !s.enum.includes(v)) errs.push(`${path}: not in enum`);
  if (typeOf(v) === 'object') {
    for (const k of s.required || []) if (!(k in v)) errs.push(`${path}.${k}: missing`);
    for (const [k, sub] of Object.entries(s.properties || {})) if (k in v) errs.push(...validate(v[k], sub, `${path}.${k}`));
  }
  if (Array.isArray(v) && s.items) v.forEach((x, i) => errs.push(...validate(x, s.items, `${path}[${i}]`)));
  return errs;
}
