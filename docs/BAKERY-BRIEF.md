# Brief: the bakery the judges order from

Product owner, 14 Nov 2026 (Vincent signed off the stage flow; this is the bar for the bakery in its proof beat).
Owner: builder 6 (site, deploy, full build); builder 1 (acceptance suite). Design direction: Mika via taste-skill.
Lives at https://bring-your-own-craft-production.up.railway.app.

## The moment it serves (DEMO.md, 2:10–2:30)
Before the talk the judges scan a QR and land on the storefront. They reserve a loaf under their first name and are
told it's on its way. On stage Vincent says *"Here's one this team finished earlier, and you're its regulars."* He
opens the baker's admin page: who ordered what, what's sold out. He taps **Deliver**, and every judge's phone flips at
once to **"Delivered: your sourdough is here."** Twenty seconds, and the room has used real software the team built.
Restocking happens afterwards, between demos (Vincent, 14 Nov).

## The honesty rule (read first)
The team builds this, not us. This brief is two things only:
1. **The bar**: what must work, written as our acceptance suite (below). Bo's build passes it or it doesn't ship.
2. **Inputs to the run**: the bakery idea, Priya's answers and takeaways, and the design direction below go into the
   real run; Bo's agent writes the code from the run's decision log, Mika's taste-skill call sets the look.
Builders write only the deploy plumbing, the acceptance tests and the image generation step, and list every hand edit.
The stage label says "built earlier by this team".

## The customer side (the judges' phones; Vincent, 14 Nov)
Phone first: one column, big tap targets, no login, loads in under 2 s on 4G. A really simple store.
1. **The storefront.** The bakery's name and its icon-only logo (from the run; the name is real text, never in the
   image). A few loaves (e.g. fresh sourdough, fresh baguette, one more), each with its photo, a one-line description
   in the baker's voice and **how many are left** ("4 left"). A small, honest banner: *"Demo bakery for a hackathon:
   no real bread, nothing to pay."*
2. **Reserve.** Tap a loaf. **One of each loaf per person.** Give a **first name** only, because regulars are on a
   first-name basis (no phone, email or account; 30 characters max). Tap **Reserve**. No payment step.
3. **Reserved.** A warm confirmation, like a sticker on a paper bag: *"Your sourdough is reserved, Ana. It'll be
   with you before the end of this talk."* A gentle "on its way" animation (the loaf in the oven, then out). **No
   exact countdown**: orders are placed at different times and delivery is when Vincent taps Deliver, so a timer
   would hit zero at the wrong moment. The page asks them to keep it open.
4. **Delivered.** The page updates by itself (server-sent events, no refresh): *"Delivered: your sourdough is
   here."* It should feel like a small delight (a stamp landing, a short vibration where the phone allows), not a
   toast. This is an in-page notification on the open page, not a phone push (push needs permissions and an
   installed app; not worth the risk).
5. **Sold out.** When a loaf hits 0 it reads *"Sold out for today"*, with a hand-drawn mark.

## The baker's side (Vincent's laptop)
A separate admin page, **locked** unless opened with `ADMIN_TOKEN` (a Railway variable Vincent sets himself; never in
the repo, chat or logs; no token set = locked).
- **Orders**, arriving live: first name, loaf, time, status (reserved / delivered).
- **Stock per loaf**, with what's sold out clearly marked.
- **Deliver**: one button delivers every reserved order; each customer's page flips within a second.
- **Restock**: puts each loaf back to its starting stock, for the next demo.
- **Reset demo**: clears orders and restocks, for rehearsal and just before the talk.
Readable from the back of a room when screen-shared: large type, few elements.

## The rules (each becomes a test)
- Stock can't go below 0; two judges racing for the last loaf: exactly one gets it.
- One of each loaf per person (per device, and per first name).
- First name only; no other personal data stored, nothing logged beyond it.
- Rate limit per device so nobody empties the shop by accident.
- **A reservation is held for a set time, then released** (Vincent, 14 Nov): the loaf goes back on the shelf if it
  isn't delivered in time. The hold length is set on the admin page, **default 15 minutes** (the talk plus slides
  and setup must fit inside it; Vincent can shorten it, e.g. to 5, once timings are known). Customers see "before the
  end of this talk", never the exact hold or a countdown.
- Starting stock: sourdough **4**, so 6–10 judges sell it out; the other loaves a few more.

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
1. Reserve with a first name → reserved, stock −1, appears on the admin page within 1 s.
2. Any field other than a first name → rejected.
3. A second reservation of the same loaf from the same person → refused, kindly.
4. Stock 0 → "Sold out for today"; reservation refused.
5. Two simultaneous reservations for the last loaf → exactly one succeeds.
6. Deliver → every reserved order's page shows "Delivered" within 1 s (SSE), and the admin shows it delivered.
7. Restock → stock back to starting values, storefront shows it within 1 s.
8. Admin page without the token, or with no token set → locked (401), never open.
9. A reservation older than the hold length is released, its stock returns, and Deliver skips it.
10. Reset demo → no orders, starting stock.
11. No API key and no first name appears in any log line.

## Out
Payments, real delivery, accounts, email or SMS, maps, reviews, anything that collects more than a first name.
