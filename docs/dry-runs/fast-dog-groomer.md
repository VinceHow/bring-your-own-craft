# Dry run: dog-groomer

- Run: `runs/dry-dog-groomer-2026-11-14T12-18-14-555Z/` (backend: claude-code, team: sonnet effort low, 3 per seat; select: sonnet effort low)
- Idea: A booking page for a mobile dog groomer.
- Her journey: (none given)
- Boxes: 
- Her file: [L1] Say it the way the customer would, not the way the business would. (prepared for the demo) / [L2] Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)

## Timings (real)
- Teammates in parallel: 7.4 s (data 5.8 s, research 6.0 s, design 6.3 s, engineering 6.3 s, product 7.4 s)
- Select (score and decide in parallel): 4.9 s
- Total: 12.3 s

## Counter: 15 decisions came up · 3 brought to you · 12 decided

## Her 3
- **What happens when a customer cancels, is late, or the day is full** (product, fork on the page) options: Free cancel up to 24 hours before; full days show the next open day with a 'tell me when there's room' option / Fixed cancellation fee and deposit taken at booking / No rules on the page; the groomer handles it by text; recommends **Free cancel up to 24 hours before; full days show the next open day with a 'tell me when there's room' option**. It states a clear promise in the customer's words without taking payment, which keeps v1 small, but the promise is hard to take back once customers have seen it.
  - why her: In your seat; changes the journey itself; your file says nothing on it.
- **Whether customers pick an exact time slot or request a visit the groomer confirms** (product, fork on the page) options: Customer picks an open slot and it is booked instantly / Customer requests a time and the groomer confirms it / Customer picks a day and gets a arrival window; recommends **Customer picks a day and gets a arrival window**. A mobile groomer's travel time makes exact slots unreliable, and a window is still a complete booking with no manual confirming step.
  - why her: In your seat; changes the journey itself; your file barely touches it.
- **What the page asks for about the dog and the address before showing prices and times** (product, pin on the page) options: Only the dog's size, the service and the address (postcode) / Full dog profile: breed, coat, age, temperament, vaccines / Size and service now, everything else after booking; recommends **Size and service now, everything else after booking**. Size, service and area are all that's needed to price and route the visit, and asking for more up front loses customers (smallest version that works end to end).
  - why her: In your seat; changes what customers get; your file barely touches it.

## Decided for her
- c1 data: What counts as a successful booking page → **Completed booking requests submitted** (cites team default)
- c2 data: Which customer and dog details the booking form stores → **Only name, phone, address, dog size, service** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c3 data: How long booking and personal data is kept → **Delete 12 months after last appointment** (cites team default)
- c4 research: How customers pick a time: fixed slots or request-and-confirm → **Request a time, groomer confirms** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c5 research: What we ask about the dog when booking → **Name, size and breed only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c6 research: Whether full days get a waitlist → **No waitlist, show next open day** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c7 design: How the customer picks a time slot → **Free-form date and time request the groomer confirms** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c8 design: Page structure: single scrolling page or step-by-step flow → **Single short page with all fields in order** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c9 design: How services and dog size are labelled and chosen → **Plain customer words like 'Bath and brush, small dog' with a price shown** (cites L1: "Say it the way the customer would, not the way the business would. (prepared for the demo)")
- c10 engineering: How to prevent two customers booking the same time slot → **Database unique constraint on slot, reject second booking** (cites team default)
- c11 engineering: How appointment length and travel time between jobs are stored as bookable slots → **Fixed-length slots the groomer sets by hand** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")
- c12 engineering: How customers get confirmation and reminders → **Confirmation email only** (cites L2: "Ship the smallest version that works end to end; extras wait for evidence. (prepared for the demo)")

## All candidates
- c1 data [high] What counts as a successful booking page (inSeat false, changes 1, silent 3)
- c2 data [high, not undoable] Which customer and dog details the booking form stores (inSeat true, changes 2, silent 1)
- c3 data [low, not undoable] How long booking and personal data is kept (inSeat false, changes 1, silent 3)
- c4 research [high, not undoable] How customers pick a time: fixed slots or request-and-confirm (inSeat true, changes 3, silent 2)
- c5 research [high, not undoable] What we ask about the dog when booking (inSeat true, changes 2, silent 1, dup of c2)
- c6 research [low] Whether full days get a waitlist (inSeat true, changes 1, silent 2)
- c7 design [high, not undoable] How the customer picks a time slot (inSeat true, changes 3, silent 2, dup of c4)
- c8 design [high] Page structure: single scrolling page or step-by-step flow (inSeat false, changes 1, silent 2)
- c9 design [low] How services and dog size are labelled and chosen (inSeat true, changes 2, silent 0)
- c10 engineering [high, not undoable] How to prevent two customers booking the same time slot (inSeat false, changes 1, silent 3)
- c11 engineering [high] How appointment length and travel time between jobs are stored as bookable slots (inSeat false, changes 1, silent 2)
- c12 engineering [low] How customers get confirmation and reminders (inSeat false, changes 1, silent 2)
- c13 product [high, not undoable] Whether customers pick an exact time slot or request a visit the groomer confirms (inSeat true, changes 3, silent 2, dup of c4)
- c14 product [high] What the page asks for about the dog and the address before showing prices and times (inSeat true, changes 2, silent 1, dup of c2)
- c15 product [low, not undoable] What happens when a customer cancels, is late, or the day is full (inSeat true, changes 3, silent 3)

Meter so far: 100% (4 craft, 0 stamp)
