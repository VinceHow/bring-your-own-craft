// "Loaded with" (Vincent, Sun 01:31: show each teammate's real loadout on its meet card). Every item is computed from
// what this server actually has for this idea: files that exist, the finding that fits, the template the build picks,
// whether taste-skill's scripts are on this machine. Nothing aspirational; a teammate with only its prompt says what
// its prompt makes it good at.
import fs from 'node:fs';
import path from 'node:path';
import { findingFor } from './teammates.js';
import { pickTemplate, TEMPLATES_DIR } from './fill.js';
import { findStart } from './design.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const has = p => fs.existsSync(path.join(ROOT, p));
const TEMPLATE_NAMES = { bakery: 'bakery', cafe: 'café', yoga: 'yoga studio' };

export function kitFor(idea = '', { start = findStart() } = {}) {
  idea = String(idea || '');
  const design = [];
  if (has('vendor/taste-skill/RULES-FOR-THE-ROOM.md')) design.push('taste-skill’s design rules (MIT), in its prompt');
  if (start) design.push('taste-skill’s deal: the page’s palette and type, picked live');
  design.push('Sketches her journey, then the page’s screens');

  const research = [];
  const f = idea ? findingFor(idea) : null;
  if (f) {
    const site = f.finding.site || (() => { try { return new URL(f.finding.url).hostname.replace(/^www\./, ''); } catch { return 'its source'; } })();
    research.push(`A verified finding: ${site}, read ${f.finding.fetched || f.finding.readAt}`);
  } else research.push('No verified finding fits this idea yet, so none is cited');
  research.push('Cites only what it has read: a link, a quote, a date');

  const data = ['One measure per step of her journey', 'Keeps only data a decision will use'];
  const strategy = ['Price and payment calls for this idea', 'Every call says who pays, and why now'];

  const engineering = [];
  const tpl = pickTemplate(idea);
  if (fs.existsSync(path.join(TEMPLATES_DIR, tpl, 'index.html'))) {
    engineering.push(`The ${TEMPLATE_NAMES[tpl] || tpl} page template, on taste-skill’s kit`);
    if (fs.existsSync(path.join(TEMPLATES_DIR, tpl, 'slots.schema.json'))) engineering.push('Fills it with her words, schema-checked before it renders');
  }
  engineering.push('Builds it live; never invents a new kind of screen');
  return { design, research, data, strategy, engineering };
}
