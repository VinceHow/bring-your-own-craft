# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T14-27-41-554Z-1jax/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.0 s (engineering 6.9 s, strategy 7.0 s, product 7.1 s, data 7.1 s, research 7.2 s, design 8.0 s)
- Select (score and decide in parallel): 13.0 s
- Total: 21.0 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **What happens when a class is full** (product, fork on n2) options: Show it as full with no way to join / Offer a waitlist with an automatic spot offer / Show it as full and suggest the next similar class; recommends **Show it as full and suggest the next similar class**. It avoids dead ends without building waitlist logic before there is evidence people want it.
  - why her: In your seat; changes what customers get; your file barely touches it.
- **Whether customers need an account or just a name and email to book** (product, fork on n3) options: Name and email only, no account / Required account with login / Optional account after first booking; recommends **Name and email only, no account**. The smallest end-to-end version has the fewest steps, and 'Book your usual' can recognise a returning customer by email without a login.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **Whether 'Book your usual' ships in v1 and how it decides what the usual is** (product, fork on n5) options: Leave it out of v1 until bookings show repeat patterns / Rebook the customer's most recent class at its next time / Let customers save a favourite class; recommends **Leave it out of v1 until bookings show repeat patterns**. It is an extra that depends on booking history, so it should wait for evidence per the smallest-version principle.
  - why her: In your seat; changes the journey itself; your file barely touches it.

## Decided for her
- c1 engineering: What happens when two people take the last spot → **First confirmed booking wins; the other sees 'just filled' and the class list** (cites team default)
- c2 engineering: Whether full classes get a waitlist → **Waitlist switch off; show 'Full'** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c3 engineering: What is stored about a customer and where → **Name and email only, in the studio's booking database** (cites team default)
- c4 engineering: Whether 'Book your usual' is on, remembered on this device → **On, remembered on this device only (no account)** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 strategy: Whether to take payment online at booking or at the desk → **Pay at the desk** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 strategy: What people can buy: single classes, class packs, or monthly membership → **Single drop-in classes only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c7 strategy: What happens to the customer's money when they cancel, are late, or the studio cancels the class → **Full refund up to a cutoff, then a credit; studio cancels get a full refund** (cites team default)
- c8 strategy: How prices are set: one price or by class type, with or without an intro offer → **One price for every class** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 product: How customers cancel or change a booking, and by when → **Cancel link in the confirmation, free until a set cutoff** (cites team default)
- c13 data: The one number that says the booking page worked → **Bookings completed per week** (cites team default)
- c14 data: What to measure at the confirm step → **Count of confirm screens viewed vs. bookings completed** (cites team default)
- c15 data: What to keep from a booking at the booked step → **Class, time and booking timestamp plus name and email** (cites team default)
- c16 data: What to measure on 'Book your usual' → **Count of bookings started from Book your usual vs. from the classes list** (cites team default)
- c17 research: Whether full classes get a waitlist → **Show 'full' only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 research: What the 'Book your usual' shortcut rebooks → **Last class booked** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 research: Whether customers need an account to book → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 research: Whether payment is taken on the page → **Pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 design: What leads the classes screen: the class list or "Book your usual" → **Class list leads; "Book your usual" is a quiet row above it** (cites team default)
- c22 design: How dense the class list is: grouped by day or one flat list → **Grouped by day, one row per class with time, name, teacher, spots** (cites team default)
- c23 design: What a full or empty class state shows → **Row stays visible, says "Full", button disabled, no waitlist yet** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c24 design: Which single accent colour the page uses → **Warm clay or terracotta on paper and near-black ink** (cites team default)

## All candidates
- c1 engineering [high, not undoable] What happens when two people take the last spot (in her seat false, changes 2, silent 3)
- c2 engineering [low] Whether full classes get a waitlist (in her seat false, changes 1, silent 0)
- c3 engineering [high, not undoable] What is stored about a customer and where (in her seat false, changes 1, silent 2)
- c4 engineering [low] Whether 'Book your usual' is on, remembered on this device (in her seat false, changes 2, silent 2)
- c5 strategy [high, not undoable] Whether to take payment online at booking or at the desk (in her seat false, changes 3, silent 3)
- c6 strategy [high, not undoable] What people can buy: single classes, class packs, or monthly membership (in her seat false, changes 3, silent 2)
- c7 strategy [high, not undoable] What happens to the customer's money when they cancel, are late, or the studio cancels the class (in her seat false, changes 2, silent 3)
- c8 strategy [low] How prices are set: one price or by class type, with or without an intro offer (in her seat false, changes 1, silent 1)
- c9 product [high, not undoable] Whether customers need an account or just a name and email to book (in her seat true, changes 3, silent 1)
- c10 product [high] What happens when a class is full (in her seat true, changes 2, silent 1, dup of c2)
- c11 product [low] Whether 'Book your usual' ships in v1 and how it decides what the usual is (in her seat true, changes 3, silent 1)
- c12 product [high, not undoable] How customers cancel or change a booking, and by when (in her seat true, changes 2, silent 2)
- c13 data [high] The one number that says the booking page worked (in her seat false, changes 0, silent 3)
- c14 data [low] What to measure at the confirm step (in her seat false, changes 0, silent 3)
- c15 data [high, not undoable] What to keep from a booking at the booked step (in her seat false, changes 1, silent 3)
- c16 data [low] What to measure on 'Book your usual' (in her seat false, changes 0, silent 3)
- c17 research [low] Whether full classes get a waitlist (in her seat false, changes 1, silent 2, dup of c2)
- c18 research [low] What the 'Book your usual' shortcut rebooks (in her seat false, changes 2, silent 2, dup of c11)
- c19 research [high, not undoable] Whether customers need an account to book (in her seat false, changes 3, silent 2, dup of c9)
- c20 research [high, not undoable] Whether payment is taken on the page (in her seat false, changes 3, silent 2, dup of c5)
- c21 design [high] What leads the classes screen: the class list or "Book your usual" (in her seat false, changes 2, silent 1)
- c22 design [high] How dense the class list is: grouped by day or one flat list (in her seat false, changes 1, silent 3)
- c23 design [low] What a full or empty class state shows (in her seat false, changes 1, silent 0, dup of c2)
- c24 design [low] Which single accent colour the page uses (in her seat false, changes 0, silent 3)

Meter so far: 100% (9 craft, 0 stamp)
