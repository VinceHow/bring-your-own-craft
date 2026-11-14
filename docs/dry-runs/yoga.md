# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T12-20-00-208Z/` (backend: claude-code, team: sonnet effort low, 5 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 regulars · n6 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.0 s (data 7.7 s, engineering 7.8 s, product 7.8 s, research 7.9 s, design 8.0 s)
- Select (score and decide in parallel): 9.8 s
- Total: 17.8 s

## Counter: 25 decisions came up · 3 brought to you · 22 decided

## Her 3
- **Whether customers can cancel or change a booking, and by when** (product, fork on n4) options: Cancel link in the confirmation email, up to a cutoff / No self-serve cancel, contact the studio / Cancel and reschedule anytime; recommends **Cancel link in the confirmation email, up to a cutoff**. Cancelling frees the spot for others, and a stated cutoff sets a promise the studio can keep.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **Whether payment is taken at booking** (product, fork on n3) options: No payment, pay at the studio / Pay online at confirm / Pay online only for drop-ins; recommends **No payment, pay at the studio**. Taking money adds refunds, fees and policies, so the smallest version leaves payment to the studio until evidence says otherwise.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **What happens when a class is full** (product, fork on n2) options: Show it as full with no booking / Offer a waitlist / Hide full classes; recommends **Show it as full with no booking**. A waitlist is an extra that should wait for evidence, while hiding classes confuses regulars looking for their usual.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by PLACEHOLDER finding: waitlists on full fitness classes. (source: PLACEHOLDER finding: waitlists on full fitness classes, TODO)

## Decided for her
- c1 data: What counts as a successful booking → **Booking reaches the 'booked' screen** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c2 data: Which customer details to store at confirm → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c3 data: Which funnel events to record → **One event per step: classes viewed, class opened, confirm started, booked** (cites team default)
- c4 data: How to recognise a regular for 'Book your usual' → **Email entered at confirm, matched to past bookings** (cites team default)
- c5 data: How long to keep booking records with personal details → **12 months after last booking, then delete or anonymise** (cites team default)
- c6 engineering: How to stop two people taking the last spot → **Atomic capacity check and insert in one database transaction** (cites team default)
- c7 engineering: Where bookings and classes are stored → **Managed Postgres database** (cites team default)
- c8 engineering: How 'Book your usual' recognises a regular → **Email-only lookup with a magic link** (cites team default)
- c9 engineering: Whether the page takes payment at booking → **No payment, pay at the studio or with an existing pass** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 engineering: How the booked confirmation is delivered and what happens if sending fails → **Show on screen and send email via a transactional provider, with retry** (cites team default)
- c11 product: What a customer must give to book a class → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 product: How regulars are recognized for Book your usual → **Remember them by email on this device** (cites team default)
- c16 research: Whether full classes get a waitlist → **No waitlist at launch** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 research: What we'd learn first: how customers book today (DM, phone, walk-in, other app) → **Ask 5 regulars how they book now** (cites team default)
- c18 research: Whether customers need an account to book → **No account, name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 research: Whether payment is taken on the page → **Pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 research: Whether the regulars 'Book your usual' shortcut ships in v1 → **Ship it in v1** (cites team default)
- c21 design: How the classes list is organised → **Day-by-day schedule with times** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c22 design: Whether booking needs an account or just name and email → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c23 design: How 'Book your usual' knows who the regular is and what their usual is → **Remember last booking on this device** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c24 design: What the booked screen shows and how it handles payment → **Confirmation with date, time, add to calendar; pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c25 design: How full classes appear on a class page → **Greyed with 'Full' and no action** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as a successful booking (inSeat false, changes 1, silent 2)
- c2 data [high, not undoable] Which customer details to store at confirm (inSeat false, changes 1, silent 1)
- c3 data [low] Which funnel events to record (inSeat false, changes 0, silent 3)
- c4 data [high, not undoable] How to recognise a regular for 'Book your usual' (inSeat false, changes 2, silent 1)
- c5 data [low, not undoable] How long to keep booking records with personal details (inSeat false, changes 0, silent 3)
- c6 engineering [high, not undoable] How to stop two people taking the last spot (inSeat false, changes 1, silent 3)
- c7 engineering [high, not undoable] Where bookings and classes are stored (inSeat false, changes 0, silent 3)
- c8 engineering [high, not undoable] How 'Book your usual' recognises a regular (inSeat false, changes 2, silent 1, dup of c4)
- c9 engineering [high, not undoable] Whether the page takes payment at booking (inSeat false, changes 3, silent 1)
- c10 engineering [low] How the booked confirmation is delivered and what happens if sending fails (inSeat false, changes 1, silent 2)
- c11 product [high, not undoable] What a customer must give to book a class (inSeat true, changes 2, silent 1)
- c12 product [low] What happens when a class is full (inSeat true, changes 2, silent 1)
- c13 product [high, not undoable] How regulars are recognized for Book your usual (inSeat true, changes 2, silent 1)
- c14 product [high, not undoable] Whether customers can cancel or change a booking, and by when (inSeat true, changes 3, silent 3)
- c15 product [high, not undoable] Whether payment is taken at booking (inSeat true, changes 3, silent 1)
- c16 research [high] Whether full classes get a waitlist (inSeat true, changes 2, silent 1, dup of c12)
- c17 research [high] What we'd learn first: how customers book today (DM, phone, walk-in, other app) (inSeat true, changes 1, silent 3)
- c18 research [high, not undoable] Whether customers need an account to book (inSeat true, changes 2, silent 1, dup of c11)
- c19 research [high, not undoable] Whether payment is taken on the page (inSeat true, changes 3, silent 1, dup of c15)
- c20 research [low] Whether the regulars 'Book your usual' shortcut ships in v1 (inSeat true, changes 2, silent 1, dup of c13)
- c21 design [high] How the classes list is organised (inSeat false, changes 1, silent 3)
- c22 design [high, not undoable] Whether booking needs an account or just name and email (inSeat true, changes 2, silent 1, dup of c11)
- c23 design [high] How 'Book your usual' knows who the regular is and what their usual is (inSeat true, changes 2, silent 1, dup of c13)
- c24 design [high, not undoable] What the booked screen shows and how it handles payment (inSeat true, changes 2, silent 1, dup of c15)
- c25 design [low] How full classes appear on a class page (inSeat false, changes 1, silent 1, dup of c12)

Meter so far: 100% (9 craft, 0 stamp)
