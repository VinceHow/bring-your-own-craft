# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T12-31-34-984Z-ovz5/` (backend: claude-code, team: sonnet effort low, 5 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.7 s (engineering 7.8 s, data 8.0 s, product 8.5 s, research 8.5 s, design 8.7 s)
- Select (score and decide in parallel): 10.0 s
- Total: 18.6 s

## Counter: 25 decisions came up · 3 brought to you · 22 decided

## Her 3
- **Cancellation and late-change rules shown to the customer** (product, pin on n3) options: Free cancel until a set hours before, stated at confirm / No self-serve cancel; contact the studio / Flexible with no rule; recommends **Free cancel until a set hours before, stated at confirm**. This is a promise made to customers once live, so it needs to be stated plainly before they commit.
  - why her: In your seat; changes what customers get; your file says nothing on it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **What happens when a class is full** (product, fork on n2) options: Show 'Full' and no booking / Offer a waitlist / Hide full classes; recommends **Show 'Full' and no booking**. A waitlist is an extra that should wait for evidence, but hiding full classes would confuse customers who expect to see them.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **How 'Book your usual' decides what the customer's usual is** (product, pin on n5) options: Their most recent booked class, same weekday and time next week / Let them pick a favourite / Leave it out of v1; recommends **Their most recent booked class, same weekday and time next week**. It serves returning regulars with no setup and needs no extra choices, and it is the only path that skips the class and confirm steps.
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c1 engineering: How to stop two people taking the last spot → **Atomic check-and-insert in one database transaction** (cites team default)
- c2 engineering: Where bookings and classes are stored → **Managed Postgres database** (cites team default)
- c3 engineering: How 'Book your usual' knows who the customer is → **Email magic link, no password** (cites team default)
- c4 engineering: How booking confirmation is sent → **Transactional email via a hosted provider** (cites team default)
- c5 engineering: Whether payment is taken on the page at booking → **No payment; pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 data: What counts as a successful booking for the page → **Booking reaches the booked step** (cites team default)
- c7 data: How long to keep customer name, email and booking history → **Delete 12 months after last booking** (cites team default)
- c8 data: Which funnel steps to record as events → **One event per step: classes, class, confirm, booked** (cites team default)
- c9 data: How to measure whether Book your usual is used → **Count bookings made through it versus through the class list** (cites team default)
- c10 data: What to record when a booking is abandoned at confirm → **Left step plus the class chosen** (cites team default)
- c11 product: What a customer must give to book (account vs. just name and email) → **Name and email only, no account** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 product: Whether payment is taken on the page → **No payment; pay at the studio or with their existing pass** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c16 research: Whether full classes get a waitlist → **Show 'full' and nothing else** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 research: Cutoff for cancellations close to class start → **Let the studio set its own cutoff** (cites team default)
- c18 research: What 'Book your usual' means and who sees it → **Rebook the customer's last class** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 research: Whether booking needs an account or just name and email → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 research: Whether payment is taken on the page → **Pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 design: How classes are laid out on the classes screen → **Day-by-day list with time first** (cites team default)
- c22 design: What 'Book your usual' does when tapped → **Go to confirm with the last class pre-filled** (cites team default)
- c23 design: How a full class appears and what the customer can do → **Show as full, disabled, no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c24 design: What the confirm screen asks for and shows → **Class, time, price and one Confirm button, with a name and email only if not known** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c25 design: What the booked screen says and offers → **Plain 'You're booked' with details and add-to-calendar** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")

## All candidates
- c1 engineering [high, not undoable] How to stop two people taking the last spot (in her seat false, changes 1, silent 2)
- c2 engineering [high, not undoable] Where bookings and classes are stored (in her seat false, changes 0, silent 3)
- c3 engineering [high, not undoable] How 'Book your usual' knows who the customer is (in her seat false, changes 2, silent 3)
- c4 engineering [low] How booking confirmation is sent (in her seat false, changes 1, silent 2)
- c5 engineering [high] Whether payment is taken on the page at booking (in her seat false, changes 3, silent 1)
- c6 data [high] What counts as a successful booking for the page (in her seat false, changes 0, silent 3)
- c7 data [high, not undoable] How long to keep customer name, email and booking history (in her seat false, changes 1, silent 3)
- c8 data [low] Which funnel steps to record as events (in her seat false, changes 0, silent 3)
- c9 data [low] How to measure whether Book your usual is used (in her seat false, changes 0, silent 3)
- c10 data [low] What to record when a booking is abandoned at confirm (in her seat false, changes 0, silent 3)
- c11 product [high, not undoable] What a customer must give to book (account vs. just name and email) (in her seat true, changes 3, silent 1)
- c12 product [low] What happens when a class is full (in her seat true, changes 2, silent 1)
- c13 product [high] How 'Book your usual' decides what the customer's usual is (in her seat true, changes 2, silent 2)
- c14 product [high, not undoable] Cancellation and late-change rules shown to the customer (in her seat true, changes 2, silent 3)
- c15 product [high, not undoable] Whether payment is taken on the page (in her seat true, changes 3, silent 1, dup of c5)
- c16 research [low] Whether full classes get a waitlist (in her seat false, changes 2, silent 2, dup of c12)
- c17 research [low, not undoable] Cutoff for cancellations close to class start (in her seat false, changes 1, silent 3, dup of c14)
- c18 research [high] What 'Book your usual' means and who sees it (in her seat false, changes 2, silent 2, dup of c13)
- c19 research [high, not undoable] Whether booking needs an account or just name and email (in her seat false, changes 3, silent 1, dup of c11)
- c20 research [high, not undoable] Whether payment is taken on the page (in her seat false, changes 3, silent 1, dup of c5)
- c21 design [high] How classes are laid out on the classes screen (in her seat false, changes 1, silent 2)
- c22 design [high] What 'Book your usual' does when tapped (in her seat false, changes 3, silent 2)
- c23 design [low] How a full class appears and what the customer can do (in her seat false, changes 2, silent 1, dup of c12)
- c24 design [high, not undoable] What the confirm screen asks for and shows (in her seat false, changes 2, silent 2, dup of c11)
- c25 design [low] What the booked screen says and offers (in her seat false, changes 1, silent 2)

Meter so far: 100% (9 craft, 0 stamp)
