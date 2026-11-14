# Dry run: yoga

- Run: `runs/dry-yoga-2026-11-14T13-04-08-828Z-gr9h/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A booking page for a small yoga studio.
- Her journey: "classes", "a class", "confirm", "booked", "regulars → "Book your usual""
- Boxes: n1 classes · n2 a class · n3 confirm · n4 booked · n5 Book your usual
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 6.4 s (data 5.7 s, strategy 5.8 s, research 6.1 s, engineering 6.2 s, product 6.2 s, design 6.4 s)
- Select (score and decide in parallel): 8.4 s
- Total: 14.8 s

## Counter: 18 decisions came up · 3 brought to you · 15 decided

## Her 3
- **Who the page serves first: returning regulars or first-time visitors** (product, fork on n5) options: Returning regulars first (Book your usual up front) / First-time visitors first (browse classes) / Equal weight on the landing screen; recommends **Returning regulars first (Book your usual up front)**. A small studio's bookings mostly come from regulars, and a one-tap rebook is the biggest time saver, while browsing still works for newcomers.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **What the confirm step asks for and how cancellation is promised** (product, pin on n3) options: Name and email only, with a plain-words cancel/late policy line / Full account signup before booking / Name, email and payment up front; recommends **Name and email only, with a plain-words cancel/late policy line**. Asking for less keeps booking quick, and stating the cancel and late rule in the customer's words sets a promise we can't easily take back once people book.
  - why her: In your seat; changes what customers get; your file barely touches it.
- **What happens when a class is full** (product, pin on n2) options: Show it as full with no further option / Offer a simple waitlist that auto-books on cancellation / Hide full classes; recommends **Show it as full with no further option**. The smallest end-to-end version ships without a waitlist, and we add one once we see how often people hit full classes.
  - why her: In your seat; changes a little of what customers get; your file barely touches it; backed by A public leisure centre runs a waitlist on full group-fitness classes. (source: A public leisure centre runs a waitlist on full group-fitness classes, https://www.activemonash.vic.gov.au/News/Update-to-Group-Fitness-Waitlist)

## Decided for her
- c1 data: The one number that says the booking page worked → **Count of completed bookings per week** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c2 data: What to measure at the confirm step → **Share of people reaching confirm who reach booked** (cites team default)
- c3 data: Whether to measure the 'Book your usual' shortcut → **Count of bookings made through 'Book your usual' vs. through a class page** (cites team default)
- c4 strategy: Pay online when booking, or pay at the desk → **Pay at the desk, page only reserves** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 strategy: What one booking costs: single drop-in, class pack, or membership → **One drop-in price for every class** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 strategy: What happens to the customer's spot or money when they cancel late or the class is cancelled → **Free cancel up to a cutoff, studio cancellation always fully refunded or rebooked** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c7 research: Whether full classes get a waitlist → **Show 'full' only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 research: What 'Book your usual' repeats for a returning customer → **Same class, same day and time next week** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c9 research: Whether customers need an account or just a name and email to book → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 engineering: What happens when two people take the last spot → **First confirmed booking wins; the other sees 'just filled' and other times** (cites team default)
- c11 engineering: What the page shows when a booking or confirmation message fails → **Show a clear error, keep the spot unbooked, let her retry** (cites team default)
- c12 engineering: Whether 'Book your usual' is on, and what is remembered on the device → **On, remembers only her last class choice on this device** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c16 design: What leads the classes screen: the 'Book your usual' shortcut or the full class list → **Class list leads, 'Book your usual' sits as a quiet link above it** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c17 design: What a full class shows in the list and on the class screen → **Show it greyed with 'Full' and no action** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c18 design: Which single accent colour the page uses, and where → **One accent on the Book button and the booked stamp only, everything else paper and ink** (cites team default)

## All candidates
- c1 data [high, not undoable] The one number that says the booking page worked (in her seat false, changes 1, silent 2)
- c2 data [low] What to measure at the confirm step (in her seat false, changes 0, silent 2)
- c3 data [low] Whether to measure the 'Book your usual' shortcut (in her seat false, changes 0, silent 2)
- c4 strategy [high, not undoable] Pay online when booking, or pay at the desk (in her seat false, changes 3, silent 1)
- c5 strategy [high] What one booking costs: single drop-in, class pack, or membership (in her seat false, changes 2, silent 1)
- c6 strategy [low, not undoable] What happens to the customer's spot or money when they cancel late or the class is cancelled (in her seat false, changes 2, silent 3)
- c7 research [low] Whether full classes get a waitlist (in her seat false, changes 1, silent 2)
- c8 research [high] What 'Book your usual' repeats for a returning customer (in her seat false, changes 2, silent 2)
- c9 research [high, not undoable] Whether customers need an account or just a name and email to book (in her seat false, changes 2, silent 1)
- c10 engineering [high, not undoable] What happens when two people take the last spot (in her seat false, changes 2, silent 3)
- c11 engineering [high] What the page shows when a booking or confirmation message fails (in her seat false, changes 1, silent 3)
- c12 engineering [low] Whether 'Book your usual' is on, and what is remembered on the device (in her seat false, changes 2, silent 1)
- c13 product [high] Who the page serves first: returning regulars or first-time visitors (in her seat true, changes 3, silent 2)
- c14 product [low] What happens when a class is full (in her seat true, changes 1, silent 1, dup of c7)
- c15 product [high, not undoable] What the confirm step asks for and how cancellation is promised (in her seat true, changes 2, silent 2)
- c16 design [high] What leads the classes screen: the 'Book your usual' shortcut or the full class list (in her seat false, changes 2, silent 2, dup of c13)
- c17 design [low] What a full class shows in the list and on the class screen (in her seat false, changes 1, silent 1, dup of c7)
- c18 design [low] Which single accent colour the page uses, and where (in her seat false, changes 0, silent 3)

Meter so far: 100% (9 craft, 0 stamp)
