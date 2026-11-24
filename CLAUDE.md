# Weirdlings: notes for Claude

Weirdlings is a Meowdoku/"Queens"-style logic puzzle web game. Live at
https://jerridthomas-79.github.io/weirdlings/ (GitHub Pages, `main` branch, repo root).
Plain HTML/CSS/JS, no build step. The owner plays on an **iPhone 14 Pro Max** (430×932 pt),
often from the Home Screen, so every change must work well there.

## Rules of the puzzle
N×N grid split into N colored patches. Place one weirdling per row, column and patch;
no two may touch, even diagonally. Every board has exactly one solution.

## Files
| File | What it does |
|---|---|
| `index.html` | All screens: home (`#home`, with the Journey/Random picker), game (`#app`, with the `#crowd` strip under the tools), modals (help, win, lose, levels, menu, leaderboard) |
| `style.css` | All styling and animations |
| `game.js` | Game logic, input, haptics, sound, home screen, menu, stars, records, win effects, UI icons (`UI_ICONS`) |
| `puzzle.js` | Puzzle generator and solver (only used by `tools/build-boards.js` and tests) |
| `boards.json` | The bank of 173 boards in level order: 5×5 (12), 6×6 (16), 7×7 (20), 8×8 (22), 9×9 (24), 10×10 (26), 11×11 (26), 12×12 (27). 13×13 was removed (owner: "too much"); don't add it back |
| `tools/build-boards.js` | Rebuilds `boards.json` (slow for 12×12/13×13; run sizes in parallel) |
| `creatures.js` | `REGION_COLORS` (12 colors), `SYMBOLS` + `paintTile()` (tile color + its symbol), `CREATURES` (owner's art library), `HERO_META` (full-art size + eye spots/eyelid colors for the crowd), `makeCast()`/`setCast()`/`getCast()`, `creatureSVG()`; old SVG `DESIGNS` kept only as a fallback |
| `bgfx.js` | Twinkling/glowing crystals over the background on every page |
| `leaderboard.js` | Supabase REST calls (leaderboard + board records), no library |
| `config.js` | Supabase URL + publishable key (public by design) |
| `supabase/setup.sql` | Full database setup, kept in sync with what's applied |
| `assets/` | Owner's art: `logo.webp/png`, `bg.jpg` (1290×2796 cave), `creatures/cNN.webp` (320×320 board markers), `heroes/cNN.webp` (up to 840px, home screen) |

## Levels and boards
- Levels 1–173 play `boards.json` in order. After 173, each level reuses a random board,
  rotated/flipped (7 transforms) and recolored. Level cap is **99,999**.
- Best times and all-time records belong to the **board** (1–173), not the level number,
  so remixes share them (`boardId() = puzzle.bankIndex + 1`).
- 12 colors (lime was removed by the owner). Colors per level come from `contrastColors()`: a seeded
  shuffle, then a seeded hill-climb (swaps + swapping in unused colors) that maximizes the weakest
  OKLab contrast between edge-touching patches (corner touches count half). Each color also has its
  own tiny black-and-white symbol (heart, triangle, star, plus, drop, circle, diamond, square, moon,
  hexagon, bolt, dome) painted top-middle of every tile as a background image (clear of the ✕ arms).
  Symbols are a setting (`save.symbols`, **off by default**; toggle in the game menu "Color symbols"
  and the tiles icon in the home screen's top bar; `body.symbols-on`). With symbols off, every tile
  gets a dark inner outline (inset box-shadow, ~5% of a tile) to separate it from its neighbours.
  The colors were re-tuned
  in OKLCH (owner: "colors too similar") so close pairs (orange/mustard, blue/slate, green/lime,
  pink/magenta, teal/blue) are more saturated. A 2nd pass (owner: greens, earth tones and pinks still
  too alike) spread lightness too: deep emerald green vs bright chartreuse lime, dark brown vs pale
  sand vs amber mustard, light pink vs deep magenta. Minimum OKLab distance is now ~0.12; keep it there.

## Modes (home screen picker, saved as `save.mode`)
- **Journey**: level by level, as above. Only Journey wins change progress, stars and the leaderboard total.
- **Random**: `startRandom()` picks any size, then any bank board of that size, any of the 8
  rotations/flips, and random colors (`randomSpec = {idx, sym, seed}`). Restart/Try again replay the
  same spec; the win card's button is "New random board". Times still count for that board's
  records (records belong to the board). Choosing a level in the Levels list switches back to Journey.
- `startLevel()`/`startRandom()` both go through `begin()`; `gameId` bumps per board so late
  Supabase replies and win timers for an old board are ignored.

## Creatures (owner's art, 19 so far)
- Every creature is the owner's image, numbered like their files (`creature_11.png` → `c11`).
  `CREATURES` in `creatures.js` lists each with `colors`: first = the color it mainly is
  (matched to the nearest tile color), later ones = backups.
- Each level picks one creature per color, seeded by level (`setCast(lv*7919+17, colorOf)`),
  so colors with several matches rotate between levels. Backtracking guarantees no creature
  repeats on a board. Pink and brown have no creature of their own and borrow backups.
- Home screen: `pickHero()` shows a random creature from the whole library each visit
  (never the same twice in a row). The little 3×3 home board uses its own random cast.
- Board markers (`assets/creatures/cNN.webp`, 320×320) are **hand-drawn cartoon sticker heads**
  (owner's request: "your own style", like the original toad marker): SVG drawings in
  `tools/markers/heads.py` (one function per creature, thick #2B2340 strokes, gradient fills, big
  eyes), rendered by `tools/markers/render.py` (Playwright → `tools/markers/raw/`), then
  `tools/markers/finish.py` adds the cream border + dark outer ring and writes the .webp-ready PNGs.
  The full art is only used on the home screen (`heroes/`).
- **To add a creature:** trim the transparent PNG, make `assets/heroes/cNN.webp` (longest side
  840), draw a new `cNN()` head in `heads.py` (add it to `DESIGNS`), render + finish, save as
  `assets/creatures/cNN.webp`, add
  `{ id: "cNN", colors: [main, backup...] }` to `CREATURES`, and bump `ART_V` if any image changed.
  `creatureSVG()` greys/tilts image creatures for wrong guesses.

## Controls (owner-specified; keep them)
- Tap = toggle ✕. Second tap on the same square **within 1 second** = place a weirdling.
- Drag across squares to mark many ✕ (or erase if the drag starts on an ✕).
- No Undo button. Tools under the board: Hint (2 per level), Restart, Rules.
- Haptics: light tap for ✕/drag per square, double tap for placing, triple for a mistake
  (iOS 18+ uses the hidden `<input switch>` trick; Android uses `navigator.vibrate`).
- Rules screen (`#modal-help`) shows three rule cards with little pictures, in the owner's words:
  "1 creature per color", "No creatures can touch", "1 creature per row and column".
  Player-facing text says "creature" (not "weirdling") for the pieces.
- Zoom is blocked everywhere (double-tap, pinch, ctrl/cmd zoom). Inputs use 16px text.

## Look (owner-specified)
- Board: rounded colored tiles with small gaps inside a white rounded frame, strong drop
  shadow. No dark patch outlines. **No glass effect** (owner removed it). The frame is thickened
  outward by `--frame` (9px, a white box-shadow spread) without taking tile space; the bars above
  and below use `--ui-w` (board + frame) so they line up with the frame's outside edge.
- Touch is forgiving: `cellFromPoint()` maps the finger position to the nearest square by
  geometry, so gaps, the frame and `EDGE_SLOP` (12px) past it count as the edge squares
  (`.board::before` extends the board's touch area). Swiping just outside an edge still marks that row/column.
- ✕ marks: bold white, nearly tile-wide, dark drop shadow. Tile keeps its color under a creature.
- Board markers are 110% of their tile (just bigger than the tile) with a dark drop shadow;
  `.cell.has-w` lifts that tile above its neighbours.
- Board complete: white flash, each creature pulses in turn and bursts 8 mini copies
  (solid for 15px, fading over the next 10px), then the board pops (`.board.pop`) while crystal
  gems and twinkles (`boardPop()`, pink/ice-blue/violet like the cave crystals) burst out of it,
  creatures dance, confetti, win modal (`POP_HOLD` gives the pop time before the card).
- Crowd under the board (`#crowd`): one small full-art creature per patch (two staggered rows above
  7). They sway, sometimes lean toward you, and blink (eyelid spots from `HERO_META.eyes`: x%, y%,
  radius % of width, lid color). When a patch's weirdling is found its creature pops, "smiles"
  (happy closed-eye arcs) and keeps dancing; unfound ones are slightly dimmed; a wrong guess makes
  that patch's creature wince; on a win they all party. The crowd shrinks (and hides under 30px)
  on short screens so the board never shrinks for it. c18 (sleeping sloth) and c24 have no lids.
- Stars: 3 = no mistakes, 2 = one, 1 = two. 3D gold twinkling stars on the win screen;
  best stars per level shown in the level chooser (saved per device).
- Icons: custom cartoon SVGs (thick #2B2340 outline, bright fills): Levels, Leaderboard,
  How to play, Sound/Vibration/Color symbols (on/off variants), Home (mushroom house), and the game-screen tools:
  Hint (glowing bulb, hint count in a pink badge), Restart (teal circular arrow), Rules (open book).
  The tool buttons use the same chunky ghost style as the home buttons.

## Online features (Supabase project "weirdlings", ref `kbaarcakmjbcprlkeavc`, us-east-2)
- `players` table + `leaderboard` view (security_invoker) + `submit_score()`: total levels
  completed, can't go down, max 99,999; each device has a private id + secret in localStorage.
- `board_records` table + `submit_time()`: fastest time per board (1–200), min 1.5s.
  Wins that used hints don't count for records.
- Publishable key (`sb_...`) goes in the `apikey` header only, never `Authorization`.
- The remaining advisor warnings (public can execute the SECURITY DEFINER functions) are
  intentional. Free projects pause after ~a week idle; restore from the dashboard.

## Working conventions
- **Bump the `?v=N` cache-busting number** on every changed file reference in `index.html`
  (and `boards.json` in `game.js`, `creature-*.webp` in `creatures.js`) or phones keep old files.
- Save data: localStorage `weirdlings-v1` (progress, stars, `boardBest`, sound/haptics)
  and `weirdlings-player` (leaderboard id/secret/name). Keep them backward compatible.
- Test in Playwright at 430×932, `is_mobile`, `has_touch`, served over `python -m http.server`
  (`fetch` of `boards.json` fails on `file://`). The game starts on the home screen, so tap
  `#btn-play` first. `window.__weirdlings.puzzleForLevel(lv)` gives the solution for tests;
  `window.__bgfx.twinkle(i)` lights a crystal. Mock Supabase with `page.route`.
- Commit to `main` and push; the owner checks results on their phone.
