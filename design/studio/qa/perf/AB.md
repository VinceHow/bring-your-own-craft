# The painted room's frame rate, mid-run (rehearsal replay), 1920x1130, headed Chromium under Xvfb (software GL)

Measured on main 4b9a09a, 15 Nov ~03:40 UTC. 8 s of requestAnimationFrame per variant. Main thread: 4-5 % busy, no long tasks:
the cost is compositing, not script.

| Variant | Day fps | Night fps |
|---|---|---|
| plain look | 60.2 | 60.2 |
| painted, full | 14.7 | 9.4 |
| painted, without the living painting | 59.9 | 59.9 |
| painted, living painting without filters, blends and masks | 30.1 | 30.1 |
| painted, living painting without its patch videos | 45.7 | 24.6 |
| painted, room UI hidden (the painting only) | 15.3 | 10.2 |

30 s run (scripts/design-perf.mjs): day 14.9 fps (p50 66.7 ms, p95 100 ms), night 10.4 fps (p50 100 ms, p95 133 ms),
6 videos playing inside the living painting, 0 long tasks. Traces: not committed (large); rerun with the script.

Reading: a VM with software GL is not the demo Mac (a real GPU composites videos, masks and blends far faster), so the
absolute numbers are pessimistic. What is heavy is clear, though: the living painting's per-teammate patches (each a
masked video with an SVG colour matrix and, at night, a multiply light map and a lamp cut-out). The room UI costs nothing.
