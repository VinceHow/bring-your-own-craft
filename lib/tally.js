// Counter, reasons and meter: pure functions of a run's events (and her file's lines, to quote what was cited).

// came = candidates; brought = asks; decided = distinct candidates decided for her (latest decision per id).
export function counter(events) {
  const came = events.filter(e => e.type === 'candidate').length;
  const brought = events.filter(e => e.type === 'ask').length;
  return { came, brought, decided: latestDecided(events).size };
}

// Her events tagged craft or stamp. pct is a whole number, or null before anything is tagged.
export function meter(events) {
  let craft = 0, stamp = 0;
  for (const e of events) { if (e.mode === 'craft') craft++; else if (e.mode === 'stamp') stamp++; }
  return { craft, stamp, pct: craft + stamp ? Math.round((100 * craft) / (craft + stamp)) : null };
}

// Why each of her asks made the cut; for each of the rest, the line of her file that decided it.
// tasteLines: [{ id, text }] (her file now). Lines she wrote during the run are also found in taste.written events.
export function reasons(events, tasteLines = []) {
  const text = new Map(tasteLines.map(l => [l.id, l.text]));
  for (const e of events) if (e.type === 'taste.written' && e.id) text.set(e.id, e.text);
  const answers = new Map(events.filter(e => e.type === 'answer').map(e => [e.askId, e.choice]));
  const refusedWhy = new Map(events.filter(e => e.type === 'ask.refused').map(e => [e.id, e.reason]));
  const asked = events.filter(e => e.type === 'ask').map(a => ({
    kind: 'asked', id: a.id, seat: a.seat, decision: a.decision, why: a.why, recommendation: a.recommendation,
    ...(a.source ? { source: a.source } : {}), ...(answers.has(a.id) ? { answer: answers.get(a.id) } : {}),
  }));
  const decided = [...latestDecided(events).values()].map(d => ({
    kind: 'decided', id: d.id, seat: d.seat, decision: d.decision, choice: d.choice, cites: d.cites,
    line: d.cites === 'team default' ? null : text.get(d.cites) ?? null,
    ...(refusedWhy.has(d.id) ? { refused: refusedWhy.get(d.id) } : {}),
  }));
  return [...asked, ...decided];
}

export function tally(events, tasteLines = []) {
  return { ...counter(events), meter: meter(events), reasons: reasons(events, tasteLines) };
}

function latestDecided(events) {
  const asked = new Set(events.filter(e => e.type === 'ask').map(e => e.id));
  const m = new Map();
  for (const e of events) if (e.type === 'decided' && !asked.has(e.id)) m.set(e.id, e);
  return m;
}
