# Brief: the bakery the judges order from

Product owner, 14 Nov 2026 (Vincent signed off the stage flow; this is the bar for the bakery in its proof beat).
Owner: builder 6 (site, deploy, full build); builder 1 (acceptance suite). Design direction: Mika via taste-skill.
Lives at https://bring-your-own-craft-production.up.railway.app.

## The moment it serves (DEMO.md, 2:10–2:30)
Before the talk the judges scan a QR and order a loaf under their first name. On stage Vincent says *"Here's one this
team finished earlier, and you're its regulars."* He opens the baker's admin page: their orders are there, the
sourdough is sold out. He taps **Restock**, then **Deliver**, and every judge's phone flips at once to
**"Delivered: your sourdough is here."** Twenty seconds, and the room has used real software the team built.

## The honesty rule (read first)
The team builds this, not us. This brief is two things only:
1. **The bar**: what must work, written as our acceptance suite (below). Bo's build passes it or it doesn't ship.
2. **Inputs to the run**: the bakery idea, Priya's answers and takeaways, and the design direction below go into the
   real run; Bo's agent writes the code from the run's decision log, Mika's taste-skill call sets the look.
Builders write only the deploy plumbing, the acceptance tests and the image generation step, and list every hand edit.
The stage label says "built earlier by this team".

## The customer side (the judges' phones)
Phone first: one column, big tap targets, no login, loads in under 2 s on 4G.
1. **The shop.** The bakery's name and its icon-only logo (from the run; the name is real text, never in the image).
   Today's loaves, each with its photo, a one-line description in the baker's voice, price, and **how many are left**
   ("4 left"). A small, honest banner: *"Demo bakery for a hackathon: no real bread, nothing to pay."*
2. **Order.** Tap a loaf, type a **first name** (the only field: no phone, no email, no account; 30 characters max),
   tap **Hold it for me**. No payment step.
3. **The sticker.** A warm confirmation that feels like a sticker on a paper bag: *"Your sourdough, held at the
   counter till 10, with your name on it, Ana."* It stays on screen as their order page.
4. **Live status.** The order page updates by itself (server-sent events, no refresh): *Held* → *Delivered: your
   sourdough is here.* The flip should feel like a small delight (a stamp landing), not a toast.
5. **Sold out.** When a loaf hits 0: *"Sourdough's gone for today. Hold one for tomorrow?"* (one tap, same name).
   This is Priya's own problem, solved in front of them.

## The baker's side (Vincent's laptop)
A separate admin page, **locked** unless opened with `ADMIN_TOKEN` (a Railway variable Vincent sets himself; never in
the repo, chat or logs; no token set = locked).
- **Today's orders**, arriving live: first name, loaf, time, status.
- **Stock per loaf**, with a **Restock** button (+ a set amount).
- **Deliver**: one button delivers every held order; each customer's page flips within a second.
- **Tomorrow's bake list**: orders for tomorrow, summed per loaf (Theo's craft).
- **Reset demo**: clears orders and resets stock, for rehearsal and just before the talk.
Readable from the back of a room when screen-shared: large type, few elements.

## The rules (from the team's decisions; each becomes a test)
- Stock can't go below 0; two judges racing for the last loaf: exactly one gets it.
- An order holds the loaf **till 10am** on its day.
- Orders after **8pm** are for the next morning (said plainly on the shop page).
- First name only; no other personal data stored, nothing logged beyond it.
- Rate limit per device so one judge can't empty the shop by accident.
- Start of the talk: sourdough stock is **4**, so 6–10 judges sell it out.

## The look (Mika, through taste-skill)
The bakery's own brand, not ours: it should feel like the place Priya described, **"like the baker already knows
you."** Warm, crafted, unhurried.
- **Photos (fal, made ahead):** one per loaf plus the logo mark, in one consistent style: soft morning window light,
  flour-dusted wood or linen, close and appetising, no text in any image. Under 5¢ in total.
- **Type and colour:** chosen by taste-skill from the run's brand feel (warm neutrals, one confident accent); a
  characterful display face for the name and loaf titles, a calm text face.
- **Voice:** short, warm lines in the baker's voice ("Still warm at 7", "Your usual?"). Never corporate, never cute.
- **Details that make it feel real:** the sticker confirmation, a hand-drawn "sold out" mark, the stamp on Delivered.
- No stock-photo feel, no generic template look; if it could be any bakery, it isn't done.

## Acceptance suite (builder 1 writes these first; the build must pass all)
1. Order with a first name → order held, stock −1, appears on the admin page within 1 s.
2. Order with any field other than first name → rejected.
3. Stock 0 → order refused with the "tomorrow" offer; tomorrow's order lands on the bake list.
4. Two simultaneous orders for the last loaf → exactly one succeeds.
5. Restock → stock rises, shop page shows it within 1 s.
6. Deliver → every held order's customer page shows "Delivered" within 1 s (SSE).
7. Admin page without the token, or with no token set → locked (401), never open.
8. Order after 8pm → dated next morning; the hold reads "till 10".
9. Reset demo → no orders, starting stock.
10. No API key and no first name appears in any log line.

## Out
Payments, real delivery, accounts, email or SMS, maps, reviews, anything that collects more than a first name.
