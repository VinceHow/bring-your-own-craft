# Evidence: design/tidy-box (P0 from Vincent's Mac: the box lost its top half after the tidy)

Cause: when the clean line takes over, painted.css faded the whole field in from opacity 0 (pt-tidy-in). The field
(textarea) IS the box's top half (its cream fill and border; the mic band below is a separate white strip), so for
~0.35 s the box lost its top border and read paper-coloured over a white band, with the words floating. On a rephrased
(reordered) tidy it was worse: the overlay's blur filter, and the raw line coming back sharp at "close".
Fix (painted.css only): only her words fade in (color from transparent), the field never changes opacity; the reordered
overlay has no filter, softens, then fades as the clean line fades in, in the same box.
Shots: before-1440-reordered.png (frame 2: border gone, paper/white split) and after-1440-reordered.png (box intact in
every frame). Stubbed /api/tidy. Not seen on a Mac yet.
