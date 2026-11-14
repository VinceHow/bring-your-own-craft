# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T15-03-50-922Z-rgsu/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.9 s, live, usedFinding true): "Browse classes", "Pick one", "Class full → Waitlist", "Pay or use pass", "Booked", "Show up"
- Users: Students, Drop-ins, The studio owner
- Boxes: n1 Browse classes · n2 Pick one · n3 Waitlist · n4 Pay or use pass · n5 Booked · n6 Show up
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.2 s (research 6.5 s, design 6.9 s, strategy 7.5 s, data 7.5 s, engineering 8.0 s, product 8.2 s)
- Select (score and decide in parallel): 16.7 s
- Total: 25.0 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Noor:** "Who is the person you picture opening this booking page, and what is getting in their way today?"
  - on: journey (n1) · settles: c2, c21 · valid Ask: true
  - from c2: Who the first customers are: regulars with passes or drop-in newcomers (team's recommendation if she skips it: Regulars with passes)
  - why (logged only): changes the shape of the product; draws on what you know best; your file says nothing on it.
- **Noor:** "What should someone feel when the class they wanted is already full?"
  - on: finding (https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist) · settles: c1, c7 · valid Ask: true
  - from c1: Whether full classes get a waitlist (team's recommendation if she skips it: Waitlist on full classes)
  - why (logged only): changes the product; draws on what you know best; your file says nothing on it; backed by A public leisure centre runs a waitlist on full group-fitness classes.
- **Mika:** "How should booking a class feel for someone squeezing it into a busy day?"
  - on: wires (n1) · settles: c5 · valid Ask: true
  - from c5: What booking should feel like: quick and remembered, or guided and reassuring (team's recommendation if she skips it: Quick and remembered)
  - why (logged only): changes the shape of the product; draws on what you know best; your file barely touches it.

## Decided for her
- c3 research: How payment and passes work at booking → **Pay per class or use pass, both at checkout** (cites team default)
- c4 research: What the page says and does when someone needs to cancel → **Free cancel up to a cutoff time** (cites team default)
- c6 design: What leads the class list: by day and time, or by class type and teacher → **Day and time first** (cites team default)
- c7 design: What a full class shows and how the waitlist is offered → **Same row, button becomes Join waitlist** (cites team default)
- c8 design: Which single accent colour the page uses → **Sage green** (cites team default)
- c9 strategy: Pay online at booking or at the desk → **Pay online at booking** (cites team default)
- c10 strategy: Single drop-in price only, or also class packs → **Drop-in plus one class pack** (cites team default)
- c11 strategy: Refund or credit when a customer cancels or is late → **Full refund up to a cutoff, then credit only** (cites team default)
- c12 strategy: Whether waitlisted people pay upfront or only when offered a spot → **Pay only when a spot is offered** (cites team default)
- c13 data: The one number that says the booking page worked → **Share of visitors who reach Booked (confirmed bookings / sessions that viewed classes)** (cites team default)
- c14 data: What to measure at Pay or use pass → **Payment completion rate: payment started vs. payment succeeded, with method (card or pass)** (cites team default)
- c15 data: What to measure at Show up → **Attended vs. booked per class, marked by the teacher at check-in** (cites team default)
- c16 data: What to measure at Waitlist → **Waitlist joins per class, and how many convert to a booking** (cites team default)
- c17 engineering: What happens when two people take the last spot → **First confirmed booking wins; the other sees 'just filled' and is offered the waitlist** (cites team default)
- c18 engineering: Whether full classes get a waitlist → **Waitlist switch on: join with email, notify when a spot opens** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 engineering: What the page does when payment or pass check fails → **Keep the spot unbooked, show a plain error and let them retry with their choice kept** (cites team default)
- c20 engineering: What is stored about the customer and how they get confirmation → **Name and email only, confirmation by email, no remember-me** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 product: Who the page serves first → **Returning regulars who hold passes or memberships** (cites team default)
- c22 product: What happens when a class is full (waitlist behaviour) → **Auto-promote the next person and notify them with a time limit to confirm** (cites team default)
- c23 product: Whether customers need an account to pay or use a pass → **Guest checkout with email only, pass looked up by email** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c24 product: Cancellation and late-arrival policy shown before booking → **Free cancel until a cutoff (e.g. 12 hours), then the class credit is lost; stated plainly at payment** (cites team default)

## All candidates
- c1 research [low] Whether full classes get a waitlist (big 2, hers 3, silent 3) q: "What should someone feel when the class they wanted is already full?"
- c2 research [high, not undoable] Who the first customers are: regulars with passes or drop-in newcomers (big 3, hers 3, silent 3) q: "Who is the person you picture opening this booking page, and what is getting in their way today?"
- c3 research [high, not undoable] How payment and passes work at booking (big 1, hers 1, silent 3)
- c4 research [low, not undoable] What the page says and does when someone needs to cancel (big 2, hers 2, silent 3) q: "How should it feel for a customer when their plans change after they've booked?"
- c5 design [high] What booking should feel like: quick and remembered, or guided and reassuring (big 3, hers 3, silent 2) q: "How should booking a class feel for someone squeezing it into a busy day?"
- c6 design [high] What leads the class list: by day and time, or by class type and teacher (big 1, hers 2, silent 3, GRANULAR)
- c7 design [low] What a full class shows and how the waitlist is offered (big 1, hers 2, silent 3, dup of c1)
- c8 design [low] Which single accent colour the page uses (big 0, hers 0, silent 3, GRANULAR)
- c9 strategy [high, not undoable] Pay online at booking or at the desk (big 1, hers 1, silent 3)
- c10 strategy [high, not undoable] Single drop-in price only, or also class packs (big 2, hers 1, silent 3)
- c11 strategy [high, not undoable] Refund or credit when a customer cancels or is late (big 1, hers 1, silent 3, dup of c4)
- c12 strategy [low, not undoable] Whether waitlisted people pay upfront or only when offered a spot (big 0, hers 1, silent 3, GRANULAR)
- c13 data [high] The one number that says the booking page worked (big 0, hers 1, silent 2, GRANULAR, not showable)
- c14 data [high] What to measure at Pay or use pass (big 0, hers 0, silent 3, GRANULAR, not showable)
- c15 data [low] What to measure at Show up (big 0, hers 0, silent 3, GRANULAR, not showable)
- c16 data [low] What to measure at Waitlist (big 0, hers 0, silent 3, GRANULAR, not showable)
- c17 engineering [high, not undoable] What happens when two people take the last spot (big 0, hers 0, silent 3, GRANULAR)
- c18 engineering [high, not undoable] Whether full classes get a waitlist (big 1, hers 1, silent 3, GRANULAR, dup of c1)
- c19 engineering [high, not undoable] What the page does when payment or pass check fails (big 0, hers 0, silent 3, GRANULAR)
- c20 engineering [low] What is stored about the customer and how they get confirmation (big 0, hers 0, silent 3, GRANULAR)
- c21 product [high] Who the page serves first (big 3, hers 3, silent 3, dup of c2)
- c22 product [high, not undoable] What happens when a class is full (waitlist behaviour) (big 1, hers 2, silent 3, GRANULAR, dup of c1)
- c23 product [high] Whether customers need an account to pay or use a pass (big 0, hers 1, silent 3, GRANULAR)
- c24 product [high, not undoable] Cancellation and late-arrival policy shown before booking (big 2, hers 2, silent 3, dup of c4)

Meter so far: 100% (4 craft, 0 stamp)
