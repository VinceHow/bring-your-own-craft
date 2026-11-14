# Dry run: cafe

- Run: `runs/dry-cafe-2026-11-14T12-20-52-411Z/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A pre-order page for a café's morning pastries.
- Her journey: "today's pastries", "pick a pastry", "pickup time", "pay", "see you at the counter", "regulars → "My usual""
- Boxes: n1 today's pastries · n2 pick a pastry · n3 pickup time · n4 pay · n5 see you at the counter · n6 regulars · n7 My usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 6.6 s (data 5.4 s, design 5.9 s, engineering 6.2 s, research 6.2 s, product 6.6 s)
- Select (score and decide in parallel): 7.2 s
- Total: 13.7 s

## Counter: 15 decisions came up · 3 brought to you · 12 decided

## Her 3
- **Whether payment is taken online up front** (research, fork on n4) options: Pay online at order / Pay at the counter / Offer both; recommends **Pay online at order**. Paying up front makes the order a real commitment and keeps the first version simple, though we'd first learn whether customers trust paying ahead and what happens with no-shows.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **What happens when a pastry sells out or a pickup slot is full** (product, fork on n2) options: Show a pastry as gone and grey out full slots live / Let people order, then the café confirms or refunds / Cap each pastry at a daily count set by the café; recommends **Cap each pastry at a daily count set by the café**. Pre-orders are a promise to the customer, so counts must be enforced before they pay rather than fixed afterward.
  - why her: In your seat; changes what customers get; your file says nothing on it.
- **How pickup time is chosen and when ordering closes** (product, pin on n3) options: Fixed 15-minute slots with a same-morning cutoff an hour ahead / Fixed 15-minute slots with a cutoff the evening before / Fixed slots with a same-morning cutoff an hour ahead / Free-text 'around what time' with no cutoff; recommends **Fixed 15-minute slots with a same-morning cutoff an hour ahead**. Slots keep the counter manageable while a short cutoff lets people order from bed, and it's the smallest version that works end to end.
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c1 data: What counts as success for the pre-order page → **Completed paid order (payment confirmed)** (cites team default)
- c2 data: Which funnel events to record → **One event per step (view, pastry picked, time picked, paid)** (cites team default)
- c3 data: How long to keep customer name and contact after pickup → **Delete after pickup day** (cites team default)
- c4 design: How pickup time slots handle full or past-cutoff times → **Show all slots, grey out full ones with 'Full'** (cites team default)
- c5 design: How sold-out pastries appear on today's list → **Keep visible, marked 'Sold out', not selectable** (cites team default)
- c6 design: Where the regulars 'My usual' shortcut lives → **Separate entry point, not in the main flow, for v1** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c7 engineering: How to stop two people ordering the last pastry of a kind → **Reserve stock atomically at checkout in the database** (cites team default)
- c8 engineering: How payment is taken and what happens when it fails or is abandoned → **Hosted checkout from a payment provider, with held stock released after a timeout** (cites team default)
- c9 engineering: How "My usual" remembers a regular's order → **Store it only in the browser on that device** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 research: What happens when a pastry sells out → **Show it as sold out** (cites team default)
- c11 research: How pickup times are offered and limited → **Fixed slots with a cap per slot** (cites team default)
- c15 product: Whether regulars and 'My usual' ship in the first version → **Remember the last order on the device without accounts** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as success for the pre-order page (inSeat false, changes 1, silent 3)
- c2 data [low] Which funnel events to record (inSeat false, changes 0, silent 3)
- c3 data [high, not undoable] How long to keep customer name and contact after pickup (inSeat false, changes 1, silent 3)
- c4 design [high] How pickup time slots handle full or past-cutoff times (inSeat false, changes 1, silent 2)
- c5 design [low] How sold-out pastries appear on today's list (inSeat true, changes 1, silent 3)
- c6 design [high] Where the regulars 'My usual' shortcut lives (inSeat false, changes 1, silent 1)
- c7 engineering [high, not undoable] How to stop two people ordering the last pastry of a kind (inSeat false, changes 1, silent 3)
- c8 engineering [high, not undoable] How payment is taken and what happens when it fails or is abandoned (inSeat false, changes 2, silent 2)
- c9 engineering [low] How "My usual" remembers a regular's order (inSeat false, changes 1, silent 2)
- c10 research [low] What happens when a pastry sells out (inSeat true, changes 1, silent 3, dup of c5)
- c11 research [high, not undoable] How pickup times are offered and limited (inSeat true, changes 2, silent 2)
- c12 research [high, not undoable] Whether payment is taken online up front (inSeat true, changes 3, silent 2)
- c13 product [high, not undoable] What happens when a pastry sells out or a pickup slot is full (inSeat true, changes 2, silent 3)
- c14 product [high, not undoable] How pickup time is chosen and when ordering closes (inSeat true, changes 2, silent 2, dup of c11)
- c15 product [low] Whether regulars and 'My usual' ship in the first version (inSeat true, changes 3, silent 0, dup of c6)

Meter so far: 100% (10 craft, 0 stamp)
