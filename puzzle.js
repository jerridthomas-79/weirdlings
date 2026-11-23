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

  // Count solutions (stops at limit). Returns {count, first}.
  function countSolutions(n, reg, limit = 2) {
    const usedCol = new Array(n).fill(false);
    const usedReg = new Array(n).fill(false);
    const cols = new Array(n);
    let count = 0;
    let first = null;
    function go(r) {
      if (count >= limit) return;
      if (r === n) {
        count++;
        if (!first) first = cols.slice();
        return;
      }
      for (let c = 0; c < n; c++) {
        if (usedCol[c]) continue;
        const g = reg[r * n + c];
        if (usedReg[g]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        usedCol[c] = usedReg[g] = true;
        cols[r] = c;
        go(r + 1);
        usedCol[c] = usedReg[g] = false;
        if (count >= limit) return;
      }
    }
    go(0);
    return { count, first };
  }

  // Generate a puzzle with exactly one solution.
  function generate(n, seed) {
    const rng = mulberry32(seed);
    for (let attempt = 0; attempt < 400; attempt++) {
      const cols = randomSolution(n, rng);
      if (!cols) continue;
      for (let tries = 0; tries < 60; tries++) {
        const reg = growRegions(n, cols, rng);
        if (countSolutions(n, reg, 2).count === 1) {
          // Shuffle region ids so colors don't reveal which row holds the answer.
          const perm = shuffle([...Array(n).keys()], rng);
          return { n, regions: reg.map((g) => perm[g]), solution: cols };
        }
      }
    }
    throw new Error("Could not generate puzzle");
  }

  function sizeForLevel(level) {
    if (level <= 8) return 5;
    if (level <= 20) return 6;
    if (level <= 40) return 7;
    if (level <= 65) return 8;
    return 9;
  }

  function puzzleForLevel(level) {
    const n = sizeForLevel(level);
    return generate(n, level * 7919 + 1234567);
  }

  const api = { generate, countSolutions, puzzleForLevel, sizeForLevel, mulberry32 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WeirdPuzzle = api;
})(typeof window !== "undefined" ? window : globalThis);
