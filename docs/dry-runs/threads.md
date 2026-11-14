# Meeting threads, dry runs (real model)

Round 4: five answers on the bakery idea, after the lead's notes (no pet topics; turn 2 answers turn 1 by name). The 15-answer bakery round is at 2203949, the yoga round at f56eebf.


**Timings over 5 answers:** first line median 1016 ms (min 771, max 1213); turns per thread 3; whole answer (thread + takeaways + mapping) median 11245 ms.

Recorded 2026-11-14 16:49 UTC with the real backend: thread turns on haiku via warm processes (lib/thread.js), takeaways + mapping on sonnet (lib/interpret.js). One bakery run (Priya, Product, the demo idea: "A website for a small bakery, so customers can order bread ahead."): real first sketch, real profile, real six-seat propose (24 candidates). Each question below is hand-made in the shape builder 7's selector will send (question, artifact, decisionIds of real candidates); her answers are written for the dry run; everything the team says is verbatim model output. "first line" is milliseconds from her submit to the first line logged. Journey redraws were switched off here to keep the comparison clean.


## journey: Mika asks "What do people come to a bakery like this for that they can't get at the supermarket?"

Decisions it settles: What leads the browse screen: today's available loaves or the full menu (Today's available loaves first / Full menu with sold-out marked / Regulars' usual first, then the rest); Whether customers pay online when ordering or at pickup (Pay online to confirm / Pay at pickup / Choose either at checkout)


**Her answer 1:** "Bread that is still warm, and being known. My regulars want their usual loaf without explaining themselves."

- **Mika** (design, 1213 ms): Then the browse screen opens on warm loaves and their usual, no explanations needed.
- **Ines** (strategy, 3056 ms): Mika, warm loaves plus usual orders means pricing needs to hold those slots fast.
- **Bo** (engineering, 5565 ms): Warm loaves need a fast reserve, so Ines's pricing won't slow the browse screen.

*Takeaways:* what I believe: "People come for bread that's still warm and for being known: regulars should get their usual loaf without having to explain themselves." · guidance: "Make the regular's usual loaf the first thing they see when they browse, with the rest of the bread after it. Don't settle pay-online versus pay-at-pickup from this; we still need her view on that."
*Mapped:* What leads the browse screen: today's available loaves or the full menu → Regulars' usual first, then the rest · first line 1213 ms · 3 turns · all done 11245 ms


**Her answer 2:** "The sourdough. It sells out by ten, and people plan their mornings around getting one."

- **Mika** (design, 771 ms): Then the sourdough leads the browse screen, with today's count right beside it.
- **Ines** (strategy, 1772 ms): Mika, yes, and the count next to it should say how many are left.
- **Bo** (engineering, 2773 ms): Mika, the count matters, so I'll make the sold-out check hit the database at checkout.

*Takeaways:* what I believe: "People come for the sourdough: it sells out by ten, and they plan their mornings around getting one, so the site's job is to guarantee their loaf." · guidance: "Lead browse with today's available loaves, sourdough first, with clear availability. Have customers pay online to confirm so a reserved loaf is really held, and keep the journey to the smallest version that works end to end."
*Mapped:* What leads the browse screen: today's available loaves or the full menu → Today's available loaves first; Whether customers pay online when ordering or at pickup → Pay online to confirm · first line 771 ms · 3 turns · all done 13122 ms


## finding: Noor asks "Small bakeries end up guessing how much to bake. When the loaf someone wants is gone, what should happen?"

Decisions it settles: What happens when a loaf sells out (Show sold out and stop orders / Let people join a notify list / Offer a similar loaf instead); What happens when two people order the last loaf (Reserve stock at checkout and show sold out instantly / Accept the order and the bakery confirms or refunds later / Show a daily limit per loaf and stop orders at it)


**Her answer 1:** "Show what's still warm instead. Something else fresh beats an apology."

- **Noor** (research, 1051 ms): Since it's a pre-order, I'll write up what's still warm as the sold-out fallback.
- **Bo** (engineering, 2843 ms): Noor, yes, and the swap rule goes right on the sold-out screen.
- **Ines** (strategy, 4713 ms): Noor, the swap screen needs real prices, so I'll pull the warm list.

*Takeaways:* what I believe: "When a loaf is gone, the best answer is something else fresh and warm, not an apology." · guidance: "When a customer's loaf sells out, show what's still fresh from the oven as an alternative rather than a dead-end sold-out message. Keep it warm and personal, and leave the last-loaf ordering mechanics for the team to settle."
*Mapped:* What happens when a loaf sells out → Offer a similar loaf instead · first line 1051 ms · 3 turns · all done 11025 ms


**Her answer 2:** "Regulars should be able to reserve a standing weekly loaf so it never runs out for them."

- **Noor** (research, 883 ms): Since regulars can reserve, I'll write the standing-order study up first, with sources.
- **Bo** (engineering, 1945 ms): Noor, a standing weekly order means I'll need a reserved-stock field tied to each regular.
- **Ines** (strategy, 2945 ms): Bo, a reserved-stock field works, and I'll set the standing-order price to match the shop.

*Takeaways:* what I believe: "I believe the loaves that matter most should never run out for our regulars, so a standing weekly reserve comes first." · guidance: "Let regulars reserve a standing weekly loaf, and hold that stock back from the daily limit so it is never given away. Take everyone else's orders only up to the remaining limit. I haven't said what to show when a loaf sells out, so the team decides that."
*Mapped:* What happens when two people order the last loaf → Show a daily limit per loaf and stop orders at it · first line 883 ms · 3 turns · all done 14682 ms


## wires: Mika asks "If ordering ahead could feel like one thing, what should it feel like?"

Decisions it settles: What happens when two people order the last loaf (Reserve stock at checkout and show sold out instantly / Accept the order and the bakery confirms or refunds later / Show a daily limit per loaf and stop orders at it); What ordering should feel like: quick and remembered, or guided and reassuring (Quick and remembered / Guided and reassuring)


**Her answer 1:** "Like texting the baker. Don't ask for anything you already know."

- **Mika** (design, 1016 ms): Like texting the baker, so the browse screen gets a "usual order" button up top.
- **Bo** (engineering, 2031 ms): Mika, a usual-order button is great, but it needs the last order saved per customer.
- **Ines** (strategy, 3777 ms): Bo, saving the last order is quick, and it can prefill their usual cart.

*Takeaways:* what I believe: "Ordering ahead should feel like texting the baker: quick, personal, and never asking me what you already know." · guidance: "Make ordering quick and remembered: prefill everything we know about a returning customer (their usual loaf, pickup time, contact details) and only ask what's new. Keep steps minimal and conversational in tone."
*Mapped:* What ordering should feel like: quick and remembered, or guided and reassuring → Quick and remembered · first line 1016 ms · 3 turns · all done 10111 ms


## Notes for judging (builder 6)
- Round 4 changes, after the lead's notes: each teammate brings only its own work that shares words with what was
  actually said (her answer, the question, the thread), so nobody drifts to a pet topic (Bo no longer reaches for
  waitlists); the prompt forbids raising a topic nobody raised; turn 2 always answers turn 1 by name, checked in
  code and retried once.
- Still weak: Noor (Research) can promise a write-up "with sources" that she wasn't given; Ines leans on "pricing"
  whatever comes up. Not seen: a question to her, a line over 15 words, a service message.
- Earlier rounds: 15 bakery answers at 2203949, 15 yoga answers at f56eebf (git history of this file).
