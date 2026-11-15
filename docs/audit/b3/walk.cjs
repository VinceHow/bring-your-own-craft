// b3's polish walk: room / inbox / meeting / action page / Team go / build, painted, stubbed routes, real browser.
const { chromium } = require('playwright');
const OUT = process.argv[2], BASE = process.argv[3];
const log = [];
const note = (size, item, ok, detail = '') => log.push(`${ok ? 'PASS' : 'FAIL'} [${size}] ${item}${detail ? ' — ' + detail : ''}`);
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1920, 1130], [1440, 900]]) {
    const size = `${w}x${h}`;
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    let roundBusy = false, proposeFail = true;
    await p.route('**/api/run/stub-run/**', async r => {
      const path = new URL(r.request().url()).pathname;
      if (/\/propose$/.test(path)) return proposeFail ? r.fulfill({ status: 500, json: { error: 'model down' } }) : r.fulfill({ status: 202, json: { ok: true } });
      if (/\/build$/.test(path)) return r.fulfill({ status: 500, json: { error: 'model down' } });
      if (/\/round$/.test(path) && roundBusy) return r.fulfill({ status: 409, json: { error: 'the team is still replying' } });
      if (/\/tally$/.test(path)) return r.fulfill({ status: 404, json: {} });
      return r.fulfill({ status: 202, json: { ok: true } });
    });
    await p.goto(`${BASE}/?stage=1&look=painted`); await p.waitForTimeout(1200);
    const shot = async name => { await p.waitForTimeout(450); const f = `${OUT}/${size}-${name}.jpg`; await p.screenshot({ path: f, type: 'jpeg', quality: 55 }); return f; };
    const scan = async (what) => {
      const r = await p.evaluate(() => {
        const se = document.scrollingElement, bad = [];
        const text = document.getElementById('room').innerText;
        for (const sel of ['#inbox', '#focus-doc:not([hidden])', '#team-status:not([hidden])', '#app-button']) {
          const root = document.querySelector(sel); if (!root) continue;
          for (const e of root.querySelectorAll('button, [data-slot]')) {
            if (!e.offsetParent || !e.clientWidth) continue;
            const cs = getComputedStyle(e);
            if (cs.overflow !== 'visible' && cs.overflowY !== 'auto' && e.scrollWidth > e.clientWidth + 2 && !/auto|scroll/.test(cs.overflowX)) bad.push(`${sel} ${e.dataset.slot || e.className}: ${e.scrollWidth}>${e.clientWidth}`);
          }
        }
        const off = [];
        for (const sel of ['#inbox', '#live-step', '#team-status', '#app-button', '#focus-doc']) { const e = document.querySelector(sel); if (!e || e.hidden || !e.offsetParent && getComputedStyle(e).position !== 'fixed') continue; const r = e.getBoundingClientRect(); if (!r.width) continue; if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) off.push(sel + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',')); }
        bad.push(...off.map(x => 'off-screen ' + x));
        return { pageScroll: se.scrollWidth > innerWidth + 1 || se.scrollHeight > innerHeight + 1, undef: /\bundefined\b|\bNaN\b|\[object /.test(text), bad };
      });
      note(size, `${what}: no page scrollbar`, !r.pageScroll);
      note(size, `${what}: no "undefined"/"NaN" on screen`, !r.undef);
      note(size, `${what}: no cut-off text in b3 components`, !r.bad.length, r.bad.join('; '));
    };
    // 1. The room at the idea; the inbox empty, top right
    await p.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run'; });
    await p.waitForTimeout(600);
    const box = () => p.evaluate(() => { const r = document.getElementById('inbox').getBoundingClientRect(); return { r: r.right, t: r.top, w: r.width, h: r.height, st: document.getElementById('inbox').dataset.state, txt: document.querySelector('#inbox .inbox-now').innerText.trim() }; });
    let bx = await box();
    note(size, 'inbox empty: top right, "Nothing needs you yet"', bx.st === 'empty' && bx.r > w * 0.75 && bx.t < h * 0.2 && bx.txt === 'Nothing needs you yet', JSON.stringify(bx));
    await shot('1-room-inbox-empty'); await scan('room');
    // 2. Team go failing: feedback within 300 ms, then a plain failure + Retry
    let t0 = Date.now();
    await p.evaluate(() => BYOC.teamGo && BYOC.teamGo());
    await p.waitForFunction(() => !document.getElementById('team-status').hidden, null, { timeout: 2000 }).catch(() => {});
    const tg = Date.now() - t0;
    note(size, `Team go: status within 300 ms (${tg} ms)`, tg <= 300);
    await p.waitForFunction(() => document.getElementById('team-status').dataset.state === 'failed', null, { timeout: 6000 }).catch(() => {});
    const tf = await p.evaluate(() => ({ st: document.getElementById('team-status').dataset.state, txt: document.getElementById('team-status').innerText, retry: !!document.querySelector('#team-status button') }));
    note(size, 'Team go failure: plain line + Retry', tf.st === 'failed' && tf.retry, tf.txt.replace(/\s+/g, ' ')); await p.waitForTimeout(600); note(size, 'Team go failure: said once (no second step note)', await p.evaluate(() => document.getElementById('live-step').hidden));
    await shot('2-teamgo-failed');
    proposeFail = false;
    // 3. An ask arrives: "Noor has a question", no preview anywhere
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q1', seat: 'research', by: 'Noor', question: 'What makes someone come back to a bakery week after week?', artifact: { kind: 'journey' } }, 'live'));
    await p.waitForFunction(() => document.getElementById('inbox').dataset.state === 'new', null, { timeout: 5000 }).catch(() => {});
    bx = await box();
    const preview = await p.evaluate(() => [...document.querySelectorAll('#room *')].some(e => e.offsetParent && e.children.length === 0 && /What makes someone come back/.test(e.textContent)));
    note(size, 'inbox new: "Noor has a question", no question preview in the room', bx.st === 'new' && bx.txt === 'Noor has a question →' && !preview, bx.txt);
    await shot('3-inbox-new'); await scan('inbox new');
    // 4. Open: the whole screen, fades in
    const one = await p.evaluate(() => [...document.querySelectorAll('#inbox button, #inbox a, #inbox [tabindex]:not([tabindex="-1"])')].filter(e => e.offsetParent && getComputedStyle(e).pointerEvents !== 'none').length);
    note(size, 'inbox closed with an item: exactly one clickable', one === 1, String(one));
    await p.click('#inbox .inbox-now'); await p.waitForTimeout(400);
    await p.click('#focus-doc [data-slot="all-notes"]');
    await p.waitForTimeout(400); bx = await box();
    note(size, 'the full inbox in two clicks (the line, then "All notes")', bx.st === 'open');
    note(size, 'inbox open: the whole screen', bx.st === 'open' && bx.w > w * 0.9 && bx.h > h * 0.9, `${Math.round(bx.w)}x${Math.round(bx.h)}`);
    await shot('4-inbox-open'); await scan('inbox open');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    note(size, 'inbox open: Esc gets her back', (await box()).st !== 'open');
    // 5. The meeting: open from the line; Send feedback within 300 ms; a reply; busy Send keeps words; End → takeaways
    await p.click('#inbox .inbox-now');
    await p.waitForFunction(() => BYOC.focusDoc.isOpen(), null, { timeout: 3000 }).catch(() => {});
    const ranks = await p.evaluate(() => [document.querySelector('#focus-doc .fd-send').dataset.rank, document.querySelector('#focus-doc .fd-end').dataset.rank]);
    note(size, 'meeting: Send primary, End meeting secondary', ranks[0] === 'primary' && ranks[1] === 'secondary', ranks.join('/'));
    await shot('5-meeting-compose'); await scan('meeting compose');
    await p.locator('#focus-doc .fd-input').fill('It is really for the regulars who come every morning.');
    t0 = Date.now(); await p.keyboard.press('Enter');
    await p.waitForFunction(() => /reading/.test(document.querySelector('#focus-doc .fd-team').textContent), null, { timeout: 2000 }).catch(() => {});
    const sf = Date.now() - t0;
    note(size, `meeting Send: "The team is reading…" within 300 ms (${sf} ms)`, sf <= 300);
    await p.evaluate(() => { BYOC.dispatch({ run: 'stub-run', type: 'thread.start', askId: 'q1', by: ['Noor', 'Mika'] }, 'live'); BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', by: 'Noor', seat: 'research', text: 'Then their usual should be one tap away.', round: 1 }, 'live'); });
    await p.waitForTimeout(900);
    await shot('6-meeting-discussing'); await scan('meeting discussing');
    roundBusy = true;
    await p.locator('#focus-doc .fd-input').fill('And never ask twice.'); await p.locator('#focus-doc .fd-input').focus(); await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.querySelector('#focus-doc .fd-input').value === 'And never ask twice.', null, { timeout: 3000 }).catch(() => {});
    const kept = await p.evaluate(() => [document.querySelector('#focus-doc .fd-input').value, document.querySelector('#focus-doc .fd-team').textContent]);
    note(size, 'meeting: Send while the team still replies keeps her words + says why', kept[0] === 'And never ask twice.' && /still replying/.test(kept[1]), kept[1]);
    await shot('7-meeting-busy');
    roundBusy = false;
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'round.done', askId: 'q1', round: 1, replies: 1 }, 'live'));
    await p.click('#focus-doc .fd-end');
    const ef = await p.evaluate(() => document.querySelector('#focus-doc .fd-team').textContent);
    note(size, 'End meeting: "The team is writing the takeaways…" at once', /writing the takeaways/.test(ef), ef);
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'takeaways', askId: 'q1', believe: 'I believe the regulars come first.', guidance: 'Their usual one tap away; never ask twice.' }, 'live'));
    await p.waitForTimeout(1200);
    const land = await p.evaluate(() => { const c = document.querySelector('#focus-doc [data-slot="side"]'), b = c.querySelector('.fd-brief'); const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(); return !b.hidden && br.top >= cr.top - 2 && br.top < cr.bottom; });
    note(size, 'End → takeaways: appended, the column lands on them', land);
    await shot('8-meeting-takeaways'); await scan('meeting ended');
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'answer', askId: 'q1', text: 'It is really for the regulars.' }, 'live')); // what the server logs at End
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    note(size, 'meeting: Esc gets her back to the room', !(await p.evaluate(() => BYOC.focusDoc.isOpen())));
    // 6. Bo's unblock page
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'u1', unblock: true, seat: 'engineering', by: 'Bo', question: 'When do orders close?', suggestion: '8pm the night before', doing: 'Setting up ordering', artifact: { kind: 'unblock' } }, 'live'));
    await p.waitForFunction(() => document.querySelector('#inbox .inbox-now')?.dataset.action === 'u1', null, { timeout: 5000 }).catch(() => note(size, 'unblock reached the inbox line', false));
    await p.click('#inbox .inbox-now'); await p.waitForTimeout(300); bx = await box();
    const yr = await p.evaluate(() => [document.querySelector('#inbox [data-slot="yes"]')?.dataset.rank, document.getElementById('inbox').dataset.view]);
    note(size, 'unblock: its own full-screen page, Yes primary', bx.st === 'open' && yr[1] === 'action' && yr[0] === 'primary' && bx.w > w * 0.9, yr.join('/'));
    await shot('9-unblock-page'); await scan('unblock page');
    await p.click('#inbox [data-slot="yes"]'); await p.waitForTimeout(1100);
    note(size, 'unblock: after Yes, back to the room on its own', (await box()).st !== 'open');
    // 7. The build: a stopped first build offers Build again
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'build.step', step: 'Build failed: model down', t: Date.now() }, 'replay'));
    const ab = await p.evaluate(() => { const r = document.querySelector('[data-component="app-button"]'); return [r.dataset.state, r.querySelector('.app-label').textContent, r.querySelector('.app-open').disabled]; });
    note(size, 'build stopped: "Build again", enabled', ab[0] === 'failed' && /Build again/.test(ab[1]) && !ab[2], ab.join('/'));
    await shot('10-build-again');
    const own = errs.filter(e => !/Failed to load resource: the server responded with a status of (500|404|409)/.test(e)); note(size, 'no console/page errors (beyond the 500/404/409 the stubs inject on purpose)', !own.length, own.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close();
  console.log(log.join('\n'));
})();
