# Evidence: design/plain-idea (AUDIT final F2, ?look=plain first screen)
Cause: room.css placed only `.setup .big-card.nt-paper`. The idea card kept `.big-card`'s absolute 470/250, so it sat
at the bottom right, with browser-default controls.
Fix (room.css): the idea card is placed exactly like the name tag (relative, centred on the setup, full stage width).
Its plain styling (question, field, hint, Next) is scoped to `html:not(.painted-on)`, so painted is untouched.
Measured card margins (left / right / top / bottom, width):
- plain: 1920 504/504/380/350 (912); 1440 378/378/315/285 (684); 1280 336/336/282/252 (608), centred.
- painted, unchanged: 1440 card 696 wide, hint opacity 1, field 23px, as on main.
Shots: `plain-{1920,1440,1280}.jpg`, `painted-*-unchanged.jpg`, `before-plain-1440-audit.jpg`.
Tests: npm 282/0; plain nametag 14/0; plain beats 1–2d 8/0; painted nametag 14/0.
