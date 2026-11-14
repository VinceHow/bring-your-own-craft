// Her journey, one line a step, into boxes and arrows. Pure code, no model.
//
// parseFlow(lines) -> { nodes: [{ id: 'n1', label }], edges: [{ from, to, label? }] }
//
// Rules:
// - A plain line is a new step, joined by an arrow from the previous plain step (the main path).
// - A line with "→" or "->" is a branch. Its first part names where it starts:
//     the earlier node with that label (case, quotes and spacing ignored), or, if none matches,
//     the first node, with the name kept as the arrow's label (e.g. `regulars → "Book your usual"`).
//   Every later part is a step on the branch; a part that names an existing node links to it.
// - If the very first line has arrows, every part is a step (a whole path written on one line).
// - Ids are given in order of appearance, so they stay stable as she adds lines.
// - The main path continues from the last plain step, not from the end of a branch.

const ARROW = /\s*(?:→|->|⟶|➔)\s*/;

export function cleanLabel(s) {
  return String(s ?? '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '') // list markers: "- ", "1. "
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '') // surrounding quotes
    .trim();
}
export function normLabel(s) {
  return cleanLabel(s).toLowerCase().replace(/\s+/g, ' ').replace(/[.!?:;,]+$/, '');
}

export function parseFlow(lines) {
  const nodes = [];
  const edges = [];
  let tail = null; // last node on the main path
  const add = label => { const n = { id: `n${nodes.length + 1}`, label }; nodes.push(n); return n; };
  const find = label => { const k = normLabel(label); return k ? nodes.find(n => normLabel(n.label) === k) : undefined; };
  const link = (from, to, label) => {
    if (!from || !to || from === to) return;
    if (edges.some(e => e.from === from.id && e.to === to.id)) return;
    edges.push(label ? { from: from.id, to: to.id, label } : { from: from.id, to: to.id });
  };

  for (const raw of lines || []) {
    const text = String(raw ?? '').trim();
    if (!text) continue;
    const parts = text.split(ARROW).map(cleanLabel).filter(Boolean);
    if (!parts.length) continue;

    if (parts.length === 1) { // a plain step on the main path
      const n = add(parts[0]);
      link(tail, n);
      tail = n;
      continue;
    }

    let prev, edgeLabel;
    let rest = parts;
    if (!nodes.length) { // first line is a whole path
      prev = add(parts[0]);
      tail = prev;
      rest = parts.slice(1);
      for (const p of rest) { const n = add(p); link(prev, n); prev = n; tail = n; }
      continue;
    }
    const start = find(parts[0]);
    if (start) prev = start;
    else { prev = nodes[0]; edgeLabel = parts[0]; }
    rest = parts.slice(1);
    for (const p of rest) {
      const n = find(p) || add(p);
      link(prev, n, edgeLabel);
      edgeLabel = undefined;
      prev = n;
    }
  }
  return { nodes, edges };
}
