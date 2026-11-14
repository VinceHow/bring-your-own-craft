# Keys

One line per key. The same list is on the room's help card (press `?`; hidden in stage mode) and in `public/stage.js`.

| Key | What it does |
|---|---|
| `→` · `PageDown` · `Space` | Next beat (a clicker's forward button). |
| `←` · `PageUp` | Previous beat (a clicker's back button). |
| `Home` · `0` | Reset to the empty room. |
| `S` | Stage mode: body text 20px and up, no chrome, no help card. |
| `R` | Replay the rehearsal run (`runs/rehearsal`), labelled REPLAY. In the close: the café run's three questions. |
| `C` | Replay the café run (`runs/cafe`), labelled REPLAY. In the close: its three questions. |
| `J` | The close: type a judge's idea. |
| `F` | Play the fake fixture run, labelled FAKE (for building the room only). |
| `Enter` | Back to her input (or the judge's idea, in the close). |
| `Esc` | Leave the input, so the keys work again. |
| `?` | Toggle the help card (never in stage mode). |

Keys are ignored while typing, except `Esc`. A clicker's `PageUp`/`PageDown` still moves the beat from an empty input.
`Space` types a space inside an input, so on a clicker use its forward button.

**Recording a replay:** `node scripts/record-run.mjs rehearsal [run-id]` (or `cafe`) copies a finished `runs/<id>` to
`runs/<name>`; with no id it takes the newest finished run (a built one first). `--force` replaces an existing one.

**When a live call is slow or fails:** the step it's on shows under the table with its seconds (never a spinner). After
25 s it adds "slow · R replays the rehearsal"; on a failure it says it stopped. `?slow=<ms>` changes the 25 s for testing.
