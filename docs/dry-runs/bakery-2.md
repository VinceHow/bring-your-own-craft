# Dry run: bakery

- Run: `runs/dry-bakery-2026-11-14T16-26-37-978Z-0rzg/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A website for a small bakery, so customers can order bread ahead.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.4 s, live, usedFinding false): "Browse breads", "Pick loaves", "Choose pickup day", "Pay or confirm", "Baker sees orders", "Pick up bread"
- Users: Regular customers, The baker, First-timers
- Boxes: n1 Browse breads · n2 Pick loaves · n3 Choose pickup day · n4 Pay or confirm · n5 Baker sees orders · n6 Pick up bread
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.5 s (data 7.7 s, research 8.1 s, strategy 8.3 s, engineering 8.4 s, product 8.4 s, design 8.5 s)
- Select (score and decide in parallel): 9.3 s
- Total: 17.8 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Product's teammate:** "What makes someone choose to plan their bread ahead instead of just walking in?" (her domain: target customer)
  - on: journey (n1) · settles: c17, c6 · valid Ask: true
  - from c17: Who the site serves first (team's recommendation if she skips it: Regulars who want their usual loaves reserved)
  - why (logged only): changes the shape of the product; draws on what you know best; your file barely touches it.
- **Wren:** "What would the baker need to know, and by when, to bake with confidence instead of guessing?" (her domain: customer problem)
  - on: finding (https://www.hippocampus.si/ISSN/1854-6935/23.259-294.pdf) · settles: c5, c11, c15 · valid Ask: true
  - from c5: Whether orders close at a cutoff so the baker knows the bake count (team's recommendation if she skips it: Close orders the evening before)
  - why (logged only): changes the product; draws on what you know; your file says nothing on it; backed by Small bakeries lose bread to guessing how much to bake.
- **Mika:** "What do you want a customer to feel in the minute after they've ordered their bread?" (her domain: user journey)
  - on: wires (n1) · settles: c21 · valid Ask: true
  - from c21: What ordering should feel like: quick and remembered, or guided and reassuring (team's recommendation if she skips it: Quick, with reassurance only at pickup day)
  - why (logged only): changes the shape of the product; draws on what you know best; your file barely touches it.

## Decided for her
- c1 data: Which single number says the site worked → **Count of orders picked up per week** (cites team default)
- c2 data: What we measure at choosing a pickup day → **Count of pickup-day selections per day slot, plus days with no slot left** (cites team default)
- c3 data: What we keep about the customer at pay or confirm → **Name and phone only, deleted 30 days after pickup** (cites team default)
- c4 data: What we measure while browsing and picking loaves → **Count of loaves added to cart per bread type** (cites team default)
- c6 research: Who the first customers are: regulars picking up weekly or new people trying the bakery → **Neighbourhood regulars who buy weekly** (cites team default)
- c7 research: Whether customers pay online or just reserve and pay at pickup → **Reserve now, pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 research: How pickup day and time are chosen → **Pick a day only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 strategy: Whether customers pay online when ordering or at pickup → **Pay at pickup** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 strategy: What happens to money or the order when a customer doesn't collect their bread → **No charge, bread is lost to bakery** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 strategy: Whether the bakery sets a minimum order or a cutoff time for ordering ahead → **No minimum, cutoff night before** (cites team default)
- c12 strategy: How prices are shown on the breads → **One fixed price per loaf shown on each bread** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 engineering: Whether customers pay online or just reserve and pay at pickup → **Pay at pickup, no online payment** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 engineering: What happens when two people order the last loaves of a bread → **Count stock per bread per day and reject the later order with a clear message** (cites team default)
- c15 engineering: Which pickup days are offered and when ordering closes for each → **Fixed bake days with a cutoff the evening before** (cites team default)
- c16 engineering: How the customer gets an order confirmation and how the baker sees orders → **Confirmation email plus a password-protected baker order list page** (cites team default)
- c18 product: Whether customers pay online or pay at pickup → **Pay at pickup, just confirm the order** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 product: How pickup days and sold-out loaves are limited → **Baker sets a daily cap per bread and cutoff time** (cites team default)
- c20 product: What happens when a customer needs to change or cancel → **Self-serve change or cancel until the cutoff** (cites team default)
- c22 design: What leads the first screen: the bread list or the pickup day → **Pickup day picker first, then breads available that day** (cites team default)
- c23 design: What a sold-out or closed day shows → **Greyed loaf with 'Sold out' and next available day** (cites team default)
- c24 design: Which single accent colour the bakery page uses → **Warm wheat ochre on cream paper** (cites team default)

## All candidates
- c1 data [high] Which single number says the site worked (big 2, hers 2, silent 3, not showable)
- c2 data [low] What we measure at choosing a pickup day (big 1, hers 2, silent 3, GRANULAR, not showable)
- c3 data [high, not undoable] What we keep about the customer at pay or confirm (big 1, hers 1, silent 2, GRANULAR, not showable)
- c4 data [low] What we measure while browsing and picking loaves (big 0, hers 1, silent 3, GRANULAR, not showable)
- c5 research [high, not undoable] Whether orders close at a cutoff so the baker knows the bake count (big 2, hers 2, silent 3)
- c6 research [high] Who the first customers are: regulars picking up weekly or new people trying the bakery (big 3, hers 3, silent 3)
- c7 research [high, not undoable] Whether customers pay online or just reserve and pay at pickup (big 2, hers 2, silent 1)
- c8 research [low] How pickup day and time are chosen (big 1, hers 2, silent 3)
- c9 strategy [high, not undoable] Whether customers pay online when ordering or at pickup (big 2, hers 2, silent 1, dup of c7)
- c10 strategy [high, not undoable] What happens to money or the order when a customer doesn't collect their bread (big 1, hers 2, silent 2)
- c11 strategy [low] Whether the bakery sets a minimum order or a cutoff time for ordering ahead (big 1, hers 1, silent 2, dup of c5)
- c12 strategy [low] How prices are shown on the breads (big 1, hers 1, silent 3)
- c13 engineering [high, not undoable] Whether customers pay online or just reserve and pay at pickup (big 2, hers 2, silent 1, dup of c7)
- c14 engineering [high, not undoable] What happens when two people order the last loaves of a bread (big 1, hers 1, silent 3, GRANULAR)
- c15 engineering [high] Which pickup days are offered and when ordering closes for each (big 1, hers 2, silent 3, dup of c5)
- c16 engineering [low] How the customer gets an order confirmation and how the baker sees orders (big 0, hers 0, silent 3, GRANULAR, not showable)
- c17 product [high] Who the site serves first (big 3, hers 3, silent 2, dup of c6)
- c18 product [high, not undoable] Whether customers pay online or pay at pickup (big 2, hers 2, silent 1, dup of c7)
- c19 product [high, not undoable] How pickup days and sold-out loaves are limited (big 2, hers 3, silent 3)
- c20 product [low] What happens when a customer needs to change or cancel (big 1, hers 2, silent 3)
- c21 design [high] What ordering should feel like: quick and remembered, or guided and reassuring (big 3, hers 3, silent 2)
- c22 design [high] What leads the first screen: the bread list or the pickup day (big 2, hers 3, silent 3)
- c23 design [low] What a sold-out or closed day shows (big 0, hers 1, silent 3)
- c24 design [low] Which single accent colour the bakery page uses (big 0, hers 0, silent 3, GRANULAR)

Meter so far: 100% (4 craft, 0 stamp)
