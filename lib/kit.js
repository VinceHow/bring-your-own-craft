// "Loaded with" (Vincent, Sun 01:31: show each teammate's real loadout on its meet card). Every item is computed from
// what this server actually has for this idea: files that exist, the finding that fits, the template the build picks,
// whether taste-skill's scripts are on this machine. Nothing aspirational; a teammate with only its prompt says what
// its prompt makes it good at.
import fs from 'node:fs';
import path from 'node:path';
import { findingFor } from './teammates.js';
import { pickTemplate, TEMPLATES_DIR } from './fill.js';
import { findStart } from './design.js';
import { backend } from './model.js';
import { logoOn } from './logo.js';
import { NAMES } from './interpret.js'; // the intros follow the teammates' names (a rename flows through)
import { liveResearchOn } from './live-finding.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const has = p => fs.existsSync(path.join(ROOT, p));
const TEMPLATE_NAMES = { bakery: 'bakery', cafe: 'café', yoga: 'yoga studio' };

// Each line at most 6 words (the lead, Sun 02:24: a skill plus a tool, one thing per screen), and every card names
// Claude, the model each teammate thinks with.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = d => { const m = String(d || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]}` : String(d || ''); };
export function kitFor(idea = '', { start = findStart() } = {}) {
  idea = String(idea || '');
  const design = [];
  if (has('vendor/taste-skill/RULES-FOR-THE-ROOM.md')) design.push('taste-skill’s design rules (MIT)');
  if (start) design.push('taste-skill’s live palette and type');
  design.push('Claude, sketching journeys and screens');

  const research = [];
  const f = idea ? findingFor(idea) : null;
  // Live research on (lib/live-finding.js): Wren searches the web now; the prepared finding is only the fallback.
  if (liveResearchOn(idea)) research.push('Linkup web search, live');
  else if (f) {
    const site = f.finding.site || (() => { try { return new URL(f.finding.url).hostname.replace(/^www\./, ''); } catch { return 'its source'; } })();
    const linkup = /linkup/i.test(String(f.finding.how_verified || ''));
    research.push(`${linkup ? 'Linkup finding' : 'Verified finding'}: ${site}, ${shortDate(f.finding.fetched || f.finding.readAt)}`);
  } else research.push('No verified finding fits yet');
  research.push('Claude, citing only what it read');

  const data = ['Claude: one measure per step', 'Keeps only data decisions use'];
  const strategy = ['Claude: price and payment calls', 'Says who pays, and why now'];

  const engineering = [];
  const tpl = pickTemplate(idea);
  if (fs.existsSync(path.join(TEMPLATES_DIR, tpl, 'index.html'))) {
    engineering.push(`The ${TEMPLATE_NAMES[tpl] || tpl} page template`);
    if (fs.existsSync(path.join(TEMPLATES_DIR, tpl, 'slots.schema.json'))) engineering.push('Schema-checked fill, built live');
  }
  // What it thinks with: the route this server is on (lib/model.js), never a guess.
  engineering.push(backend() === 'fal' ? 'Claude (Sonnet), through fal' : 'Claude, through Claude Code');
  return { design, research, data, strategy, engineering: engineering.slice(0, 3) };
}

// "Made with" (prepared ahead, the sponsors; Vincent, Sun 02:05): next to "Loaded with" (live). Each item only when its
// evidence is on this machine: the painted studio's clips and music (made on fal, design/FAL-SPEND.md), the room's frames
// in Figma (design/FIGMA.md), Wren's finding
// found with Linkup (its how_verified says so, and it's the one cited), the app built with Claude Code.
const hasFiles = (dir, re) => { try { return fs.readdirSync(path.join(ROOT, dir)).some(f => re.test(f)); } catch { return false; } };
export function madeFor(idea = '') {
  idea = String(idea || '');
  const made = { design: [], research: [], data: [], strategy: [], engineering: [] };
  if (hasFiles('public/looks/cast/loops', /\.(webm|mp4)$/) && hasFiles('public/looks/cast/music', /\.mp3$/)) made.design.push('Studio, clips, music painted on fal');
  // Figma, prepared ahead (the lead, Sun 02:56, POLISH.md §6): the room's frames went from code into Figma; design/FIGMA.md is the evidence.
  if (has('design/FIGMA.md')) made.design.push('The room’s frames, laid out in Figma');
  const f = idea ? findingFor(idea) : null;
  // "before the demo" only when the prepared finding is what she will see (live research off)
  if (f && !liveResearchOn(idea) && /linkup/i.test(String(f.finding.how_verified || ''))) made.research.push('Researched with Linkup, before the demo');
  if (has('CLAUDE.md')) made.engineering.push('This app, built with Claude Code');
  for (const k of Object.keys(made)) made[k] = made[k].slice(0, 2);
  return made;
}

