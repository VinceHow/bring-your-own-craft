# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T13-04-31-644Z-ghmd/` (backend: claude-code, team: sonnet effort low, 4 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 8.4 s (product 7.0 s, data 7.2 s, strategy 7.5 s, engineering 7.5 s, research 7.7 s, design 8.3 s)
- Select (score and decide in parallel): 10.5 s
- Total: 18.9 s

## Counter: 24 decisions came up · 3 brought to you · 21 decided

## Her 3
- **Whether customers can cancel or change a booking, and the cut-off** (product, fork on n4) options: Cancel by link in the confirmation email up to a set time before class / No self-service, contact the studio / Cancel and reschedule both self-service; recommends **Cancel by link in the confirmation email up to a set time before class**. It frees spots for others and spares the owner messages, and it needs only a link rather than accounts; the cut-off is a promise customers will rely on.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **What happens when a class is full** (product, fork on n2) options: Show it as full with no further action / Offer a waitlist with automatic spot offers / Show full and suggest the next open class; recommends **Show full and suggest the next open class**. It avoids dead ends without building a waitlist before there is evidence people want one.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)
- **What a customer must give to book (account vs. name and email only)** (product, fork on n3) options: Name and email only, no account / Required account with login / Email only, account created after booking; recommends **Name and email only, no account**. Fewest steps to a booked class fits the smallest end-to-end version, and an email is enough to recognise a returning customer later.
  - why her: In your seat; changes the journey itself; your file barely touches it.

## Decided for her
- c3 product: How 'Book your usual' decides what the usual is, and who sees it → **Last class booked, shown to returning customers recognised by email** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 data: The one number that says the booking page worked → **Bookings completed per week (reached 'booked')** (cites team default)
- c6 data: What we measure at the confirm step → **Count confirm views vs. bookings completed, with the class id** (cites team default)
- c7 data: What we keep from a finished booking → **Class id, booking time, and the customer's email only** (cites team default)
- c8 data: How we tell 'Book your usual' is working → **Count bookings started from 'Book your usual' vs. from the classes list** (cites team default)
- c9 strategy: Pay online when booking, or at the desk → **Pay at the desk, booking is free** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 strategy: What people can buy: single classes, class packs, or membership → **Single drop-in classes only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c11 strategy: What happens when someone cancels late or the studio cancels a class → **Free cancel until a set time, studio cancellation fully refunded or rebooked** (cites team default)
- c12 strategy: Whether 'Book your usual' reuses the same price and payment as before → **Show the current price and ask to confirm** (cites team default)
- c13 engineering: What happens when two people take the last spot in a class → **First confirmed booking wins; the second sees 'just filled up' and is sent back to classes** (cites team default)
- c14 engineering: What is stored about a customer and where, to power 'Book your usual' → **Name and email stored on the studio's server, linked to bookings** (cites team default)
- c15 engineering: What the page shows when booking fails (network, server, or email not sent) → **Plain message with the class kept on screen and a retry button; booking is saved before the email is sent** (cites team default)
- c16 engineering: Which optional switches are on for the first version (waitlist, phone field, one-tap cancel) → **All off except email confirmation** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 research: Whether full classes get a waitlist → **Show 'full' only, no waitlist** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 research: What 'Book your usual' means and who sees it → **Show only to returning customers who have booked before** (cites team default)
- c19 research: Whether customers need an account to book → **Guest booking with name and email** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c20 research: Whether payment is taken on the page and how cancellations work → **Pay at the studio, free cancellation until a cutoff** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c21 design: What leads the classes screen: a day-by-day schedule or the Book your usual shortcut → **Day-by-day schedule leads; usual sits as a single row above it for returning people** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c22 design: What Book your usual books and how it is named → **Rebook the last class: same teacher, day and time next week, one tap to confirm** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c23 design: What a full class shows in the list and on the class screen → **Say 'Full', disable the button, and show the next open time of the same class** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c24 design: Which single accent colour the page uses, and where → **One warm clay accent on the main button and selected day only, rest paper and near-black** (cites team default)

## All candidates
- c1 product [high, not undoable] What a customer must give to book (account vs. name and email only) (in her seat true, changes 3, silent 1)
- c2 product [low] What happens when a class is full (in her seat true, changes 2, silent 1)
- c3 product [high] How 'Book your usual' decides what the usual is, and who sees it (in her seat true, changes 2, silent 2)
- c4 product [high, not undoable] Whether customers can cancel or change a booking, and the cut-off (in her seat true, changes 3, silent 3)
- c5 data [high] The one number that says the booking page worked (in her seat false, changes 0, silent 3)
- c6 data [low] What we measure at the confirm step (in her seat false, changes 0, silent 3)
- c7 data [high, not undoable] What we keep from a finished booking (in her seat false, changes 1, silent 3)
- c8 data [low] How we tell 'Book your usual' is working (in her seat false, changes 0, silent 2)
- c9 strategy [high, not undoable] Pay online when booking, or at the desk (in her seat false, changes 3, silent 1)
- c10 strategy [high, not undoable] What people can buy: single classes, class packs, or membership (in her seat false, changes 3, silent 1)
- c11 strategy [high, not undoable] What happens when someone cancels late or the studio cancels a class (in her seat false, changes 2, silent 3, dup of c4)
- c12 strategy [low] Whether 'Book your usual' reuses the same price and payment as before (in her seat false, changes 1, silent 2)
- c13 engineering [high, not undoable] What happens when two people take the last spot in a class (in her seat false, changes 2, silent 3)
- c14 engineering [high, not undoable] What is stored about a customer and where, to power 'Book your usual' (in her seat false, changes 2, silent 3, dup of c3)
- c15 engineering [high] What the page shows when booking fails (network, server, or email not sent) (in her seat false, changes 1, silent 3)
- c16 engineering [low] Which optional switches are on for the first version (waitlist, phone field, one-tap cancel) (in her seat false, changes 1, silent 0)
- c17 research [high] Whether full classes get a waitlist (in her seat false, changes 2, silent 2, dup of c2)
- c18 research [high] What 'Book your usual' means and who sees it (in her seat false, changes 2, silent 2, dup of c3)
- c19 research [high, not undoable] Whether customers need an account to book (in her seat false, changes 3, silent 1, dup of c1)
- c20 research [high, not undoable] Whether payment is taken on the page and how cancellations work (in her seat false, changes 3, silent 1, dup of c9)
- c21 design [high] What leads the classes screen: a day-by-day schedule or the Book your usual shortcut (in her seat false, changes 2, silent 2)
- c22 design [high, not undoable] What Book your usual books and how it is named (in her seat false, changes 2, silent 2, dup of c3)
- c23 design [low] What a full class shows in the list and on the class screen (in her seat false, changes 1, silent 1, dup of c2)
- c24 design [low] Which single accent colour the page uses, and where (in her seat false, changes 0, silent 3)

Meter so far: 100% (9 craft, 0 stamp)
