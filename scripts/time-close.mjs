#!/usr/bin/env node
// Times the close as public/close.js runs it: Design's sketch of a judge's idea, then /api/select-for-idea's
// selectForIdea on those stages. Real model calls. Usage: node scripts/time-close.mjs ["idea"] [runs=3]
import { sketchForIdea } from '../lib/sketch.js';
import { selectForIdea } from '../lib/select.js';
import { readEvents } from '../lib/events.js';

const idea = process.argv[2] || 'A booking site for a tattoo studio.';
const n = Number(process.argv[3] || 3);
for (let i = 1; i <= n; i++) {
  const t0 = Date.now();
  const sk = await sketchForIdea(idea);
  const tSketch = Date.now() - t0;
  const r = await selectForIdea(idea, sk.body.stages || []);
  const tAsks = Date.now() - t0;
  await r.pending;
  const done = readEvents(r.run).find(e => e.type === 'select.done');
  console.log(`## Run ${i} (\`runs/${r.run}/\`)`);
  console.log(`- Sketch ${(tSketch / 1000).toFixed(1)} s · team ${(r.ms.team / 1000).toFixed(1)} s · scored and asked ${(r.ms.select / 1000).toFixed(1)} s · **questions on screen at ${(tAsks / 1000).toFixed(1)} s** · team's decisions all logged at ${((tSketch + done.ms + r.ms.team) / 1000).toFixed(1)} s`);
  console.log(`- ${r.came} came up · ${r.brought} asked`);
  for (const a of r.asks) console.log(`  - ${a.by} (${a.artifact.kind}): "${a.question}"`);
}
