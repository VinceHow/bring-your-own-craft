# Evidence: design/door-reveal (POLISH §3, the door)
Before (`1440-before.jpg`): as the door layer faded, its arch showed over the room for about 250 ms (the clip's last frame
and the room have different crops).
After (`1440-after.jpg`, `1440-after-8fps.jpg`): the room shows first through the open doorway, and the reveal widens outward
in 0.9 s, so the arch is gone before the room's edges arrive. Reduced motion: a plain fade, no mask.
Recorded at 1440 in a real browser through the whole opening (idea → name tag → meet the team → door).
1920: `1920-after-6fps.jpg`, the same reveal.
Tests: npm test 282/0; E2E_LOOK=painted studio 9/0.
