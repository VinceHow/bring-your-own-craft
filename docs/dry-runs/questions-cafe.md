# Dry run: cafe

- Run: `runs/dry-cafe-2026-11-14T15-04-43-791Z-9064/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A pre-order page for a café's morning pastries.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.6 s, live, usedFinding false): "Browse pastries", "Pick items", "Choose pickup time", "Pay", "Get confirmation", "Pick up"
- Users: Morning regulars, Commuters in a rush, Café owner, Counter staff
- Boxes: n1 Browse pastries · n2 Pick items · n3 Choose pickup time · n4 Pay · n5 Get confirmation · n6 Pick up
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.6 s (data 6.6 s, research 7.4 s, strategy 7.6 s, engineering 7.7 s, product 8.1 s, design 8.5 s)
- Select (score and decide in parallel): 20.4 s
- Total: 28.9 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Wren:** "Who is the person you most want this page to make a morning easier for?"
  - on: journey (n1) · settles: c5 · valid Ask: true
  - from c5: Who the page is for: regulars on a commute vs. anyone nearby (team's recommendation if she skips it: Regulars grabbing breakfast on the way to work)
  - why (logged only): changes the shape of the product; draws on what you know best; your file says nothing on it.
- **Wren:** "What should someone feel when the pastry they were looking forward to is gone?"
  - on: journey (n2) · settles: c7, c17 · valid Ask: true
  - from c7: What happens when a pastry sells out (team's recommendation if she skips it: Show live stock and hide sold-out items)
  - why (logged only): changes the product; draws on what you know; your file says nothing on it.
- **Mika:** "What should ordering breakfast feel like for someone who is half-awake and in a hurry?"
  - on: wires (n1) · settles: c21 · valid Ask: true
  - from c21: What ordering should feel like: quick and remembered, or guided and reassuring (team's recommendation if she skips it: Quick and remembered: one scrolling page, running basket, few taps)
  - why (logged only): changes the shape of the product; draws on what you know; your file barely touches it.

## Decided for her
- c1 data: The one number that says the page worked → **Count of orders picked up per week** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c2 data: What to measure at pickup time choice → **Count of orders per pickup slot** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c3 data: What to measure at payment → **Share of people who start paying and complete it** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c4 data: What customer data to keep from confirmed orders → **Keep order items and pickup slot, with no name or contact after pickup** (cites team default)
- c6 research: How pickup time slots work and how many orders per slot → **Fixed slots with a cap per slot** (cites team default)
- c8 research: Whether to take payment online or at pickup → **Pay online at checkout** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 strategy: Pay online at order time or pay at pickup → **Pay online when ordering** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 strategy: Refund and no-show policy for pre-paid orders → **No refund after a cutoff time, full refund before** (cites team default)
- c11 strategy: How prices are set and shown → **Same prices as in the café, tax included** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 strategy: Whether to take a deposit instead of full payment → **Full payment upfront** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 engineering: What happens when two people order the last pastry → **Check stock only at payment; second buyer sees 'just sold out'** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 engineering: What the page shows when payment fails or is abandoned → **Keep the cart, show a clear error and a retry button** (cites L1: "I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today)")
- c15 engineering: How the customer receives their confirmation → **On-screen confirmation plus email** (cites team default)
- c16 engineering: Which pickup times are offered and when ordering closes → **Fixed 15-minute slots with a per-slot cap, closing the evening before** (cites team default)
- c17 product: How limited stock and sell-outs are handled → **Daily cap per item set by café, shown as 'few left'** (cites team default)
- c18 product: How pickup times are offered and when ordering closes → **Fixed 15-minute slots with capacity limits and a cutoff the evening before** (cites team default)
- c19 product: Whether customers pay online up front or at pickup → **Pay online in full at order** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 product: What happens when a customer needs to cancel or change an order → **Free cancel until the cutoff, then final** (cites team default)
- c22 design: What leads the browse and pick screen: photos or a text list → **Compact text list with price and a small thumbnail** (cites team default)
- c23 design: What the pickup time step shows when slots are full or the café is closed → **Show full slots greyed with a label, and offer the next free one** (cites L1: "I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today)")
- c24 design: Which single accent colour the page uses → **Warm crust orange, used on the main button and the selected slot only** (cites team default)

## All candidates
- c1 data [high] The one number that says the page worked (big 0, hers 0, silent 3, GRANULAR, not showable)
- c2 data [high] What to measure at pickup time choice (big 0, hers 0, silent 3, GRANULAR, not showable)
- c3 data [low] What to measure at payment (big 0, hers 0, silent 3, GRANULAR, not showable)
- c4 data [high, not undoable] What customer data to keep from confirmed orders (big 0, hers 0, silent 3, GRANULAR, not showable)
- c5 research [high] Who the page is for: regulars on a commute vs. anyone nearby (big 3, hers 3, silent 3) q: "Who is the person you most want this page to make a morning easier for?"
- c6 research [high, not undoable] How pickup time slots work and how many orders per slot (big 2, hers 1, silent 3)
- c7 research [high, not undoable] What happens when a pastry sells out (big 2, hers 2, silent 3) q: "What should someone feel when the pastry they were looking forward to is gone?"
- c8 research [high, not undoable] Whether to take payment online or at pickup (big 2, hers 1, silent 2)
- c9 strategy [high, not undoable] Pay online at order time or pay at pickup (big 2, hers 1, silent 2, dup of c8)
- c10 strategy [high, not undoable] Refund and no-show policy for pre-paid orders (big 1, hers 1, silent 3)
- c11 strategy [low] How prices are set and shown (big 1, hers 0, silent 2)
- c12 strategy [low, not undoable] Whether to take a deposit instead of full payment (big 1, hers 0, silent 2, not showable, dup of c8)
- c13 engineering [high, not undoable] What happens when two people order the last pastry (big 0, hers 0, silent 3, GRANULAR, not showable)
- c14 engineering [low] What the page shows when payment fails or is abandoned (big 0, hers 1, silent 3, GRANULAR)
- c15 engineering [high, not undoable] How the customer receives their confirmation (big 0, hers 0, silent 3, GRANULAR)
- c16 engineering [high, not undoable] Which pickup times are offered and when ordering closes (big 2, hers 1, silent 3, dup of c6)
- c17 product [high, not undoable] How limited stock and sell-outs are handled (big 1, hers 1, silent 3, dup of c7)
- c18 product [high] How pickup times are offered and when ordering closes (big 2, hers 1, silent 3, dup of c6)
- c19 product [high, not undoable] Whether customers pay online up front or at pickup (big 2, hers 1, silent 2, dup of c8)
- c20 product [low, not undoable] What happens when a customer needs to cancel or change an order (big 1, hers 1, silent 3, dup of c10)
- c21 design [high] What ordering should feel like: quick and remembered, or guided and reassuring (big 3, hers 2, silent 2) q: "What should ordering breakfast feel like for someone who is half-awake and in a hurry?"
- c22 design [low] What leads the browse and pick screen: photos or a text list (big 0, hers 0, silent 3, GRANULAR)
- c23 design [low] What the pickup time step shows when slots are full or the café is closed (big 1, hers 1, silent 3, GRANULAR)
- c24 design [low] Which single accent colour the page uses (big 0, hers 0, silent 3, GRANULAR)

Meter so far: 100% (4 craft, 0 stamp)
