// Original Weirdling creature art, drawn as inline SVG.
(function (root) {
  // tile = square color, light = square behind a placed weirdling, body = creature
  const REGION_COLORS = [
    { tile: "#F5A3C0", light: "#FDE3EC", body: "#FF5C8A" }, // pink
    { tile: "#FDAA6B", light: "#FFE6D1", body: "#FF8A1F" }, // orange
    { tile: "#E5B94A", light: "#FBEFC9", body: "#E0A800" }, // mustard
    { tile: "#7CCB6B", light: "#DDF3D6", body: "#38A84A" }, // green
    { tile: "#4AB8B4", light: "#D3F0EF", body: "#129C97" }, // teal
    { tile: "#6CBAE8", light: "#DCEFFA", body: "#2F8FD6" }, // blue
    { tile: "#9B7EDB", light: "#E7DFF8", body: "#7A4FE0" }, // purple
    { tile: "#B07350", light: "#EEDCCF", body: "#9A5A33" }, // brown
    { tile: "#A8BCD6", light: "#E7EDF5", body: "#5F7896" }, // slate
    { tile: "#E8635F", light: "#FADAD9", body: "#D9302B" }, // red
    { tile: "#B9D454", light: "#EFF6D2", body: "#86B012" }, // lime
    { tile: "#E486BE", light: "#F8DDEE", body: "#C93AA6" }, // magenta
    { tile: "#D4B89A", light: "#F4EBE1", body: "#A97E54" }, // sand
  ];

  const INK = "#2B2340";

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
      img: "assets/creature-toad.webp?v=28",
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

  function creatureSVG(index, mood) {
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

  const api = { REGION_COLORS, DESIGNS, creatureSVG, INK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Weirdlings = api;
})(typeof window !== "undefined" ? window : globalThis);
