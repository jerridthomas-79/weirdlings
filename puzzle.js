// Weirdlings puzzle engine: generation + solving.
// Rules: N x N grid split into N regions. Place exactly one weirdling in
// every row, column and region. No two weirdlings may touch, not even diagonally.
(function (root) {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Random placement: one per row/col, no diagonal touching between rows.
  function randomSolution(n, rng) {
    const cols = new Array(n);
    const used = new Array(n).fill(false);
    function place(r) {
      if (r === n) return true;
      const order = shuffle([...Array(n).keys()], rng);
      for (const c of order) {
        if (used[c]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        used[c] = true;
        cols[r] = c;
        if (place(r + 1)) return true;
        used[c] = false;
      }
      return false;
    }
    return place(0) ? cols : null;
  }

  // Grow regions outward from each solution cell.
  function growRegions(n, cols, rng) {
    const reg = new Array(n * n).fill(-1);
    const weight = [];
    for (let r = 0; r < n; r++) {
      reg[r * n + cols[r]] = r;
      weight.push(0.4 + rng() * 1.6); // uneven region sizes
    }
    let remaining = n * n - n;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (remaining > 0) {
      // collect frontier (cell, region) pairs
      const front = [];
      let total = 0;
      for (let i = 0; i < n * n; i++) {
        if (reg[i] !== -1) continue;
        const r = Math.floor(i / n), c = i % n;
        for (const [dr, dc] of dirs) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          const g = reg[rr * n + cc];
          if (g !== -1) {
            front.push([i, g]);
            total += weight[g];
          }
        }
      }
      let pick = rng() * total;
      for (const [i, g] of front) {
        pick -= weight[g];
        if (pick <= 0) {
          reg[i] = g;
          break;
        }
      }
      if (pick > 0) reg[front[front.length - 1][0]] = front[front.length - 1][1];
      remaining--;
    }
    return reg;
  }

  // Find up to `limit` solutions. Returns {count, sols}.
  function solve(n, reg, limit = 2) {
    const usedCol = new Array(n).fill(false);
    const usedReg = new Array(n).fill(false);
    const cols = new Array(n);
    const sols = [];
    function go(r) {
      if (r === n) { sols.push(cols.slice()); return; }
      for (let c = 0; c < n; c++) {
        if (usedCol[c]) continue;
        const g = reg[r * n + c];
        if (usedReg[g]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        usedCol[c] = usedReg[g] = true;
        cols[r] = c;
        go(r + 1);
        usedCol[c] = usedReg[g] = false;
        if (sols.length >= limit) return;
      }
    }
    go(0);
    return { count: sols.length, sols };
  }
  function countSolutions(n, reg, limit = 2) {
    const r = solve(n, reg, limit);
    return { count: r.count, first: r.sols[0] || null };
  }

  // Is region g still connected if cell `skip` is removed from it?
  function connectedWithout(n, reg, g, skip) {
    const cellsOf = [];
    for (let i = 0; i < n * n; i++) if (reg[i] === g && i !== skip) cellsOf.push(i);
    if (!cellsOf.length) return false;
    const seen = new Set([cellsOf[0]]);
    const stack = [cellsOf[0]];
    while (stack.length) {
      const i = stack.pop();
      const r = Math.floor(i / n), c = i % n;
      for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1]) {
        if (j < 0 || j === skip || seen.has(j) || reg[j] !== g) continue;
        seen.add(j);
        stack.push(j);
      }
    }
    return seen.size === cellsOf.length;
  }

  // Generate a puzzle with exactly one solution.
  // Grow random regions, then keep breaking any rival solution by moving
  // one of its cells into a neighbouring region.
  function generate(n, seed) {
    const rng = mulberry32(seed);
    for (let attempt = 0; attempt < 200; attempt++) {
      const cols = randomSolution(n, rng);
      if (!cols) continue;
      const reg = growRegions(n, cols, rng);
      const anchors = new Set(cols.map((c, r) => r * n + c));
      for (let fix = 0; fix < n * n * 3; fix++) {
        const { sols } = solve(n, reg, 2);
        const rival = sols.find((s) => s.some((c, r) => c !== cols[r]));
        if (!rival) {
          const perm = shuffle([...Array(n).keys()], rng);
          return { n, regions: reg.map((g) => perm[g]), solution: cols };
        }
        // candidate moves: a rival cell (not an anchor) joins an adjacent region
        const moves = [];
        rival.forEach((c, r) => {
          const i = r * n + c;
          if (anchors.has(i)) return;
          const g = reg[i];
          if (!connectedWithout(n, reg, g, i)) return;
          for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1]) {
            if (j >= 0 && reg[j] !== g) moves.push([i, reg[j]]);
          }
        });
        if (!moves.length) break;
        const [i, g2] = moves[Math.floor(rng() * moves.length)];
        reg[i] = g2;
      }
    }
    throw new Error("Could not generate puzzle");
  }

  const api = { generate, solve, countSolutions, mulberry32 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WeirdPuzzle = api;
})(typeof window !== "undefined" ? window : globalThis);
