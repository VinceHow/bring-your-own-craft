# Cast room: how it's made

Page: `public/looks/comps/cast-room.html` (1600x900, autoplays, `?still=1` for the end state). Assets: `public/looks/cast/`.
Options: `?time=morning|afternoon|building|evening` pins a time of day (default: the day cycles afternoon → building →
evening → morning, 20 s each); `?seg=14` shortens each time of day (used for the recording).

- **Room:** the afternoon studio painting with all five teammates and the cat painted out (fal image edit). It lines up
  pixel-for-pixel with the original painting, so the cast drops back in exactly where they were painted.
- **Teammates:** cut from the original painting (background removed), trimmed so no table or neighbour comes with them.
  Extra frames are fal edits of the same crop: eyes closed (patched onto the eyes only, so a blink is seamless), Mika
  scribbling, and one signature pose each (Mika shows the star, Noor holds up a tab, Theo lifts the card, Ines raises
  the cup, Bo gives a lazy thumbs up). Bo doesn't blink: the eyes are already half-lidded.
- **Motion (code):** each breathes at its own pace; blinks at its own rhythm; Mika works in bursts, Noor nods at a page,
  Theo squares up. About every 15 s an exchange: the speaker leans in, a paper slip appears, the others turn toward
  them, and a signature move plays. Light: slow window glow, fairy lights, dust in the sun, steam from two mugs.
- **Time of day (round 2):** four character-free plates painted from the design studio's morning, building and evening
  rooms (same composition, so the cast never moves). Crossfade 2.6 s; the light on the cast shifts with a CSS filter;
  window glow by day, lamp glow by evening, fairy lights brighter at night, dust only in daylight. Habits change with
  the time: morning Mika yawns; afternoon Mika draws; building Mika scribbles, Noor peers through the magnifying glass,
  Ines marks an X on the map, Bo types faster, Theo tidies more often; evening Ines sips and Bo stops typing.
- **Ines is the explorer** (Vincent's pick): khaki hat with a feather, raised eyebrow, sly smile. Frames: blink, slow
  sip with the hat tipped back, marking an X on the map, and the signature point ahead with a slow wink.
- **Cat:** click it and it opens its eyes and purrs.
- Lines: Bo/Ines and Noor/Bo are from DEMO.md. All other lines (Mika's 8pm button, Theo's sourdough, the morning coffee,
  the evening sign-off) are placeholders written for the comp, not from a run.
- fal spend: about $3.00 in total (round 1 about $1.60; round 2 about $1.40: 4 room plates, 9 pose edits, 6 background
  removals). Within the $4 budget.
