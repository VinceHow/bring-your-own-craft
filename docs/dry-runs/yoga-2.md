# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T12-31-16-067Z-c1r9/` (backend: claude-code, team: sonnet effort low, 5 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.8 s (data 7.6 s, engineering 7.9 s, design 8.1 s, research 8.5 s, product 8.8 s)
- Select (score and decide in parallel): 10.1 s
- Total: 18.9 s

## Counter: 25 decisions came up · 3 brought to you · 22 decided

## Her 3
- **Whether customers can cancel or change a booking themselves, and the late cutoff** (product, fork on n4) options: Cancel link in confirmation email with a cutoff time / Contact the studio to cancel / No cancellation; recommends **Cancel link in confirmation email with a cutoff time**. Without it, cancelled spots stay empty and the studio gets messages. A stated cutoff sets a promise customers will hold the studio to.
  - why her: In your seat; changes what customers get; your file says nothing on it.
- **Whether booking requires an account or just name and email** (product, fork on n3) options: Name and email only, no account / Account required / Optional account after booking; recommends **Name and email only, no account**. The smallest end-to-end version removes sign-up friction, and 'Book your usual' can recognize returning people by email.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **How 'Book your usual' knows what someone's usual class is** (product, pin on n5) options: Remember their last booked class via email or device / Let them mark a favorite class / Cut it from v1; recommends **Remember their last booked class via email or device**. It serves regulars with no extra setup, but it depends on the identity choice and needs only a light version to test.
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c1 data: What counts as a successful booking → **Reaching 'booked' (n4) with a confirmed spot** (cites team default)
- c2 data: Which funnel events to record → **One event per step: classes, class, confirm, booked** (cites team default)
- c3 data: How to measure the 'Book your usual' shortcut → **Track its taps and bookings separately from the browse path** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c4 data: Which customer details to store with a booking → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 data: How long to keep personal booking data → **Delete 12 months after last booking** (cites team default)
- c6 engineering: How to stop two people taking the last spot in a class → **Atomic capacity check and insert in one database transaction** (cites team default)
- c7 engineering: Whether the booking takes payment on the page → **No payment, book only and pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 engineering: Where bookings and classes are stored → **Managed hosted Postgres** (cites team default)
- c9 engineering: How 'Book your usual' recognises a returning customer → **Email-based lookup with a signed link, no account** (cites team default)
- c10 engineering: How the booking confirmation and cancellation reach the customer → **Transactional email sent after the booking is saved** (cites team default)
- c11 design: How the classes list (n1) is organised → **By day, in a time-ordered list** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c12 design: Where 'Book your usual' (n5) sits and what it does → **Top of the classes page, one tap to confirm screen** (cites team default)
- c13 design: What the confirm screen (n3) asks for → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 design: How full classes appear in the list and on a class (n2) → **Show 'Full' greyed out, no action** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 design: What the booked screen (n4) shows and how errors are worded → **Plain 'You're booked' with day, time, add-to-calendar, and a friendly retry message on failure** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c16 research: Whether full classes get a waitlist → **Show 'full' only, no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 research: Whether 'Book your usual' repeats a past booking in one tap → **Pre-fill the class, still go to confirm** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 research: Whether booking needs an account or just name and email → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 research: Whether payment is taken on the page → **Pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 research: What the cancellation rule is and how it is worded → **Free cancel until a cutoff, in plain words** (cites team default)
- c23 product: What happens when a class is full → **Show as full with no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c25 product: Whether payment is taken on the page → **No payment, pay at the studio or with existing pass** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as a successful booking (in her seat false, changes 1, silent 2)
- c2 data [low] Which funnel events to record (in her seat false, changes 0, silent 2)
- c3 data [low] How to measure the 'Book your usual' shortcut (in her seat false, changes 1, silent 1)
- c4 data [high, not undoable] Which customer details to store with a booking (in her seat false, changes 1, silent 1)
- c5 data [high, not undoable] How long to keep personal booking data (in her seat false, changes 1, silent 3)
- c6 engineering [high, not undoable] How to stop two people taking the last spot in a class (in her seat false, changes 2, silent 3)
- c7 engineering [high, not undoable] Whether the booking takes payment on the page (in her seat false, changes 3, silent 1)
- c8 engineering [high, not undoable] Where bookings and classes are stored (in her seat false, changes 0, silent 3)
- c9 engineering [high] How 'Book your usual' recognises a returning customer (in her seat false, changes 2, silent 2)
- c10 engineering [low] How the booking confirmation and cancellation reach the customer (in her seat false, changes 1, silent 2)
- c11 design [high] How the classes list (n1) is organised (in her seat false, changes 2, silent 2)
- c12 design [high] Where 'Book your usual' (n5) sits and what it does (in her seat false, changes 2, silent 2)
- c13 design [high, not undoable] What the confirm screen (n3) asks for (in her seat false, changes 1, silent 1)
- c14 design [low] How full classes appear in the list and on a class (n2) (in her seat false, changes 1, silent 1)
- c15 design [low] What the booked screen (n4) shows and how errors are worded (in her seat false, changes 1, silent 2)
- c16 research [low] Whether full classes get a waitlist (in her seat false, changes 2, silent 2, dup of c14)
- c17 research [low] Whether 'Book your usual' repeats a past booking in one tap (in her seat false, changes 2, silent 2)
- c18 research [high, not undoable] Whether booking needs an account or just name and email (in her seat false, changes 3, silent 1)
- c19 research [high, not undoable] Whether payment is taken on the page (in her seat false, changes 3, silent 1, dup of c7)
- c20 research [high, not undoable] What the cancellation rule is and how it is worded (in her seat false, changes 2, silent 3)
- c21 product [high, not undoable] Whether booking requires an account or just name and email (in her seat true, changes 3, silent 1, dup of c18)
- c22 product [high] How 'Book your usual' knows what someone's usual class is (in her seat true, changes 2, silent 2)
- c23 product [low] What happens when a class is full (in her seat true, changes 1, silent 1, dup of c14)
- c24 product [high, not undoable] Whether customers can cancel or change a booking themselves, and the late cutoff (in her seat true, changes 2, silent 3, dup of c20)
- c25 product [high, not undoable] Whether payment is taken on the page (in her seat true, changes 3, silent 1, dup of c7)

Meter so far: 100% (9 craft, 0 stamp)
