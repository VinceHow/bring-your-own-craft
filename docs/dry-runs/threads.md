# Meeting threads, dry runs (real model)

Recorded 2026-11-14 16:22 UTC with the real backend: thread turns on haiku via warm processes (lib/thread.js), takeaways + mapping on sonnet (lib/interpret.js). One yoga run (Priya, Product): real first sketch, real profile, real six-seat propose (24 candidates). Each question below is hand-made in the shape builder 7's selector will send (question, artifact, decisionIds of real candidates); her answers are written for the dry run; everything the team says is verbatim model output. "first line" is milliseconds from her submit to the first line logged. Journey redraws were switched off here to keep the comparison clean.


**Timings over 15 answers:** first line median 891 ms (min 775, max 1852); turns per thread 3/4; whole answer (thread + takeaways + mapping) median 11801 ms.


## journey: Mika asks "What makes someone come back to a studio week after week?"

Decisions it settles: What leads the class list: by day and time, or by class type and teacher (Day and time first / Class type or teacher first); How students pay: single drop-in classes, class packs, or both (Drop-in only at launch / Drop-in plus one class pack / Drop-in, class packs and monthly membership)


**Her answer 1:** "Knowing their spot is theirs. My regulars do the same Tuesday class every week and hate hunting for it."

- **Mika** (design, 1703 ms): Tuesday's class goes at the top, with a "your spot" tag on it.
- **Ines** (strategy, 2791 ms): Pricing follows that: Tuesday's spot gets a saved card, so rebooking is one tap.
- **Bo** (engineering, 3837 ms): Stored cards on Tuesday's spot mean the waitlist should auto-notify with one-tap rebooking too.

*Takeaways:* what I believe: "People come back when they know their spot is theirs, and my regulars hate hunting for their same weekly class." · guidance: "Lead the class list by day and time so a regular finds their Tuesday class instantly. Make rebooking the same class effortless, and hold off on extras like packs and memberships until we see evidence."
*Mapped:* What leads the class list: by day and time, or by class type and teacher → Day and time first · first line 1703 ms · 3 turns · all done 10764 ms


**Her answer 2:** "Honestly, the teacher. People follow a teacher, not a timetable."

- **Mika** (design, 933 ms): Then the grey sketches lead with teacher name, not the timetable.
- **Ines** (strategy, 1933 ms): Then I'll make pricing hinge on teacher-led packs, so students stick with who they follow.
- **Bo** (engineering, 2932 ms): Teacher-led packs mean the booking page needs teacher pages, and I'll wire waitlists per instructor.

*Takeaways:* what I believe: "People come back for their teacher, not the timetable, so the teacher is how they find their class." · guidance: "Lead the class list with the teacher, then show their days and times underneath. Keep it simple, and check with my regulars before adding anything more to the list."
*Mapped:* What leads the class list: by day and time, or by class type and teacher → Class type or teacher first · first line 933 ms · 3 turns · all done 13143 ms


**Her answer 3:** "Habit. If it takes more than two taps to rebook, they drift off to the gym down the road."

- **Mika** (design, 795 ms): Habit means the rebook button sits right on the class row, no extra screens.
- **Ines** (strategy, 1794 ms): Rebook on the class row, and cancellations can't cost them a second trip.
- **Bo** (engineering, 2795 ms): Rebook sits on the row, so I'll make the waitlist a one-tap join too.

*Takeaways:* what I believe: "People come back out of habit, so rebooking has to take no more than two taps or they drift off to the gym down the road." · guidance: "Design rebooking first: a returning student should get from the page to booked in two taps or fewer, with their usual class one tap away. Keep payment light, with drop-in plus one pack, so a pack lets them rebook without a payment step each time."
*Mapped:* How students pay: single drop-in classes, class packs, or both → Drop-in plus one class pack · first line 795 ms · 3 turns · all done 9368 ms


**Her answer 4:** "Feeling known. When the studio remembers their name and their mat spot, they keep coming. Most of my regulars started as drop-ins who got a warm welcome on day one."

- **Mika** (design, 829 ms): Feeling known means the class list should show who's teaching and where they sit.
- **Ines** (strategy, 2565 ms): Mika, a mat-spot map on the page would also show who's teaching, so regulars recognize them.
- **Bo** (engineering, 4279 ms): Ines wants the mat map, so I'll store each waitlister's preferred mat spot.

