// Weirdlings game UI
(function () {
  const { mulberry32 } = window.WeirdPuzzle;
  const { REGION_COLORS, creatureSVG, paintTile } = window.Weirdlings;

  const MAX_HEARTS = 3;
  const MAX_LEVEL = 99999; // level counter tops out here
  const HINTS_PER_LEVEL = 2;
  const STORE_KEY = "weirdlings-v1";

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");

  // ---------- saved progress ----------
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.unlocked) { if (s.haptics === undefined) s.haptics = true; return s; }
    } catch (e) {}
    return { unlocked: 1, current: 1, done: {}, best: {}, sound: true, haptics: true, seenHelp: false };
  }
  function writeSave() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  const save = loadSave();

  // ---------- sound ----------
  let audio = null;
  function tone(freq, dur, type = "sine", vol = 0.12, delay = 0) {
    if (!save.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + delay;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (e) {}
  }
  // ---------- haptics ----------
  // Android: real vibration. iPhone (iOS 18+): Safari has no vibration API,
  // but toggling a hidden "switch" checkbox makes the phone give a haptic tick.
  const haptic = (() => {
    const canVibrate = typeof navigator.vibrate === "function";
    let label = null;
    function tick() {
      try {
        if (!label) {
          label = document.createElement("label");
          label.setAttribute("aria-hidden", "true");
          label.style.display = "none";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.setAttribute("switch", "");
          label.appendChild(input);
          document.body.appendChild(label);
        }
        label.click();
      } catch (e) {}
    }
    function pattern(ms, ticks) {
      if (!save.haptics) return;
      if (canVibrate) { try { navigator.vibrate(ms); } catch (e) {} return; }
      tick();
      for (let k = 1; k < ticks; k++) setTimeout(tick, k * 70);
    }
    return {
      light: () => pattern(12, 1),          // one tap: mark X / drag over a square
      strong: () => pattern(45, 2),         // double tap: place a weirdling
      error: () => pattern([60, 50, 60], 3) // wrong guess
    };
  })();

  const sfx = {
    mark: () => tone(880, 0.06, "triangle", 0.06),
    place: () => { tone(520, 0.12, "sine"); tone(780, 0.18, "sine", 0.12, 0.08); },
    wrong: () => { tone(180, 0.25, "sawtooth", 0.08); tone(140, 0.3, "sawtooth", 0.08, 0.1); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, i * 0.11)),
  };

  // ---------- level bank ----------
  // boards.json holds 173 unique puzzles in order (5x5 up to 12x12; 13x13 was removed).
  // Levels 1-200 play them in order. After that, a previously solved board
  // is picked at random and rotated/flipped so it looks new.
  // Every level also gets its own random colors.
  let bank = [];
  const B36 = "0123456789abc";

  function shuffled(n, rng) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // The 8 ways to rotate/flip a square grid.
  function transformRC(sym, r, c, n) {
    const m = n - 1;
    switch (sym) {
      case 1: return [c, m - r];       // rotate 90
      case 2: return [m - r, m - c];   // rotate 180
      case 3: return [m - c, r];       // rotate 270
      case 4: return [r, m - c];       // mirror
      case 5: return [m - r, c];       // flip
      case 6: return [c, r];           // diagonal
      case 7: return [m - c, m - r];   // anti-diagonal
      default: return [r, c];
    }
  }

  function bankPick(lv) {
    if (lv <= bank.length) return { idx: lv - 1, sym: 0 };
    const rng = mulberry32(lv * 2654435761);
    let idx = Math.floor(rng() * bank.length);
    if (idx === bankPick(lv - 1).idx) idx = (idx + 1 + Math.floor(rng() * (bank.length - 1))) % bank.length;
    return { idx, sym: 1 + Math.floor(rng() * 7) };
  }

  function puzzleForLevel(lv) {
    const { idx, sym } = bankPick(lv);
    return puzzleFrom(idx, sym, lv * 977 + 31);
  }

  // Build a playable puzzle from bank board `idx`, rotated/flipped by `sym`,
  // with colors shuffled by `colorSeed`.
  function puzzleFrom(idx, sym, colorSeed) {
    const b = bank[idx];
    const n = b.n;
    const regions = new Array(n * n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const [r2, c2] = transformRC(sym, r, c, n);
        regions[r2 * n + c2] = B36.indexOf(b.r[r * n + c]);
      }
    }
    const solution = new Array(n);
    for (let r = 0; r < n; r++) {
      const [r2, c2] = transformRC(sym, r, B36.indexOf(b.s[r]), n);
      solution[r2] = c2;
    }
    // fresh colors (and creatures) for this level, arranged so touching patches contrast
    const colorOf = contrastColors(regions, n, mulberry32(colorSeed));
    return { n, regions, solution, colorOf, bankIndex: idx, sym };
  }

  // ---------- colors: maximize contrast between neighbouring patches ----------
  // OKLab distance between every pair of palette colors.
  const COLOR_DIST = (() => {
    const lab = REGION_COLORS.map(({ tile }) => {
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const [r, g, b] = [1, 3, 5].map((k) => lin(parseInt(tile.slice(k, k + 2), 16)));
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2];
    });
    return lab.map((a) => lab.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])));
  })();
  // Pick a color for each patch: start from a seeded shuffle, then swap colors around
  // (and swap in unused ones) to make the closest pair of touching patches as different
  // as possible. Patches touching along an edge count fully, corner-only touches count half.
  function contrastColors(regions, n, rng) {
    const all = shuffled(REGION_COLORS.length, rng);
    const asg = all.slice(0, n), spare = all.slice(n);
    const w = new Map();
    const link = (a, b, wt) => {
      if (a === b) return;
      const k = a < b ? a * 64 + b : b * 64 + a;
      w.set(k, Math.max(w.get(k) || 0, wt));
    };
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const a = regions[r * n + c];
      if (c + 1 < n) link(a, regions[r * n + c + 1], 1);
      if (r + 1 < n) link(a, regions[(r + 1) * n + c], 1);
      if (r + 1 < n && c + 1 < n) link(a, regions[(r + 1) * n + c + 1], 0.5);
      if (r + 1 < n && c > 0) link(a, regions[(r + 1) * n + c - 1], 0.5);
    }
    const pairs = [...w].map(([k, wt]) => [Math.floor(k / 64), k % 64, wt]);
    // score: weakest edge-neighbour contrast first, then the overall sum (small gaps hurt most)
    const score = () => {
      let worst = Infinity, sum = 0;
      for (const [a, b, wt] of pairs) {
        const d = COLOR_DIST[asg[a]][asg[b]];
        if (wt === 1 && d < worst) worst = d;
        sum += wt * Math.min(d, 0.3);
      }
      return worst * 100 + sum;
    };
    let best = score();
    for (let it = 0; it < 900; it++) {
      const a = Math.floor(rng() * n);
      if (spare.length && rng() < 0.35) {
        const s = Math.floor(rng() * spare.length);
        [asg[a], spare[s]] = [spare[s], asg[a]];
        const sc = score();
        if (sc >= best) best = sc; else [asg[a], spare[s]] = [spare[s], asg[a]];
      } else {
        const b = Math.floor(rng() * n);
        if (a === b) continue;
        [asg[a], asg[b]] = [asg[b], asg[a]];
        const sc = score();
        if (sc >= best) best = sc; else [asg[a], asg[b]] = [asg[b], asg[a]];
      }
    }
    return asg;
  }

  function sizeForLevel(lv) {
    return bank[bankPick(lv).idx].n;
  }

  // ---------- Random mode ----------
  // Any size, any board from the bank, any rotation, any colors.
  // Doesn't touch Journey progress; times still count toward that board's records.
  let randomSpec = null;
  function newRandomSpec() {
    const sizes = [...new Set(bank.map((b) => b.n))];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const pool = [];
    bank.forEach((b, i) => { if (b.n === size && (!randomSpec || i !== randomSpec.idx)) pool.push(i); });
    return {
      idx: pool[Math.floor(Math.random() * pool.length)],
      sym: Math.floor(Math.random() * 8),
      seed: 1 + Math.floor(Math.random() * 2147483000),
    };
  }

  // hand-painted brush-stroke ✕ (owner's reference): two tapered, slightly curved strokes
  const X_SVG = `<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M18.6 12.4Q14.9 12.1 14.3 15.7Q13.7 19.4 14.6 22.0Q15.5 24.7 16.8 27.1Q18.1 29.4 19.5 31.8Q20.9 34.1 22.6 36.1Q24.4 38.1 25.9 40.3Q27.5 42.5 28.9 44.9Q30.3 47.2 32.1 49.2Q33.9 51.2 35.8 53.2Q37.6 55.1 39.5 57.1Q41.3 59.1 43.3 61.0Q45.2 62.9 47.1 64.8Q49.0 66.8 51.0 68.7Q53.0 70.5 55.1 72.2Q57.3 73.8 59.3 75.8Q61.2 77.7 63.4 79.3Q65.6 81.0 67.9 82.6Q70.1 84.2 72.5 85.6Q75.0 87.0 77.7 88.1Q80.4 89.2 84.1 88.7Q87.7 88.2 87.7 84.5Q87.6 80.8 86.4 78.2Q85.1 75.5 83.4 73.4Q81.8 71.3 80.0 69.3Q78.2 67.3 76.3 65.5Q74.4 63.6 72.5 61.8Q70.6 60.0 69.0 57.9Q67.4 55.8 65.4 54.1Q63.5 52.3 61.9 50.2Q60.3 48.1 58.6 46.2Q56.8 44.3 54.8 42.6Q52.8 41.0 51.1 39.0Q49.4 37.0 47.6 35.2Q45.8 33.4 43.9 31.6Q42.0 29.8 40.4 27.8Q38.7 25.8 36.6 24.2Q34.5 22.6 32.8 20.7Q31.1 18.8 29.2 17.0Q27.2 15.3 24.8 14.0Q22.3 12.6 18.6 12.4ZM86.5 17.1Q86.3 13.6 82.8 13.5Q79.2 13.3 76.8 14.5Q74.4 15.6 72.2 17.0Q70.1 18.4 68.2 20.0Q66.2 21.6 64.4 23.4Q62.7 25.3 60.8 27.0Q58.9 28.7 57.0 30.4Q55.1 32.2 53.1 33.8Q51.1 35.5 49.3 37.4Q47.6 39.4 45.6 41.1Q43.6 42.8 41.8 44.7Q39.9 46.6 38.0 48.5Q36.1 50.3 34.3 52.3Q32.6 54.3 31.0 56.6Q29.5 58.8 27.7 60.8Q25.8 62.9 24.2 65.0Q22.5 67.2 20.6 69.2Q18.8 71.3 17.2 73.6Q15.6 75.9 14.4 78.6Q13.2 81.3 13.5 84.9Q13.7 88.4 17.2 88.5Q20.8 88.7 23.3 87.3Q25.9 85.8 28.2 84.3Q30.5 82.7 32.7 81.0Q34.9 79.3 37.1 77.6Q39.2 75.8 41.0 73.8Q42.8 71.8 44.8 70.0Q46.9 68.2 48.7 66.3Q50.6 64.4 52.6 62.6Q54.6 60.8 56.6 59.1Q58.6 57.4 60.2 55.3Q61.8 53.2 63.8 51.5Q65.7 49.7 67.2 47.6Q68.7 45.4 70.5 43.6Q72.3 41.7 74.0 39.8Q75.7 37.9 77.2 35.8Q78.8 33.8 80.2 31.7Q81.7 29.6 83.1 27.5Q84.6 25.5 85.7 23.1Q86.8 20.7 86.5 17.1Z" fill="#fff"/></svg>`;

  const PEEK_MS = 5000; // creature ⇄ color cycle for resting markers (matches colorpeek in style.css)
  // "journey" = level by level, "random" = a surprise board each time
  let gameMode = "journey";

  // ---------- state ----------
  let level, puzzle, n, cells, hearts, hints, history, startTime, elapsed, finished, timerId;
  let cellEls = [];

  let gameId = 0; // bumps on every new/restarted board (for late network replies)
  function startLevel(lv) {
    gameMode = "journey";
    level = lv;
    save.current = lv;
    writeSave();
    puzzle = puzzleForLevel(lv);
    begin(lv * 7919 + 17);
  }
  function startRandom(spec) {
    gameMode = "random";
    randomSpec = spec || newRandomSpec();
    level = 0;
    puzzle = puzzleFrom(randomSpec.idx, randomSpec.sym, randomSpec.seed);
    begin(randomSpec.seed * 7 + 3);
  }
  function restartBoard() {
    if (gameMode === "random") startRandom(randomSpec); else startLevel(level);
  }
  function begin(castSeed) {
    gameId++;
    n = puzzle.n;
    window.Weirdlings.setCast(castSeed, puzzle.colorOf);
    cells = new Array(n * n).fill(0); // 0 empty, 1 marked, 2 weirdling
    hearts = MAX_HEARTS;
    hints = HINTS_PER_LEVEL;
    history = [];
    lastTap = { i: -1, time: 0 };
    finished = false;
    elapsed = 0;
    { const ws = $("win-stats"); if (ws) delete ws.dataset.ready; }
    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(updateTimer, 500);
    buildBoard();
    buildCrowd();
    renderHearts();
    updateTools();
    updateTimer();
    const lv = level;
    $("level-label").textContent = gameMode === "random"
      ? `🎲 Random · ${n}×${n} · Board ${puzzle.bankIndex + 1}`
      : lv > bank.length
      ? `Level ${lv.toLocaleString()} · ${n}×${n} · Board ${puzzle.bankIndex + 1}`
      : `Level ${lv} · ${n}×${n}`;
    renderRecords();
  }

  // color/creature index for a cell's patch
  function regionAt(i) { return puzzle.colorOf[puzzle.regions[i]]; }

  function buildBoard() {
    boardEl.innerHTML = "";
    boardEl.classList.remove("won");
    boardEl.style.setProperty("--n", n);
    document.documentElement.style.setProperty("--n", n);
    boardEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${n}, 1fr)`;
    cellEls = [];
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n;
      const el = document.createElement("div");
      el.className = "cell";
      el.dataset.i = i;
      el.setAttribute("role", "gridcell");
      paintTile(el, regionAt(i));
      boardEl.appendChild(el);
      cellEls.push(el);
    }
  }

  function renderCell(i) {
    const el = cellEls[i];
    const s = cells[i];
    const col = REGION_COLORS[regionAt(i)];
    paintTile(el, regionAt(i)); // keep the patch color (and symbol), even under a weirdling
    if (s === 0) el.innerHTML = "";
    else if (s === 1) el.innerHTML = X_SVG;
    else el.innerHTML = creatureSVG(regionAt(i));
    el.classList.toggle("has-w", s === 2);
    if (s === 2) {
      // markers fade to their color together: a new one waits (as a creature) for the next shared cycle
      const w = el.querySelector(".weirdling");
      const delay = (PEEK_MS - (performance.now() % PEEK_MS)).toFixed(0) + "ms";
      if (w) w.style.setProperty("--peek-delay", delay);
      // a plain swatch of the tile's own color fades in over the creature in the color phase
      const sw = document.createElement("span");
      sw.className = "peek";
      paintTile(sw, regionAt(i));
      sw.style.setProperty("--peek-delay", delay);
      el.appendChild(sw);
    }
    el.setAttribute("aria-label", s === 2 ? "weirdling" : s === 1 ? "marked" : "empty");
  }

  function renderHearts(popIndex) {
    const h = $("hearts");
    h.innerHTML = "";
    for (let k = 0; k < MAX_HEARTS; k++) {
      const s = document.createElement("span");
      s.className = "heart" + (k >= hearts ? " lost" : "") + (k === popIndex ? " pop" : "");
      s.textContent = "❤️";
      h.appendChild(s);
    }
  }

  function updateTools() {
    $("hint-count").textContent = hints;
    $("btn-hint").disabled = hints <= 0 || finished;
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  let paused = false;
  function updateTimer() {
    if (!finished && !paused) elapsed = Date.now() - startTime;
    $("timer").textContent = "⏱ " + fmtTime(elapsed);
  }

  // ---------- moves ----------
  function setCells(changes) {
    // changes: [{i, next}] -> records prev, applies, pushes one undo step
    const step = [];
    for (const { i, next } of changes) {
      if (cells[i] === next) continue;
      step.push({ i, prev: cells[i], next });
      cells[i] = next;
      renderCell(i);
    }
    if (step.length) history.push(step);
    updateTools();
    updateCrowd(true);
    return step.length;
  }

  // Found a creature: its icon comes down on the tile like a rubber stamp —
  // drops in big and tilted, slams flat, the tile gets pressed, ink specks fly out.
  const STAMP_MS = 560, STAMP_HIT = 0.36; // impact at 36% of the animation
  function stampCell(i) {
    const cell = cellEls[i];
    const w = cell.querySelector(".weirdling");
    if (!w) return;
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tilt = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 8);
    w.animate([
      { transform: `translateY(-28%) scale(2.5) rotate(${tilt}deg)`, opacity: 0,
        filter: "drop-shadow(0 26px 14px rgba(25,12,45,.35))" },
      { transform: `translateY(-8%) scale(1.55) rotate(${tilt / 3}deg)`, opacity: 1, offset: 0.24,
        filter: "drop-shadow(0 14px 8px rgba(25,12,45,.45))" },
      { transform: "scale(.94, .86)", offset: STAMP_HIT, filter: "drop-shadow(0 1px 1px rgba(25,12,45,.7))" },
      { transform: "scale(1.1, 1.04)", offset: 0.56 },
      { transform: "scale(.98)", offset: 0.76 },
      { transform: "none", filter: "drop-shadow(0 3px 2.5px rgba(25,12,45,.6))" },
    ], { duration: reduce ? 250 : STAMP_MS, easing: "cubic-bezier(.3,.7,.4,1)" });
    cell.animate([
      { transform: "none" },
      { transform: "none", offset: STAMP_HIT - 0.02 },
      { transform: "scale(.86)", offset: STAMP_HIT + 0.08 },
      { transform: "scale(1.05)", offset: 0.68 },
      { transform: "none" },
    ], { duration: STAMP_MS, easing: "ease-out" });
    if (reduce) return;
    // impact: a ring of ink and a few specks in the creature's color
    setTimeout(() => {
      if (!cell.isConnected) return;
      const ink = REGION_COLORS[regionAt(i)].body;
      const ring = document.createElement("span");
      ring.className = "stamp-ring";
      cell.appendChild(ring);
      for (let k = 0; k < 7; k++) {
        const dot = document.createElement("span");
        dot.className = "stamp-dot";
        const a = (k / 7) * Math.PI * 2 + Math.random() * 0.5;
        const dist = cell.offsetWidth * (0.62 + Math.random() * 0.3);
        dot.style.background = k % 2 ? "#fff" : ink;
        dot.style.setProperty("--dx", (Math.cos(a) * dist).toFixed(1) + "px");
        dot.style.setProperty("--dy", (Math.sin(a) * dist).toFixed(1) + "px");
        dot.style.setProperty("--s", (0.10 + Math.random() * 0.08).toFixed(2));
        cell.appendChild(dot);
      }
      if (!finished) {
        boardEl.animate([{ transform: "none" }, { transform: "translateY(2px) scale(.996)" }, { transform: "none" }],
          { duration: 180, easing: "ease-out" });
      }
      setTimeout(() => cell.querySelectorAll(".stamp-ring, .stamp-dot").forEach((e) => e.remove()), 650);
    }, STAMP_MS * STAMP_HIT);
  }

  function isCorrect(i) {
    const r = Math.floor(i / n), c = i % n;
    return puzzle.solution[r] === c;
  }

  function tryPlace(i) {
    if (isCorrect(i)) {
      setCells([{ i, next: 2 }]);
      stampCell(i);
      sfx.place();
      haptic.strong();
      checkWin();
    } else {
      // wrong guess: lose a heart, mark the square as ruled out
      hearts--;
      sfx.wrong();
      haptic.error();
      cells[i] = 2;
      renderCell(i);
      const el = cellEls[i];
      el.innerHTML = creatureSVG(regionAt(i), "sad");
      el.classList.remove("wrong");
      void el.offsetWidth;
      el.classList.add("wrong");
      boardEl.classList.remove("shake");
      void boardEl.offsetWidth;
      boardEl.classList.add("shake");
      renderHearts(hearts);
      crowdReact(puzzle.regions[i], "wince");
      setTimeout(() => {
        el.classList.remove("wrong");
        cells[i] = 1;
        renderCell(i);
        // drop undo steps that touched this cell so undo can't resurrect it
        history = history.filter((step) => !step.some((ch) => ch.i === i));
        updateTools();
        if (hearts <= 0) lose();
      }, 600);
    }
  }

  // Tap rules:
  //  - second tap on the same square within 1 second -> place a weirdling
  //  - otherwise a tap toggles the X on/off
  const DOUBLE_TAP_MS = 1000;
  let lastTap = { i: -1, time: 0 };
  function tap(i) {
    if (finished) return;
    const s = cells[i];
    if (s === 2) return; // placed weirdlings stay put
    const now = Date.now();
    if (lastTap.i === i && now - lastTap.time <= DOUBLE_TAP_MS) {
      lastTap = { i: -1, time: 0 };
      tryPlace(i);
      return;
    }
    lastTap = { i, time: now };
    setCells([{ i, next: s === 0 ? 1 : 0 }]);
    sfx.mark();
    haptic.light();
  }

  function undo() {
    if (finished) return;
    const step = history.pop();
    if (!step) return;
    for (const ch of step.slice().reverse()) {
      if (cells[ch.i] !== ch.next) continue;
      cells[ch.i] = ch.prev;
      renderCell(ch.i);
    }
    sfx.mark();
    updateTools();
  }

  function hint() {
    if (finished || hints <= 0) return;
    const rows = [];
    for (let r = 0; r < n; r++) {
      const i = r * n + puzzle.solution[r];
      if (cells[i] !== 2) rows.push(i);
    }
    if (!rows.length) return;
    const i = rows[Math.floor(Math.random() * rows.length)];
    hints--;
    cells[i] = 2;
    renderCell(i);
    cellEls[i].classList.remove("hinted");
    void cellEls[i].offsetWidth;
    cellEls[i].classList.add("hinted");
    stampCell(i);
    sfx.place();
    updateTools();
    updateCrowd(true);
    checkWin();
  }

  // ---------- best times ----------
  let worldRecord = null; // { ms, name, player_id } for the current level
  function fmtRecord(ms) {
    const t = Math.round(ms / 100) / 10; // tenths of a second
    const m = Math.floor(t / 60);
    const s = (t - m * 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  }
  // Records belong to the board (1-200), so rotated/recolored replays share them.
  function boardId() { return puzzle.bankIndex + 1; }
  function migrateBests() {
    // older saves kept bests by level number; move them to board numbers
    if (save.boardBest) return;
    save.boardBest = {};
    for (const [lv, ms] of Object.entries(save.best || {})) {
      const b = bankPick(Number(lv)).idx + 1;
      if (!save.boardBest[b] || ms < save.boardBest[b]) save.boardBest[b] = ms;
    }
    writeSave();
  }
  function renderRecords() {
    const mine = save.boardBest[boardId()];
    $("rec-mine").textContent = mine ? fmtRecord(mine) : "–";
    const lb = window.Leaderboard;
    const lvAtRequest = gameId;
    const bAtRequest = boardId();
    $("rec-world").textContent = "–";
    $("rec-world-name").textContent = lb.configured() ? "" : "offline";
    worldRecord = null;
    if (!lb.configured()) return;
    lb.getRecord(bAtRequest).then((rec) => {
      if (gameId !== lvAtRequest) return;
      worldRecord = rec;
      showWorld();
    }).catch(() => { if (gameId === lvAtRequest) $("rec-world-name").textContent = "couldn't load"; });
  }
  function showWorld() {
    const me = window.Leaderboard.getPlayer();
    if (!worldRecord) {
      $("rec-world").textContent = "–";
      $("rec-world-name").textContent = "no record yet";
      return;
    }
    $("rec-world").textContent = fmtRecord(worldRecord.ms);
    $("rec-world-name").textContent = worldRecord.player_id === me.id ? "by you!" : "by " + worldRecord.name;
  }
  function flashRec(id) {
    const el = $(id).closest(".rec");
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  function checkWin() {
    const placed = cells.filter((s) => s === 2).length;
    if (placed !== n) return;
    finished = true;
    updateTimer();
    clearInterval(timerId);
    updateTools();
    celebrate();
    sfx.win();
    confetti();
    const journey = gameMode === "journey";
    const earned = Math.max(1, hearts); // hearts left = stars earned
    if (journey) {
      save.done[level] = true;
      save.stars = save.stars || {};
      const prevStars = save.stars[level] || 0;
      if (earned > prevStars) save.stars[level] = earned;
    }
    // Times only count when no hints were used.
    const usedHints = hints < HINTS_PER_LEVEL;
    const prevBest = save.boardBest[boardId()];
    const isBest = !usedHints && (!prevBest || elapsed < prevBest);
    if (isBest) { save.boardBest[boardId()] = elapsed; $("rec-mine").textContent = fmtRecord(elapsed); flashRec("rec-mine"); }
    let worldNote = "";
    const lbx = window.Leaderboard;
    const recordPromise = (!usedHints && lbx.configured())
      ? lbx.submitTime(boardId(), elapsed).catch(() => false)
      : Promise.resolve(false);
    recordPromise.then((isWorld) => {
      if (isWorld) {
        worldRecord = { ms: elapsed, name: lbx.getPlayer().name || "Anonymous", player_id: lbx.getPlayer().id };
        showWorld();
        flashRec("rec-world");
        worldNote = "🌍 New all-time record!";
        const ws = $("win-stats"); if (ws && ws.dataset.ready) ws.insertAdjacentHTML("afterbegin", `<b class="world-note">${worldNote}</b><br>`);
      }
    });
    if (journey) {
      save.unlocked = Math.min(MAX_LEVEL, Math.max(save.unlocked, level + 1));
      save.current = Math.min(MAX_LEVEL, level + 1); // Play on the home screen goes to the next level
    }
    writeSave();
    if (journey) syncScore();
    const winId = gameId;
    setTimeout(() => {
      if (winId !== gameId) return;
      $("btn-next").hidden = journey && level >= MAX_LEVEL;
      $("btn-next").textContent = journey ? "Next level →" : "New random board 🎲";
      // stars pop in one at a time
      const sw = $("win-stars");
      sw.innerHTML = starsRow(earned);
      [...sw.children].forEach((s, k) => {
        s.style.animationDelay = (0.25 + k * 0.28) + "s";
        if (k < earned) setTimeout(() => { if (save.sound) tone(880 + k * 220, 0.18, "triangle", 0.1); haptic.light(); }, 250 + k * 280);
      });
      const parade = $("win-parade");
      parade.innerHTML = "";
      for (let g = 0; g < 5; g++) parade.insertAdjacentHTML("beforeend", creatureSVG(puzzle.colorOf[g]));
      const lostHearts = MAX_HEARTS - hearts;
      $("win-title").textContent = lostHearts === 0 ? "Flawless!" : "Puzzle solved!";
      const ws = $("win-stats");
      ws.innerHTML = (worldNote ? `<b class="world-note">${worldNote}</b><br>` : "") +
        `Time <b>${fmtRecord(elapsed)}</b>${isBest && prevBest ? " · new personal best!" : isBest ? " · personal best set" : ""}<br>` +
        (usedHints ? `<small>Hints used, so this time doesn't count for records.</small><br>` : "") +
        (worldRecord && !worldNote ? `<small>All-time record ${fmtRecord(worldRecord.ms)} by ${escapeHtml(worldRecord.player_id === lbx.getPlayer().id ? "you" : worldRecord.name)}</small><br>` : "") +
        `${"❤️".repeat(hearts)}${"🤍".repeat(lostHearts)}`;
      ws.dataset.ready = "1";
      openModal("modal-win");
    }, Math.max(1900, 120 + n * PULSE_STAGGER + 450 + POP_HOLD));
  }

  // Board-complete effect: flash the board, pulse each weirdling in turn,
  // and burst tiny copies of it outward (solid for 15px, fading over the next 10px).
  const PULSE_STAGGER = 90;
  const POP_HOLD = 1150; // time to enjoy the board pop + crystal sparkles before the win card
  function celebrate() {
    boardEl.classList.remove("flash");
    void boardEl.offsetWidth;
    boardEl.classList.add("flash");
    setTimeout(() => boardEl.classList.remove("flash"), 500);

    const placed = [];
    for (let r = 0; r < n; r++) placed.push(r * n + puzzle.solution[r]);
    placed.forEach((i, k) => {
      setTimeout(() => {
        const cell = cellEls[i];
        const w = cell.querySelector(".weirdling");
        if (w) {
          w.classList.remove("pulse");
          void w.getBoundingClientRect();
          w.classList.add("pulse");
        }
        cell.classList.add("bursting");
        const size = Math.max(7, cell.clientWidth * 0.24);
        const r0 = cell.clientWidth * 0.34; // start at the creature's edge
        const count = 8;
        const spin = Math.random() * Math.PI;
        for (let p = 0; p < count; p++) {
          const a = spin + (p / count) * Math.PI * 2;
          const el = document.createElement("span");
          el.className = "burst";
          el.style.width = el.style.height = size + "px";
          const at = (d, f) => (f(a) * d).toFixed(1) + "px";
          el.style.setProperty("--x0", at(r0, Math.cos));
          el.style.setProperty("--y0", at(r0, Math.sin));
          el.style.setProperty("--x1", at(r0 + 15, Math.cos)); // 15px out: fully visible
          el.style.setProperty("--y1", at(r0 + 15, Math.sin));
          el.style.setProperty("--x2", at(r0 + 25, Math.cos)); // next 10px: fade to 0
          el.style.setProperty("--y2", at(r0 + 25, Math.sin));
          el.innerHTML = creatureSVG(regionAt(i));
          cell.appendChild(el);
          setTimeout(() => el.remove(), 700);
        }
        setTimeout(() => cell.classList.remove("bursting"), 700);
      }, 120 + k * PULSE_STAGGER);
    });
    // start the happy dance once every weirdling has pulsed
    setTimeout(() => {
      placed.forEach((i) => { const w = cellEls[i].querySelector(".weirdling"); if (w) w.classList.remove("pulse"); });
      boardEl.classList.add("won");
      boardPop();
      crowdParty();
    }, 120 + placed.length * PULSE_STAGGER + 450);
  }

  // ---------- board pop with crystal sparkles ----------
  const GEMS = [
    ["#E6FAFF", "#7FE0FF", "#2A9FD6", "95,215,255"],  // ice blue
    ["#FFE3FA", "#FF7EEE", "#C23FB8", "255,110,240"], // pink
    ["#EFE6FF", "#B49BFF", "#6F4FD6", "180,150,255"], // violet
  ];
  function gemSVG([hi, mid, lo]) {
    return `<svg viewBox="-10 -13 20 26"><path d="M0 -12 L8 -3 L0 12 L-8 -3Z" fill="${mid}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M0 -12 L-8 -3 L0 -1Z" fill="${hi}"/><path d="M0 -12 L8 -3 L0 -1Z" fill="${mid}"/>` +
      `<path d="M-8 -3 L0 12 L0 -1Z" fill="${mid}"/><path d="M8 -3 L0 12 L0 -1Z" fill="${lo}"/>` +
      `<path d="M-3 -8 L-5.5 -4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  }
  const TWINKLE = `<svg viewBox="-10 -10 20 20"><path d="M0 -10 Q1.2 -1.2 10 0 Q1.2 1.2 0 10 Q-1.2 1.2 -10 0 Q-1.2 -1.2 0 -10Z" fill="#fff"/></svg>`;
  function boardPop() {
    boardEl.classList.remove("pop");
    void boardEl.offsetWidth;
    boardEl.classList.add("pop");
    setTimeout(() => boardEl.classList.remove("pop"), 900);
    if (save.sound) [1568, 2093, 2637, 3136].forEach((f, k) => tone(f, 0.22, "sine", 0.05, 0.05 + k * 0.07));
    haptic.strong();
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = boardEl.getBoundingClientRect();
    const layer = document.createElement("div");
    layer.className = "crystal-layer";
    document.body.appendChild(layer);
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const count = reduce ? 12 : 48;
    for (let k = 0; k < count; k++) {
      const gem = GEMS[k % GEMS.length];
      const isGem = k % 3 !== 0;
      const el = document.createElement("div");
      el.className = "crystal";
      const size = isGem ? 14 + Math.random() * 14 : 16 + Math.random() * 18;
      el.style.width = size + "px";
      el.style.height = (isGem ? size * 1.3 : size) + "px";
      el.innerHTML = isGem ? gemSVG(gem) : TWINKLE;
      el.style.filter = `drop-shadow(0 1px 1px rgba(30,15,50,.55)) drop-shadow(0 0 ${Math.round(size / 2.5)}px rgba(${gem[3]},1))`;
      // start somewhere along the board's edge, fly outward
      const a = (k / count) * Math.PI * 2 + Math.random() * 0.3;
      const ex = Math.cos(a), ey = Math.sin(a);
      const edge = Math.min(rect.width / 2 / Math.abs(ex || 1e-6), rect.height / 2 / Math.abs(ey || 1e-6));
      // burst out from inside the board; the sides of a phone screen are tight,
      // so sideways crystals stay on screen and top/bottom ones fly further
      const r0 = edge * (0.1 + Math.random() * 0.55);
      const r1 = edge * (0.8 + Math.random() * 0.3) + Math.abs(ey) * (30 + Math.random() * 90);
      const clampX = (x) => Math.max(2, Math.min(innerWidth - size - 2, x));
      const x0 = clampX(cx + ex * r0 - size / 2), y0 = cy + ey * r0 - size / 2;
      const x1 = clampX(cx + ex * r1 - size / 2), y1 = cy + ey * r1 - size / 2 + 20;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 240);
      const dur = 900 + Math.random() * 600;
      el.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.2) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${(x0 + x1) / 2}px, ${(y0 + y1) / 2 - 18}px) scale(1.1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${x1}px, ${y1}px) scale(.35) rotate(${spin}deg)`, opacity: 0 },
      ], { duration: dur, delay: Math.random() * 260, easing: "cubic-bezier(.2,.7,.35,1)", fill: "both" });
      layer.appendChild(el);
    }
    // a few sparkles twinkle right on the board
    for (let k = 0; k < (reduce ? 4 : 14); k++) {
      const gem = GEMS[k % GEMS.length];
      const el = document.createElement("div");
      el.className = "crystal";
      const size = 14 + Math.random() * 18;
      el.style.width = el.style.height = size + "px";
      el.innerHTML = TWINKLE;
      el.style.filter = `drop-shadow(0 0 ${Math.round(size / 3)}px rgba(${gem[3]},1))`;
      const x = rect.left + rect.width * (0.08 + Math.random() * 0.84) - size / 2;
      const y = rect.top + rect.height * (0.08 + Math.random() * 0.84) - size / 2;
      el.animate([
        { transform: `translate(${x}px, ${y}px) scale(0) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${x}px, ${y}px) scale(1) rotate(45deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${x}px, ${y}px) scale(0) rotate(90deg)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 300, delay: 150 + Math.random() * 700, easing: "ease-in-out", fill: "both" });
      layer.appendChild(el);
    }
    setTimeout(() => layer.remove(), 2200);
  }

  // ---------- the little crowd under the board ----------
  // One full-art weirdling per patch. They sway, lean in and blink while you play;
  // when you find one it smiles (happy closed eyes) and starts dancing.
  const crowdEl = $("crowd");
  let crowd = [];      // index = patch number
  let regionSol = [];  // patch -> the cell where its weirdling belongs
  function buildCrowd() {
    crowdEl.innerHTML = "";
    crowd = [];
    regionSol = [];
    for (let r = 0; r < n; r++) regionSol[puzzle.regions[r * n + puzzle.solution[r]]] = r * n + puzzle.solution[r];
    const cast = window.Weirdlings.getCast();
    const two = n > 7;
    const back = document.createElement("div");
    const front = document.createElement("div");
    back.className = "crowd-row back";
    front.className = "crowd-row front";
    if (two) crowdEl.appendChild(back);
    crowdEl.appendChild(front);
    for (let r = 0; r < n; r++) {
      const c = cast[puzzle.colorOf[r]];
      const ar = Math.min(1.5, c.w / c.h);
      const m = document.createElement("div");
      m.className = "cm";
      m.style.setProperty("--ar", ar.toFixed(3));
      m.style.setProperty("--dur", (2.1 + Math.random() * 1.3).toFixed(2) + "s");
      m.style.setProperty("--delay", (-Math.random() * 3).toFixed(2) + "s");
      m.style.setProperty("--hop", (0.42 + Math.random() * 0.16).toFixed(2) + "s");
      const lids = c.eyes.map(([x, y, rad, col]) => {
        const rr = rad * 1.12;
        return `<span class="lid" style="left:${(x - rr).toFixed(2)}%;top:${(y - rr * c.w / c.h).toFixed(2)}%;width:${(rr * 2).toFixed(2)}%;--lid:${col}"></span>`;
      }).join("");
      m.innerHTML = `<div class="cm-sway"><div class="cm-body"><img src="${c.hero}" alt="" draggable="false">${lids}</div></div>`;
      (two && r % 2 === 1 ? back : front).appendChild(m);
      crowd.push({ el: m, ar, found: false, eyes: c.eyes.length > 0 });
    }
    layoutCrowd();
    updateCrowd(false);
  }
  function layoutCrowd() {
    if (!crowd.length) return;
    const W = crowdEl.clientWidth || Math.min(innerWidth - 20, 560);
    const H = crowdEl.clientHeight;
    crowdEl.classList.toggle("tiny", H < 30);
    const two = crowd.length > 7;
    const sum = (list) => list.reduce((t, c) => t + c.ar, 0) * 0.9;
    const frontList = crowd.filter((_, r) => !two || r % 2 === 0);
    const backList = two ? crowd.filter((_, r) => r % 2 === 1) : [];
    let h = Math.min(H / (two ? 1.42 : 1), W / sum(frontList), two ? W / (sum(backList) * 0.8) : Infinity);
    h = Math.max(0, Math.floor(h));
    crowdEl.style.setProperty("--h", h + "px");
  }
  if (window.ResizeObserver) new ResizeObserver(layoutCrowd).observe(crowdEl);
  else addEventListener("resize", layoutCrowd);

  function updateCrowd(announce) {
    crowd.forEach((c, r) => {
      const found = cells[regionSol[r]] === 2;
      if (found === c.found) return;
      c.found = found;
      c.el.classList.toggle("found", found);
      if (found && announce) {
        crowdReact(r, "just-found", 700);
        crowdReact(r, "happy", 1500);
      }
    });
  }
  function crowdReact(r, cls, ms = 650) {
    const c = crowd[r];
    if (!c) return;
    const body = c.el;
    body.classList.remove(cls);
    void body.offsetWidth;
    body.classList.add(cls);
    clearTimeout(c[cls]);
    c[cls] = setTimeout(() => body.classList.remove(cls), ms);
  }
  function crowdParty() {
    crowd.forEach((c, r) => { c.el.classList.add("found", "party"); setTimeout(() => crowdReact(r, "happy", 2600), r * 60); });
  }
  // idle life: random blinks and an occasional lean toward you
  setInterval(() => {
    if (!crowd.length || $("app").hidden || document.hidden) return;
    const r = Math.floor(Math.random() * crowd.length);
    const c = crowd[r];
    if (c.eyes && !c.el.classList.contains("happy")) crowdReact(r, "blink", 260);
    if (Math.random() < 0.3) {
      const r2 = Math.floor(Math.random() * crowd.length);
      if (!crowd[r2].found) {
        crowd[r2].el.style.setProperty("--lean", (r2 < crowd.length / 2 ? 1 : -1) * 7 + "deg");
        crowdReact(r2, "lean", 1300);
      }
    }
  }, 520);

  function lose() {
    finished = true;
    clearInterval(timerId);
    updateTools();
    $("lose-face").innerHTML = creatureSVG(puzzle.colorOf[0], "sad");
    openModal("modal-lose");
  }

  function confetti() {
    const colors = REGION_COLORS.map((c) => c.body);
    for (let k = 0; k < 60; k++) {
      const d = document.createElement("div");
      d.className = "confetti";
      d.style.left = Math.random() * 100 + "vw";
      d.style.background = colors[k % colors.length];
      d.style.borderRadius = k % 3 === 0 ? "50%" : "3px";
      d.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      d.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 4000);
    }
  }

  // ---------- pointer input (tap + drag to mark) ----------
  let drag = null;
  // Works out the square from the finger position by geometry, so the gaps between
  // squares, the white frame and a little margin past it all count as the nearest
  // square (forgiving taps and swipes along the edges of the grid).
  const EDGE_SLOP = 12; // px past the white frame that still counts
  // Finger position → grid position. rowF/colF are unclamped (in tiles), row/col are clamped.
  function gridPos(x, y) {
    if (!n) return null;
    const r = boardEl.getBoundingClientRect();
    const cs = getComputedStyle(boardEl);
    const scale = r.width / (boardEl.offsetWidth || r.width); // board may be mid-animation
    const frame = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--frame")) || 0) * scale;
    const slop = frame + EDGE_SLOP;
    const inside = !(x < r.left - slop || x > r.right + slop || y < r.top - slop || y > r.bottom + slop);
    const pad = parseFloat(cs.paddingLeft) * scale;
    const gap = (parseFloat(cs.columnGap) || 0) * scale;
    const pitch = (r.width - 2 * pad + gap) / n;
    const colF = (x - r.left - pad + gap / 2) / pitch;
    const rowF = (y - r.top - pad + gap / 2) / pitch;
    const clamp = (v) => Math.max(0, Math.min(n - 1, Math.floor(v)));
    return { inside, rowF, colF, row: clamp(rowF), col: clamp(colF) };
  }
  function cellFromPoint(x, y) {
    const g = gridPos(x, y);
    return g && g.inside ? g.row * n + g.col : null;
  }
  boardEl.addEventListener("pointerdown", (e) => {
    const i = cellFromPoint(e.clientX, e.clientY);
    if (i === null || finished) return;
    e.preventDefault();
    drag = { start: i, last: i, moved: false, mode: null, changes: [], sx: e.clientX, sy: e.clientY, axis: null };
    try { boardEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  // Swipes lock to the row or column you start along, so a wobbly finger doesn't spill ✕s
  // into neighbouring lines. A clear turn (1.6+ tiles off the line) switches to the other
  // direction from where you are, so L-shaped swipes still work.
  const TURN_TILES = 1.6;
  boardEl.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const g = gridPos(e.clientX, e.clientY);
    if (!g) return;
    if (!drag.axis) {
      if (!g.inside || g.row * n + g.col === drag.start) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? "row" : "col";
      drag.lineRow = Math.floor(drag.start / n);
      drag.lineCol = drag.start % n;
      drag.moved = true;
      const s = cells[drag.start];
      drag.mode = s === 0 ? "mark" : s === 1 ? "erase" : null;
      paint(drag.start);
    }
    const lastRow = Math.floor(drag.last / n), lastCol = drag.last % n;
    if (drag.axis === "row" && Math.abs(g.rowF - (drag.lineRow + 0.5)) > TURN_TILES) {
      drag.axis = "col"; drag.lineCol = lastCol;
    } else if (drag.axis === "col" && Math.abs(g.colF - (drag.lineCol + 0.5)) > TURN_TILES) {
      drag.axis = "row"; drag.lineRow = lastRow;
    }
    const target = drag.axis === "row" ? drag.lineRow * n + g.col : g.row * n + drag.lineCol;
    if (target === drag.last) return;
    // walk from the last square to the target along the locked line, filling any skipped squares
    const step = drag.axis === "row" ? Math.sign(target - drag.last) : Math.sign(target - drag.last) * n;
    let i = drag.last;
    while (i !== target) { i += step; paint(i); }
    drag.last = target;
  });
  function paint(i) {
    if (!drag.mode) return;
    const from = drag.mode === "mark" ? 0 : 1;
    const to = drag.mode === "mark" ? 1 : 0;
    if (cells[i] !== from) return;
    drag.changes.push({ i, prev: from, next: to });
    cells[i] = to;
    renderCell(i);
    sfx.mark();
    haptic.light();
  }
  function endDrag() {
    if (!drag) return;
    if (!drag.moved) tap(drag.start);
    else if (drag.changes.length) { history.push(drag.changes); lastTap = { i: -1, time: 0 }; updateTools(); }
    drag = null;
  }
  boardEl.addEventListener("pointerup", endDrag);
  boardEl.addEventListener("pointercancel", endDrag);

  // ---------- iPhone: block zooming ----------
  // Safari ignores "no zoom" settings, so stop double-tap and pinch zoom here.
  boardEl.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  boardEl.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  ["gesturestart", "gesturechange", "gestureend"].forEach((t) =>
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  // two-finger pinch anywhere on the page
  ["touchstart", "touchmove"].forEach((t) =>
    document.addEventListener(t, (e) => {
      if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault();
    }, { passive: false }));
  // trackpad / ctrl+scroll and ctrl +/- zoom on computers
  window.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
  });
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 350) {
      // second quick tap: block the zoom but still press the button
      e.preventDefault();
      const btn = e.target.closest && e.target.closest("button");
      if (btn && !btn.disabled) btn.click();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // ---------- modals ----------
  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.hasAttribute("data-close")) {
        if (m.id === "modal-win" || m.id === "modal-lose") return; // need a choice
        closeModal(m.id);
      }
    });
  });

  function showHelp() {
    const demo = $("rules-demo");
    demo.innerHTML = [0, 1, 3, 9, 12].map((g) => creatureSVG(g)).join("");
    openModal("modal-help");
  }

  // ---------- stars ----------
  // 3 stars = no mistakes, 2 = one mistake, 1 = two mistakes (three is game over).
  let starUid = 0;
  function starSVG(filled, opts = {}) {
    const id = "st" + (++starUid);
    const cx = 50, cy = 53, R = 46, r = 20;
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = (-90 + k * 36) * Math.PI / 180;
      const rad = k % 2 === 0 ? R : r;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    // two facets per arm (one lit, one shaded) give the bevelled 3D look
    const light = filled ? `url(#${id}l)` : "#ddd3c4";
    const dark = filled ? `url(#${id}d)` : "#b8ab98";
    let faces = "";
    for (let k = 0; k < 10; k++) {
      const p1 = pts[k], p2 = pts[(k + 1) % 10];
      faces += `<path d="M${cx} ${cy} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z" fill="${k % 2 === 0 ? dark : light}"/>`;
    }
    const outline = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L") + "Z";
    const sparkle = (x, y, s, d) => `<path class="sparkle" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${s})" d="M0 -10 Q1.5 -1.5 10 0 Q1.5 1.5 0 10 Q-1.5 1.5 -10 0 Q-1.5 -1.5 0 -10Z" fill="#fff"/>`;
    return `<svg class="star3d ${filled ? "on" : "off"}" viewBox="-6 -6 112 112" aria-hidden="true">` +
      (filled ? `<defs>
        <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6B0"/><stop offset="1" stop-color="#FFC83D"/></linearGradient>
        <linearGradient id="${id}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB627"/><stop offset="1" stop-color="#E07B00"/></linearGradient>
      </defs>` : "") +
      `<path d="${outline}" fill="rgba(0,0,0,.25)" transform="translate(0 4)"/>` +
      faces +
      `<path d="${outline}" fill="none" stroke="${filled ? "#B35C00" : "#9c8f7c"}" stroke-width="3" stroke-linejoin="round"/>` +
      (filled && !opts.still ? `<path class="shine" d="${outline}" fill="#fff"/>` + sparkle(78, 14, .9, opts.delay || 0) + sparkle(18, 30, .6, (opts.delay || 0) + .7) + sparkle(70, 80, .5, (opts.delay || 0) + 1.3) : "") +
      `</svg>`;
  }
  function starsRow(count, opts = {}) {
    let h = "";
    for (let k = 0; k < 3; k++) h += starSVG(k < count, { ...opts, delay: k * 0.4 });
    return h;
  }

  function showLevels() {
    const grid = $("level-grid");
    grid.innerHTML = "";
    const shown = Math.min(MAX_LEVEL, Math.max(30, Math.ceil((save.unlocked + 10) / 5) * 5));
    for (let lv = 1; lv <= shown; lv++) {
      const b = document.createElement("button");
      const st = (save.stars || {})[lv];
      b.innerHTML = `${lv}<small>${sizeForLevel(lv)}×${sizeForLevel(lv)}</small>` +
        (st ? `<span class="lvl-stars${st === 3 ? " perfect" : ""}">${starsRow(st, { still: true })}</span>` : save.done[lv] ? `<span class="lvl-stars done-check">✓</span>` : "");
      if (save.done[lv]) b.classList.add("done");
      if (lv === Math.min(save.current || 1, save.unlocked)) b.classList.add("current");
      b.disabled = lv > save.unlocked;
      b.addEventListener("click", () => { closeModal("modal-levels"); setMode("journey"); showGame(lv); });
      grid.appendChild(b);
    }
    openModal("modal-levels");
    const cur = grid.querySelector(".current");
    if (cur) cur.scrollIntoView({ block: "center" });
  }

  // ---------- buttons ----------
  $("btn-hint").addEventListener("click", hint);
  $("btn-restart").addEventListener("click", restartBoard);
  $("btn-help").addEventListener("click", showHelp);
  // ---------- leaderboard ----------
  const LB = window.Leaderboard;
  function totalCompleted() { return Math.min(MAX_LEVEL, Object.keys(save.done).length); }
  function syncScore() {
    if (!LB.configured() || !LB.getPlayer().name) return;
    LB.submit(totalCompleted()).catch(() => {});
  }
  function escapeHtml(t) {
    return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function openLeaderboard() {
    const me = LB.getPlayer();
    const total = totalCompleted();
    const meBox = $("lb-me");
    const list = $("lb-list");
    const status = $("lb-status");
    meBox.innerHTML = `<div>${me.name ? escapeHtml(me.name) : "You"}<small id="lb-rank">${me.name ? "" : "Not on the board yet"}</small></div>` +
      `<div class="big">${total.toLocaleString()}</div>`;
    $("lb-join").hidden = !!me.name || !LB.configured();
    list.innerHTML = "";
    openModal("modal-leaders");
    if (!LB.configured()) {
      status.textContent = "The online leaderboard isn't switched on yet. Your total is saved on this phone.";
      return;
    }
    status.textContent = "Loading…";
    try {
      if (me.name) await LB.submit(total).catch(() => {});
      const [rows, rank] = await Promise.all([LB.top(50), me.name ? LB.rank(total) : Promise.resolve(null)]);
      list.innerHTML = rows.map((r, k) =>
        `<li class="${r.id === me.id ? "me" : ""}"><span class="rk">${k + 1}</span><span class="nm">${escapeHtml(r.name)}</span><span class="lv">${Number(r.levels).toLocaleString()}</span></li>`
      ).join("");
      status.textContent = rows.length ? "" : "No one's on the board yet. Be the first!";
      if (rank && $("lb-rank")) $("lb-rank").textContent = `Rank #${rank.toLocaleString()}`;
    } catch (e) {
      status.textContent = "Couldn't reach the leaderboard. Check your connection and try again.";
    }
  }
  $("lb-join").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = LB.cleanName($("lb-name").value);
    if (!name) return;
    LB.setName(name);
    $("lb-name").blur();
    openLeaderboard();
  });

  // ---------- game menu ----------

  // ---------- cartoon UI icons (same style as Levels / Leaderboard / How to play) ----------
  const INKC = "#2B2340";
  const UI_ICONS = {
    home: () => `<svg class="ui-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M17 30 L17 55 L47 55 L47 30Z" fill="${INKC}" opacity=".25" transform="translate(1 3)"/>
      <path d="M18 28 Q16 44 15 54 Q15 57 18 57 L46 57 Q49 57 49 54 Q48 44 46 28Z" fill="#FFF1DC" stroke="${INKC}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M21 34 Q20 44 19.5 52" stroke="#E8D2B4" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M26 57 L26 47 Q26 41 32 41 Q38 41 38 47 L38 57Z" fill="#9B7EDB" stroke="${INKC}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="35" cy="50" r="1.6" fill="#FFE873"/>
      <circle cx="42.5" cy="44" r="3.4" fill="#6CBAE8" stroke="${INKC}" stroke-width="2.2"/>
      <path d="M41.2 42.6 L43 42.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M4 31 C4 15 17 5 32 5 C47 5 60 15 60 31 Q60 35 55 35 L9 35 Q4 35 4 31Z" fill="${INKC}" opacity=".25" transform="translate(1 3)"/>
      <path d="M4 31 C4 15 17 5 32 5 C47 5 60 15 60 31 Q60 35 55 35 L9 35 Q4 35 4 31Z" fill="#E8635F" stroke="${INKC}" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="21" cy="17" rx="5.5" ry="4" fill="#FFF1DC"/>
      <ellipse cx="37" cy="12" rx="4.5" ry="3.2" fill="#FFF1DC"/>
      <ellipse cx="48" cy="23" rx="5" ry="3.8" fill="#FFF1DC"/>
      <ellipse cx="31" cy="26" rx="3.6" ry="2.8" fill="#FFF1DC"/>
      <ellipse cx="11.5" cy="28" rx="2.8" ry="2.2" fill="#FFF1DC"/>
      <path d="M13 14 Q19 8 26 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".55"/>
    </svg>`,
    sound: (on) => `<svg class="ui-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 24 L20 24 L34 11 L34 53 L20 40 L8 40Z" fill="${INKC}" opacity=".25" transform="translate(1 3)"/>
      <path d="M8 24 Q6 24 6 26 L6 38 Q6 40 8 40 L20 40 L33 52 Q35 53 35 51 L35 13 Q35 11 33 12 L20 24Z" fill="${on ? "#FDAA6B" : "#C9BBA5"}" stroke="${INKC}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M10 28 L18 28" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      ${on
        ? `<path d="M42 24 Q47 32 42 40" fill="none" stroke="${INKC}" stroke-width="7" stroke-linecap="round"/>
           <path d="M42 24 Q47 32 42 40" fill="none" stroke="#4AB8B4" stroke-width="3" stroke-linecap="round"/>
           <path d="M49 16 Q59 32 49 48" fill="none" stroke="${INKC}" stroke-width="7" stroke-linecap="round"/>
           <path d="M49 16 Q59 32 49 48" fill="none" stroke="#4AB8B4" stroke-width="3" stroke-linecap="round"/>`
        : `<path d="M43 24 L57 40 M57 24 L43 40" stroke="${INKC}" stroke-width="9" stroke-linecap="round"/>
           <path d="M43 24 L57 40 M57 24 L43 40" stroke="#E8635F" stroke-width="4.5" stroke-linecap="round"/>`}
    </svg>`,
    vibration: (on) => `<svg class="ui-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="20" y="8" width="24" height="46" rx="6" fill="${INKC}" opacity=".25" transform="translate(1 3)"/>
      ${on
        ? `<path d="M13 20 L8 25 L13 30 L8 35 L13 40 M51 20 L56 25 L51 30 L56 35 L51 40" fill="none" stroke="${INKC}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M13 20 L8 25 L13 30 L8 35 L13 40 M51 20 L56 25 L51 30 L56 35 L51 40" fill="none" stroke="#FFC21F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
        : ""}
      <rect x="19" y="6" width="26" height="50" rx="7" fill="${on ? "#9B7EDB" : "#C9BBA5"}" stroke="${INKC}" stroke-width="3.5"/>
      <rect x="24" y="12" width="16" height="32" rx="3" fill="${on ? "#DCEFFA" : "#EFE7DA"}" stroke="${INKC}" stroke-width="2.2"/>
      <circle cx="32" cy="50" r="2.4" fill="#fff" stroke="${INKC}" stroke-width="1.6"/>
      <path d="M27 16 L27 26" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      ${on ? "" : `<path d="M10 54 L54 10" stroke="${INKC}" stroke-width="9" stroke-linecap="round"/>
           <path d="M10 54 L54 10" stroke="#E8635F" stroke-width="4.5" stroke-linecap="round"/>`}
    </svg>`,
    // a little tile with a heart and a star on it (the color symbols setting)
    symbols: (on) => `<svg class="ui-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="9" y="10" width="46" height="46" rx="11" fill="${INKC}" opacity=".25" transform="translate(1 3)"/>
      <rect x="8" y="8" width="23" height="23" rx="6" fill="#FFA2CD" stroke="${INKC}" stroke-width="3.5"/>
      <rect x="33" y="8" width="23" height="23" rx="6" fill="#F9BC1E" stroke="${INKC}" stroke-width="3.5"/>
      <rect x="8" y="33" width="23" height="23" rx="6" fill="#3E96EA" stroke="${INKC}" stroke-width="3.5"/>
      <rect x="33" y="33" width="23" height="23" rx="6" fill="#0FA44D" stroke="${INKC}" stroke-width="3.5"/>
      <path d="M19.5 26C14.5 22.5 13 20 13 18c0-2 1.6-3.4 3.4-3.4 1.3 0 2.4.8 3.1 1.8.7-1 1.8-1.8 3.1-1.8 1.8 0 3.4 1.4 3.4 3.4 0 2-1.5 4.5-6.5 8Z" fill="#fff" stroke="${INKC}" stroke-width="2"/>
      <path d="M44.5 12.5l1.8 4.3 4.6.4-3.5 3 1.1 4.5-4-2.5-4 2.5 1.1-4.5-3.5-3 4.6-.4Z" fill="#fff" stroke="${INKC}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="19.5" cy="44.5" r="5.5" fill="#fff" stroke="${INKC}" stroke-width="2"/>
      <path d="M41.5 41.5h6v-0 M44.5 38.5v12 M38.5 44.5h12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <path d="M44.5 38.5v12 M38.5 44.5h12" stroke="${INKC}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
      ${on ? "" : `<path d="M10 54 L54 10" stroke="${INKC}" stroke-width="9" stroke-linecap="round"/>
           <path d="M10 54 L54 10" stroke="#E8635F" stroke-width="4.5" stroke-linecap="round"/>`}
    </svg>`,
  };
  // Color symbols on tiles: off by default. Off = tiles get a dark inner outline instead.
  function renderSymbols() {
    document.body.classList.toggle("symbols-on", !!save.symbols);
    $("btn-symbols").classList.toggle("off", !save.symbols);
  }
  function toggleSymbols() { save.symbols = !save.symbols; writeSave(); renderSymbols(); renderToggleIcons(); haptic.light(); }
  function renderToggleIcons() {
    $("btn-symbols").innerHTML = UI_ICONS.symbols(!!save.symbols);
    $("menu-symbols").querySelector("span").innerHTML = UI_ICONS.symbols(!!save.symbols);
    $("menu-symbols").querySelector("b").textContent = save.symbols ? "On" : "Off";
    $("btn-sound").innerHTML = UI_ICONS.sound(save.sound);
    $("btn-haptics").innerHTML = UI_ICONS.vibration(save.haptics);
    $("menu-sound").querySelector("span").innerHTML = UI_ICONS.sound(save.sound);
    $("menu-haptics").querySelector("span").innerHTML = UI_ICONS.vibration(save.haptics);
  }
  $("menu-home").querySelector("span").innerHTML = UI_ICONS.home();

  function openMenu() {
    $("menu-sound").querySelector("b").textContent = save.sound ? "On" : "Off";
    $("menu-haptics").querySelector("b").textContent = save.haptics ? "On" : "Off";
    renderToggleIcons();
    openModal("modal-menu");
  }
  $("btn-menu").addEventListener("click", openMenu);
  $("menu-symbols").addEventListener("click", toggleSymbols);
  $("btn-symbols").addEventListener("click", toggleSymbols);
  renderSymbols();
  $("menu-leaders").addEventListener("click", () => { closeModal("modal-menu"); openLeaderboard(); });
  $("menu-levels").addEventListener("click", () => { closeModal("modal-menu"); showLevels(); });
  $("menu-help").addEventListener("click", () => { closeModal("modal-menu"); showHelp(); });
  $("menu-home").addEventListener("click", () => { closeModal("modal-menu"); showHome(); });
  $("menu-sound").addEventListener("click", () => {
    save.sound = !save.sound; writeSave(); renderSound(); openMenu();
  });
  $("menu-haptics").addEventListener("click", () => {
    save.haptics = !save.haptics; writeSave(); renderHaptics(); haptic.light(); openMenu();
  });
  $("btn-home-leaders").addEventListener("click", openLeaderboard);

  // ---------- home screen ----------
  function buildHomeGrid() {
    // a little 3x3 sample board with weirdlings and X marks
    const picks = shuffled(REGION_COLORS.length, mulberry32(Date.now() % 100000)).slice(0, 3);
    const homeCast = window.Weirdlings.makeCast(Date.now() % 100000 + 7, picks);
    const layout = [0, 0, 1, 2, 0, 1, 2, 2, 1];
    const show = { 1: "w", 3: "x", 4: "x", 6: "w", 8: "w", 0: "x", 2: "x" };
    const grid = $("home-grid");
    grid.innerHTML = "";
    layout.forEach((g, k) => {
      const c = picks[g];
      const t = document.createElement("div");
      t.className = "tile";
      paintTile(t, c);
      if (show[k] === "w") t.innerHTML = creatureSVG(c, undefined, homeCast);
      else if (show[k] === "x") t.innerHTML = X_SVG;
      const w = t.querySelector(".weirdling");
      if (w) w.style.animationDelay = (k * 0.17) + "s";
      grid.appendChild(t);
    });
  }

  function getMode() { return save.mode === "random" ? "random" : "journey"; }
  function setMode(m) {
    save.mode = m;
    writeSave();
    $("mode-journey").classList.toggle("on", m === "journey");
    $("mode-random").classList.toggle("on", m === "random");
    $("mode-journey").setAttribute("aria-checked", m === "journey");
    $("mode-random").setAttribute("aria-checked", m === "random");
    if (!$("home").hidden && bank.length) refreshHome();
  }
  function refreshHome() {
    const lv = Math.min(save.current || 1, save.unlocked);
    const random = getMode() === "random";
    const inProgress = puzzle && !finished && cells.some((s) => s !== 0) &&
      (random ? gameMode === "random" : gameMode === "journey" && level === lv);
    $("play-label").textContent = inProgress ? "Continue" : "Play";
    if (random) {
      $("play-sub").textContent = inProgress ? `Random board · ${puzzle.n}×${puzzle.n}` : "Random board · any size";
    } else {
      const n = sizeForLevel(lv);
      $("play-sub").textContent = `Level ${lv} · ${n}×${n}`;
    }
    const solved = totalCompleted();
    $("home-stats").textContent = solved ? `${solved.toLocaleString()} level${solved === 1 ? "" : "s"} completed` : "";
  }

  function showHome() {
    if (puzzle && !finished && !paused) { paused = true; updateTimer(); }
    ["modal-win", "modal-lose", "modal-help", "modal-levels", "modal-menu", "modal-leaders"].forEach(closeModal);
    $("app").hidden = true;
    $("home").hidden = false;
    buildHomeGrid();
    pickHero();
    refreshHome();
  }

  // featured creature on the home screen: a random one from the whole library,
  // never the same one twice in a row
  let heroIdx = -1;
  function pickHero() {
    const all = window.Weirdlings.CREATURES;
    let k = Math.floor(Math.random() * all.length);
    if (all.length > 1 && k === heroIdx) k = (k + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length;
    heroIdx = k;
    const img = $("hero-img");
    img.classList.remove("hero-in");
    img.src = all[k].hero;
    void img.offsetWidth;
    img.classList.add("hero-in");
  }

  function showGame(lv) {
    $("home").hidden = true;
    $("app").hidden = false;
    if (lv === "random") {
      if (gameMode !== "random" || finished || !puzzle) { paused = false; startRandom(); }
      else if (paused) { paused = false; startTime = Date.now() - elapsed; }
    } else if (lv !== undefined && (gameMode !== "journey" || lv !== level || finished || !puzzle)) {
      paused = false;
      startLevel(lv);
    } else if (paused) {
      paused = false;
      startTime = Date.now() - elapsed; // resume timer where it left off
    }
    if (!save.seenHelp) {
      save.seenHelp = true;
      writeSave();
      showHelp();
    }
  }

  $("btn-play").addEventListener("click", () =>
    showGame(getMode() === "random" ? "random" : Math.min(save.current || 1, save.unlocked)));
  $("mode-journey").addEventListener("click", () => { setMode("journey"); haptic.light(); });
  $("mode-random").addEventListener("click", () => { setMode("random"); haptic.light(); });
  setMode(getMode());
  $("btn-home-levels").addEventListener("click", showLevels);
  $("btn-home-help").addEventListener("click", showHelp);
  $("btn-home").addEventListener("click", showHome);
  document.querySelectorAll("[data-home]").forEach((b) => b.addEventListener("click", showHome));
  const hapticsBtn = $("btn-haptics");
  function renderHaptics() { hapticsBtn.classList.toggle("off", !save.haptics); renderToggleIcons(); }
  hapticsBtn.addEventListener("click", () => { save.haptics = !save.haptics; writeSave(); renderHaptics(); haptic.light(); });
  renderHaptics();
  $("btn-next").addEventListener("click", () => {
    closeModal("modal-win");
    if (gameMode === "random") startRandom(); else startLevel(Math.min(MAX_LEVEL, level + 1));
  });
  $("btn-retry").addEventListener("click", () => { closeModal("modal-lose"); restartBoard(); });
  const soundBtn = $("btn-sound");
  function renderSound() { soundBtn.classList.toggle("off", !save.sound); renderToggleIcons(); }
  soundBtn.addEventListener("click", () => { save.sound = !save.sound; writeSave(); renderSound(); });
  renderSound();


  window.__weirdlings = { // for testing
    puzzleForLevel: (lv) => puzzleForLevel(lv), bankPick: (lv) => bankPick(lv),
    current: () => ({ mode: gameMode, n, solution: puzzle && puzzle.solution, regions: puzzle && puzzle.regions }),
    startRandom: (spec) => { showGame("random"); startRandom(spec); },
  };

  // ---------- go ----------
  fetch("boards.json?v=34")
    .then((r) => r.json())
    .then((data) => {
      bank = data;
      migrateBests();
      showHome();
    })
    .catch(() => {
      $("home-stats").textContent = "Couldn't load the puzzles. Check your connection and refresh.";
      $("btn-play").disabled = true;
    });
})();
