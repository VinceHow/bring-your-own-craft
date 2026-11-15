# Evidence: design/one-reply (P0: a reply shown twice in the meeting)

Before: `before-b3-1440x900-6.jpg` (b3's audit). Noor's reply showed both as a note by its pin on the work and in the column.
Fix (painted-focus.css): while her document has the meeting column, the pin's reply notes are hidden. The pin stays.
Measured (painted, a stubbed meeting, one reply): at 1440 and 1920, pin notes visible 0, column replies 1, pins 1.
After the document closes, a room chatter line still shows (1 visible).
Shots: `or1440-meeting.jpg`, `or1920-meeting.jpg`, `or1440-room.jpg`, `or1920-room.jpg`.
Tests: npm test 282/0; E2E_LOOK=painted beats 1e/2b/2c 3/0; focus-ack + focus-wait 6/0.
