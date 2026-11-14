# Dry run: shoe-returns

- Run: `runs/dry-shoe-returns-2026-11-14T12-18-00-152Z/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A returns page for an online shoe shop.
- Her journey: (none given)
- Boxes: 
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 6.4 s (research 5.6 s, engineering 5.9 s, product 6.0 s, data 6.2 s, design 6.4 s)
- Select (score and decide in parallel): 7.9 s
- Total: 14.3 s

## Counter: 15 decisions came up · 3 brought to you · 12 decided

## Her 3
- **Whether customers get a refund or exchange as the main return choice** (research, fork on the page) options: Refund only / Exchange only / Offer both, refund first; recommends **Offer both, refund first**. Shoe returns are mostly about fit, so we should first learn from order data and support emails which outcome customers actually ask for.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **How long the return window is and who pays return shipping** (research, fork on the page) options: 30 days, customer pays / 30 days, free returns / 14 days, customer pays; recommends **30 days, customer pays**. This is a promise made to customers that is hard to take back, so we'd first learn what competitors offer and what the shop can afford.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **What the v1 returns page lets a customer do end to end** (product, fork on the page) options: Start a return and get a label, nothing more / Start a return plus exchange for another size / Start a return, exchange, and track refund status; recommends **Start a return and get a label, nothing more**. The smallest version that works end to end is a customer starting a return and getting a label; exchanges and tracking wait for evidence.
  - why her: In your seat; changes the journey itself; your file barely touches it.

## Decided for her
- c3 research: How customers identify the order they are returning → **Order number and email** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c4 engineering: How a customer proves which order they are returning → **Order number plus email, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 engineering: Whether the page issues refunds automatically or only records a request for staff → **Record request, staff refunds manually** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 engineering: How to stop duplicate or repeat return requests for the same item → **Unique constraint per order line item in the database** (cites team default)
- c8 product: How the page finds the customer's order → **Order number plus email, no login** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 product: What the page says when an item is outside the return window or not returnable → **Plain-words message with the date and a contact link** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c10 data: What counts as success for the returns page → **Completed returns started per visitor, with fewer support contacts about returns** (cites team default)
- c11 data: Whether to record the customer's return reason and what form it takes → **One required pick from a short list of reasons (size, fit, comfort, changed mind, damaged)** (cites team default)
- c12 data: How long personal return data (name, address, order details) is kept → **Delete personal fields 90 days after the return closes, keep anonymous counts** (cites team default)
- c13 design: How a customer finds their order to start a return → **Order number + email lookup, no account needed** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 design: How the customer states the reason for return and size problem → **Plain-language choices like 'Too small' / 'Too big' / 'Not what I expected'** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c15 design: What the confirmation screen gives the customer after submitting → **Return label download plus drop-off steps and refund timing on screen** (cites team default)

## All candidates
- c1 research [high, not undoable] Whether customers get a refund or exchange as the main return choice (inSeat true, changes 3, silent 3)
- c2 research [high, not undoable] How long the return window is and who pays return shipping (inSeat true, changes 3, silent 3)
- c3 research [low] How customers identify the order they are returning (inSeat true, changes 2, silent 2)
- c4 engineering [high, not undoable] How a customer proves which order they are returning (inSeat false, changes 2, silent 2, dup of c3)
- c5 engineering [high, not undoable] Whether the page issues refunds automatically or only records a request for staff (inSeat false, changes 1, silent 2)
- c6 engineering [low] How to stop duplicate or repeat return requests for the same item (inSeat false, changes 1, silent 3)
- c7 product [high] What the v1 returns page lets a customer do end to end (inSeat true, changes 3, silent 1)
- c8 product [high] How the page finds the customer's order (inSeat true, changes 2, silent 2, dup of c3)
- c9 product [low] What the page says when an item is outside the return window or not returnable (inSeat true, changes 2, silent 1)
- c10 data [high] What counts as success for the returns page (inSeat false, changes 0, silent 3)
- c11 data [high, not undoable] Whether to record the customer's return reason and what form it takes (inSeat true, changes 2, silent 2)
- c12 data [high, not undoable] How long personal return data (name, address, order details) is kept (inSeat false, changes 1, silent 3)
- c13 design [high] How a customer finds their order to start a return (inSeat false, changes 2, silent 2, dup of c3)
- c14 design [low] How the customer states the reason for return and size problem (inSeat true, changes 1, silent 0)
- c15 design [low] What the confirmation screen gives the customer after submitting (inSeat true, changes 2, silent 2)

Meter so far: 100% (4 craft, 0 stamp)
