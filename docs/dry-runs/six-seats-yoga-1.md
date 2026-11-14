# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T13-03-23-622Z-j8h3/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 7.9 s (data 6.9 s, product 7.1 s, strategy 7.1 s, design 7.4 s, engineering 7.4 s, research 7.9 s)
- Select (score and decide in parallel): 10.2 s
- Total: 18.1 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Whether customers can cancel or change a booking themselves** (product, fork on n4) options: Cancel link in the confirmation, up to a cutoff time / Customer contacts the studio / No cancellation in v1; recommends **Customer contacts the studio**. Self-serve cancellation adds rules and edge cases, so the smallest version tells people plainly how to reach the studio.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **How 'Book your usual' decides what the usual is** (product, pin on n5) options: Last class the customer booked, same day and time next week / Most frequently booked class / Cut it from the first version; recommends **Last class the customer booked, same day and time next week**. It is the simplest rule a returning customer can predict, and it needs remembered bookings, so it requires the customer to be recognised.
  - why her: In your seat; changes what customers get; your file barely touches it.
- **What happens when a class is full** (product, fork on n2) options: Show it as full with no further option / Offer a waitlist / Hide full classes; recommends **Show it as full with no further option**. A waitlist is an extra that should wait for evidence, while hiding classes confuses regulars who expect them.
  - why her: In your seat; changes a little of what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)

## Decided for her
- c1 data: The one number that says the booking page worked → **Count of classes booked per week** (cites team default)
- c2 data: What we measure at the confirm step → **Share of people who open confirm and then reach booked** (cites team default)
- c3 data: What we measure on 'Book your usual' → **Count of bookings made through 'Book your usual' vs. through the class list** (cites team default)
- c4 data: What we keep from each booking → **Class, time and the booker's email, kept only while needed to run the class** (cites team default)
- c5 product: What the confirm step asks the customer for → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 strategy: Pay online when booking, or pay at the desk → **Pay at the desk, page only reserves** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 strategy: Single drop-in price only, or also class packs and membership → **One drop-in price per class** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 strategy: What happens to the customer's money when they cancel, are late, or the studio cancels the class → **Free cancel up to a cutoff, studio cancels give full refund or credit** (cites team default)
- c12 strategy: What 'Book your usual' charges and whether it repeats automatically → **Rebook the same class, pay as any single booking** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 design: What leads the classes screen: the week's schedule or the Book your usual shortcut → **Schedule leads, usual shortcut as one row above it** (cites team default)
- c14 design: How dense the class list is → **One row per class: time, name, teacher, spots left** (cites team default)
- c15 design: What a full class shows → **Row stays, button reads 'Class is full' and is disabled** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c16 design: Which single accent the page uses, and where → **One riso ink on the main button and selected row only** (cites team default)
- c17 engineering: What happens when two people take the last spot in a class → **First confirmed booking wins; the other sees 'just filled' and the class list** (cites team default)
- c18 engineering: What is remembered on the customer's device for 'Book your usual' → **Remember me on: store name and last class on this device only** (cites team default)
- c19 engineering: What the page does when booking or confirmation fails → **Show a plain error, keep their choices, offer retry** (cites team default)
- c20 engineering: Whether full classes get a waitlist → **Waitlist off: show 'Full' only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 research: Whether full classes get a waitlist → **Show 'full' only, no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c22 research: Cutoff for late cancellations → **Cancel any time up to the start** (cites team default)
- c23 research: What 'Book your usual' means and who sees it → **Show only to returning customers who have booked before** (cites team default)
- c24 research: What a customer must give to book → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] The one number that says the booking page worked (in her seat false, changes 1, silent 3)
- c2 data [low] What we measure at the confirm step (in her seat false, changes 0, silent 3)
- c3 data [low] What we measure on 'Book your usual' (in her seat false, changes 1, silent 3)
- c4 data [high, not undoable] What we keep from each booking (in her seat false, changes 2, silent 3)
- c5 product [high, not undoable] What the confirm step asks the customer for (in her seat true, changes 2, silent 1)
- c6 product [low] What happens when a class is full (in her seat true, changes 1, silent 1)
- c7 product [high, not undoable] How 'Book your usual' decides what the usual is (in her seat true, changes 2, silent 2)
- c8 product [low] Whether customers can cancel or change a booking themselves (in her seat true, changes 2, silent 2)
- c9 strategy [high, not undoable] Pay online when booking, or pay at the desk (in her seat false, changes 3, silent 1)
- c10 strategy [high, not undoable] Single drop-in price only, or also class packs and membership (in her seat false, changes 2, silent 1)
- c11 strategy [high, not undoable] What happens to the customer's money when they cancel, are late, or the studio cancels the class (in her seat false, changes 2, silent 2)
- c12 strategy [low, not undoable] What 'Book your usual' charges and whether it repeats automatically (in her seat false, changes 2, silent 2)
- c13 design [high] What leads the classes screen: the week's schedule or the Book your usual shortcut (in her seat false, changes 2, silent 3)
- c14 design [low] How dense the class list is (in her seat false, changes 1, silent 3)
- c15 design [low] What a full class shows (in her seat false, changes 1, silent 1, dup of c6)
- c16 design [low] Which single accent the page uses, and where (in her seat false, changes 0, silent 3)
- c17 engineering [high, not undoable] What happens when two people take the last spot in a class (in her seat false, changes 2, silent 3)
- c18 engineering [high, not undoable] What is remembered on the customer's device for 'Book your usual' (in her seat false, changes 2, silent 3)
- c19 engineering [low] What the page does when booking or confirmation fails (in her seat false, changes 1, silent 3)
- c20 engineering [low] Whether full classes get a waitlist (in her seat false, changes 1, silent 1, dup of c6)
- c21 research [high] Whether full classes get a waitlist (in her seat false, changes 1, silent 2, dup of c6)
- c22 research [high, not undoable] Cutoff for late cancellations (in her seat false, changes 2, silent 3, dup of c8)
- c23 research [low] What 'Book your usual' means and who sees it (in her seat false, changes 2, silent 2, dup of c7)
- c24 research [high, not undoable] What a customer must give to book (in her seat false, changes 2, silent 1, dup of c5)

Meter so far: 100% (9 craft, 0 stamp)
