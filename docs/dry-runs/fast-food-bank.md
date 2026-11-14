# Dry run: food-bank

- Run: `runs/dry-food-bank-2026-11-14T12-18-26-860Z/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A page where neighbours sign up to volunteer at a local food bank.
- Her journey: (none given)
- Boxes: 
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 6.4 s (product 5.7 s, data 6.0 s, research 6.2 s, engineering 6.3 s, design 6.4 s)
- Select (score and decide in parallel): 5.0 s
- Total: 11.4 s

## Counter: 15 decisions came up · 3 brought to you · 12 decided

## Her 3
- **What a neighbour signs up for: a specific shift or a general 'I'm available' offer** (product, fork on the page) options: Pick a specific dated shift / General availability offer the food bank follows up on / Both; recommends **Pick a specific dated shift**. A concrete shift works end to end with no staff back-and-forth, which is the smallest version that works.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **What happens when a shift is full or gets cancelled** (product, fork on the page) options: Show it as full and offer other shifts / Offer a waitlist / Let people over-book; recommends **Show it as full and offer other shifts**. A waitlist adds extra build and promises we may not keep; evidence can justify it later.
  - why her: In your seat; changes what customers get; your file barely touches it.
- **What we ask a neighbour to give when signing up** (product, pin on the page) options: Name and email only / Name, email and phone / Name, email, phone, and skills or age info; recommends **Name and email only**. Fewer fields means more people finish, and a confirmation email is enough to reach them; more can be asked later.
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c4 data: What counts as success for the page → **Sign-ups that turn into people actually showing up** (cites team default)
- c5 data: Which personal details to collect from each volunteer → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 data: How long to keep volunteer personal data after a shift → **Delete 12 months after last shift** (cites team default)
- c7 research: Whether full volunteer shifts get a waitlist → **Decide after seeing how often shifts fill** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 research: What a neighbour must give to sign up → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 research: How neighbours pick when to help → **Pick from a list of specific shifts** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c10 engineering: How to prevent shifts being overbooked when two people take the last spot → **Enforce capacity in the database with a transactional check on insert** (cites team default)
- c11 engineering: Where sign-ups are stored → **Small hosted database (e.g. Postgres) with shifts and sign-ups tables** (cites team default)
- c12 engineering: Whether to send a confirmation email and how people cancel → **Send one confirmation email with a cancel link, no accounts** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 design: How neighbours pick a shift: browse a list of open shifts or fill a form with free-text availability → **List of open shifts with a Sign up button on each** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c14 design: How much the sign-up form asks for → **Name, email and shift only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 design: What the success and full-shift states say after signing up → **Plain confirmation with shift details and a way to cancel, plus 'Shift full' label on full shifts** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 product [high, not undoable] What a neighbour signs up for: a specific shift or a general 'I'm available' offer (inSeat true, changes 3, silent 3)
- c2 product [low] What happens when a shift is full or gets cancelled (inSeat true, changes 2, silent 2)
- c3 product [low, not undoable] What we ask a neighbour to give when signing up (inSeat true, changes 2, silent 2)
- c4 data [high] What counts as success for the page (inSeat false, changes 1, silent 3)
- c5 data [high, not undoable] Which personal details to collect from each volunteer (inSeat true, changes 2, silent 2, dup of c3)
- c6 data [low] How long to keep volunteer personal data after a shift (inSeat false, changes 1, silent 3)
- c7 research [low] Whether full volunteer shifts get a waitlist (inSeat true, changes 2, silent 2, dup of c2)
- c8 research [high, not undoable] What a neighbour must give to sign up (inSeat true, changes 2, silent 2, dup of c3)
- c9 research [high] How neighbours pick when to help (inSeat true, changes 3, silent 3, dup of c1)
- c10 engineering [high, not undoable] How to prevent shifts being overbooked when two people take the last spot (inSeat false, changes 1, silent 3)
- c11 engineering [high, not undoable] Where sign-ups are stored (inSeat false, changes 0, silent 3)
- c12 engineering [low] Whether to send a confirmation email and how people cancel (inSeat true, changes 2, silent 2)
- c13 design [high] How neighbours pick a shift: browse a list of open shifts or fill a form with free-text availability (inSeat false, changes 2, silent 2, dup of c1)
- c14 design [high, not undoable] How much the sign-up form asks for (inSeat true, changes 2, silent 2, dup of c3)
- c15 design [low] What the success and full-shift states say after signing up (inSeat true, changes 1, silent 1)

Meter so far: 100% (4 craft, 0 stamp)
