// Online leaderboard (Supabase REST, no extra libraries).
(function (root) {
  const MAX_LEVELS = 99999;
  const PLAYER_KEY = "weirdlings-player";
  const cfg = root.WEIRDLINGS_CONFIG || {};
  const base = (cfg.supabaseUrl || "").replace(/\/+$/, "");
  const key = cfg.supabaseKey || "";

  function configured() { return !!(base && key); }

  function headers(extra) {
    const h = { apikey: key, "Content-Type": "application/json" };
    // New "sb_..." keys go in apikey only; legacy JWT anon keys also need Authorization.
    if (!key.startsWith("sb_")) h.Authorization = "Bearer " + key;
    return Object.assign(h, extra || {});
  }

  function randomId() {
    if (root.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function randomSecret() {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  function getPlayer() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PLAYER_KEY)); } catch (e) {}
    if (!p || !p.id || !p.secret) {
      p = { id: randomId(), secret: randomSecret(), name: "" };
      try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch (e) {}
    }
    return p;
  }
  function setName(name) {
    const p = getPlayer();
    p.name = cleanName(name);
    try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch (e) {}
    return p;
  }
  function cleanName(name) {
    return String(name || "").replace(/\s+/g, " ").trim().slice(0, 16);
  }

  async function submit(levels) {
    const p = getPlayer();
    if (!configured() || !p.name) return false;
    const res = await fetch(`${base}/rest/v1/rpc/submit_score`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ p_id: p.id, p_secret: p.secret, p_name: p.name, p_levels: Math.min(MAX_LEVELS, levels) }),
    });
    if (!res.ok) throw new Error("submit failed " + res.status);
    return true;
  }

  async function top(limit = 50) {
    const res = await fetch(`${base}/rest/v1/leaderboard?select=id,name,levels&order=levels.desc,updated_at.asc&limit=${limit}`, { headers: headers() });
    if (!res.ok) throw new Error("load failed " + res.status);
    return res.json();
  }

  // Your rank = 1 + number of players with more levels than you.
  async function rank(levels) {
    const res = await fetch(`${base}/rest/v1/leaderboard?select=id&levels=gt.${levels}`, {
      headers: headers({ Prefer: "count=exact", Range: "0-0" }),
    });
    if (!res.ok) throw new Error("rank failed " + res.status);
    const cr = res.headers.get("content-range") || "";
    const total = Number(cr.split("/")[1]);
    return Number.isFinite(total) ? total + 1 : null;
  }

  // ---- all-time record per level ----
  async function getRecord(level) {
    const res = await fetch(`${base}/rest/v1/level_records?level=eq.${level}&select=ms,name,player_id`, { headers: headers() });
    if (!res.ok) throw new Error("record failed " + res.status);
    const rows = await res.json();
    return rows[0] || null;
  }
  // Returns true if this time set a new all-time record.
  async function submitTime(level, ms) {
    const p = getPlayer();
    const res = await fetch(`${base}/rest/v1/rpc/submit_time`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ p_id: p.id, p_secret: p.secret, p_name: p.name || "", p_level: level, p_ms: Math.round(ms) }),
    });
    if (!res.ok) throw new Error("time failed " + res.status);
    return (await res.json()) === true;
  }

  root.Leaderboard = { MAX_LEVELS, configured, getPlayer, setName, cleanName, submit, top, rank, getRecord, submitTime };
})(window);
