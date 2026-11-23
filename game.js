// Weirdlings game UI
(function () {
  const { puzzleForLevel, sizeForLevel } = window.WeirdPuzzle;
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
      if (s && s.unlocked) return s;
    } catch (e) {}
    return { unlocked: 1, current: 1, done: {}, best: {}, sound: true, seenHelp: false };
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
  const sfx = {
    mark: () => tone(880, 0.06, "triangle", 0.06),
    place: () => { tone(520, 0.12, "sine"); tone(780, 0.18, "sine", 0.12, 0.08); },
    wrong: () => { tone(180, 0.25, "sawtooth", 0.08); tone(140, 0.3, "sawtooth", 0.08, 0.1); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, i * 0.11)),
  };

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

  function regionAt(i) { return puzzle.regions[i]; }

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
      const g = regionAt(i);
      el.style.background = REGION_COLORS[g].bg;
      const thick = "3px", thin = "1px";
      const topDiff = r > 0 && regionAt(i - n) !== g;
      const leftDiff = c > 0 && regionAt(i - 1) !== g;
      el.style.borderTopWidth = r === 0 ? "0" : topDiff ? thick : thin;
      el.style.borderLeftWidth = c === 0 ? "0" : leftDiff ? thick : thin;
      el.style.borderRightWidth = "0";
      el.style.borderBottomWidth = "0";
      el.style.borderTopColor = topDiff ? "var(--ink)" : "rgba(43,35,64,.14)";
      el.style.borderLeftColor = leftDiff ? "var(--ink)" : "rgba(43,35,64,.14)";
      boardEl.appendChild(el);
      cellEls.push(el);
    }
  }

  function renderCell(i) {
    const el = cellEls[i];
    const s = cells[i];
    if (s === 0) el.innerHTML = "";
    else if (s === 1) el.innerHTML = `<span class="mark">✕</span>`;
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
    $("btn-undo").disabled = history.length === 0 || finished;
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
      checkWin();
    } else {
      // wrong guess: lose a heart, mark the square as ruled out
      hearts--;
      sfx.wrong();
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
      if (navigator.vibrate) navigator.vibrate(120);
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

  function tap(i) {
    if (finished) return;
    const s = cells[i];
    if (s === 0) { setCells([{ i, next: 1 }]); sfx.mark(); }
    else if (s === 1) tryPlace(i);
    // placed weirdlings stay put
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
      for (let g = 0; g < Math.min(n, 5); g++) parade.insertAdjacentHTML("beforeend", creatureSVG((g + level) % 9));
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
    $("lose-face").innerHTML = creatureSVG(level % 9, "sad");
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
  }
  function endDrag() {
    if (!drag) return;
    if (!drag.moved) tap(drag.start);
    else if (drag.changes.length) { history.push(drag.changes); updateTools(); }
    drag = null;
  }
  boardEl.addEventListener("pointerup", endDrag);
  boardEl.addEventListener("pointercancel", endDrag);

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
    demo.innerHTML = [0, 1, 3, 6, 8].map((g) => creatureSVG(g)).join("");
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
  $("btn-undo").addEventListener("click", undo);
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

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
  });

  // ---------- go ----------
  startLevel(Math.min(save.current || 1, save.unlocked));
  if (!save.seenHelp) {
    save.seenHelp = true;
    writeSave();
    showHelp();
  }
})();
