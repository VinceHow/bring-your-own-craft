# Dry run: cafe

- Run: `runs/dry-cafe-2026-11-14T12-20-18-037Z/` (backend: claude-code, team: sonnet effort low, 5 per seat; select: sonnet effort low)
- Idea: A pre-order page for a café's morning pastries.
- Her journey: "today's pastries", "pick a pastry", "pickup time", "pay", "see you at the counter", "regulars → "My usual""
- Boxes: n1 today's pastries · n2 pick a pastry · n3 pickup time · n4 pay · n5 see you at the counter · n6 regulars · n7 My usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.7 s (data 7.1 s, research 7.6 s, engineering 7.9 s, design 8.1 s, product 8.7 s)
- Select (score and decide in parallel): 10.5 s
- Total: 19.2 s

## Counter: 25 decisions came up · 3 brought to you · 22 decided

## Her 3
- **How pickup time is chosen and when ordering closes** (product, pin on n3) options: Fixed 15-minute slots with a cutoff the evening before or X minutes ahead / Free-text 'around 8am' request / Only 'as soon as ready'; recommends **Fixed 15-minute slots with a cutoff the evening before or X minutes ahead**. Slots let the kitchen plan bakes and keep the counter from jamming, with the smallest build that works.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **Whether customers pay online now or at the counter** (product, fork on n4) options: Pay online at order time / Pay at the counter on pickup / Online or counter, customer's choice; recommends **Pay online at order time**. Prepaying cuts no-shows and gives a clear commitment, and one payment path is the smallest end-to-end version.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **What the order cutoff and daily pastry limits are** (research, pin on n1) options: Cutoff the evening before with set quantities / Same-morning orders until sold out; recommends **Cutoff the evening before with set quantities**. We'd learn first how much the café bakes and when customers decide, since promising pastries that aren't there breaks trust.
  - why her: In your seat; changes the journey itself; your file says nothing on it.

## Decided for her
- c1 data: What counts as a successful pre-order → **Order paid and picked up** (cites team default)
- c2 data: Which funnel events to track from today's pastries to payment → **One event per journey step (view, pick, time chosen, paid)** (cites team default)
- c3 data: How long to keep customer contact and order details → **Delete personal details 30 days after pickup** (cites team default)
- c4 data: Which fields to store on each order → **Pastry, quantity, pickup time, payment status, first name** (cites team default)
- c5 data: How to measure whether My usual is worth keeping → **Share of regulars' orders placed via My usual** (cites team default)
- c6 research: Whether sold-out pastries get a waitlist → **No waitlist, mark as sold out** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c7 research: How pickup time slots are offered → **Fixed 15-minute slots** (cites team default)
- c8 research: Whether customers pay online at order time → **Pay online to confirm** (cites team default)
- c9 research: Whether to build the regulars 'My usual' repeat order now → **Build it in the first version** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 engineering: How to stop two people ordering the last pastry → **Atomic stock decrement in the database at checkout** (cites team default)
- c12 engineering: Whether payment is taken online or paid at the counter → **Online card payment through a hosted provider checkout** (cites team default)
- c13 engineering: Cutoff and pickup-slot limits for morning orders → **Fixed slots with a per-slot cap and an order cutoff time** (cites team default)
- c14 engineering: How 'My usual' remembers regulars → **Browser local storage, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 engineering: What happens when payment succeeds but the order fails to save, or the reverse → **Confirm via payment provider webhook, then create the order idempotently** (cites team default)
- c16 design: How pickup time slots are offered and limited → **Fixed 15-minute slots with a cap per slot** (cites team default)
- c17 design: What the page shows when a pastry sells out → **Show it greyed out as 'All gone for today'** (cites team default)
- c18 design: Whether the first version includes the regulars 'My usual' shortcut → **Include it as a one-tap reorder** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 design: Whether customers pay online at checkout or at the counter → **Pay online at checkout** (cites team default)
- c20 design: What the confirmation screen says and shows → **Plain 'See you at the counter' with pastry, time and a name** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c21 product: What happens when a pastry sells out or a pickup slot is full → **Show live counts and grey out sold-out items/slots** (cites team default)
- c24 product: What happens when a customer cancels, changes, or is late to pick up → **Free cancel until cutoff; after that no refund, held 30 min then given away** (cites team default)
- c25 product: Whether 'My usual' for regulars ships in the first version → **Ship with saved last order, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as a successful pre-order (inSeat false, changes 1, silent 3)
- c2 data [low] Which funnel events to track from today's pastries to payment (inSeat false, changes 0, silent 3)
- c3 data [high, not undoable] How long to keep customer contact and order details (inSeat false, changes 1, silent 3)
- c4 data [high, not undoable] Which fields to store on each order (inSeat false, changes 1, silent 3)
- c5 data [low] How to measure whether My usual is worth keeping (inSeat false, changes 0, silent 2)
- c6 research [low] Whether sold-out pastries get a waitlist (inSeat true, changes 2, silent 2)
- c7 research [high] How pickup time slots are offered (inSeat true, changes 3, silent 3)
- c8 research [high, not undoable] Whether customers pay online at order time (inSeat true, changes 3, silent 3)
- c9 research [low] Whether to build the regulars 'My usual' repeat order now (inSeat true, changes 2, silent 0)
- c10 research [high, not undoable] What the order cutoff and daily pastry limits are (inSeat true, changes 3, silent 3)
- c11 engineering [high, not undoable] How to stop two people ordering the last pastry (inSeat false, changes 1, silent 3)
- c12 engineering [high, not undoable] Whether payment is taken online or paid at the counter (inSeat false, changes 1, silent 3, dup of c8)
- c13 engineering [high, not undoable] Cutoff and pickup-slot limits for morning orders (inSeat false, changes 2, silent 3, dup of c7)
- c14 engineering [low] How 'My usual' remembers regulars (inSeat false, changes 1, silent 1)
- c15 engineering [high, not undoable] What happens when payment succeeds but the order fails to save, or the reverse (inSeat false, changes 1, silent 3)
- c16 design [high, not undoable] How pickup time slots are offered and limited (inSeat false, changes 2, silent 3, dup of c7)
- c17 design [high, not undoable] What the page shows when a pastry sells out (inSeat false, changes 2, silent 3, dup of c6)
- c18 design [high] Whether the first version includes the regulars 'My usual' shortcut (inSeat true, changes 2, silent 0, dup of c9)
- c19 design [high, not undoable] Whether customers pay online at checkout or at the counter (inSeat false, changes 3, silent 3, dup of c8)
- c20 design [low] What the confirmation screen says and shows (inSeat true, changes 1, silent 1)
- c21 product [high, not undoable] What happens when a pastry sells out or a pickup slot is full (inSeat true, changes 2, silent 3, dup of c6)
- c22 product [high] How pickup time is chosen and when ordering closes (inSeat true, changes 3, silent 3, dup of c7)
- c23 product [high, not undoable] Whether customers pay online now or at the counter (inSeat true, changes 3, silent 3, dup of c8)
- c24 product [high, not undoable] What happens when a customer cancels, changes, or is late to pick up (inSeat true, changes 3, silent 3)
- c25 product [low] Whether 'My usual' for regulars ships in the first version (inSeat true, changes 2, silent 0, dup of c9)

Meter so far: 100% (10 craft, 0 stamp)