*Takeaways:* what I believe: "I believe people keep coming back when the studio knows them: their name, their mat spot, and a warm welcome on day one, which is how most of my regulars started as drop-ins." · guidance: "Make the first drop-in booking feel personal: remember their name and mat spot, and welcome them warmly. Launch with drop-in only, since that's where regulars begin, and hold packs and memberships until we see evidence."
*Mapped:* How students pay: single drop-in classes, class packs, or both → Drop-in only at launch · first line 829 ms · 3 turns · all done 14796 ms


**Her answer 5:** "Price, if I am honest. Ten-class passes keep people coming because they have already paid."

- **Mika** (design, 879 ms): Ten-pass buyers already paid, so I'll make the pass count the hero.
- **Ines** (strategy, 2579 ms): Ten-pass buyers paid up front, so I'll set the refund cutoff to match.
- **Bo** (engineering, 3580 ms): Price keeps them coming, so the waitlist should auto-notify and never make them wait.

*Takeaways:* what I believe: "Price is what keeps people coming back: once someone has paid for a ten-class pass, they show up to use it." · guidance: "Launch with drop-in plus one ten-class pass, and make using a pass as easy as paying for a single class. Hold off on memberships and extra pack sizes until we see evidence. Leave the class list order for now, since my answer didn't cover it."
*Mapped:* How students pay: single drop-in classes, class packs, or both → Drop-in plus one class pack · first line 879 ms · 3 turns · all done 9731 ms


## finding: Noor asks "Small studios fill their popular classes. What should happen when one is full?"

Decisions it settles: Whether full classes get a waitlist (Waitlist on full classes / Show 'full' only, no waitlist / Waitlist later, after launch evidence); Whether full classes get a waitlist switch (Waitlist on: join with name and contact, auto-notify when a spot opens / Waitlist off: full classes show 'Full' only / Waitlist on, studio confirms spots manually)


**Her answer 1:** "Waitlist, and text them the moment a spot opens. Nobody checks a website twice."

- **Noor** (research, 1852 ms): Noted, I'll write the waitlist as a text alert the moment a spot opens.
- **Bo** (engineering, 3708 ms): Noor, a text alert is clean, but I'll add a stop-after-one-notice rule.
- **Ines** (strategy, 4708 ms): Bo, a stop-after-one-notice rule works, and I'll price the waitlist spot as free.

*Takeaways:* what I believe: "When a class is full, people should join a waitlist and get a text the moment a spot opens, because nobody checks a website twice." · guidance: "Build the waitlist for full classes: join with name and phone number, and automatically text the moment a spot opens. Don't rely on people coming back to the page, and keep it as simple as possible."
*Mapped:* Whether full classes get a waitlist → Waitlist on full classes; Whether full classes get a waitlist switch → Waitlist on: join with name and contact, auto-notify when a spot opens · first line 1852 ms · 3 turns · all done 16310 ms


**Her answer 2:** "Show the next class with space instead. A waitlist just disappoints people."

- **Noor** (research, 903 ms): Then I'll write the page's full-class state around the next-available class, with no waitlist copy.
- **Bo** (engineering, 2603 ms): Noor, agreed, so the full-class state drops the waitlist switch entirely.
- **Ines** (strategy, 3604 ms): Bo, dropping the waitlist switch also means no prepaid holds on full classes.

*Takeaways:* what I believe: "A waitlist just disappoints people; when a class is full, the best thing is to show them the next class with space." · guidance: "Don't build a waitlist. When a class is full, mark it 'Full' and show the next class with space right there so the customer can book it straight away."
*Mapped:* Whether full classes get a waitlist → Show 'full' only, no waitlist; Whether full classes get a waitlist switch → Waitlist off: full classes show 'Full' only · first line 903 ms · 3 turns · all done 9195 ms


**Her answer 3:** "Regulars should get first dibs before it opens to everyone."

- **Noor** (research, 900 ms): Regulars first, then open it to everyone. I'll write up the Monash waitlist rules.
- **Bo** (engineering, 1901 ms): Then regulars get a waitlist switch first, and I'll wire the notify step to them.
- **Ines** (strategy, 3737 ms): Regulars first, so I'll price their waitlist spot: free to join, paid on the day.

