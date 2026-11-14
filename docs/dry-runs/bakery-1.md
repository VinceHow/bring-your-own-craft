# Dry run: bakery

- Run: `runs/dry-bakery-2026-11-14T16-26-17-884Z-cyuq/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A website for a small bakery, so customers can order bread ahead.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.5 s, live, usedFinding false): "Browse breads", "Pick loaves", "Choose pickup day", "Place order", "Baker sees total", "Pick up bread"
- Users: Regular customers, First-timers, The baker
- Boxes: n1 Browse breads · n2 Pick loaves · n3 Choose pickup day · n4 Place order · n5 Baker sees total · n6 Pick up bread
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 9.2 s (data 7.0 s, engineering 7.6 s, product 8.0 s, design 8.2 s, strategy 8.7 s, research 9.2 s)
- Select (score and decide in parallel): 8.3 s
- Total: 17.5 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Product's teammate:** "What makes someone come back to the same bakery week after week?" (her domain: target customer)
  - on: journey (n1) · settles: c9, c13, c21 · valid Ask: true
  - from c9: Who the site serves first: busy regulars or first-time neighbours (team's recommendation if she skips it: Regulars who reorder weekly)
  - why (logged only): changes the shape of the product; draws on what you know best; your file says nothing on it.
- **Noor:** "What does a customer need to feel sure of after ordering, so they trust the bread will be waiting?" (her domain: customer problem)
  - on: journey (n4) · settles: c23 · valid Ask: true
  - from c23: What promise we make once an order is placed (team's recommendation if she skips it: Guaranteed, with a limit per loaf)
  - why (logged only): changes the shape of the product; draws on what you know; your file says nothing on it.
- **Noor:** "How early can a customer realistically know what bread they want, and how early does the baker need to know?" (her domain: user journey)
  - on: finding (https://www.hippocampus.si/ISSN/1854-6935/23.259-294.pdf) · settles: c22 · valid Ask: true
  - from c22: How far ahead the baker needs orders (cutoff before pickup day) (team's recommendation if she skips it: Night before)
  - why (logged only): changes the product; draws on what you know; your file says nothing on it; backed by Small bakeries lose bread to guessing how much to bake.

## Decided for her
- c1 data: The one number that says the site worked → **Count of orders picked up per week** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c2 data: What to measure at choosing a pickup day → **Count of orders per pickup day** (cites team default)
- c3 data: What to measure at placing the order → **Share of carts started that become placed orders** (cites L1: "I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today)")
- c4 data: What customer details to keep and for how long → **Name and phone only, deleted 30 days after pickup** (cites team default)
- c5 engineering: What happens when a pickup day's loaves run out → **Show per-day loaf limits and block orders over the limit** (cites team default)
- c6 engineering: How the baker sees new orders → **Emailed order notice plus a simple list page by pickup day** (cites team default)
- c7 engineering: Whether customers pay online when ordering → **Pay at pickup, no online payment** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 engineering: What the customer receives after placing an order → **Confirmation screen plus confirmation email with order number** (cites team default)
- c10 product: What happens when a loaf sells out or the order cutoff passes → **Show per-day limits and mark items sold out** (cites team default)
- c11 product: Whether customers pay online or at pickup → **Pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 product: How pickup day and time are chosen and how changes or cancellations work → **Pick a day only, cancel by message until cutoff** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 design: What ordering should feel like: quick and remembered, or guided and reassuring → **Quick and remembered** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 design: What leads the browse screen: photos of each bread or a plain list with prices → **Plain text list with small photos** (cites team default)
- c15 design: What the pickup-day screen shows when a day is full, closed or has sold out of a loaf → **Grey out the day with a plain reason and the next open day** (cites team default)
- c16 design: What the confirmation screen leads with after the order is placed → **Pickup day, time and loaves as the heading, with a short order number** (cites team default)
- c17 strategy: Whether customers pay online when ordering or at pickup → **Pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 strategy: How to handle no-shows when nothing is paid upfront → **Bakery absorbs it, no penalty** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 strategy: Whether prices are shown fixed per loaf or can change by day → **One fixed price per loaf** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 strategy: What happens to an order the customer changes or cancels, or the bakery can't fill → **Cancel free until a cutoff time** (cites team default)
- c21 research: Who the first customers are: regulars ordering weekly or occasional buyers → **Regulars who buy weekly** (cites team default)
- c24 research: Whether customers pay online or at pickup → **Pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] The one number that says the site worked (big 1, hers 2, silent 3, GRANULAR, not showable)
- c2 data [low] What to measure at choosing a pickup day (big 0, hers 1, silent 3, GRANULAR, not showable)
- c3 data [low] What to measure at placing the order (big 0, hers 1, silent 3, GRANULAR, not showable)
- c4 data [high, not undoable] What customer details to keep and for how long (big 0, hers 0, silent 3, GRANULAR, not showable)
- c5 engineering [high, not undoable] What happens when a pickup day's loaves run out (big 2, hers 3, silent 3)
- c6 engineering [low] How the baker sees new orders (big 1, hers 1, silent 3, GRANULAR, not showable)
- c7 engineering [high, not undoable] Whether customers pay online when ordering (big 2, hers 2, silent 1)
- c8 engineering [low] What the customer receives after placing an order (big 0, hers 1, silent 3, GRANULAR)
- c9 product [high] Who the site serves first: busy regulars or first-time neighbours (big 3, hers 3, silent 3)
- c10 product [high, not undoable] What happens when a loaf sells out or the order cutoff passes (big 2, hers 3, silent 3, dup of c5)
- c11 product [high, not undoable] Whether customers pay online or at pickup (big 2, hers 2, silent 1, dup of c7)
- c12 product [low] How pickup day and time are chosen and how changes or cancellations work (big 1, hers 2, silent 3)
- c13 design [high] What ordering should feel like: quick and remembered, or guided and reassuring (big 2, hers 3, silent 3, dup of c9)
- c14 design [low] What leads the browse screen: photos of each bread or a plain list with prices (big 0, hers 1, silent 3, GRANULAR)
- c15 design [high, not undoable] What the pickup-day screen shows when a day is full, closed or has sold out of a loaf (big 2, hers 3, silent 3, dup of c5)
- c16 design [low] What the confirmation screen leads with after the order is placed (big 0, hers 2, silent 3, GRANULAR)
- c17 strategy [high, not undoable] Whether customers pay online when ordering or at pickup (big 2, hers 2, silent 1, dup of c7)
- c18 strategy [low, not undoable] How to handle no-shows when nothing is paid upfront (big 1, hers 1, silent 2, not showable)
- c19 strategy [low] Whether prices are shown fixed per loaf or can change by day (big 1, hers 1, silent 3)
- c20 strategy [high, not undoable] What happens to an order the customer changes or cancels, or the bakery can't fill (big 2, hers 3, silent 3)
- c21 research [high] Who the first customers are: regulars ordering weekly or occasional buyers (big 3, hers 3, silent 3, dup of c9)
- c22 research [high, not undoable] How far ahead the baker needs orders (cutoff before pickup day) (big 2, hers 2, silent 3)
- c23 research [high, not undoable] What promise we make once an order is placed (big 3, hers 2, silent 3)
- c24 research [low] Whether customers pay online or at pickup (big 2, hers 2, silent 1, dup of c7)

Meter so far: 100% (4 craft, 0 stamp)
