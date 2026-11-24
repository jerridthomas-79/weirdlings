# Weirdlings

A cozy logic puzzle for your phone's browser, inspired by Meowdoku.

**Rules:** place one weirdling in every row, every column, and every colored patch. Weirdlings are shy, so no two can touch, not even corner to corner.

- Tap a square to mark ✕ (tap again after a second to clear it). Double-tap within 1 second to place a weirdling. Drag across squares to mark several at once.
- A wrong placement costs a ❤️. Lose all 3 and the level restarts.
- 2 hints per level, plus restart.
- 173 levels that grow from 5×5 up to 12×12, saved in `boards.json`. Every puzzle has exactly one solution.
- After level 173 the game reuses a board you've already solved, rotated or flipped and recolored so it looks new. It never generates new boards.
- Progress saves on your device. Use "Add to Home Screen" to play it like an app.

Plain HTML/CSS/JS with no build step, hosted on GitHub Pages.

| File | What it does |
|---|---|
| `boards.json` | The 173 saved puzzles, in level order |
| `puzzle.js` | Puzzle generator and solver |
| `tools/build-boards.js` | Rebuilds `boards.json` (run with Node) |
| `creatures.js` | The weirdling artwork (SVG) |
| `game.js` | Gameplay, level order, rotate/recolor, saving |
| `style.css` | Look and animations |

## Online leaderboard

Players pick a name and their total levels completed (max 99,999) is shared on a leaderboard stored in [Supabase](https://supabase.com).

1. Create a free Supabase project.
2. Open **SQL Editor**, paste in `supabase/setup.sql`, and click **Run**.
3. Put the project URL and the **Publishable** key into `config.js`.

Without those settings the game still works; the leaderboard shows just your own total.
