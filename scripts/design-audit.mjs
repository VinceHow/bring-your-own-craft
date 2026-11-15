// Design audit: turns one design-qa walk (findings.json + states.txt) into the [design] section of docs/AUDIT.md:
// pass/fail per screen per size per mode, in DEMO.md order, a screenshot path for each cell, and one line per failure.
//   node scripts/design-audit.mjs design/studio/qa/<stamp> > /tmp/audit.md
// A cell fails on any hard flag (below). Small text under 13px on screen, 2px frame shaves and "check by eye" contrast
// over the painting are counted, not failed: they are listed under each screen as notes.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '.');
const F = JSON.parse(fs.readFileSync(path.join(dir, 'findings.json'), 'utf8'));
const rel = p => p; // shot paths in findings are already repo-relative
const SCREENS = [ // DEMO.md order: [label, state-name prefixes as the walk names them]
  ['The idea paper (and the tidy moment)', ['the first page: her idea', 'the idea paper']],
  ['Her name tag (form → handwritten tag)', ['her name tag (setup, paper)', 'name tag, spin', 'name tag, fallback']],
  ['Meet the team', ['meeting the team', 'meet the team']],
  ['The reveal (door)', ['the reveal']],
  ['The room, calm', ['the room, empty']],
  ['The team working', ['team working']],
  ['The idea sheet and journey', ['idea sheet, glance', 'idea sheet, open large']],
  ['Teammate pads and her workspace', ['seat panel', 'her workspace']],
  ['Focus 1 meeting (rounds, End meeting, takeaways)', ['Focus 1']],
  ['The inbox', ['inbox']],
  ['The quick unblock card', ['unblock card']],
  ['Focus 2 meeting', ['Focus 2']],
  ['The team space', ['team space']],
  ['Her page and the app tag', ['her page', 'app button']],
  ['The close', ['the close', '/slides/']],
  ['Day / night', ['day/night modes']],
  ['Sound and the mic', ['sound and mic']],
  ['Art, toys, room coverage, cursor', ['extras']],
];
const SOFT = new Set(['small text', 'contrast (over picture)', 'not on main yet', 'not checkable here']);
const isSoft = f => f.soft || SOFT.has(f.check) || (f.check === 'clipped frame' && /cut by [12]px/.test(f.note));
const cellsOf = prefixes => F.findings.filter(f => prefixes.some(p => (f.state || '').startsWith(p)));
const sizes = ['1920x1130', '1440x900', '1280x800'], modes = ['day', 'night'];
const states = fs.readFileSync(path.join(dir, 'states.txt'), 'utf8').trim().split('\n').map(l => l.split('\t'));
const shotFor = (prefixes, size, mode) => { const s = states.find(([p, n]) => prefixes.some(x => n.startsWith(x)) && p.includes(`${size}-${mode}`)); return s ? s[0] : ''; };

const out = [];
out.push(`| Screen | ${sizes.flatMap(s => modes.map(m => `${s} ${m}`)).join(' | ')} |`, `|---|${sizes.flatMap(() => modes.map(() => '---')).join('|')}|`);
const fails = [];
for (const [label, prefixes] of SCREENS) {
  const row = [label];
  for (const s of sizes) for (const m of modes) {
    const fs_ = cellsOf(prefixes).filter(f => f.size === s && (f.mode === m || (!modes.includes(f.mode) && m === 'day')));
    const hard = fs_.filter(f => !isSoft(f));
    const any = fs_.length || shotFor(prefixes, s, m);
    row.push(!any ? '·' : hard.length ? `**fail** (${hard.length})` : 'pass');
    for (const f of hard) fails.push({ label, s, m, f });
  }
  out.push(`| ${row.join(' | ')} |`);
}
out.push('', '· = not walked at that size or mode (see the notes).', '');
// one line per failure, de-duplicated across sizes and modes
const seen = new Map();
for (const { label, s, m, f } of fails) {
  const k = [label, f.check, f.hook, f.note.replace(/[\d.]+(px|:1| ms)?/g, '#')].join('|');
  if (!seen.has(k)) seen.set(k, { label, f, where: [] });
  seen.get(k).where.push(`${s} ${m}`);
}
out.push('**Failures** (one line each; where; shot):', '');
for (const { label, f, where } of seen.values()) out.push(`- ${label} · ${f.check} · \`${f.hook}\` · ${f.note.slice(0, 160)} · ${[...new Set(where)].join(', ')} · \`${rel(f.shot)}\``);
// notes: soft counts per screen
out.push('', '**Notes, counted not failed:**', '');
for (const [label, prefixes] of SCREENS) {
  const soft = cellsOf(prefixes).filter(isSoft); if (!soft.length) continue;
  const by = {}; for (const f of soft) by[f.check] = (by[f.check] || 0) + 1;
  out.push(`- ${label}: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
process.stdout.write(out.join('\n') + '\n');

// ---- POLISH.md item by item (design-polish.mjs: polish.json in the same folder, or POLISH_JSON=path) ----
const pj = process.env.POLISH_JSON || path.join(dir, 'polish.json');
if (fs.existsSync(pj)) {
  const P = JSON.parse(fs.readFileSync(pj, 'utf8')).results;
  const SECT = { 2: 'Every input is a good input', 3: 'Calm, clean motion', 4: 'Never lost, never stuck', 5: 'Nothing broken-looking', 6: 'True on screen', 7: "Vincent's own path" };
  const lines = ['', '#### POLISH.md, item by item', ''];
  for (const sec of [2, 3, 4, 5, 6, 7]) {
    const rows = P.filter(r => r.sec === sec); if (!rows.length) continue;
    lines.push(`**§${sec} ${SECT[sec]}**`, '', '| Item | Size | Result | Evidence | Note | Owner |', '|---|---|---|---|---|---|');
    for (const r of rows) lines.push(`| ${r.item} | ${r.size || ''}${r.mode ? ' ' + r.mode : ''} | ${r.result === 'FAIL' ? '**FAIL**' : r.result} | ${r.evidence ? '`' + r.evidence + '`' : ''} | ${String(r.note).replace(/\|/g, '/').slice(0, 220)} | ${r.owner || ''} |`);
    lines.push('');
  }
  process.stdout.write(lines.join('\n') + '\n');
}
// ---- §1 one thing per screen: the census per screen at 1920 day (counted by design-qa.mjs) ----
{
  const cen = F.findings.filter(f => f.check === 'census' && f.size === '1920x1130' && f.mode === 'day');
  if (cen.length) {
    const lines = ['', '#### §1 One thing per screen (1920x1130 day; the same at every size)', '', '| Screen | Result | Controls · competing · guidance | Owner |', '|---|---|---|---|'];
    const seen = new Set();
    for (const f of cen) { if (seen.has(f.state)) continue; seen.add(f.state);
      const m = f.note.match(/controls (\d+).*competing (\d+).*guidance (\d+)/); const [c, k, g] = m ? m.slice(1).map(Number) : [0, 0, 0];
      const pass = k === 0 && g <= 1 && c <= 3;   // one input plus its mic and its button counts as one action
      lines.push(`| ${f.state} | ${pass ? 'PASS' : '**FAIL**'} | ${f.note.replace(/\|/g, '·').slice(0, 260)} | ${pass ? '' : 'bug fixer'} |`); }
    process.stdout.write(lines.join('\n') + '\n');
  }
}
