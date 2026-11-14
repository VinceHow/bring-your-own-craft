# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T13-11-47-771Z-38p5/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 9.6 s (data 7.5 s, product 7.6 s, strategy 7.7 s, research 7.7 s, engineering 7.8 s, design 9.6 s)
- Select (score and decide in parallel): 11.0 s
- Total: 20.5 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **What happens when a class is full** (product, pin on n2) options: Show it as full with no booking button / Offer a waitlist with an email notice / Hide full classes; recommends **Show it as full with no booking button**. A waitlist is an extra that should wait for evidence; showing 'Full' is honest and cheap.
  - why her: In your seat; changes a little of what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **What the confirm step asks the customer for** (product, pin on n3) options: Name and email only / Name, email and phone / Full account sign-up; recommends **Name and email only**. Smallest version that works end to end: the studio needs a way to reach people and nothing more, and extra fields cost bookings.
  - why her: In your seat; changes what customers get; your file barely touches it.
- **How 'Book your usual' knows who the returning customer is and what their usual class is** (product, pin on n5) options: Remember the device and last booked class / Ask for email and look up past bookings / Cut it from v1; recommends **Remember the device and last booked class**. It serves regulars with no login, but it only works once a first booking exists, so it should stay simple and fall back to the class list.
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c1 data: The one number that says the booking page worked → **Bookings completed per week (reaching 'booked')** (cites team default)
- c2 data: What we measure at the confirm step → **Count of confirm views vs. bookings completed (drop-off)** (cites team default)
- c3 data: What we keep from each booking at 'booked' → **Name, contact, class and time only** (cites team default)
- c4 data: What we measure on 'Book your usual' → **Count of bookings started from 'Book your usual' vs. via the classes list** (cites team default)
- c8 product: Whether customers can cancel or change a booking, and how late → **Customers contact the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 strategy: Pay online when booking, or at the desk → **Pay at the desk on arrival** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 strategy: Single classes only, or passes and membership too → **Single drop-in classes only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 strategy: What happens to money when someone cancels or the class is cancelled → **Free cancel up to a set time, credit after that** (cites team default)
- c12 strategy: Whether Book your usual charges the same as a normal booking → **Same single-class price, no discount** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 research: Whether full classes get a waitlist → **Show 'full' only, no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 research: Whether people pay when booking or at the studio → **Pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 research: How 'Book your usual' knows what the usual is → **Last class they booked** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c16 research: Whether customers need an account to book → **No account, name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 engineering: What happens when two people take the last spot → **First confirmed booking wins; the other sees 'just filled' and is shown other classes** (cites team default)
- c18 engineering: What is stored about the customer and where → **Name and email only, in the studio's booking store** (cites team default)
- c19 engineering: How 'Book your usual' remembers the customer → **Remember on this device only (switch on, stored in the browser)** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 engineering: What the page shows when booking or confirmation fails → **Show a plain 'not booked' message with a retry button and keep their choices** (cites team default)
- c21 design: What leads the classes screen and how dense the list is → **Day-by-day list, one row per class: time, name, teacher, spots left** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c22 design: What a full class and an empty day show → **Full row stays, greyed, says 'Full', offers no action; empty day says 'No classes on Tuesday' with a link to the next day that has one** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c23 design: Where 'Book your usual' sits and what it shows → **A single row above the class list showing her last class with one filled 'Book Tuesday 18:00 Vinyasa' button** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c24 design: Which single accent colour the page uses → **Warm clay on paper, used only for the main button and the booked state** (cites team default)

## All candidates
- c1 data [high] The one number that says the booking page worked (in her seat false, changes 1, silent 3)
- c2 data [low] What we measure at the confirm step (in her seat false, changes 0, silent 3)
- c3 data [high, not undoable] What we keep from each booking at 'booked' (in her seat false, changes 1, silent 3)
- c4 data [low] What we measure on 'Book your usual' (in her seat false, changes 0, silent 3)
- c5 product [high, not undoable] What the confirm step asks the customer for (in her seat true, changes 2, silent 1)
- c6 product [high] How 'Book your usual' knows who the returning customer is and what their usual class is (in her seat true, changes 2, silent 1)
- c7 product [low] What happens when a class is full (in her seat true, changes 1, silent 1)
- c8 product [high] Whether customers can cancel or change a booking, and how late (in her seat true, changes 2, silent 1)
- c9 strategy [high, not undoable] Pay online when booking, or at the desk (in her seat false, changes 3, silent 1)
- c10 strategy [high, not undoable] Single classes only, or passes and membership too (in her seat false, changes 2, silent 1)
- c11 strategy [high, not undoable] What happens to money when someone cancels or the class is cancelled (in her seat false, changes 2, silent 2)
- c12 strategy [low] Whether Book your usual charges the same as a normal booking (in her seat false, changes 1, silent 1)
- c13 research [low] Whether full classes get a waitlist (in her seat false, changes 1, silent 2, dup of c7)
- c14 research [high, not undoable] Whether people pay when booking or at the studio (in her seat false, changes 3, silent 1, dup of c9)
- c15 research [low] How 'Book your usual' knows what the usual is (in her seat false, changes 1, silent 2, dup of c6)
- c16 research [high, not undoable] Whether customers need an account to book (in her seat false, changes 2, silent 1, dup of c5)
- c17 engineering [high, not undoable] What happens when two people take the last spot (in her seat false, changes 2, silent 3)
- c18 engineering [high, not undoable] What is stored about the customer and where (in her seat false, changes 1, silent 1, dup of c5)
- c19 engineering [high] How 'Book your usual' remembers the customer (in her seat false, changes 2, silent 1, dup of c6)
- c20 engineering [low] What the page shows when booking or confirmation fails (in her seat false, changes 1, silent 3)
- c21 design [high] What leads the classes screen and how dense the list is (in her seat false, changes 2, silent 2)
- c22 design [low] What a full class and an empty day show (in her seat false, changes 1, silent 1, dup of c7)
- c23 design [high] Where 'Book your usual' sits and what it shows (in her seat false, changes 2, silent 2)
- c24 design [low] Which single accent colour the page uses (in her seat false, changes 0, silent 3)

Meter so far: 100% (9 craft, 0 stamp)
