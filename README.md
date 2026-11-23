# Weirdlings

A cozy logic puzzle for your phone's browser, inspired by Meowdoku.

**Rules:** place one weirdling in every row, every column, and every colored patch. Weirdlings are shy, so no two can touch, not even corner to corner.

- Tap a square to mark ✕, then tap it again to place a weirdling. Drag across squares to mark several at once.
- A wrong placement costs a ❤️. Lose all 3 and the level restarts.
- 2 hints per level, plus undo and restart.
- Endless levels that grow from 5×5 up to 9×9. Every puzzle has exactly one solution.
- Progress saves on your device. Use "Add to Home Screen" to play it like an app.

Plain HTML/CSS/JS with no build step, hosted on GitHub Pages.

| File | What it does |
|---|---|
| `puzzle.js` | Puzzle generator and solver |
| `creatures.js` | The weirdling artwork (SVG) |
| `game.js` | Gameplay, input, saving |
| `style.css` | Look and animations |