*Takeaways:* what I believe: "When a class is full, my regulars get first dibs on a spot before it opens to everyone else." · guidance: "Build a simple waitlist on full classes where regulars are offered an opening first, with auto-notify, then open it to everyone. Keep it minimal and show the next class with space so nobody hits a dead end."
*Mapped:* Whether full classes get a waitlist → Waitlist on full classes; Whether full classes get a waitlist switch → Waitlist on: join with name and contact, auto-notify when a spot opens · first line 900 ms · 3 turns · all done 17661 ms


**Her answer 4:** "Let them join a waitlist, but cap it at five, otherwise it is a false promise."

- **Noor** (research, 1806 ms): Cap at five, and I'll note the Monash waitlist as our one proof point.
- **Bo** (engineering, 3342 ms): Cap at five, and I'll enforce it server-side so the page can't overpromise.
- **Ines** (strategy, 5069 ms): Bo, the server-side cap is right, and I'll make the hold match it: no payment taken past five.

*Takeaways:* what I believe: "A full class should offer a waitlist, but capped at five, because a longer list is a false promise." · guidance: "Build the waitlist on full classes with a hard cap of five; once it's full, show 'Full' and don't let anyone else join. Notify people automatically when a spot opens, and keep the first-dibs rule for regulars."
*Mapped:* Whether full classes get a waitlist → Waitlist on full classes; Whether full classes get a waitlist switch → Waitlist on: join with name and contact, auto-notify when a spot opens · first line 1806 ms · 3 turns · all done 11048 ms


**Her answer 5:** "Honestly I'd rather add another class than run a waitlist. Tell me which ones fill."

- **Noor** (research, 798 ms): Then I'll pull the fill-rate patterns for each class before anything gets scheduled.
- **Bo** (engineering, 1799 ms): Then I'll keep the page simple: no waitlist code, just a clear "Full" state.
- **Ines** (strategy, 2800 ms): Then I'll price the add-a-class plan: which drop-ins cost more, and when.

*Takeaways:* what I believe: "I'd rather add another class than run a waitlist, so a full class should just say it's full and show me which ones fill." · guidance: "Ship full classes as a plain 'Full' with no waitlist, and give the owner a simple view of which classes fill so she can add sessions. Leave the waitlist until real evidence says it's needed."
*Mapped:* Whether full classes get a waitlist → Show 'full' only, no waitlist; Whether full classes get a waitlist switch → Waitlist off: full classes show 'Full' only · first line 798 ms · 3 turns · all done 13989 ms


## wires: Mika asks "If booking could feel like one thing, what should it feel like?"

Decisions it settles: What happens when two people try to book the last spot (First confirmed booking wins; the other sees 'just filled' and is offered the waitlist / Hold the spot for 5 minutes while the person pays / Allow overbooking and let the studio sort it out); What booking should feel like: quick and remembered, or guided and reassuring (Quick and remembered / Guided and reassuring)


**Her answer 1:** "Fast. Don't ask for anything you already know."

- **Mika** (design, 849 ms): Then the sketch drops the form, and one tap books from saved details.
- **Bo** (engineering, 1850 ms): Saved details mean Bo's waitlist and payment states can skip the form too.
- **Ines** (strategy, 3572 ms): Saved details mean I can drop the prepay step for returning students.

*Takeaways:* what I believe: "Booking should feel fast, and it should never ask me for something it already knows." · guidance: "Design the flow as quick and remembered. Prefill name, pass and payment for returning regulars, skip any step that repeats known information, and ask only for what's genuinely missing."
*Mapped:* What booking should feel like: quick and remembered, or guided and reassuring → Quick and remembered · first line 849 ms · 3 turns · all done 14041 ms


**Her answer 2:** "Like texting a friend. One question at a time, no forms."

- **Mika** (design, 775 ms): Like texting a friend" means the grey wireframe gets chat-style steps, one question per screen, Day and time up top.
- **Bo** (engineering, 2595 ms): Mika, chat steps work, and I'll save each answer as it arrives.
- **Ines** (strategy, 4395 ms): Bo, saving answers as they arrive works, but cancellations need the same care: hold cards, don't charge yet.
- **Theo** (data, 6179 ms): Ines, holding cards with no charge means I'll track drop-off at the card step.

