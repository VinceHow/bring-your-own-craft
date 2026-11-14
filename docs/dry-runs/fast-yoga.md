# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T12-20-37-276Z/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 regulars · n6 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 7.3 s (data 5.6 s, research 6.3 s, engineering 6.3 s, product 6.4 s, design 7.3 s)
- Select (score and decide in parallel): 7.8 s
- Total: 15.1 s

## Counter: 15 decisions came up · 3 brought to you · 12 decided

## Her 3
- **What 'Book your usual' books and how it handles a full or changed class** (design, pin on n6) options: One tap books the last-booked class slot next week, with a clear confirm line / Opens the usual class pre-selected, then goes to confirm / Shows a list of past classes to pick from; recommends **Opens the usual class pre-selected, then goes to confirm**. It keeps the shortcut fast but reuses the existing confirm step, so there is no one-tap charge surprise and no new flow to build.
  - why her: In your seat; changes what customers get; your file says nothing on it.
- **What happens when a class is full** (product, fork on n2) options: Show it as full with no way to join / Offer a waitlist that auto-books on a cancellation / Show full and suggest the next class of the same type; recommends **Show full and suggest the next class of the same type**. It avoids a dead end for the customer without building waitlist logic before there is evidence it's needed.
  - why her: In your seat; changes what customers get; your file barely touches it.
- **How confirmation is sent after booking** (engineering, pin on n4) options: Confirmation email sent right away / Confirmation on screen only / Email plus text message; recommends **Confirmation email sent right away**. Email is cheap and reliable, and customers need something to keep, while text adds cost and consent rules.
  - why her: In your seat; changes a little of what customers get; your file says nothing on it.

## Decided for her
- c1 data: What counts as success for the booking page → **Completed bookings (reached 'booked')** (cites team default)
- c2 data: Which funnel steps to record as events → **Every step including class selection** (cites team default)
- c3 data: What customer data to store for regulars' 'Book your usual' → **Name and contact plus last booked class only** (cites team default)
- c4 research: Whether full classes get a waitlist → **Show full classes as sold out, no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 research: Whether booking requires an account or just name and email → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 research: How regulars are recognized for "Book your usual" → **Remember by email from past bookings** (cites team default)
- c7 engineering: How to stop two people taking the last spot → **Database transaction with capacity check at confirm** (cites team default)
- c9 engineering: How regulars are recognised for Book your usual → **Email-based booking history, no account** (cites team default)
- c10 product: What a customer must give to confirm a booking → **Name and email only, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 product: How 'Book your usual' knows who a regular is → **Remember them by email on this device, no login** (cites team default)
- c14 design: How the classes list is organised on first view → **By day, with time, class name and spots left per row** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c15 design: What the confirm and booked screens show, including the full-class and error states → **Confirm: class, time, price, one button; booked: summary plus add to calendar; full classes show 'Full' with no action** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as success for the booking page (inSeat false, changes 1, silent 2)
- c2 data [low] Which funnel steps to record as events (inSeat false, changes 0, silent 3)
- c3 data [high, not undoable] What customer data to store for regulars' 'Book your usual' (inSeat false, changes 1, silent 2)
- c4 research [low] Whether full classes get a waitlist (inSeat true, changes 1, silent 1)
- c5 research [high, not undoable] Whether booking requires an account or just name and email (inSeat true, changes 2, silent 1)
- c6 research [low] How regulars are recognized for "Book your usual" (inSeat true, changes 2, silent 1)
- c7 engineering [high, not undoable] How to stop two people taking the last spot (inSeat false, changes 1, silent 3)
- c8 engineering [low] How confirmation is sent after booking (inSeat true, changes 1, silent 3)
- c9 engineering [high, not undoable] How regulars are recognised for Book your usual (inSeat false, changes 1, silent 2)
- c10 product [high, not undoable] What a customer must give to confirm a booking (inSeat true, changes 2, silent 1, dup of c5)
- c11 product [low] What happens when a class is full (inSeat true, changes 2, silent 2)
- c12 product [high] How 'Book your usual' knows who a regular is (inSeat true, changes 3, silent 1, dup of c6)
- c13 design [high, not undoable] What 'Book your usual' books and how it handles a full or changed class (inSeat true, changes 2, silent 3)
- c14 design [high] How the classes list is organised on first view (inSeat false, changes 1, silent 2)
- c15 design [low] What the confirm and booked screens show, including the full-class and error states (inSeat true, changes 1, silent 1, dup of c11)

Meter so far: 100% (9 craft, 0 stamp)