// The meet cards (the PO's copy, Sun 08:58, from Vincent): per teammate a standing intro, a "loves" line, and what it
// brings as two chip rows. "Live in this room": only what really runs here, each conditional item under the code's own
// switch. "Built with": prepared ahead, each backed by something in this repo. The model names come from the same
// variables the code reads (a Fallback B *_MODEL=sonnet override shows as Sonnet).
const MODEL_NAMES = { sonnet: 'Claude Sonnet', haiku: 'Claude Haiku', opus: 'Claude Opus' };
const modelName = (v, d) => MODEL_NAMES[String(process.env[v] || d).toLowerCase()] || 'Claude';
export function cardsFor(idea = '', { start = findStart() } = {}) {
  idea = String(idea || '');
  const team = modelName('TEAM_MODEL', 'sonnet');
  const cards = {
    research: { intro: `I’m ${NAMES.research}. I will absolutely read the whole footnote.`, loves: 'A source for every claim, and the one surprising number.',
      live: [...(liveResearchOn(idea) ? ['Linkup web search, live', 'Quotes checked word-for-word against the page'] : []), 'Prepared finding if nothing verifies (labelled)', team],
      built: has('lib/live-finding.js') ? ['Linkup'] : [] },
    design: { intro: `I’m ${NAMES.design}. I’ll have a sketch on the table before the coffee’s cool.`, loves: 'Rough first, polish last, and one colour doing the heavy lifting.',
      live: [...(has('vendor/taste-skill') ? ['taste-skill’s design rules'] : []), ...(start ? ['taste-skill palette and type, dealt live'] : []),
        ...(logoOn() ? ['The page’s emblem, painted live on fal'] : []), team],
      built: [...(has('vendor/taste-skill/LICENSE') || has('vendor/taste-skill') ? ['taste-skill (MIT)'] : []),
        ...(hasFiles('public/looks/cast/loops', /\.(webm|mp4)$/) ? ['The studio, painted on fal'] : []), ...(has('design/FIGMA.md') ? ['The room’s frames in Figma'] : [])] },
    engineering: { intro: `I’m ${NAMES.engineering}. Boring, correct, shipped, in that order.`, loves: 'The thing working on a Tuesday morning, not just on stage.',
      live: ['Builds her page from her decisions', ...(fs.existsSync(path.join(TEMPLATES_DIR, pickTemplate(idea), 'slots.schema.json')) ? ['Schema-checked template fill'] : []), modelName('FILL_MODEL', 'sonnet')],
      built: [...(has('CLAUDE.md') ? ['Claude Code'] : []), ...(has('e2e') ? ['Playwright end-to-end tests'] : []), ...(has('docs/BAKERY-BRIEF.md') ? ['The live bakery on Railway'] : [])] },
    strategy: { intro: `I’m ${NAMES.strategy}. I’ll ask who pays before anyone picks a font.`, loves: 'Knowing who pays, and why now.',
      live: ['Price and payment calls', team], built: has('CLAUDE.md') ? ['Claude Code'] : [] },
    data: { intro: `I’m ${NAMES.data}. One number that says it worked, and I’ll guard it.`, loves: 'Measuring only what someone will actually use.',
      live: ['One measure per step', team], built: has('CLAUDE.md') ? ['Claude Code'] : [] },
  };
  // The whole team, one shared line. The mic item shows only when the browser's voice probe says it works (room.js).
  const room = [
    { text: `Talk it out on ${modelName('JOINT_MODEL', 'haiku')}` },
    { text: `her takeaways on ${modelName('INTERPRET_MODEL', 'opus')}` },
    { text: 'her mic on ElevenLabs speech-to-text', kind: 'mic' },
    { text: backend() === 'fal' ? 'thinking through fal' : 'thinking through Claude Code' },
  ];
  return { cards, room };
}