*Takeaways:* what I believe: "Booking should feel like texting a friend: one question at a time, no forms, and never asking for what you already know." · guidance: "Design booking as a short conversational flow with one question per step, prefilled with what we already know about the regular. No forms, and aim for a regular to book in seconds."
*Mapped:* What booking should feel like: quick and remembered, or guided and reassuring → Quick and remembered · first line 775 ms · 4 turns · all done 16732 ms


**Her answer 3:** "Calm. It is a yoga studio; the page should breathe."

- **Mika** (design, 891 ms): Calm means no red badges, so the full-class state gets a quiet grey row.
- **Bo** (engineering, 5283 ms): Inline note works; the class stays selected until payment confirms.
- **Ines** (strategy, 6283 ms): Calm pricing means no surprise fees at checkout, so the price stays visible and fixed.

*Takeaways:* what I believe: "Booking should feel calm: the page breathes, and nothing about it hurries or crowds the person." · guidance: "Design the booking screens with space, quiet type and one clear step at a time, with no clutter or pressure cues. Keep it fast by remembering what we already know, but let calm lead the feel."
*Mapped:* What booking should feel like: quick and remembered, or guided and reassuring → Guided and reassuring · first line 891 ms · 3 turns · all done 11801 ms


**Her answer 4:** "Certain. When you hit book, you know your spot is held, no "pending" nonsense."

- **Mika** (design, 902 ms): Certain means the spot's locked before they see the confirmation, so I'll drop "pending" entirely.
- **Bo** (engineering, 2677 ms): Then the confirm screen shows the held spot, and a timer never appears.
- **Ines** (strategy, 3677 ms): Then cancellations refund the spot instantly, so nobody's card waits on a hold.

*Takeaways:* what I believe: "Booking should feel certain: when you hit book, your spot is held, with no "pending" nonsense." · guidance: "Make every booking final and confirmed the moment someone taps book, with no pending states. If someone loses the last spot, tell them plainly that it just filled, and never imply a spot is held when it isn't."
*Mapped:* What happens when two people try to book the last spot → First confirmed booking wins; the other sees 'just filled' and is offered the waitlist; What booking should feel like: quick and remembered, or guided and reassuring → Quick and remembered · first line 902 ms · 3 turns · all done 9557 ms


**Her answer 5:** "Personal. It should greet my regulars by name and have their usual class ready."

- **Mika** (design, 805 ms): Personal means the regulars' usual class is the first thing they see.
- **Bo** (engineering, 2464 ms): Mika, the regulars' usual class can sit behind a one-tap rebook, so it stays fast.
- **Ines** (strategy, 3465 ms): Bo, a one-tap rebook is great, and I'll make cancellations refund the pack credit automatically.

*Takeaways:* what I believe: "Booking should feel personal: it knows my regulars by name and has their usual class ready." · guidance: "Design wires around recognition: greet returning regulars by name and pre-select their usual class so booking is one tap. Keep it quick and remembered, not a guided walkthrough."
*Mapped:* What booking should feel like: quick and remembered, or guided and reassuring → Quick and remembered · first line 805 ms · 3 turns · all done 9235 ms


## Notes for judging (builder 6)
- What changed across three prompt rounds (all 15 answers re-run each time; this file is the last round, verbatim):
  round 1 cut lines mid-sentence and echoed each other ("Two taps is the bar, so I'll..." three times); round 2
  parroted the prompt's own example and drifted from her answer; round 3 puts her answer at the centre ("never
  contradict her, never steer back to something she ruled out"), takes examples from a bakery, narrows each
  teammate's work to what the question touches, keeps Research to questions about its finding, and never cuts a line.
- Still weak: Engineering pulls back towards waitlists (its own work in this run); one line names Bo in the third
  person. Not seen: a teammate asking her anything.
- Speed: the thread's processes are kept warm per run (lib/thread.js); the first line is the time from her submit.
  Takeaways and mapping run alongside on sonnet and are logged after the thread, so the whole answer takes ~12 s but
  nobody waits on it.
