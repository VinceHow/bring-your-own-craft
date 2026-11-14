# Dry run: running-club

- Run: `runs/dry-running-club-2026-11-14T12-17-48-324Z/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A sign-up page for a neighbourhood running club.
- Her journey: (none given)
- Boxes: 
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 6.0 s (data 5.3 s, design 5.6 s, engineering 5.8 s, product 5.9 s, research 6.0 s)
- Select (score and decide in parallel): 5.8 s
- Total: 11.8 s

## Counter: 15 decisions came up · 3 brought to you · 12 decided

## Her 3
- **Who the page is written for first** (product, fork on the page) options: Brand-new beginner runners / Existing regulars signing up for each run / Both equally; recommends **Brand-new beginner runners**. Newcomers are the ones who need a sign-up page, and plain words like 'Come for a run' work for regulars too.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **What happens when a run is full or has been cancelled** (product, fork on the page) options: Show 'full' and stop / Offer a waitlist / Show 'full' with an email-me-about-the-next-run option; recommends **Show 'full' with an email-me-about-the-next-run option**. It keeps the customer from hitting a dead end without building a full waitlist before there is evidence anyone needs one.
  - why her: In your seat; changes what customers get; your file barely touches it; backed by PLACEHOLDER finding: waitlists on full fitness classes. (source: PLACEHOLDER finding: waitlists on full fitness classes, TODO)
- **What the success state shows after sign-up** (design, pin on the page) options: Inline confirmation with next run details / Redirect to a separate thank-you page / Just an email confirmation; recommends **Inline confirmation with next run details**. It confirms the sign-up on the same screen and tells them where to show up, with nothing extra to build.
  - why her: In your seat; changes a little of what customers get; your file says nothing on it.

## Decided for her
- c1 data: What counts as success for the sign-up page → **Sign-ups plus first run attended** (cites team default)
- c2 data: Which fields the sign-up form stores → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c3 data: How long sign-up personal data is kept → **Delete after 12 months of no activity** (cites team default)
- c4 design: How many fields the sign-up form asks for → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 design: What the page leads with above the form → **Next run: day, time, meeting spot** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c7 engineering: Where sign-ups are stored → **Hosted form tool saving to a spreadsheet** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 engineering: How to handle the same person signing up twice → **Ignore duplicates, organiser cleans up** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 engineering: What personal data to collect and how it is protected → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c10 product: What the sign-up form asks for → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c13 research: What a new runner must give to sign up → **Name and email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c14 research: Whether full runs or groups get a waitlist → **Decide after seeing demand** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c15 research: Whether to ask runners their pace or experience level → **Don't ask** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as success for the sign-up page (inSeat false, changes 1, silent 3)
- c2 data [high, not undoable] Which fields the sign-up form stores (inSeat true, changes 2, silent 1)
- c3 data [low, not undoable] How long sign-up personal data is kept (inSeat false, changes 1, silent 3)
- c4 design [high, not undoable] How many fields the sign-up form asks for (inSeat true, changes 2, silent 1)
- c5 design [low] What the page leads with above the form (inSeat false, changes 1, silent 2)
- c6 design [low] What the success state shows after sign-up (inSeat true, changes 1, silent 3)
- c7 engineering [high] Where sign-ups are stored (inSeat false, changes 0, silent 2)
- c8 engineering [low] How to handle the same person signing up twice (inSeat true, changes 1, silent 2)
- c9 engineering [high, not undoable] What personal data to collect and how it is protected (inSeat true, changes 2, silent 1, dup of c4)
- c10 product [high, not undoable] What the sign-up form asks for (inSeat true, changes 2, silent 1, dup of c4)
- c11 product [high] Who the page is written for first (inSeat true, changes 3, silent 3)
- c12 product [low] What happens when a run is full or has been cancelled (inSeat true, changes 2, silent 2)
- c13 research [high, not undoable] What a new runner must give to sign up (inSeat true, changes 2, silent 1, dup of c4)
- c14 research [low] Whether full runs or groups get a waitlist (inSeat true, changes 2, silent 1, dup of c12)
- c15 research [low] Whether to ask runners their pace or experience level (inSeat true, changes 1, silent 1, dup of c2)

Meter so far: 100% (4 craft, 0 stamp)
