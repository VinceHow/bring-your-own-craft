import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT=process.env.ROOT||'.', OUT=process.cwd()+'/shots', PORT=4481, BASE=`http://localhost:${PORT}`; fs.mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const env={...process.env,PORT:String(PORT),MODEL_BACKEND:'fal',RUNS_DIR:fs.mkdtempSync('/tmp/byoc-anyseat-qa-'),THREAD_WARM:'0'}; delete env.FAL_KEY;
const srv=spawn(process.execPath,['server.js'],{cwd:ROOT,env,stdio:'ignore'});
for(let i=0;i<50;i++){try{if((await fetch(BASE+'/')).ok)break;}catch{}await wait(200);}
const LABEL={product:'Product',design:'Design',data:'Data',research:'Research',engineering:'Engineering',strategy:'Strategy'};
const FLEX={role:'flex',flex:{name:'Operations',focus:'the morning bake',stance:'what the counter can really do',loves:'A bake list that adds up.',brings:'the morning bake: what is ready, and when'}};
const b=await chromium.launch(); const R=[]; const ext=[];
for(const [w,h] of [[1920,1130],[1440,900]]) for(const seat of ['product','design','data','research','engineering','strategy']){
  const tag=`${w}-${seat}`; const r={size:`${w}x${h}`,seat,fails:[],notes:[]};
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}); const p=await ctx.newPage();
  const errors=[]; p.on('pageerror',e=>errors.push(String(e)));
  await ctx.route(/fal\.(run|ai|media)|elevenlabs|anthropic/,q=>{ext.push(q.request().url()); q.abort();});
  await p.route('**/api/**',async q=>{ const u=q.request().url(), m=q.request().method();
    if(m==='GET'&&!/voice\/stt/.test(u)) return q.continue();
    if(/\/api\/tidy/.test(u)) return q.fulfill({json:{text:JSON.parse(q.request().postData()).text,tidied:false}});
    if(/\/api\/name-tag/.test(u)){ const x=JSON.parse(q.request().postData()||'{}'); await wait(500); return q.fulfill({json:x.part==='more'?{alternates:{}}:{title:'the Journey Mapper',traits:['problem detective','user obsessed','solution builder'],superpower:'',alternates:{}}}); }
    if(/\/api\/cast\/flex/.test(u)) return q.fulfill({json:FLEX});
    if(/\/api\/cast$/.test(u)) return q.continue();   // the table, no model (routes/cast.js)
    if(/\/api\/run$/.test(u)){ r.runBody=JSON.parse(q.request().postData()); return q.fulfill({json:{run:'stub-anyseat'}}); }
    return q.fulfill({json:{ok:true}}); });
  await p.addInitScript(()=>{try{localStorage.setItem('byoc.timeMode','day')}catch(e){}});
  await p.goto(BASE+'/?look=painted&hold=60'); await p.waitForFunction(()=>window.BYOC&&BYOC.ideaOpen&&BYOC.ideaOpen(),null,{timeout:10000});
  await p.fill('#idea-input',"A website for my friend's bakery where regulars can order their bread ahead"); await p.press('#idea-input','Enter');
  await p.waitForFunction(()=>BYOC.introOpen&&BYOC.introOpen(),null,{timeout:10000}); await wait(1500);
  const opts=await p.$$eval('.pick-option',bs=>bs.map(b=>({seat:b.dataset.seat,sel:b.dataset.selected,text:b.textContent.trim(),vis:!!b.offsetParent})));
  if(opts.map(o=>o.seat).join()!=='product,design,data,research,engineering,strategy,craft') r.fails.push('chips: '+opts.map(o=>o.seat).join());
  if(opts[0]?.sel!=='true') r.fails.push('Product not preselected');
  // geometry of the chip row and the paper
  const geo=async()=>p.evaluate(()=>{ const pc=document.querySelector('.pick-card'), pap=document.querySelector('.nt-paper'); const pr=pap.getBoundingClientRect();
    const chips=[...document.querySelectorAll('.pick-option')].map(b=>{const c=b.getBoundingClientRect(); return {s:b.dataset.seat,l:c.left,r:c.right,t:c.top,b:c.bottom,over:b.scrollWidth>b.clientWidth+1||b.scrollHeight>b.clientHeight+1,fs:parseFloat(getComputedStyle(b).fontSize)};});
    const rows=new Set(chips.map(c=>Math.round(c.t))).size;
    const out=chips.filter(c=>c.l<pr.left-1||c.r>pr.right+1||c.t<pr.top-1||c.b>pr.bottom+1).map(c=>c.s);
    const off=pr.left<0||pr.top<0||pr.right>innerWidth||pr.bottom>innerHeight;
    const ov=[]; for(let i=0;i<chips.length;i++)for(let j=i+1;j<chips.length;j++){const a=chips[i],c=chips[j]; if(a.l<c.r-1&&c.l<a.r-1&&a.t<c.b-1&&c.t<a.b-1) ov.push(a.s+'/'+c.s);}
    return {paper:[pr.left,pr.top,pr.width,pr.height].map(Math.round),rows,out,off,ov,over:chips.filter(c=>c.over).map(c=>c.s),minFs:Math.min(...chips.map(c=>c.fs))}; });
  const g0=await geo(); r.chips=g0; if(g0.out.length) r.fails.push('chip outside paper: '+g0.out); if(g0.off) r.fails.push('paper off-screen'); if(g0.ov.length) r.fails.push('chips overlap '+g0.ov); if(g0.over.length) r.fails.push('chip text clipped '+g0.over); if(g0.minFs<13) r.fails.push('chip font '+g0.minFs);
  if(seat==='product'){ for(const s of ['design','data','research','engineering','strategy','craft','product']){ await p.click(`.pick-option[data-seat="${s}"]`); await wait(250); const sel=await p.getAttribute(`.pick-option[data-seat="${s}"]`,'data-selected'); if(sel!=='true') r.fails.push('cannot pick '+s); if(s==='craft'){ await p.screenshot({path:`${OUT}/${tag}-craft-picked.png`}); } } }
  else { await p.click(`.pick-option[data-seat="${seat}"]`); await wait(400); }
  if(await p.getAttribute(`.pick-option[data-seat="${seat}"]`,'data-selected')!=='true') r.fails.push('picked seat not selected');
  await p.fill('#nt-name','Priya'); await p.fill('#intro-input','I love talking to customers and turning what they say into what we build');
  const g1=await geo(); await p.screenshot({path:`${OUT}/${tag}-1-picked.png`});
  await p.press('#intro-input','Enter'); await wait(250); const gE=await geo();
  await p.waitForFunction(()=>['rough','shown'].includes(document.querySelector('.nt-paper')?.dataset.state),null,{timeout:8000}).catch(()=>r.fails.push('tag never made'));
  await wait(3500); const g2=await p.evaluate(()=>{const pap=document.querySelector('.nt-paper'); const pr=pap.getBoundingClientRect(); return {paper:[pr.left,pr.top,pr.width,pr.height].map(Math.round),state:pap.dataset.state,text:pap.innerText.replace(/\s+/g,' ').slice(0,200)};});
  r.tag=g2; await p.screenshot({path:`${OUT}/${tag}-2-tag.png`});
  if(g2.state!=='shown') r.fails.push('tag state '+g2.state);
  const dj=(a,c)=>Math.max(Math.abs(a[0]-c[0]),Math.abs(a[1]-c[1]));
  r.jump={enter:dj(g1.paper,gE.paper),tag:dj(g1.paper,g2.paper),size:[g1.paper[2]-g2.paper[2],g1.paper[3]-g2.paper[3]]}; if(r.jump.enter>2||r.jump.tag>2) r.fails.push('paper moved on Enter '+JSON.stringify(r.jump));
  await p.evaluate(()=>BYOC.introDone()); 
  await p.waitForFunction(()=>BYOC.beat>=3,null,{timeout:25000}).catch(async()=>{ for(let i=0;i<10&&await p.evaluate(()=>BYOC.beat<3);i++){ await p.evaluate(()=>BYOC.meetNext()); await wait(400);} });
  if(await p.evaluate(()=>BYOC.beat)<3) r.fails.push('never reached the room');
  await wait(4500);
  await p.screenshot({path:`${OUT}/${tag}-3-room.png`});
  const room=await p.evaluate(s=>({cards:document.querySelectorAll('.seat .card').length, her:document.querySelector('.seat-product .card-name')?.textContent.trim(), herCraft:document.body.dataset.herCraft||null,
     theirs:s!=='product'?BYOC.info(s)?.name:null, aside:[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&/steps? aside/i.test(e.textContent)&&e.offsetParent).map(e=>e.textContent.trim().slice(0,90)),
     late:[...document.querySelectorAll('.late-note')].map(n=>n.textContent.trim())}),seat);
  r.room=room;
  if(room.cards<5) r.fails.push('room cards '+room.cards);
  if(room.her!==(LABEL[seat])) r.fails.push(`her card says ${room.her}, not ${LABEL[seat]}`);
  if(seat!=='product'){ if(room.theirs===LABEL[seat]) r.fails.push('teammate did not step aside'); if(!room.aside.length) r.notes.push('no "steps aside" text visible'); }
  if(seat!=='product'&&r.runBody?.craft!==seat) r.notes.push('run body craft '+r.runBody?.craft+' (run not started yet?)');
  if(errors.length) r.fails.push('page errors: '+errors.join(' | ').slice(0,300));
  R.push(r); console.log(tag, r.fails.length?'FAIL '+r.fails.join('; '):'PASS', '| chips rows',g0.rows,'| jump',JSON.stringify(r.jump),'| room',JSON.stringify(room).slice(0,300), r.notes.join('; '));
  await ctx.close();
}
fs.writeFileSync(process.cwd()+'/anyseat.json',JSON.stringify(R,null,1)); console.log('external calls',ext.length);
await b.close(); srv.kill();
