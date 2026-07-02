/* ============================================================
   LEADERBOARD.JS — Local top-10 high score table (localStorage).
   Fully isolated: only reads/writes CFG.storageKeys.leaderboard.

   NOTE FOR CRAZYGAMES SUBMISSION:
   This is a per-device local leaderboard so the game works
   standalone. For a real cross-player leaderboard on CrazyGames,
   swap the save()/getAll() bodies to call the CrazyGames SDK
   (window.CrazyGames.SDK.data / leaderboard modules) once you've
   added the SDK script tag. Everything else in the game calls
   only Leaderboard.save() / Leaderboard.getAll(), so that's the
   only file you'd need to touch.
   ============================================================ */
window.Leaderboard = (function () {
  const KEY = CFG.storageKeys.leaderboard;
  const MAX_ENTRIES = 10;

  function getAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function save(name, score, wave) {
    const entries = getAll();
    entries.push({ name: (name || "YOU").slice(0, 10).toUpperCase(), score, wave, date: Date.now() });
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, MAX_ENTRIES);
    try { localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch (e) {}
    return trimmed;
  }

  function isHighScore(score) {
    const entries = getAll();
    if (entries.length < MAX_ENTRIES) return true;
    return score > entries[entries.length - 1].score;
  }

  return { getAll, save, isHighScore };
})();
