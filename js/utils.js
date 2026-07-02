/* ============================================================
   UTILS.JS — Generic helper functions with no game-state
   knowledge. Safe to extend; nothing here depends on other
   files, and other files only call these as pure functions.
   ============================================================ */
window.Utils = (function () {
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Weighted random pick from an object map { key: {weight, ...} }
  function weightedPick(map) {
    const entries = Object.entries(map);
    const total = entries.reduce((s, [, v]) => s + (v.weight || 1), 0);
    let r = Math.random() * total;
    for (const [key, v] of entries) {
      r -= (v.weight || 1);
      if (r <= 0) return key;
    }
    return entries[0][0];
  }

  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return { rand, randInt, dist, clamp, lerp, weightedPick, angleTo, vibrate, fmtTime };
})();
