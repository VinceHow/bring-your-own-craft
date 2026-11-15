# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T16-27-42-026Z-iphd/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.6 s, live, usedFinding true): "Browse classes", "Pick one", "Class full → Waitlist", "Pay or use pass", "Booked", "Show up"
- Users: First-timers, Regulars, The studio owner
- Boxes: n1 Browse classes · n2 Pick one · n3 Waitlist · n4 Pay or use pass · n5 Booked · n6 Show up
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.9 s (product 7.1 s, design 7.3 s, strategy 7.6 s, data 8.0 s, research 8.1 s, engineering 8.9 s)
- Select (score and decide in parallel): 12.1 s
- Total: 20.9 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Product's teammate:** "What makes someone come back to a studio week after week?" (her domain: target customer)
  - on: journey (n1) · settles: c1, c5, c17 · valid Ask: true
  - from c1: Which customer the page serves first (team's recommendation if she skips it: Regulars who book weekly)
  - why (logged only): changes the shape of the product; draws on what you know best; your file says nothing on it.
- **Ines:** "How should it feel to hand over money at the moment you decide to come to a class?" (her domain: user journey)
  - on: journey (n4) · settles: c10, c19, c3 · valid Ask: true
  - from c10: Whether customers pay online when booking or at the desk (team's recommendation if she skips it: Pay online at booking)
  - why (logged only): changes the product; draws on what you know; your file says nothing on it.
- **Wren:** "How should it feel for someone who wanted a class and found it full?" (her domain: customer problem)
  - on: finding (https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist) · settles: c2, c6, c18 · valid Ask: true
  - from c2: What happens when a class is full (team's recommendation if she skips it: Join a waitlist with auto-promotion)
  - why (logged only): changes the product; draws on what you know best; your file says nothing on it; backed by A public leisure centre runs a waitlist on full group-fitness classes.

## Decided for her
- c3 product: How people pay or use a pass at booking → **Pay per class or use a pass in one step** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c4 product: Cancellation and late-cancel rule shown before booking → **Free cancel until a cutoff, then pass credit lost** (cites team default)
- c5 design: What booking should feel like: quick and remembered, or guided and reassuring → **Quick and remembered** (cites team default)
- c6 design: What a full class shows and how the waitlist is offered → **Same row, 'Join the waitlist' replaces Book, shows position** (cites team default)
- c7 design: How dense the class list is and what leads each row → **Day-grouped rows: time first, then class, teacher, spots left** (cites team default)
- c8 design: Which single accent colour the page uses → **Sage green** (cites team default)
- c9 strategy: Whether to sell single classes only, or also class packs → **Single classes plus a class pack** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 strategy: What the customer gets back when they cancel late or the studio cancels → **Full refund early, credit if late, refund if studio cancels** (cites team default)
- c12 strategy: Whether a first-time visitor gets an intro offer → **No intro offer, one standard price** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 data: The one number that says the booking page worked → **Share of class-list visitors who end with a confirmed booking** (cites team default)
- c14 data: What we measure at Pay or use pass → **Count payment starts versus payment completions, split by card or pass** (cites team default)
- c15 data: What we measure at Show up → **Mark attended or no-show per booking, by class** (cites team default)
- c16 data: What we measure at Waitlist → **Count waitlist joins per full class and how many convert to a booking** (cites team default)
- c17 research: Who the page is built for first: regulars or newcomers → **Regulars with passes** (cites team default)
- c18 research: Whether full classes get a waitlist → **Waitlist on full classes** (cites team default)
- c19 research: Whether to take payment at booking or let people pay at the studio → **Pay or use pass online at booking** (cites team default)
- c20 research: Cutoff for cancelling a booked class → **Free cancel until a set time before class** (cites team default)
- c21 engineering: What happens when two people take the last spot → **First confirmed booking wins; the other sees 'just filled' with the waitlist offered** (cites team default)
- c22 engineering: Whether full classes get a waitlist → **Waitlist on, auto-offer the spot by email when someone cancels** (cites team default)
- c23 engineering: How people pay or use a pass, and what is stored → **Card payment through a hosted checkout, with pass balance kept on the booking record by email** (cites team default)
- c24 engineering: What the page does when a step fails, and how bookings are confirmed → **Show a plain retry message, keep the choices entered, and send a confirmation email only after payment succeeds** (cites team default)

## All candidates
- c1 product [high] Which customer the page serves first (big 3, hers 3, silent 3)
- c2 product [high, not undoable] What happens when a class is full (big 2, hers 3, silent 3)
- c3 product [high, not undoable] How people pay or use a pass at booking (big 2, hers 1, silent 1)
- c4 product [low, not undoable] Cancellation and late-cancel rule shown before booking (big 1, hers 1, silent 3)
- c5 design [high] What booking should feel like: quick and remembered, or guided and reassuring (big 2, hers 3, silent 3, dup of c1)
- c6 design [low] What a full class shows and how the waitlist is offered (big 1, hers 2, silent 2, dup of c2)
- c7 design [low] How dense the class list is and what leads each row (big 0, hers 1, silent 3, GRANULAR)
- c8 design [low] Which single accent colour the page uses (big 0, hers 0, silent 3, GRANULAR)
- c9 strategy [high, not undoable] Whether to sell single classes only, or also class packs (big 2, hers 2, silent 3)
- c10 strategy [high, not undoable] Whether customers pay online when booking or at the desk (big 2, hers 2, silent 3)
- c11 strategy [high, not undoable] What the customer gets back when they cancel late or the studio cancels (big 1, hers 2, silent 3)
- c12 strategy [low] Whether a first-time visitor gets an intro offer (big 1, hers 1, silent 3)
- c13 data [high] The one number that says the booking page worked (big 1, hers 2, silent 3, GRANULAR, not showable)
- c14 data [high] What we measure at Pay or use pass (big 0, hers 0, silent 3, GRANULAR, not showable)
- c15 data [low] What we measure at Show up (big 1, hers 2, silent 3, GRANULAR, not showable)
- c16 data [low] What we measure at Waitlist (big 0, hers 0, silent 3, GRANULAR, not showable)
- c17 research [high] Who the page is built for first: regulars or newcomers (big 3, hers 3, silent 3, dup of c1)
- c18 research [high] Whether full classes get a waitlist (big 2, hers 3, silent 3, dup of c2)
- c19 research [high, not undoable] Whether to take payment at booking or let people pay at the studio (big 2, hers 2, silent 3, dup of c10)
- c20 research [low] Cutoff for cancelling a booked class (big 1, hers 1, silent 3, dup of c4)
- c21 engineering [high, not undoable] What happens when two people take the last spot (big 0, hers 0, silent 3, GRANULAR, not showable)
- c22 engineering [high] Whether full classes get a waitlist (big 2, hers 3, silent 3, GRANULAR, dup of c2)
- c23 engineering [high, not undoable] How people pay or use a pass, and what is stored (big 1, hers 1, silent 3, GRANULAR, not showable)
- c24 engineering [low] What the page does when a step fails, and how bookings are confirmed (big 0, hers 0, silent 3, GRANULAR, not showable)

Meter so far: 100% (4 craft, 0 stamp)
