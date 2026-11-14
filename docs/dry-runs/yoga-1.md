# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T12-30-57-255Z-xx5j/` (backend: claude-code, team: sonnet effort low, 5 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.9 s (data 7.8 s, engineering 7.9 s, product 8.1 s, design 8.3 s, research 8.9 s)
- Select (score and decide in parallel): 9.8 s
- Total: 18.7 s

## Counter: 25 decisions came up · 3 brought to you · 22 decided

## Her 3
- **What happens when a class is full** (product, fork on n2) options: Show 'Full' and no booking / Offer a waitlist / Suggest the next similar class; recommends **Show 'Full' and no booking**. A waitlist adds notifications and promises to customers, so it should wait for evidence that people ask for it.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **Whether customers need an account to book** (product, fork on n3) options: Name and email only, no account / Required account with login / Guest booking with optional account later; recommends **Name and email only, no account**. Asking for only name and email keeps the path to booked short and matches the smallest version that works end to end.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **How 'Book your usual' knows what the usual is** (product, pin on n5) options: Remember last booked class by email or device / Customer picks favorites in advance / Cut it from v1; recommends **Remember last booked class by email or device**. It needs no setup from the customer, but it depends on recognising returning people, so it should be tied to the identity choice.
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c1 data: What counts as success for the booking page → **Completed bookings per week** (cites team default)
- c2 data: Which funnel events to record → **One event per step: classes, a class, confirm, booked** (cites team default)
- c3 data: Which customer fields to store with a booking → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c4 data: How to measure the 'Book your usual' shortcut → **Tag bookings with source (shortcut vs browse)** (cites team default)
- c5 data: How long to keep personal booking data → **12 months after last booking** (cites team default)
- c6 engineering: How to stop two people taking the last spot → **Atomic capacity check and insert in one database transaction** (cites team default)
- c7 engineering: Whether booking takes payment online or is just a reservation → **Reservation only, pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 engineering: Where bookings and class schedule are stored → **Managed Postgres (or SQLite) with a simple schema** (cites team default)
- c9 engineering: How 'Book your usual' recognizes a returning customer → **Browser cookie remembering last booking** (cites team default)
- c10 engineering: What confirmation the customer gets after booking → **On-screen confirmation plus one confirmation email** (cites team default)
- c14 product: Whether payment is taken on the page → **No payment, pay at the studio or with existing pass** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 product: Whether and how customers can cancel or change a booking → **Cancel link in the booked screen and email, up to a cutoff** (cites team default)
- c16 design: How the classes list is organised (by day vs. by class type) → **By day with a time-ordered list** (cites team default)
- c17 design: What 'Book your usual' does when tapped → **Goes to the confirm screen prefilled** (cites team default)
- c18 design: How a full class is shown and handled → **Greyed out with 'Full' and no action** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 design: What the confirm screen asks for and shows → **Class, time, price and one Confirm button; name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 design: What the booked screen says and offers → **'You're booked' with class, time, and add-to-calendar and cancel link** (cites team default)
- c21 research: Whether full classes get a waitlist → **Show 'full' with no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c22 research: Whether 'Book your usual' repeats a customer's last class in one step → **Show a shortlist of past classes** (cites team default)
- c23 research: What the cancellation cutoff and policy is, and how it's shown at confirm → **Cutoff decided after learning the owner's rules** (cites team default)
- c24 research: Whether customers need an account to book → **Name and email only, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c25 research: What the class list and page call things (class names, 'Book', 'full') → **Customer's own words, e.g. 'Book a spot'** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as success for the booking page (in her seat false, changes 1, silent 3)
- c2 data [low] Which funnel events to record (in her seat false, changes 0, silent 2)
- c3 data [high, not undoable] Which customer fields to store with a booking (in her seat false, changes 1, silent 2)
- c4 data [low] How to measure the 'Book your usual' shortcut (in her seat false, changes 1, silent 3)
- c5 data [high, not undoable] How long to keep personal booking data (in her seat false, changes 1, silent 3)
- c6 engineering [high, not undoable] How to stop two people taking the last spot (in her seat false, changes 1, silent 2)
- c7 engineering [high] Whether booking takes payment online or is just a reservation (in her seat false, changes 3, silent 1)
- c8 engineering [high, not undoable] Where bookings and class schedule are stored (in her seat false, changes 0, silent 3)
- c9 engineering [low] How 'Book your usual' recognizes a returning customer (in her seat false, changes 1, silent 2)
- c10 engineering [low] What confirmation the customer gets after booking (in her seat false, changes 1, silent 3)
- c11 product [high, not undoable] Whether customers need an account to book (in her seat true, changes 3, silent 1)
- c12 product [high] How 'Book your usual' knows what the usual is (in her seat true, changes 2, silent 2)
- c13 product [high] What happens when a class is full (in her seat true, changes 2, silent 1)
- c14 product [high, not undoable] Whether payment is taken on the page (in her seat true, changes 3, silent 1, dup of c7)
- c15 product [low] Whether and how customers can cancel or change a booking (in her seat true, changes 2, silent 2)
- c16 design [high] How the classes list is organised (by day vs. by class type) (in her seat false, changes 2, silent 2)
- c17 design [high, not undoable] What 'Book your usual' does when tapped (in her seat false, changes 2, silent 3)
- c18 design [low] How a full class is shown and handled (in her seat false, changes 2, silent 1, dup of c13)
- c19 design [high, not undoable] What the confirm screen asks for and shows (in her seat false, changes 2, silent 1)
- c20 design [low] What the booked screen says and offers (in her seat false, changes 1, silent 2)
- c21 research [high] Whether full classes get a waitlist (in her seat false, changes 2, silent 2, dup of c13)
- c22 research [high] Whether 'Book your usual' repeats a customer's last class in one step (in her seat false, changes 2, silent 3)
- c23 research [high, not undoable] What the cancellation cutoff and policy is, and how it's shown at confirm (in her seat false, changes 2, silent 3)
- c24 research [high, not undoable] Whether customers need an account to book (in her seat false, changes 3, silent 1, dup of c11)
- c25 research [low] What the class list and page call things (class names, 'Book', 'full') (in her seat false, changes 1, silent 0)

Meter so far: 100% (9 craft, 0 stamp)
