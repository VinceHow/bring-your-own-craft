# Cast room: how it's made

Page: `public/looks/comps/cast-room.html` (1600x900, autoplays, `?still=1` for the end state). Assets: `public/looks/cast/`.

- **Room:** the afternoon studio painting with all five teammates and the cat painted out (fal image edit). It lines up
  pixel-for-pixel with the original painting, so the cast drops back in exactly where they were painted.
- **Teammates:** cut from the original painting (background removed), trimmed so no table or neighbour comes with them.
  Extra frames are fal edits of the same crop: eyes closed (patched onto the eyes only, so a blink is seamless), Mika
  scribbling, and one signature pose each (Mika shows the star, Noor holds up a tab, Theo lifts the card, Ines raises
  the cup, Bo gives a lazy thumbs up). Bo doesn't blink: the eyes are already half-lidded.
- **Motion (code):** each breathes at its own pace; blinks at its own rhythm; Mika works in bursts, Noor nods at a page,
  Theo squares up. About every 15 s an exchange: the speaker leans in, a paper slip appears, the others turn toward
  them, and a signature move plays. Light: slow window glow, fairy lights, dust in the sun, steam from two mugs.
- **Cat:** click it and it opens its eyes and purrs.
- Lines: Bo/Ines and Noor/Bo are from DEMO.md. Mika's "I'll put 8pm right on the button." and Theo's "Sourdough, gone
  by ten. Every week." are placeholders written for the comp, not from a run.
- fal spend: about $1.60 (3 background images, 13 pose edits, 13 background removals).
