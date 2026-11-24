// Background effects: crystals in the cave background randomly light up and
// twinkle. Runs on every page, behind everything else.
(function () {
  // Background image size and the crystal spots in it (image pixels: x0, y0, x1, y1).
  const IMG_W = 1290, IMG_H = 2796;
  const PINK = "255,110,240", BLUE = "95,215,255";
  const CRYSTALS = [
    [10, 190, 165, 360, BLUE],     // top left
    [195, 380, 245, 435, BLUE],    // small, top left
    [825, 280, 875, 335, BLUE],    // tiny, by the waterfall
    [1140, 130, 1290, 330, PINK],  // top right
    [0, 860, 105, 1040, PINK],     // middle left
    [1145, 1025, 1290, 1240, BLUE],// middle right
    [1185, 1735, 1240, 1805, BLUE],// small, lower right
    [0, 1730, 135, 2000, PINK],    // lower left
    [123, 1949, 197, 2035, BLUE],  // small, lower left
    [40, 2174, 139, 2257, BLUE],   // tiny, lower left
    [1100, 2080, 1290, 2380, PINK],// big, lower right
    [335, 2435, 455, 2560, PINK],  // bottom left
    [855, 2475, 990, 2575, PINK],  // bottom right
  ];

  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const layer = document.createElement("div");
  layer.id = "bg-fx";
  layer.setAttribute("aria-hidden", "true");
  document.body.prepend(layer);

  // Same math as CSS "background-size: cover; background-position: center".
  let scale = 1, ox = 0, oy = 0;
  function layout() {
    const w = document.body.clientWidth || innerWidth;
    const h = document.body.clientHeight || innerHeight;
    scale = Math.max(w / IMG_W, h / IMG_H);
    ox = (w - IMG_W * scale) / 2;
    oy = (h - IMG_H * scale) / 2;
  }
  layout();
  addEventListener("resize", layout);
  addEventListener("orientationchange", () => setTimeout(layout, 300));

  // Bigger crystals get picked more often.
  const weights = CRYSTALS.map(([x0, y0, x1, y1]) => Math.sqrt((x1 - x0) * (y1 - y0)));
  const totalW = weights.reduce((a, b) => a + b, 0);
  function pickCrystal() {
    let r = Math.random() * totalW;
    for (let i = 0; i < CRYSTALS.length; i++) { r -= weights[i]; if (r <= 0) return CRYSTALS[i]; }
    return CRYSTALS[0];
  }

  const SPARKLE = `<svg viewBox="-10 -10 20 20"><path d="M0 -10 Q1.2 -1.2 10 0 Q1.2 1.2 0 10 Q-1.2 1.2 -10 0 Q-1.2 -1.2 0 -10Z" fill="#fff"/></svg>`;

  function twinkle(index) {
    const [x0, y0, x1, y1, rgb] = index === undefined ? pickCrystal() : CRYSTALS[index];
    const cx = ox + ((x0 + x1) / 2) * scale;
    const cy = oy + ((y0 + y1) / 2) * scale;
    const bw = (x1 - x0) * scale, bh = (y1 - y0) * scale;

    // the crystal lights up a little
    const glow = document.createElement("div");
    glow.className = "fx-glow";
    const gs = Math.max(bw, bh) * 1.45;
    glow.style.cssText = `left:${cx - gs / 2}px;top:${cy - gs / 2}px;width:${gs}px;height:${gs}px;` +
      `background:radial-gradient(circle, rgba(255,255,255,.35) 0%, rgba(${rgb},.85) 14%, rgba(${rgb},.42) 38%, rgba(${rgb},0) 70%);` +
      `animation-duration:${1.6 + Math.random() * 1.2}s`;
    layer.appendChild(glow);

    // one or two small sparkles on the crystal
    const count = Math.random() < 0.45 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const s = document.createElement("div");
      s.className = "fx-sparkle";
      const size = 7 + Math.random() * Math.min(16, Math.max(bw, bh) * 0.35);
      const sx = ox + (x0 + Math.random() * (x1 - x0)) * scale;
      const sy = oy + (y0 + Math.random() * (y1 - y0)) * scale;
      s.style.cssText = `left:${sx - size / 2}px;top:${sy - size / 2}px;width:${size}px;height:${size}px;` +
        `animation-delay:${0.15 + k * 0.35}s;animation-duration:${1 + Math.random() * 0.6}s;` +
        `filter:drop-shadow(0 0 ${Math.round(size / 3)}px rgba(${rgb},1))`;
      s.innerHTML = SPARKLE;
      layer.appendChild(s);
      setTimeout(() => s.remove(), 2400);
    }
    setTimeout(() => glow.remove(), 3000);
  }

  // Random timing, paused while the app is in the background.
  function loop() {
    if (!document.hidden) twinkle();
    setTimeout(loop, 260 + Math.random() * 520);
  }
  setTimeout(loop, 400);
  window.__bgfx = { twinkle, count: CRYSTALS.length }; // for testing
})();
