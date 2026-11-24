// Original Weirdling creature art, drawn as inline SVG.
(function (root) {
  // Lime was removed (owner, Nov 2026): 12 colors for boards up to 12x12.
  // Colors were re-tuned twice (Nov 2026) in OKLCH; 2nd pass split greens (deep emerald vs
  // bright chartreuse lime), earth tones (dark brown, pale sand, amber mustard) and pinks.
  // Originally re-tuned so neighbours like orange/mustard,
  // blue/slate, green/lime and pink/magenta are more saturated and easier to tell apart.
  // tile = square color, light = square behind a placed weirdling, body = creature
  const REGION_COLORS = [
    { tile: "#FFA2CD", light: "#FFE2EE", body: "#E16EA5" }, // pink
    { tile: "#FF7D30", light: "#FFE5D8", body: "#DD4500" }, // orange
    { tile: "#F9BC1E", light: "#F6EAD1", body: "#D68F00" }, // mustard
    { tile: "#0FA44D", light: "#DCF2DF", body: "#007F0C" }, // green
    { tile: "#09B8BA", light: "#D1F3F3", body: "#009397" }, // teal
    { tile: "#3E96EA", light: "#DAEEFF", body: "#006CCE" }, // blue
    { tile: "#8B65D8", light: "#EDE7FF", body: "#6932BB" }, // purple
    { tile: "#8C5331", light: "#FFE5D7", body: "#6E2500" }, // brown
    { tile: "#A5B7DF", light: "#E0EBFF", body: "#748EC7" }, // slate
    { tile: "#E64340", light: "#FFE3DF", body: "#BE0004" }, // red
    { tile: "#BF38AA", light: "#FBE3F5", body: "#960084" }, // magenta
    { tile: "#E2D3AF", light: "#F5EAD1", body: "#C0A86F" }, // sand
  ];

  const INK = "#2B2340";

  // A tiny black-and-white symbol for each color (same index as REGION_COLORS), drawn in the
  // corner of every tile so patches can be told apart without relying on color alone.
  const SYMBOLS = [
    "M12 20.5C5 15.5 3 11.5 3 8.5 3 5.5 5.3 3.5 8 3.5c1.8 0 3.2 1.1 4 2.5.8-1.4 2.2-2.5 4-2.5 2.7 0 5 2 5 5 0 3-2 7-9 12Z", // pink: heart
    "M12 3.5 21 19.5H3Z",                                     // orange: triangle
    "M12 2.5l2.6 6.3 6.8.5-5.2 4.3 1.7 6.7L12 16.6l-5.9 3.7 1.7-6.7-5.2-4.3 6.8-.5Z", // mustard: star
    "M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z",                          // green: plus
    "M12 2.5S19 10.5 19 15a7 7 0 0 1-14 0c0-4.5 7-12.5 7-12.5Z", // teal: drop
    "M12 3.5a8.5 8.5 0 1 1-.01 0Z",                           // blue: circle
    "M12 2.5 21 12l-9 9.5L3 12Z",                             // purple: diamond
    "M4.5 4.5h15v15h-15Z",                                    // brown: square
    "M15 3a9 9 0 1 0 6 12A7 7 0 1 1 15 3Z",                   // slate: moon
    "M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5Z",           // red: hexagon
    "M13.5 2 4.5 13.5H11L9.5 22l10-12H13Z",                   // magenta: lightning bolt
    "M3 18a9 9 0 0 1 18 0Z",                                  // sand: dome
  ];
  const symbolURL = SYMBOLS.map((d) =>
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${d}' fill='#fff' stroke='#141018' stroke-width='2.4' stroke-linejoin='round'/></svg>`)}")`);
  // Paint a tile: its color plus its color's symbol.
  function paintTile(el, colorIndex) {
    el.style.backgroundColor = REGION_COLORS[colorIndex].tile;
    el.style.backgroundImage = symbolURL[colorIndex % symbolURL.length];
  }


  function eye(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
      `<circle class="pupil" cx="${x + r * 0.15}" cy="${y + r * 0.15}" r="${r * 0.48}" fill="${INK}"/>` +
      `<circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.18}" fill="#fff"/>`;
  }

  // Each design: body path, extras drawn behind/in front, eye layout, mouth.
  const DESIGNS = [
    { // Gloop: one giant eye
      body: "M50 18 C78 18 88 40 88 60 C88 80 72 90 50 90 C28 90 12 80 12 60 C12 40 22 18 50 18Z",
      eyes: [[50, 50, 17]], mouth: "M40 74 Q50 80 60 74",
    },
    { // Zib: antennae, two eyes
      back: (c) => `<path d="M38 28 L30 8 M62 28 L70 8" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` +
        `<circle cx="30" cy="8" r="6" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="70" cy="8" r="6" fill="${c}" stroke="${INK}" stroke-width="3"/>`,
      body: "M50 24 C76 24 86 44 86 62 C86 82 70 90 50 90 C30 90 14 82 14 62 C14 44 24 24 50 24Z",
      eyes: [[38, 54, 10], [62, 54, 10]], mouth: "M42 74 Q50 82 58 74",
    },
    { // Trillo: tall bean, three eyes
      body: "M50 10 C72 10 80 30 80 55 C80 80 68 92 50 92 C32 92 20 80 20 55 C20 30 28 10 50 10Z",
      eyes: [[50, 32, 8], [38, 52, 8], [62, 52, 8]], mouth: "M42 74 L58 74",
    },
    { // Spork: spiky
      body: "M50 10 L60 24 L78 18 L76 36 L92 46 L78 58 L86 76 L66 76 L58 92 L50 80 L42 92 L34 76 L14 76 L22 58 L8 46 L24 36 L22 18 L40 24Z",
      eyes: [[40, 50, 9], [60, 50, 9]], mouth: "M44 66 Q50 61 56 66",
    },
    { // Woo: ghosty, wavy bottom
      body: "M50 12 C74 12 86 30 86 52 L86 88 Q78 80 70 88 Q62 96 56 88 Q50 80 44 88 Q38 96 30 88 Q22 80 14 88 L14 52 C14 30 26 12 50 12Z",
      eyes: [[38, 46, 9], [62, 46, 9]], mouth: "M44 64 Q50 72 56 64 Z",
    },
    { // Horny: little horns, one eye
      back: (c) => `<path d="M28 34 L18 10 L40 26Z M72 34 L82 10 L60 26Z" fill="#fff8e8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
      body: "M50 22 C78 22 88 42 88 62 C88 82 72 90 50 90 C28 90 12 82 12 62 C12 42 22 22 50 22Z",
      eyes: [[50, 54, 13]], mouth: "M38 76 Q44 72 50 76 Q56 80 62 76",
    },
    { // Squidge: squarish with tentacles
      back: (c) => `<path d="M24 78 Q20 94 12 92 M40 82 Q40 96 34 96 M60 82 Q60 96 66 96 M76 78 Q80 94 88 92" stroke="${c}" stroke-width="8" stroke-linecap="round" fill="none"/>` +
        `<path d="M24 78 Q20 94 12 92 M40 82 Q40 96 34 96 M60 82 Q60 96 66 96 M76 78 Q80 94 88 92" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".35"/>`,
      body: "M28 16 L72 16 Q86 16 86 30 L86 70 Q86 84 72 84 L28 84 Q14 84 14 70 L14 30 Q14 16 28 16Z",
      eyes: [[36, 44, 10], [64, 44, 10]], mouth: "M40 66 Q50 74 60 66",
    },
    { // Sprout: leaf on head
      back: () => `<path d="M50 24 Q48 12 50 6" stroke="${INK}" stroke-width="3" fill="none"/>` +
        `<path d="M50 10 Q62 -2 74 6 Q64 18 50 10Z" fill="#5CD65C" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
      body: "M50 22 C76 22 88 40 88 60 C88 80 72 90 50 90 C28 90 12 80 12 60 C12 40 24 22 50 22Z",
      eyes: [[38, 54, 8], [62, 54, 8]], mouth: "M44 72 Q50 78 56 72", cheeks: true,
    },
    { // Drip: slime with drips, three eyes
      body: "M50 14 C76 14 88 34 88 56 L88 72 Q88 80 82 80 Q78 80 78 88 Q78 94 72 94 Q66 94 66 86 L66 82 Q50 86 40 82 L40 90 Q40 96 34 96 Q28 96 28 90 L28 80 Q12 80 12 66 L12 56 C12 34 24 14 50 14Z",
      eyes: [[34, 46, 8], [52, 40, 9], [68, 50, 7]], mouth: "M38 66 Q50 74 62 66",
    },
    { // Toadstool: the mushroom toad (artwork image) - red patches
      img: "assets/creatures/c04.webp?v=4",
    },
    { // Stalky: eyes on stalks
      back: (c) => `<path d="M38 40 Q32 22 28 14 M62 40 Q68 22 72 14" stroke="${c}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
        `<path d="M38 40 Q32 22 28 14 M62 40 Q68 22 72 14" stroke="${INK}" stroke-width="2" fill="none" opacity=".3"/>`,
      body: "M50 36 C76 36 88 52 88 68 C88 84 72 92 50 92 C28 92 12 84 12 68 C12 52 24 36 50 36Z",
      eyes: [[28, 14, 10], [72, 14, 10]], mouth: "M38 66 Q50 78 62 66",
    },
    { // Shroom: mushroom cap with spots
      body: "M10 52 C10 22 30 10 50 10 C70 10 90 22 90 52 Q90 58 80 58 L72 58 L72 82 Q72 92 62 92 L38 92 Q28 92 28 82 L28 58 L20 58 Q10 58 10 52Z",
      front: `<circle cx="30" cy="30" r="6" fill="#fff" opacity=".85"/><circle cx="54" cy="20" r="5" fill="#fff" opacity=".85"/><circle cx="74" cy="36" r="6" fill="#fff" opacity=".85"/>`,
      eyes: [[41, 70, 7], [59, 70, 7]], mouth: "M45 84 Q50 88 55 84",
    },
    { // Chomp: pointy top, toothy grin
      body: "M50 8 L86 76 Q90 90 76 90 L24 90 Q10 90 14 76Z",
      eyes: [[50, 50, 11]], mouth: "M34 72 L66 72 L62 80 L58 74 L54 80 L50 74 L46 80 L42 74 L38 80Z",
    },
  ];

  // The owner's creature art. colors[0] = the color the creature mainly is
  // (matched to the nearest tile color); later entries are backups used only
  // when a color has no creature of its own (pink, brown) or is already taken.
  // Color index: 0 pink 1 orange 2 mustard 3 green 4 teal 5 blue 6 purple
  // 7 brown 8 slate 9 red 10 magenta 11 sand
  // Full-art sizes and eye spots (percent of width/height, radius in % of width,
  // eyelid color) so the little creatures under the board can blink and smile.
  const HERO_META = {
    c01: { w: 692, h: 508, eyes: [[47.5,14,9.5,"#FFD9C4"],[69,41,5,"#D8A06E"]] },
    c02: { w: 702, h: 510, eyes: [[37.5,23,6.5,"#D5A3B3"],[19,35,3.5,"#E3AFA6"],[63,22,7,"#BF7AA5"],[79,34,3,"#E3AFA6"]] },
    c03: { w: 720, h: 492, eyes: [[45,43,11.5,"#708399"]] },
    c04: { w: 840, h: 828, eyes: [[46,39,7,"#E2A443"],[74,38,5.5,"#E2A443"]] },
    c05: { w: 786, h: 840, eyes: [[60,29,8,"#3FB3A6"],[94,29,5,"#3FB3A6"]] },
    c06: { w: 800, h: 840, eyes: [[54,29,10,"#B8798A"]] },
    c07: { w: 840, h: 670, eyes: [[43,30,7.5,"#8DAA34"],[79,31,6,"#8DAA34"]] },
    c09: { w: 806, h: 840, eyes: [[55,40,6.5,"#9A9A52"],[76,40,5,"#9A9A52"]] },
    c10: { w: 840, h: 820, eyes: [[49,38,8.5,"#D7A475"],[72,35,7.5,"#EEBC91"]] },
    c11: { w: 836, h: 840, eyes: [[55,31,9,"#D0A070"],[82,29,7,"#D7A48D"]] },
    c12: { w: 840, h: 783, eyes: [[77,31,4.5,"#CCAE82"],[91,28,3,"#E6D9C2"]] },
    c13: { w: 818, h: 840, eyes: [[79,30,5,"#C4856F"],[90,27.5,3,"#E6D7BE"]] },
    c14: { w: 840, h: 839, eyes: [[69,30,2.5,"#3D5A80"]] },
    c17: { w: 840, h: 830, eyes: [[70,40,8,"#EECA5D"],[91,39,5.5,"#F4CC5F"]] },
    c18: { w: 835, h: 840, eyes: [] },
    c19: { w: 828, h: 840, eyes: [[70,45,4.5,"#D9433B"],[85,47,3,"#BA433F"]] },
    c20: { w: 798, h: 840, eyes: [[78,18,2.5,"#9599B1"]] },
    c23: { w: 835, h: 840, eyes: [[71,24,2,"#1B2B49"]] },
    c24: { w: 840, h: 829, eyes: [] },
  };
  const HERO_META_get = (id) => HERO_META[id] || { w: 1, h: 1, eyes: [] };
  const ART_V = 6;
  const CREATURES = [
    { id: "c01", colors: [8, 11] },      // shaggy one-eyed sad fluff
    { id: "c02", colors: [10, 0] },      // two-headed bird
    { id: "c03", colors: [6, 4] },       // big-mouth fish lizard
    { id: "c04", colors: [9, 7] },       // mushroom toad
    { id: "c05", colors: [4] },          // goggle chameleon
    { id: "c06", colors: [11, 6] },      // lava-lamp cyclops
    { id: "c07", colors: [3, 0] },   // fairy frog
    { id: "c09", colors: [3, 7, 0] },    // butterfly mushroom turtle
    { id: "c10", colors: [1] },          // coral owl octopus
    { id: "c11", colors: [1, 6, 0] },    // tentacle-tail lizard
    { id: "c12", colors: [4] },          // teal antler griffin
    { id: "c13", colors: [9] },          // red antler griffin
    { id: "c14", colors: [5] },          // ice whale
    { id: "c17", colors: [2] },          // honeycomb bee scorpion
    { id: "c18", colors: [3, 7] },       // moss snail sloth
    { id: "c19", colors: [9, 7] },       // lava egg octopus
    { id: "c20", colors: [5] },          // shell heron
    { id: "c23", colors: [5, 6] },       // cosmic whale
    { id: "c24", colors: [6, 5] },       // night-sky whale
  ].map((c) => ({ ...c, ...(HERO_META_get(c.id)),
    img: `assets/creatures/${c.id}.webp?v=${ART_V}`,
    hero: `assets/heroes/${c.id}.webp?v=${ART_V}` }));

  function rng32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Pick one creature per color (no repeats among `used` colors), seeded.
  function makeCast(seed, used) {
    const rand = rng32(seed);
    const colors = used && used.length ? [...new Set(used)] : REGION_COLORS.map((_, i) => i);
    for (let i = 0; i < REGION_COLORS.length; i++) if (!colors.includes(i)) colors.push(i);
    const cand = (ci) => {
      const own = CREATURES.filter((c) => c.colors[0] === ci);
      return own.length ? own : CREATURES.filter((c) => c.colors.includes(ci));
    };
    const usedCount = used && used.length ? new Set(used).size : colors.length;
    const level = colors.slice(0, usedCount).sort((a, b) => cand(a).length - cand(b).length);
    const cast = [], taken = new Set();
    const order = (list) => list.map((c) => [rand(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const opts = level.map((ci) => order(cand(ci)));
    // backtracking so every color on the board gets a different creature
    (function fill(k) {
      if (k === level.length) return true;
      for (const c of opts[k]) {
        if (taken.has(c.id)) continue;
        taken.add(c.id); cast[level[k]] = c;
        if (fill(k + 1)) return true;
        taken.delete(c.id);
      }
      return false;
    })(0) || level.forEach((ci, k) => { cast[ci] = opts[k][0]; });
    colors.slice(usedCount).forEach((ci) => { cast[ci] = order(cand(ci))[0]; });
    return cast;
  }

  let currentCast = makeCast(1);
  function setCast(seed, used) { currentCast = makeCast(seed, used); return currentCast; }

  function creatureSVG(index, mood, cast) {
    const art = (cast || currentCast)[index % REGION_COLORS.length];
    if (art) {
      return `<img class="weirdling img-weirdling${mood === "sad" ? " sad" : ""}" src="${art.img}" alt="" draggable="false">`;
    }
    const d = DESIGNS[index % DESIGNS.length];
    if (d.img) {
      return `<img class="weirdling img-weirdling${mood === "sad" ? " sad" : ""}" src="${d.img}" alt="" draggable="false">`;
    }
    const c = REGION_COLORS[index % REGION_COLORS.length].body;
    const eyes = d.eyes.map(([x, y, r]) =>
      d.sleepy && mood !== "sad"
        ? `<path d="M${x - r} ${y} Q${x} ${y + r} ${x + r} ${y}" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        : mood === "sad"
        ? `<path d="M${x - r} ${y} Q${x} ${y + r * 0.8} ${x + r} ${y}" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        : eye(x, y, r)
    ).join("");
    const mouth = mood === "sad"
      ? `<path d="M42 78 Q50 70 58 78" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<path d="${d.mouth}" stroke="${INK}" stroke-width="3.5" fill="${d.mouth.endsWith("Z") ? INK : "none"}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const cheeks = d.cheeks
      ? `<ellipse cx="26" cy="68" rx="6" ry="4" fill="#ff8fab" opacity=".7"/><ellipse cx="74" cy="68" rx="6" ry="4" fill="#ff8fab" opacity=".7"/>`
      : "";
    return `<svg class="weirdling" viewBox="0 0 100 100" aria-hidden="true">` +
      (d.back ? d.back(c) : "") +
      `<path d="${d.body}" fill="${c}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="${d.body}" fill="url(#shine)" opacity=".35"/>` +
      (d.front || "") + cheeks + eyes + mouth + `</svg>`;
  }

  const api = { REGION_COLORS, SYMBOLS, paintTile, DESIGNS, CREATURES, creatureSVG, makeCast, setCast, getCast: () => currentCast, INK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Weirdlings = api;
})(typeof window !== "undefined" ? window : globalThis);
