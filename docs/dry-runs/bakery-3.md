# Dry run: bakery

- Run: `runs/dry-bakery-2026-11-14T16-26-58-192Z-39cj/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A website for a small bakery, so customers can order bread ahead.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.4 s, live, usedFinding false): "Browse breads", "Pick loaves", "Choose pickup day", "Place order", "Baker sees total", "Pick up bread"
- Users: Regular customers, First-timers, The baker
- Boxes: n1 Browse breads · n2 Pick loaves · n3 Choose pickup day · n4 Place order · n5 Baker sees total · n6 Pick up bread
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.2 s (data 7.0 s, design 7.2 s, engineering 7.4 s, product 7.5 s, research 8.0 s, strategy 8.2 s)
- Select (score and decide in parallel): 11.3 s
- Total: 19.5 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Product's teammate:** "What makes someone come back to a small bakery week after week?" (her domain: target customer)
  - on: journey (n1) · settles: c13, c18 · valid Ask: true
  - from c13: Who the site serves first (team's recommendation if she skips it: Regulars who want their usual loaves fast)
  - why (logged only): changes the shape of the product; draws on what you know best; your file barely touches it.
- **Product's teammate:** "When a customer orders ahead, what are they promising the bakery, and what is the bakery promising back?" (her domain: customer problem)
  - on: journey (n4) · settles: c15, c19, c21, c23 · valid Ask: true
  - from c15: Whether customers pay online or at pickup (team's recommendation if she skips it: Pay at pickup)
  - why (logged only): changes the product; draws on what you know; your file barely touches it.
- **Noor:** "When does the baker need to know what people want, and how does that fit with when customers actually decide?" (her domain: customer problem)
  - on: finding (https://www.hippocampus.si/ISSN/1854-6935/23.259-294.pdf) · settles: c17, c16 · valid Ask: true
  - from c17: Order cutoff: how far ahead customers must order (team's recommendation if she skips it: Night before, fixed time)
  - why (logged only): changes the product; draws on what you know; your file says nothing on it; backed by Small bakeries lose bread to guessing how much to bake.

## Decided for her
- c1 data: The one number that says the site worked → **Count of completed pre-orders picked up per week** (cites team default)
- c2 data: What to measure at pickup day choice → **Count of orders per pickup day** (cites team default)
- c3 data: What to measure when the order is placed → **Share of visitors who start an order and complete it** (cites team default)
- c4 data: What customer data to keep from an order and for how long → **Name, phone, items, pickup day; delete after 90 days** (cites team default)
- c5 design: What ordering should feel like: quick and remembered, or guided and reassuring → **Quick and remembered** (cites team default)
- c6 design: What leads the browse and pick screen: photos of loaves or a plain price list → **Plain list with small photos** (cites team default)
- c7 design: What a sold-out loaf or a full pickup day shows → **Offer the next free day** (cites team default)
- c8 design: What the confirmation screen shows after placing the order → **Total, pickup day and order number only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 engineering: What happens when a pickup day's loaves sell out → **Show sold-out and block the order** (cites team default)
- c10 engineering: How the baker learns about each order → **Simple orders list page grouped by pickup day** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 engineering: What the customer receives after placing an order → **On-screen confirmation only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 engineering: What is stored about customers and where → **Name and contact only, in the order record** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 product: What happens when a loaf or pickup day is sold out → **Show it as sold out and hide the day** (cites team default)
- c16 product: How customers change or cancel an order, or miss pickup → **Contact the bakery by phone or email, with a cutoff stated** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 research: Who the first customers are: regulars or new walk-by neighbours → **Regulars who buy weekly** (cites team default)
- c19 research: Whether customers pay online or at pickup → **Pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 research: How much of the bread range to show and offer → **Short list of core loaves** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 strategy: Whether customers pay online when ordering or at pickup → **Pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c22 strategy: How loaves are priced on the site → **Same shelf price as in the shop** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c23 strategy: What happens when an ordered loaf is not picked up → **Bakery absorbs the loss, no penalty** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c24 strategy: Whether customers can change or cancel an order and until when → **Changes allowed any time by contacting the bakery** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] The one number that says the site worked (big 1, hers 2, silent 3, GRANULAR, not showable)
- c2 data [low] What to measure at pickup day choice (big 0, hers 1, silent 3, GRANULAR, not showable)
- c3 data [low] What to measure when the order is placed (big 0, hers 1, silent 3, GRANULAR, not showable)
- c4 data [high, not undoable] What customer data to keep from an order and for how long (big 0, hers 0, silent 3, GRANULAR, not showable)
- c5 design [high] What ordering should feel like: quick and remembered, or guided and reassuring (big 3, hers 3, silent 2)
- c6 design [low] What leads the browse and pick screen: photos of loaves or a plain price list (big 1, hers 1, silent 3, GRANULAR)
- c7 design [low] What a sold-out loaf or a full pickup day shows (big 1, hers 2, silent 3)
- c8 design [low] What the confirmation screen shows after placing the order (big 0, hers 1, silent 1, GRANULAR)
- c9 engineering [high, not undoable] What happens when a pickup day's loaves sell out (big 1, hers 2, silent 3, dup of c7)
- c10 engineering [low] How the baker learns about each order (big 0, hers 0, silent 3, GRANULAR, not showable)
- c11 engineering [low] What the customer receives after placing an order (big 0, hers 1, silent 3, GRANULAR)
- c12 engineering [high, not undoable] What is stored about customers and where (big 1, hers 1, silent 1, GRANULAR, not showable)
- c13 product [high] Who the site serves first (big 3, hers 3, silent 2)
- c14 product [high, not undoable] What happens when a loaf or pickup day is sold out (big 1, hers 2, silent 3, dup of c7)
- c15 product [high, not undoable] Whether customers pay online or at pickup (big 2, hers 2, silent 2)
- c16 product [low] How customers change or cancel an order, or miss pickup (big 1, hers 2, silent 3)
- c17 research [high, not undoable] Order cutoff: how far ahead customers must order (big 2, hers 2, silent 3)
- c18 research [high] Who the first customers are: regulars or new walk-by neighbours (big 3, hers 3, silent 2, dup of c13)
- c19 research [high, not undoable] Whether customers pay online or at pickup (big 2, hers 2, silent 2, dup of c15)
- c20 research [low] How much of the bread range to show and offer (big 1, hers 1, silent 2)
- c21 strategy [high, not undoable] Whether customers pay online when ordering or at pickup (big 2, hers 2, silent 2, dup of c15)
- c22 strategy [low] How loaves are priced on the site (big 1, hers 1, silent 3)
- c23 strategy [high, not undoable] What happens when an ordered loaf is not picked up (big 1, hers 1, silent 3, not showable)
- c24 strategy [high, not undoable] Whether customers can change or cancel an order and until when (big 2, hers 2, silent 3, dup of c16)

Meter so far: 100% (4 craft, 0 stamp)
