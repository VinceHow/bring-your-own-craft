# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T13-03-47-741Z-npm3/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 7.7 s (data 6.5 s, product 6.7 s, strategy 6.9 s, research 7.2 s, design 7.4 s, engineering 7.7 s)
- Select (score and decide in parallel): 13.3 s
- Total: 21.0 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Whether customers can cancel themselves, and the cutoff** (product, fork on n4) options: No self-cancel, contact the studio / Self-cancel up to a set cutoff, such as 12 hours before / Self-cancel any time; recommends **Self-cancel up to a set cutoff, such as 12 hours before**. Without it, every cancellation becomes a message to the studio, but the cutoff is a promise to customers that is hard to change once people rely on it.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **What happens when a class is full** (product, fork on n2) options: Show as full with no booking option / Offer a waitlist with auto-notify / Show as full and suggest the next open class; recommends **Show as full and suggest the next open class**. A waitlist adds notification and promotion rules that wait for evidence, while a dead end loses the customer.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **Whether customers must create an account to book** (product, fork on n3) options: Name and email only, no account / Account required / Optional account after first booking; recommends **Name and email only, no account**. The smallest end-to-end version asks only for what the studio needs to hold a spot, and a returning customer can still be recognised by email.
  - why her: In your seat; changes the journey itself; your file barely touches it.

## Decided for her
- c1 data: The one number that says the booking page worked → **Bookings completed per week by distinct customers** (cites team default)
- c2 data: What we measure at the confirm step → **Share of people at confirm who reach 'booked'** (cites team default)
- c3 data: What we measure on the 'Book your usual' shortcut → **Bookings made via 'Book your usual' vs. via the class list** (cites team default)
- c4 data: What we measure on the classes list → **Share of classes-list visitors who open a class** (cites team default)
- c6 product: How 'Book your usual' knows what the usual is → **Last class booked, same day and time next week** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 strategy: Pay online at booking, or pay at the desk → **Pay at the desk on arrival** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 strategy: What people can buy: single classes only, class packs, or monthly membership → **Single classes only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 strategy: Refund or credit when a customer cancels late or the studio cancels the class → **Full refund if studio cancels; credit if customer cancels before a cutoff** (cites team default)
- c12 strategy: How 'Book your usual' charges: one tap using saved card or pack, or re-confirm payment → **Pay at the desk for repeats** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 research: Whether full classes get a waitlist → **Show 'Full' with no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 research: Whether to set a late-cancellation cutoff before class → **No cutoff, cancel any time** (cites team default)
- c15 research: Who 'Book your usual' is for and what it repeats → **Repeat the customer's last-booked class** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c16 research: Whether booking requires an account or payment up front → **Name and email only, pay at the studio** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 design: What leads the classes screen: day-by-day list or class-type filter → **Day-by-day list, today first** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c18 design: What a full class shows in the list and on its page → **Greyed row labelled "Full", no action** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c19 design: Where "Book your usual" sits and how prominent it is → **Its own card above the list, outline style** (cites team default)
- c20 design: Which single accent colour the page uses → **Warm terracotta on tags and the booked state only** (cites team default)
- c21 engineering: What happens when two people take the last spot in a class → **First confirmed booking wins; the second sees 'just filled up' and is offered other classes** (cites team default)
- c22 engineering: What is stored about a customer and where, to power 'Book your usual' → **Name and email stored on the server; the device only keeps a 'remember me' token** (cites team default)
- c23 engineering: How the booking is confirmed to the customer → **Show the booked screen and send a confirmation email** (cites team default)
- c24 engineering: What the page shows when a step fails (loading classes or confirming a booking) → **Plain message with a retry button; booking is never shown as done until the server confirms** (cites team default)

## All candidates
- c1 data [high] The one number that says the booking page worked (in her seat false, changes 1, silent 3)
- c2 data [low] What we measure at the confirm step (in her seat false, changes 0, silent 2)
- c3 data [low] What we measure on the 'Book your usual' shortcut (in her seat false, changes 0, silent 1)
- c4 data [low] What we measure on the classes list (in her seat false, changes 0, silent 1)
- c5 product [high, not undoable] Whether customers must create an account to book (in her seat true, changes 3, silent 1)
- c6 product [high] How 'Book your usual' knows what the usual is (in her seat true, changes 2, silent 1)
- c7 product [high] What happens when a class is full (in her seat true, changes 2, silent 1)
- c8 product [high, not undoable] Whether customers can cancel themselves, and the cutoff (in her seat true, changes 2, silent 2)
- c9 strategy [high, not undoable] Pay online at booking, or pay at the desk (in her seat false, changes 3, silent 2)
- c10 strategy [high, not undoable] What people can buy: single classes only, class packs, or monthly membership (in her seat false, changes 3, silent 1)
- c11 strategy [high, not undoable] Refund or credit when a customer cancels late or the studio cancels the class (in her seat false, changes 2, silent 2)
- c12 strategy [low, not undoable] How 'Book your usual' charges: one tap using saved card or pack, or re-confirm payment (in her seat false, changes 2, silent 2)
- c13 research [low] Whether full classes get a waitlist (in her seat false, changes 2, silent 2, dup of c7)
- c14 research [high, not undoable] Whether to set a late-cancellation cutoff before class (in her seat false, changes 2, silent 2, dup of c8)
- c15 research [low] Who 'Book your usual' is for and what it repeats (in her seat false, changes 2, silent 1, dup of c6)
- c16 research [high, not undoable] Whether booking requires an account or payment up front (in her seat false, changes 3, silent 2, dup of c5)
- c17 design [high] What leads the classes screen: day-by-day list or class-type filter (in her seat false, changes 2, silent 1)
- c18 design [low] What a full class shows in the list and on its page (in her seat false, changes 1, silent 1, dup of c7)
- c19 design [high] Where "Book your usual" sits and how prominent it is (in her seat false, changes 2, silent 2)
- c20 design [low] Which single accent colour the page uses (in her seat false, changes 0, silent 3)
- c21 engineering [high, not undoable] What happens when two people take the last spot in a class (in her seat false, changes 2, silent 3)
- c22 engineering [high, not undoable] What is stored about a customer and where, to power 'Book your usual' (in her seat false, changes 2, silent 3)
- c23 engineering [low] How the booking is confirmed to the customer (in her seat false, changes 1, silent 3)
- c24 engineering [high] What the page shows when a step fails (loading classes or confirming a booking) (in her seat false, changes 1, silent 3)

Meter so far: 100% (9 craft, 0 stamp)
