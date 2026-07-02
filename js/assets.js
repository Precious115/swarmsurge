/* ============================================================
   ASSETS.JS — Loads real art (PNG/WEBP) once at startup and
   exposes it as Assets.get('key'). Fully independent: if an
   image is missing or fails to load, Assets.get() returns null
   and callers (player.js/enemies.js/game.js) fall back to the
   emoji they already draw, so a bad/missing image file can
   never crash or blank out the game.
   ============================================================ */
window.Assets = (function () {
  const manifest = {
    player: "assets/player.webp",
    grunt: "assets/grunt.webp",
    bat: "assets/bat.webp",
    tank: "assets/tank.webp",
    ghost: "assets/ghost.webp",
    boss: "assets/boss.webp",
    backgroundTile: "assets/background-tile.webp"
  };

  const images = {};
  const ready = {};
  let loadedCount = 0;
  const total = Object.keys(manifest).length;
  let onAllLoaded = null;

  function load() {
    Object.entries(manifest).forEach(([key, src]) => {
      const img = new Image();
      ready[key] = false;
      img.onload = () => {
        ready[key] = true;
        loadedCount++;
        if (loadedCount === total && onAllLoaded) onAllLoaded();
      };
      img.onerror = () => {
        // Missing/broken file — silently fall back to emoji elsewhere
        ready[key] = false;
        loadedCount++;
        console.warn(`[Assets] Failed to load "${key}" from ${src}; using emoji fallback.`);
        if (loadedCount === total && onAllLoaded) onAllLoaded();
      };
      img.src = src;
      images[key] = img;
    });
  }

  function get(key) {
    return ready[key] ? images[key] : null;
  }

  function isReady(key) { return !!ready[key]; }

  function whenAllLoaded(cb) {
    if (loadedCount === total) cb();
    else onAllLoaded = cb;
  }

  load();

  return { get, isReady, whenAllLoaded };
})();
