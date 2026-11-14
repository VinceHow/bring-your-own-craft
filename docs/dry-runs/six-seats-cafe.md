# Dry run: cafe

- Run: `runs/dry-cafe-2026-11-14T13-11-47-774Z-fnzb/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A pre-order page for a café's morning pastries.
- Her journey: "today's pastries", "pick a pastry", "pickup time", "pay", "see you at the counter", "regulars → "My usual""
- Boxes: n1 today's pastries · n2 pick a pastry · n3 pickup time · n4 pay · n5 see you at the counter · n6 My usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.7 s (data 7.3 s, strategy 7.7 s, research 8.0 s, engineering 8.2 s, design 8.5 s, product 8.7 s)
- Select (score and decide in parallel): 12.4 s
- Total: 21.1 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Whether customers pay online or at the counter** (product, fork on n4) options: Pay online to confirm the order / Pay at the counter on pickup / Offer both; recommends **Pay online to confirm the order**. Prepaid orders cut no-shows and keep the smallest end-to-end version simple, with one path to build and test.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **What happens when a pastry sells out or the pickup slot is full** (product, pin on n2) options: Show sold-out items greyed out and cap slots per time window / Let people order anyway and sort it out later / Hide sold-out items entirely; recommends **Show sold-out items greyed out and cap slots per time window**. Customers must never pay for a pastry the café can't hand over, and a visible sold-out tells them to come earlier next time.
  - why her: In your seat; changes what customers get; your file says nothing on it.
- **What happens if a customer is late or needs to cancel** (product, pin on n3) options: Hold the order for a short fixed time, no refunds after cutoff / Allow free cancel until a cutoff time, then no refund / Handle by message to the café, no rule on the page; recommends **Allow free cancel until a cutoff time, then no refund**. A clear cutoff protects the café from wasted bakes and tells customers up front what to expect.
  - why her: In your seat; changes what customers get; your file says nothing on it.

## Decided for her
- c1 data: What single number says the page worked → **Count of orders paid and picked up per morning** (cites team default)
- c2 data: What to measure at pickup time selection → **Count of orders per pickup slot** (cites team default)
- c3 data: What to measure and keep at payment → **Count of payment starts vs payment completions, keeping order total and status only** (cites team default)
- c4 data: What to measure for My usual → **Count of orders placed via My usual vs the normal pick flow** (cites team default)
- c5 strategy: Pay online when ordering, or pay at the counter → **Pay online at checkout** (cites team default)
- c6 strategy: What happens to the money if the customer cancels or misses pickup → **Full refund until a cutoff time, none after** (cites team default)
- c7 strategy: How pastries are priced on the page → **Same price as in the café** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 strategy: Whether My usual saves a card for one-tap repeat orders → **Save the order only, pay each time** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 research: What happens when a pastry sells out → **Cap orders at the bakery's stock count** (cites team default)
- c10 research: Whether customers pay online or at the counter → **Pay online when ordering** (cites team default)
- c11 research: How pickup times are offered → **Fixed 15-minute slots with a limit per slot** (cites team default)
- c12 research: Whether to build 'My usual' in the first version → **Build it now as a one-tap reorder** (cites team default)
- c13 engineering: What happens when two people order the last pastry of a kind → **Check stock only at payment; the second person sees 'just sold out' and picks again** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 engineering: What the page does when payment fails or is interrupted → **Keep the order on screen, show a plain error and a retry button, and take no order until paid** (cites team default)
- c15 engineering: Whether 'My usual' is on, and where it is stored → **On, saved on this device only (no account)** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c16 engineering: How pickup times are offered and capped → **Fixed 15-minute slots with a max number of orders per slot** (cites team default)
- c17 design: What leads the first screen: the pastry list or the My usual shortcut → **Pastry list leads; My usual sits as a quiet link above it** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 design: What a sold-out or cut-off pastry shows → **Stays listed, greyed, with 'Sold out' as plain text and no select button** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 design: How pickup time is chosen → **Short list of 15-minute slot buttons, full slots disabled and labelled** (cites team default)
- c20 design: Which single accent colour the page uses → **Warm crust brown-orange on the main button and selected states only** (cites team default)
- c24 product: Whether My usual ships in the first version → **Ship it as a one-tap reorder of the last order** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What single number says the page worked (in her seat false, changes 1, silent 3)
- c2 data [low] What to measure at pickup time selection (in her seat false, changes 1, silent 3)
- c3 data [high, not undoable] What to measure and keep at payment (in her seat false, changes 2, silent 3)
- c4 data [low] What to measure for My usual (in her seat false, changes 0, silent 2)
- c5 strategy [high, not undoable] Pay online when ordering, or pay at the counter (in her seat false, changes 3, silent 2)
- c6 strategy [high, not undoable] What happens to the money if the customer cancels or misses pickup (in her seat false, changes 2, silent 3)
- c7 strategy [low] How pastries are priced on the page (in her seat false, changes 2, silent 2)
- c8 strategy [high, not undoable] Whether My usual saves a card for one-tap repeat orders (in her seat false, changes 2, silent 1)
- c9 research [high, not undoable] What happens when a pastry sells out (in her seat false, changes 2, silent 3)
- c10 research [high, not undoable] Whether customers pay online or at the counter (in her seat false, changes 3, silent 2, dup of c5)
- c11 research [low] How pickup times are offered (in her seat false, changes 2, silent 2)
- c12 research [low] Whether to build 'My usual' in the first version (in her seat false, changes 3, silent 0)
- c13 engineering [high, not undoable] What happens when two people order the last pastry of a kind (in her seat false, changes 2, silent 3)
- c14 engineering [high, not undoable] What the page does when payment fails or is interrupted (in her seat false, changes 2, silent 3)
- c15 engineering [low] Whether 'My usual' is on, and where it is stored (in her seat false, changes 2, silent 2)
- c16 engineering [low] How pickup times are offered and capped (in her seat false, changes 2, silent 2, dup of c11)
- c17 design [high] What leads the first screen: the pastry list or the My usual shortcut (in her seat false, changes 2, silent 1)
- c18 design [low] What a sold-out or cut-off pastry shows (in her seat false, changes 1, silent 1)
- c19 design [high, not undoable] How pickup time is chosen (in her seat false, changes 2, silent 2, dup of c11)
- c20 design [low] Which single accent colour the page uses (in her seat false, changes 0, silent 3)
- c21 product [high, not undoable] What happens when a pastry sells out or the pickup slot is full (in her seat true, changes 2, silent 3, dup of c9)
- c22 product [high, not undoable] Whether customers pay online or at the counter (in her seat true, changes 3, silent 2, dup of c5)
- c23 product [high, not undoable] What happens if a customer is late or needs to cancel (in her seat true, changes 2, silent 3, dup of c6)
- c24 product [low] Whether My usual ships in the first version (in her seat true, changes 3, silent 0, dup of c12)

Meter so far: 100% (10 craft, 0 stamp)
