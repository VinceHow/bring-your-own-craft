# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T15-38-25-510Z-2cud/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.5 s, live, usedFinding true): "Browse the schedule", "Pick a class", "Class full → Waitlist", "Pay or use pass", "Booked", "Show up"
- Users: Students, Drop-ins, The studio owner
- Boxes: n1 Browse the schedule · n2 Pick a class · n3 Waitlist · n4 Pay or use pass · n5 Booked · n6 Show up
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.7 s (data 7.3 s, design 7.6 s, product 7.7 s, research 7.9 s, engineering 8.1 s, strategy 8.7 s)
- Select (score and decide in parallel): 12.6 s
- Total: 21.3 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Product's teammate:** "What makes someone come back to a studio week after week?"
  - on: journey (n1) · settles: c9, c14 · valid Ask: true
  - from c9: Who the page serves first: regulars or first-timers (team's recommendation if she skips it: Regulars rebooking weekly)
  - why (logged only): changes the shape of the product; draws on what you know best; your file says nothing on it.
- **Ines:** "What holds a curious newcomer back from walking into a yoga studio for the first time?"
  - on: journey (n2) · settles: c24 · valid Ask: true
  - from c24: Whether a first-time visitor gets an intro offer (team's recommendation if she skips it: Discounted first class)
  - why (logged only): changes the product; draws on what you know best; your file says nothing on it.
- **Noor:** "How should it feel to a student when the class they wanted is already full?"
  - on: finding (https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist) · settles: c10, c13, c7 · valid Ask: true
  - from c10: What happens when a class is full (team's recommendation if she skips it: Offer a waitlist with automatic promotion)
  - why (logged only): changes the product; draws on what you know best; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes.

## Refused by code
- c22: no natural question for it

## Decided for her
- c22 strategy: Pay online at booking or at the desk → **Pay online to book** (cites team default)
- c1 data: The one number that says the booking page worked → **Share of schedule visitors who end with a confirmed booking** (cites team default)
- c2 data: What we measure at the waitlist step → **Count waitlist joins per class, and how many later convert to a booking** (cites team default)
- c3 data: What we measure at the pay or use pass step → **Count payment starts versus completions, split by card or pass** (cites team default)
- c4 data: How we know people show up after booking → **Studio marks attendance per booking; keep it for 12 months, then drop the name** (cites team default)
- c5 design: What booking should feel like: quick and remembered, or guided and reassuring → **Quick and remembered** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 design: How dense the schedule list is and what leads each row → **Time first, one row per class, spots left shown small** (cites team default)
- c7 design: What a full class shows and how the waitlist is offered → **Row stays visible, button becomes Join the waitlist** (cites team default)
- c8 design: Which single accent colour the page uses → **Warm clay on paper** (cites team default)
- c11 product: What the pay-or-use-pass step asks for → **Guest checkout with single-class payment or pass** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 product: Late cancellation and no-show rules and wording → **Free cancel until a cutoff, then credit lost, in plain words** (cites team default)
- c13 research: Whether full classes get a waitlist → **Simple waitlist on full classes** (cites team default)
- c14 research: Who the page is for: regulars or first-timers → **Both with one simple flow** (cites team default)
- c15 research: How payment works: single class, pass, or both → **Single class plus pass use** (cites team default)
- c16 research: How the schedule is shown for browsing → **Weekly list by day** (cites team default)
- c17 engineering: What happens when two people take the last spot → **First confirmed payment wins, the other sees 'just filled' and is offered the waitlist** (cites team default)
- c18 engineering: Whether full classes get a waitlist → **Waitlist on, auto-offer spot by email or text when one opens** (cites team default)
- c19 engineering: What the page does when payment or pass use fails → **Keep the spot choice, show a plain error, let them retry, and never mark booked until payment confirms** (cites team default)
- c20 engineering: What is stored about the customer and how confirmation is sent → **Name and email only, confirmation by email, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 strategy: What the page sells: single classes only, or passes too → **Drop-in plus a class pack** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c23 strategy: Refund and credit rules for cancellations and late cancels → **Studio cancels get full refund, customer cancels get credit before a cutoff** (cites team default)

## All candidates
- c1 data [high] The one number that says the booking page worked (big 1, hers 2, silent 3, GRANULAR, not showable)
- c2 data [low] What we measure at the waitlist step (big 0, hers 0, silent 3, GRANULAR, not showable)
- c3 data [low] What we measure at the pay or use pass step (big 0, hers 0, silent 3, GRANULAR, not showable)
- c4 data [high, not undoable] How we know people show up after booking (big 1, hers 2, silent 3, GRANULAR, not showable)
- c5 design [high] What booking should feel like: quick and remembered, or guided and reassuring (big 3, hers 3, silent 2)
- c6 design [high] How dense the schedule list is and what leads each row (big 1, hers 1, silent 3, GRANULAR)
- c7 design [low] What a full class shows and how the waitlist is offered (big 1, hers 2, silent 2)
- c8 design [low] Which single accent colour the page uses (big 0, hers 0, silent 3, GRANULAR)
- c9 product [high] Who the page serves first: regulars or first-timers (big 3, hers 3, silent 3)
- c10 product [high, not undoable] What happens when a class is full (big 2, hers 3, silent 2)
- c11 product [high, not undoable] What the pay-or-use-pass step asks for (big 2, hers 2, silent 2, GRANULAR)
- c12 product [low] Late cancellation and no-show rules and wording (big 1, hers 2, silent 3)
- c13 research [low] Whether full classes get a waitlist (big 1, hers 2, silent 2, dup of c10)
- c14 research [high] Who the page is for: regulars or first-timers (big 3, hers 3, silent 3, dup of c9)
- c15 research [high, not undoable] How payment works: single class, pass, or both (big 2, hers 2, silent 3)
- c16 research [low] How the schedule is shown for browsing (big 1, hers 1, silent 3, GRANULAR)
- c17 engineering [high, not undoable] What happens when two people take the last spot (big 0, hers 0, silent 3, GRANULAR)
- c18 engineering [high] Whether full classes get a waitlist (big 1, hers 2, silent 2, GRANULAR, dup of c10)
- c19 engineering [high, not undoable] What the page does when payment or pass use fails (big 0, hers 0, silent 3, GRANULAR)
- c20 engineering [low] What is stored about the customer and how confirmation is sent (big 0, hers 0, silent 3, GRANULAR, not showable)
- c21 strategy [high, not undoable] What the page sells: single classes only, or passes too (big 2, hers 2, silent 3)
- c22 strategy [high, not undoable] Pay online at booking or at the desk (big 2, hers 2, silent 3)
- c23 strategy [high, not undoable] Refund and credit rules for cancellations and late cancels (big 1, hers 2, silent 3, dup of c12)
- c24 strategy [low] Whether a first-time visitor gets an intro offer (big 2, hers 3, silent 3)

Meter so far: 100% (4 craft, 0 stamp)
