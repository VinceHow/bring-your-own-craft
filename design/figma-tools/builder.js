const VARS = { '242,238,230':'1:3','251,249,244':'1:4','231,225,213':'1:5','20,20,20':'1:6','255,72,176':'1:7','0,120,191':'1:8','255,232,0':'1:9','0,169,92':'1:10','255,108,47':'1:11','229,50,45':'1:12' };
const vcache = {};
async function paint(c) {
  if (!c) return null;
  let p = { type: 'SOLID', color: { r: c[0]/255, g: c[1]/255, b: c[2]/255 }, opacity: c[3] };
  const key = c.slice(0,3).join(',');
  if (VARS[key]) { const id = 'VariableID:' + VARS[key]; vcache[id] = vcache[id] || await figma.variables.getVariableByIdAsync(id);
    p = figma.variables.setBoundVariableForPaint(p, 'color', vcache[id]); p = Object.assign({}, p, { opacity: c[3] }); }
  return p;
}
const STY = (f, wt, it) => {
  if (/Archivo/.test(f)) return { family: 'Archivo Black', style: 'Regular' };
  const fam = /Mono/.test(f) ? 'IBM Plex Mono' : 'IBM Plex Sans';
  const w = wt >= 700 ? 'Bold' : wt >= 600 ? 'SemiBold' : wt >= 500 ? 'Medium' : 'Regular';
  return { family: fam, style: it ? (w === 'Regular' ? 'Italic' : w + ' Italic') : w };
};
function place(n, c, w, h, a) {
  const t = (a || 0) * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t);
  n.relativeTransform = [[cs, -sn, c[0] - (cs*w/2 - sn*h/2)], [sn, cs, c[1] - (sn*w/2 + cs*h/2)]];
}
const old = figma.currentPage.findChild(n => n.name === NAME); const oldX = old ? old.x : null; if (old) old.remove();
let maxX = 0; for (const ch of figma.currentPage.children) maxX = Math.max(maxX, ch.x + ch.width + 200);
const F = figma.createFrame(); F.name = NAME; F.resize(D.w, D.h); F.x = oldX ?? maxX; F.y = 0; F.clipsContent = true;
F.fills = [await paint([242,238,230,1])];
const loaded = new Set(); const made = [];
for (const it of D.items) {
  if (it.k === 'b') {
    const r = figma.createFrame(); r.name = it.n; r.resize(Math.max(it.w,1), Math.max(it.h,1)); r.clipsContent = false;
    r.fills = it.bg ? [await paint(it.bg)] : [];
    const sd = (it.sides || [it.bw, it.bw, it.bw, it.bw]).slice();
    const edge = it.bl && it.blc && it.bc && sd[3] > sd[0] + 1 && it.blc.join() !== it.bc.join(); if (edge) sd[3] = sd[0];
    const topEdge = it.bc && it.blc && sd[0] > sd[3] + 1 && sd[3] > 0 && it.blc.join() !== it.bc.join(); const topCol = it.bc; if (topEdge) { it.bc = it.blc; sd[0] = sd[3]; }
    if (sd.some(x => x > 0) && (it.bc || it.blc)) { r.strokes = [await paint(it.bc && sd[0] ? it.bc : it.blc)];
      if (sd.every(x => x === sd[0])) r.strokeWeight = sd[0]; else { r.strokeTopWeight = sd[0]; r.strokeRightWeight = sd[1]; r.strokeBottomWeight = sd[2]; r.strokeLeftWeight = sd[3]; } r.strokeAlign = 'INSIDE'; if (it.bs === 'dashed') r.dashPattern = [6, 4]; if (it.bs === 'dotted') r.dashPattern = [2, 3]; }
    r.cornerRadius = it.rad || 0;
    if (it.sh && it.sh[0]) r.effects = [{ type: 'DROP_SHADOW', color: { r: it.sh[0][0]/255, g: it.sh[0][1]/255, b: it.sh[0][2]/255, a: it.sh[0][3] }, offset: { x: it.sh[1], y: it.sh[2] }, radius: 0, spread: 0, visible: true, blendMode: 'NORMAL' }];
    if (it.op < 1) r.opacity = it.op;
    if (topEdge) { const e = figma.createRectangle(); e.name = 'ink edge'; e.resize(it.w, (it.sides || [])[0] || 8); e.fills = [await paint(topCol)]; r.appendChild(e); e.x = 0; e.y = 0; }
    if (edge) { const e = figma.createRectangle(); e.name = 'ink edge'; e.resize(it.bl, it.h); e.fills = [await paint(it.blc)]; r.appendChild(e); e.x = 0; e.y = 0; }
    F.appendChild(r); place(r, it.c, it.w, it.h, it.a); made.push(r.id);
  } else if (it.k === 't') {
    const fn = STY(it.f, it.wt, it.it); const fk = fn.family + fn.style;
    if (!loaded.has(fk)) { await figma.loadFontAsync(fn); loaded.add(fk); }
    const mk = async (col, dx, dy) => {
      const t = figma.createText(); t.fontName = fn; t.characters = it.t; t.fontSize = it.sz;
      if (it.lh) t.lineHeight = { unit: 'PIXELS', value: it.lh };
      if (it.ls) t.letterSpacing = { unit: 'PIXELS', value: it.ls };
      if (it.up) t.textCase = 'UPPER';
      t.fills = [await paint(col)]; if (it.op < 1) t.opacity = it.op;
      if (it.h < (it.lh || it.sz * 1.3) * 1.6) t.textAutoResize = 'WIDTH_AND_HEIGHT'; else { t.textAutoResize = 'HEIGHT'; t.resize(it.w + 3, it.h); }
      F.appendChild(t); place(t, [it.c[0] + 1.5 + dx, it.c[1] + dy], t.width, t.height, it.a); return t;
    };
    if (it.ts) { const m = it.ts.match(/rgba?\(([^)]+)\) (-?[\d.]+)px (-?[\d.]+)px/); if (m) { const v = m[1].split(/[ ,\/]+/).map(Number);
      const g = await mk([v[0], v[1], v[2], v.length > 3 ? v[3] : 1], +m[2], +m[3]); g.name = 'misregistration'; made.push(g.id); } }
    const t = await mk(it.col, 0, 0); t.name = it.t.slice(0, 40); made.push(t.id);
  } else if (it.k === 's') {
    try { const s = figma.createNodeFromSvg(it.svg); s.name = it.cl || 'glyph'; F.appendChild(s); s.resize(Math.max(it.w,1), Math.max(it.h,1)); place(s, it.c, it.w, it.h, it.a); made.push(s.id); } catch (e) { made.push('svg-fail:' + e.message); }
  }
}
await F.screenshot({ scale: 0.6 });
return { frame: F.id, name: F.name, x: F.x, nodes: made.length, fails: made.filter(m => String(m).startsWith('svg-fail')) };
