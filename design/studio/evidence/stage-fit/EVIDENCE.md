# Evidence: design/stage-fit (Vincent: a fixed 16:9 stage, no fiddling with window widths)

The painted look now scales the whole 1600x900 room uniformly to FIT the window (was COVER, which cropped the edges and
let five max-width:1500px rules reflow parts at smaller windows). Letterbox bars in the room's dark (#1F1813).
Measured: 1280x800 scale .8, 1440x900 .9, 1512x982 .945, 1920x1080 1.1667; crop vars 0; identical layout in all four
(all-four.png). The five @media (max-width:1500px) blocks are switched off, so no breakpoint fires.
Tests: E2E_LOOK=painted beats 14/0, inputs 8/0. Hit-testing: the e2e click through the stage under the scale.
Plain look unchanged (stage.js already letterboxes).
