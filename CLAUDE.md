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
| `index.html` | All screens: home (`#home`), game (`#app`), modals (help, win, lose, levels, menu, leaderboard) |
| `style.css` | All styling and animations |
| `game.js` | Game logic, input, haptics, sound, home screen, menu, stars, records, win effects, UI icons (`UI_ICONS`) |
| `puzzle.js` | Puzzle generator and solver (only used by `tools/build-boards.js` and tests) |
| `boards.json` | The bank of 200 boards in level order: 5×5 (12), 6×6 (16), 7×7 (20), 8×8 (22), 9×9 (24), 10×10 (26), 11×11 (26), 12×12 (27), 13×13 (27) |
| `tools/build-boards.js` | Rebuilds `boards.json` (slow for 12×12/13×13; run sizes in parallel) |
| `creatures.js` | `REGION_COLORS` (13 colors), `CREATURES` (owner's art library), `makeCast()`/`setCast()`, `creatureSVG()`; old SVG `DESIGNS` kept only as a fallback |
| `bgfx.js` | Twinkling/glowing crystals over the background on every page |
| `leaderboard.js` | Supabase REST calls (leaderboard + board records), no library |
| `config.js` | Supabase URL + publishable key (public by design) |
| `supabase/setup.sql` | Full database setup, kept in sync with what's applied |
| `assets/` | Owner's art: `logo.webp/png`, `bg.jpg` (1290×2796 cave), `creatures/cNN.webp` (320×320 board markers), `heroes/cNN.webp` (up to 840px, home screen) |

## Levels and boards
- Levels 1–200 play `boards.json` in order. After 200, each level reuses a random board,
  rotated/flipped (7 transforms) and recolored. Level cap is **99,999**.
- Best times and all-time records belong to the **board** (1–200), not the level number,
  so remixes share them (`boardId() = puzzle.bankIndex + 1`).
- Colors per level are a seeded shuffle of the 13 colors (`colorOf`).

## Creatures (owner's art, 19 so far)
- Every creature is the owner's image, numbered like their files (`creature_11.png` → `c11`).
  `CREATURES` in `creatures.js` lists each with `colors`: first = the color it mainly is
  (matched to the nearest tile color), later ones = backups.
- Each level picks one creature per color, seeded by level (`setCast(lv*7919+17, colorOf)`),
  so colors with several matches rotate between levels. Backtracking guarantees no creature
  repeats on a board. Pink and brown have no creature of their own and borrow backups.
- Home screen: `pickHero()` shows a random creature from the whole library each visit
  (never the same twice in a row). The little 3×3 home board uses its own random cast.
- Board markers (`assets/creatures/cNN.webp`, 320×320) are **sticker icons**, not the full art:
  head close-up, cartoon filter (flat colors + dark ink lines), rounded cut edge, thick #2B2340 outline with a thin cream rim (matches the
  owner's original toad marker). The full art is only used on the home screen (`heroes/`).
- **To add a creature:** trim the transparent PNG, make `assets/heroes/cNN.webp` (longest side
  840), make the marker with `python3 tools/make-marker.py art.png assets/creatures/cNN.webp x0 y0 x1 y1`
  (box = the head area as fractions; check it on a colored tile), add
  `{ id: "cNN", colors: [main, backup...] }` to `CREATURES`, and bump `ART_V` if any image changed.
  `creatureSVG()` greys/tilts image creatures for wrong guesses.

## Controls (owner-specified; keep them)
- Tap = toggle ✕. Second tap on the same square **within 1 second** = place a weirdling.
- Drag across squares to mark many ✕ (or erase if the drag starts on an ✕).
- No Undo button. Tools under the board: Hint (2 per level), Restart, Rules.
- Haptics: light tap for ✕/drag per square, double tap for placing, triple for a mistake
  (iOS 18+ uses the hidden `<input switch>` trick; Android uses `navigator.vibrate`).
- Zoom is blocked everywhere (double-tap, pinch, ctrl/cmd zoom). Inputs use 16px text.

## Look (owner-specified)
- Board: rounded colored tiles with small gaps inside a white rounded frame, strong drop
  shadow. No dark patch outlines. **No glass effect** (owner removed it).
- ✕ marks: bold white, nearly tile-wide, tiny drop shadow. Tile keeps its color under a creature.
- Board complete: white flash, each creature pulses in turn and bursts 8 mini copies
  (solid for 15px, fading over the next 10px), then dance, confetti, win modal.
- Stars: 3 = no mistakes, 2 = one, 1 = two. 3D gold twinkling stars on the win screen;
  best stars per level shown in the level chooser (saved per device).
- Icons: custom cartoon SVGs (thick #2B2340 outline, bright fills): Levels, Leaderboard,
  How to play, Sound/Vibration (on/off variants), Home (mushroom house). Hint/Restart/Rules
  still use emoji.

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
