# Voice: her notes, in pieces (build notes)

Comp: `public/looks/comps/voice-capture.html` (`?fail=1` tidy never answers, `?same=1` speech-to-text already clean).
Stills `capture-*.jpg`, clip `capture.webm`. Earlier rounds (`voice-ink`, `voice-listens`, `voice-pieces`, `voice-tidy`)
are exploration only.

## The flow
1. She clicks a part of the work → an empty pink ring (pending pin) on it; her pen loops that part while she holds V.
   Nothing else on screen reacts: no teammates while she captures.
2. Release → speech-to-text (batch, ~0.6–1 s, "Writing it down") → a new piece: her raw words, in soft grey.
3. `tidy()` runs on that piece right away (one fast model call, ~1 s). Each piece is tidied as it lands.
4. Pieces stack as lines on one sheet ("Your thoughts"). The newest shows: See what you said · Say it again · Remove.
5. One **Send** gathers the clean pieces into one note, fills her pin, fires `studio:said`, and clears her sheet in 0.45 s.
   The loop comp (`her-page.html`) owns her P pin, the replies and the work changing from there.

## tidy(piece, request)
- **In:** `piece._raw`, the speech-to-text text exactly as returned (fillers included), already rendered by
  `rawInto(piece, raw)` as one `span.tk` per word. `request()` returns a Promise of the clean text, or rejects / never
  resolves on failure. Rule for the model: **only clean** (drop fillers, false starts, repeats; fix casing and
  punctuation). No new claims, no new content, no softening.
- **Timing:** "Tidying…" appears only if the call is still out at 0.5 s (`TIDY_SHOW_AT`). Past 3 s (`TIDY_GIVE_UP`) it
  gives up silently.
- **Out:** resolves to one of these, and also sets `piece.dataset.tidy`:
  - `'tidied'`: `diffWords(raw, clean)` (word-level LCS on lower-cased words, punctuation ignored) gives keep / drop / add.
    Drops blur and fold away (0.28 s), kept words slide together (FLIP, spring, no bounce), changed words ("regulars," →
    "Regulars") cross over, added words fade in, and the ink dries grey → her pink left to right (~1 s in all).
  - `'same'`: the clean text is identical word for word, so there's no motion; the ink just dries.
  - `'kept'`: failed or past 3 s, so her raw words stay and the ink dries. No error shown.
- `piece._clean` holds the result (`clean(piece)` falls back to raw). `piece._raw` is never thrown away: "See what you
  said" shows it, and "Use mine" sets `_clean = _raw`.

## Send event
`document.dispatchEvent(new CustomEvent('studio:said', { detail: { text, anchor, pieces: [{ text, raw, anchor }] } }))`
`text` is the gathered clean pieces, joined. `anchor` is the first piece's part (one pin per Send for the demo).

## Hooks (data-slot)
`capture-sheet`, `pieces`, `piece`, `piece-anchor`, `piece-words`, `piece-status`, `piece-controls`, `voice-pill`, `send`,
`pen`, `her-pin` (pending ring; in the merged comp her-page draws the real one), `gathered-note`, `reply-standin`
(a stand-in only; her-page's replies replace it).

## Honest notes
- The voice level and the tidy results are scripted in the comp.
- Live word-by-word words would need streaming speech-to-text; that's labelled "future" in `voice-tidy.html?stream=1`.
- `public/voice.js` stops recording at 20 s (`MAX_MS`), which cuts off a long piece. Raise it.
