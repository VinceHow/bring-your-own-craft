# Evidence: design/chatter-place (b7's two chatter findings with the warmer, longer lines)

1. Bo's note ran off the right edge: it now sits above his pill, over the bookshelf. Box at 1920 1514-1790, 1440 1167-1389,
   1280 1035-1232 (all ≥16 px inside), clear of Ines's pill and Bo's own pill. Mika's and Ines's notes are narrower so they
   stay ≥16 px inside at 1440/1280 too (Mika was 3 px from the left edge). Every seat measured at all 3 sizes.
2. "the research teammate's note under the painting": not reproduced. Her note renders on top (see the 1440 screenshot); elementFromPoint
   misses it only because the chatter layer has pointer-events: none. With calm-2 only the newest note shows, so an older
   one disappears when a newer one lands, by design.
Tests: painted teamgo 5/0, room (see commit). Shots: bo-*.png, mika-*.png (painted, day).
