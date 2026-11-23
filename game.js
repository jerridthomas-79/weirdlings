// Weirdlings game UI
(function () {
  const { mulberry32 } = window.WeirdPuzzle;
  const { REGION_COLORS, creatureSVG } = window.Weirdlings;

  const MAX_HEARTS = 3;
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
  // boards.json holds 200 unique puzzles in order (5x5 up to 13x13).
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
    // fresh colors (and creatures) for this level
    const colorOf = shuffled(REGION_COLORS.length, mulberry32(lv * 977 + 31)).slice(0, n);
    return { n, regions, solution, colorOf, bankIndex: idx, sym };
  }

  function sizeForLevel(lv) {
    return bank[bankPick(lv).idx].n;
  }

  const X_SVG = `<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M27 27 L73 73 M73 27 L27 73" stroke="#fff" stroke-width="15" stroke-linecap="round"/></svg>`;

  // ---------- state ----------
  let level, puzzle, n, cells, hearts, hints, history, startTime, elapsed, finished, timerId;
  let cellEls = [];

  function startLevel(lv) {
    level = lv;
    save.current = lv;
    writeSave();
    puzzle = puzzleForLevel(lv);
    n = puzzle.n;
    cells = new Array(n * n).fill(0); // 0 empty, 1 marked, 2 weirdling
    hearts = MAX_HEARTS;
    hints = HINTS_PER_LEVEL;
    history = [];
    lastTap = { i: -1, time: 0 };
    finished = false;
    elapsed = 0;
    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(updateTimer, 500);
    buildBoard();
    renderHearts();
    updateTools();
    updateTimer();
    $("level-label").textContent = `Level ${lv} · ${n}×${n}`;
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
      el.style.background = REGION_COLORS[regionAt(i)].tile;
      boardEl.appendChild(el);
      cellEls.push(el);
    }
  }

  function renderCell(i) {
    const el = cellEls[i];
    const s = cells[i];
    const col = REGION_COLORS[regionAt(i)];
    el.style.background = col.tile; // keep the patch color, even under a weirdling
    if (s === 0) el.innerHTML = "";
    else if (s === 1) el.innerHTML = X_SVG;
    else el.innerHTML = creatureSVG(regionAt(i));
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
  function updateTimer() {
    if (!finished) elapsed = Date.now() - startTime;
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
    return step.length;
  }

  function isCorrect(i) {
    const r = Math.floor(i / n), c = i % n;
    return puzzle.solution[r] === c;
  }

  function tryPlace(i) {
    if (isCorrect(i)) {
      setCells([{ i, next: 2 }]);
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
    sfx.place();
    updateTools();
    checkWin();
  }

  function checkWin() {
    const placed = cells.filter((s) => s === 2).length;
    if (placed !== n) return;
    finished = true;
    updateTimer();
    clearInterval(timerId);
    updateTools();
    boardEl.classList.add("won");
    sfx.win();
    confetti();
    save.done[level] = true;
    const prevBest = save.best[level];
    const isBest = !prevBest || elapsed < prevBest;
    if (isBest) save.best[level] = elapsed;
    save.unlocked = Math.max(save.unlocked, level + 1);
    writeSave();
    setTimeout(() => {
      const parade = $("win-parade");
      parade.innerHTML = "";
      for (let g = 0; g < 5; g++) parade.insertAdjacentHTML("beforeend", creatureSVG(puzzle.colorOf[g]));
      const lostHearts = MAX_HEARTS - hearts;
      $("win-title").textContent = lostHearts === 0 ? "Flawless!" : "Puzzle solved!";
      $("win-stats").innerHTML = `Time <b>${fmtTime(elapsed)}</b>${isBest && prevBest ? " · new best!" : ""}<br>` +
        `${"❤️".repeat(hearts)}${"🤍".repeat(lostHearts)}`;
      openModal("modal-win");
    }, 1300);
  }

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
  function cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const c = el && el.closest(".cell");
    return c && boardEl.contains(c) ? Number(c.dataset.i) : null;
  }
  boardEl.addEventListener("pointerdown", (e) => {
    const i = cellFromPoint(e.clientX, e.clientY);
    if (i === null || finished) return;
    e.preventDefault();
    drag = { start: i, last: i, moved: false, mode: null, changes: [] };
    try { boardEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  boardEl.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const i = cellFromPoint(e.clientX, e.clientY);
    if (i === null || i === drag.last) return;
    if (!drag.moved) {
      drag.moved = true;
      const s = cells[drag.start];
      drag.mode = s === 0 ? "mark" : s === 1 ? "erase" : null;
      paint(drag.start);
    }
    drag.last = i;
    paint(i);
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

  function showLevels() {
    const grid = $("level-grid");
    grid.innerHTML = "";
    const shown = Math.max(30, Math.ceil((save.unlocked + 10) / 5) * 5);
    for (let lv = 1; lv <= shown; lv++) {
      const b = document.createElement("button");
      b.innerHTML = `${lv}<small>${sizeForLevel(lv)}×${sizeForLevel(lv)}</small>`;
      if (save.done[lv]) b.classList.add("done");
      if (lv === level) b.classList.add("current");
      b.disabled = lv > save.unlocked;
      b.addEventListener("click", () => { closeModal("modal-levels"); startLevel(lv); });
      grid.appendChild(b);
    }
    openModal("modal-levels");
    const cur = grid.querySelector(".current");
    if (cur) cur.scrollIntoView({ block: "center" });
  }

  // ---------- buttons ----------
  $("btn-hint").addEventListener("click", hint);
  $("btn-restart").addEventListener("click", () => startLevel(level));
  $("btn-help").addEventListener("click", showHelp);
  $("btn-levels").addEventListener("click", showLevels);
  $("btn-next").addEventListener("click", () => { closeModal("modal-win"); startLevel(level + 1); });
  $("btn-retry").addEventListener("click", () => { closeModal("modal-lose"); startLevel(level); });
  const soundBtn = $("btn-sound");
  function renderSound() { soundBtn.textContent = save.sound ? "🔊" : "🔇"; }
  soundBtn.addEventListener("click", () => { save.sound = !save.sound; writeSave(); renderSound(); });
  renderSound();


  window.__weirdlings = { puzzleForLevel: (lv) => puzzleForLevel(lv), bankPick: (lv) => bankPick(lv) }; // for testing

  // ---------- go ----------
  fetch("boards.json?v=8")
    .then((r) => r.json())
    .then((data) => {
      bank = data;
      startLevel(Math.min(save.current || 1, save.unlocked));
      if (!save.seenHelp) {
        save.seenHelp = true;
        writeSave();
        showHelp();
      }
    })
    .catch(() => {
      boardEl.outerHTML = `<p style="text-align:center">Couldn't load the puzzles. Check your connection and refresh.</p>`;
    });
})();
