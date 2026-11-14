# Dry run: tattoo

- Run: `runs/dry-tattoo-2026-11-14T15-04-22-949Z-vxk1/` (backend: claude-code, team: sonnet effort low, 2 per seat; select: sonnet effort low)
- Idea: A booking site for a tattoo studio.
- Her intro: "I love working on the customer journey, understanding the problems customers face, and building products that solve them."
- Her journey (Design's first sketch, 2.5 s, live, usedFinding false): "Browse artists", "Share your idea", "Pick a time", "Pay deposit", "Get confirmed", "Get tattooed"
- Users: First-timers, Returning clients, The tattoo artist, Studio owner
- Boxes: n1 Browse artists · n2 Share your idea · n3 Pick a time · n4 Pay deposit · n5 Get confirmed · n6 Get tattooed
- Her file: [L1] I love working on the customer journey, understanding the problems customers face, and building products that solve them. (her own words, today) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 6.3 s (design 5.0 s, data 5.3 s, product 5.6 s, strategy 5.7 s, engineering 5.8 s, research 6.3 s)
- Select (score and decide in parallel): 12.0 s
- Total: 18.3 s

## Counter: 12 decisions came up · 3 brought to you · 9 decided

## Her 3
- **Product's teammate:** "What worries someone most at the moment they're asked to put money down for a tattoo?"
  - on: journey (n4) · settles: c5, c8, c12 · valid Ask: true
  - from c5: What the deposit is and what happens to it if the customer cancels or no-shows (team's recommendation if she skips it: Fixed deposit, non-refundable, but transferable once with 48h notice)
  - why (logged only): changes the product; draws on what you know; your file says nothing on it.
- **Product's teammate:** "What does someone need to feel they've been heard about their tattoo idea before they pick a time?"
  - on: journey (n2) · settles: c6, c11 · valid Ask: true
  - from c6: How much the customer must share about their idea before picking a time (team's recommendation if she skips it: Short form: description, placement, size, and optional reference photos)
  - why (logged only): changes the product; draws on what you know best; your file barely touches it.
- **Mika:** "How should it feel for someone booking a permanent piece of art for the first time?"
  - on: wires (n1) · settles: c1 · valid Ask: true
  - from c1: What booking should feel like: guided and reassuring, or quick and self-serve (team's recommendation if she skips it: Guided and reassuring)
  - why (logged only): changes the shape of the product; draws on what you know best; your file barely touches it.

## Decided for her
- c2 design: What leads the deposit screen and what its error and success states show → **Deposit amount and refund terms first, then the form** (cites team default)
- c3 data: What counts as a successful booking: deposit paid, or only after the studio confirms → **Count deposits paid per visitor who started the idea form** (cites team default)
- c4 data: What to keep from the idea form and for how long → **Keep idea text, body placement and size only for booked clients, delete reference photos 12 months after the session** (cites team default)
- c7 strategy: Whether a deposit is required to hold a slot, and how it is set → **Flat deposit for every booking** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 strategy: What happens to the deposit if the customer cancels, reschedules or the studio cancels → **Refundable with long notice, otherwise forfeited; studio cancels means full refund** (cites team default)
- c9 engineering: What happens when two people pick the same time slot → **Hold the slot for 10 minutes while the first person pays the deposit; the second sees it as taken** (cites team default)
- c10 engineering: What the page does if the deposit payment fails or the confirmation message doesn't send → **Keep the slot held, show a plain retry message, and send the confirmation by email with a retry on failure** (cites team default)
- c11 research: How the customer shares their tattoo idea before picking a time → **Short form with description, placement, size and optional reference photos** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 research: Deposit rules: amount, refundability and what happens on cancellation → **Fixed deposit, non-refundable but transferable once with notice** (cites team default)

## All candidates
- c1 design [high] What booking should feel like: guided and reassuring, or quick and self-serve (big 3, hers 3, silent 2) q: "How should it feel for someone booking a permanent piece of art for the first time?"
- c2 design [high, not undoable] What leads the deposit screen and what its error and success states show (big 1, hers 1, silent 2, GRANULAR)
- c3 data [high, not undoable] What counts as a successful booking: deposit paid, or only after the studio confirms (big 0, hers 1, silent 3, GRANULAR, not showable)
- c4 data [high, not undoable] What to keep from the idea form and for how long (big 0, hers 0, silent 3, GRANULAR, not showable)
- c5 product [high, not undoable] What the deposit is and what happens to it if the customer cancels or no-shows (big 2, hers 2, silent 3) q: "What worries someone most at the moment they're asked to put money down for a tattoo?"
- c6 product [high] How much the customer must share about their idea before picking a time (big 2, hers 3, silent 2) q: "What does someone need to feel they've been heard about their tattoo idea before they pick a time?"
- c7 strategy [high, not undoable] Whether a deposit is required to hold a slot, and how it is set (big 2, hers 2, silent 3, GRANULAR, dup of c5)
- c8 strategy [high, not undoable] What happens to the deposit if the customer cancels, reschedules or the studio cancels (big 1, hers 2, silent 3, dup of c5)
- c9 engineering [high, not undoable] What happens when two people pick the same time slot (big 0, hers 1, silent 3, GRANULAR)
- c10 engineering [high, not undoable] What the page does if the deposit payment fails or the confirmation message doesn't send (big 0, hers 1, silent 3, GRANULAR)
- c11 research [high, not undoable] How the customer shares their tattoo idea before picking a time (big 2, hers 3, silent 2, dup of c6)
- c12 research [high, not undoable] Deposit rules: amount, refundability and what happens on cancellation (big 2, hers 2, silent 3, dup of c5)

Meter so far: 100% (4 craft, 0 stamp)
