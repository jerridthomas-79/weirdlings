// Builds boards.json: the bank of 200 hand-checked puzzles, 5x5 up to 13x13.
// Usage: node tools/build-boards.js            (all sizes, writes boards.json)
//        node tools/build-boards.js 12 out.json (one size, for parallel builds)
const fs = require("fs");
const path = require("path");
const P = require("../puzzle.js");

// How many boards of each size, in level order (total 200).
const PLAN = { 5: 12, 6: 16, 7: 20, 8: 22, 9: 24, 10: 26, 11: 26, 12: 27, 13: 27 };
const B36 = "0123456789abc";

function buildSize(n) {
  const out = [];
  for (let k = 0; k < PLAN[n]; k++) {
    const p = P.generate(n, n * 100003 + k * 7919 + 17);
    if (P.countSolutions(n, p.regions, 2).count !== 1) throw new Error("not unique");
    out.push({ n, r: p.regions.map((g) => B36[g]).join(""), s: p.solution.map((c) => B36[c]).join("") });
    process.stderr.write(`${n}x${n} #${k + 1}/${PLAN[n]}\n`);
  }
  return out;
}

const [size, outFile] = process.argv.slice(2);
if (size) {
  fs.writeFileSync(outFile, JSON.stringify(buildSize(Number(size))));
} else {
  const all = Object.keys(PLAN).flatMap((n) => buildSize(Number(n)));
  fs.writeFileSync(path.join(__dirname, "..", "boards.json"), JSON.stringify(all));
}
