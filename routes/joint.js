// The team space's API (CONTRACT.md, "Team space seams"). The exchanges start on their own after the selector
// (installJoint listens for select.done); these routes read them back, or start them by hand for a logged run.
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { readEvents, RUNS_DIR } from '../lib/events.js';
import { installJoint, runJoint } from '../lib/joint.js';

installJoint();

const PATH = /^\/api\/run\/([\w-]{1,80})\/joint$/;
const validRun = id => fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));
const agreed = run => readEvents(run).filter(e => e.type === 'joint.agreed')
  .map(({ id, headline, seats, withTakeaways, turns }) => ({ id, headline, seats, withTakeaways, turns }));

export default [
  { method: 'GET', match: url => PATH.test(url.pathname), handler(req, res, { url }) {
    const run = url.pathname.match(PATH)[1];
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    sendJson(res, 200, { agreed: agreed(run) });
  } },
  { method: 'POST', match: url => PATH.test(url.pathname), async handler(req, res, { url, body }) {
    const run = url.pathname.match(PATH)[1];
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    if (!readEvents(run).some(e => e.type === 'select.done')) return sendJson(res, 409, { error: 'the team has not proposed yet' });
    const job = runJoint(run).catch(() => []);
    if (!body?.wait) return sendJson(res, 202, { started: true });
    await job;
    sendJson(res, 200, { agreed: agreed(run) });
  } },
];
