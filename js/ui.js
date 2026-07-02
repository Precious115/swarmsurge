/* ============================================================
   UI.JS — All DOM manipulation (HUD, menus, overlays) lives
   here. game.js calls these functions with plain data; this file
   never runs game logic, so redesigning the UI never touches
   gameplay code and vice versa.
   ============================================================ */
window.UI = (function () {
  const $ = (id) => document.getElementById(id);

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
    if (id) $(id).classList.add("active");
  }

  function updateHud({ hp, maxHp, xp, xpToNext, level, score, wave, time, combo }) {
    $("hpFill").style.width = `${Utils.clamp((hp / maxHp) * 100, 0, 100)}%`;
    $("hpText").textContent = `${Math.ceil(hp)}/${maxHp}`;
    $("xpFill").style.width = `${Utils.clamp((xp / xpToNext) * 100, 0, 100)}%`;
    $("levelText").textContent = `Lv ${level}`;
    $("scoreText").textContent = score.toLocaleString();
    $("waveText").textContent = `Wave ${wave}`;
    $("timeText").textContent = Utils.fmtTime(time);
    const comboEl = $("comboText");
    if (combo > 1) {
      comboEl.textContent = `x${combo.toFixed(1)} COMBO`;
      comboEl.style.opacity = "1";
    } else {
      comboEl.style.opacity = "0";
    }
  }

  function flashBossWarning(show) {
    $("bossWarning").style.display = show ? "block" : "none";
  }

  function renderUpgradeChoices(choices, onPick) {
    const wrap = $("upgradeChoices");
    wrap.innerHTML = "";
    choices.forEach(c => {
      const card = document.createElement("button");
      card.className = "upgrade-card";
      card.innerHTML = `<div class="upgrade-icon">${c.icon}</div>
                         <div class="upgrade-name">${c.name}</div>
                         <div class="upgrade-desc">${c.desc}</div>`;
      card.onclick = () => onPick(c);
      wrap.appendChild(card);
    });
    showScreen("levelUpScreen");
  }

  function renderLeaderboard(entries) {
    const list = $("leaderboardList");
    list.innerHTML = "";
    if (entries.length === 0) {
      list.innerHTML = `<div class="lb-empty">No runs yet — be the first!</div>`;
      return;
    }
    entries.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `<span class="lb-rank">#${i + 1}</span>
                        <span class="lb-name">${e.name}</span>
                        <span class="lb-wave">W${e.wave}</span>
                        <span class="lb-score">${e.score.toLocaleString()}</span>`;
      list.appendChild(row);
    });
  }

  function showGameOver({ score, wave, isHighScore }) {
    $("finalScore").textContent = score.toLocaleString();
    $("finalWave").textContent = wave;
    $("nameEntryRow").style.display = isHighScore ? "flex" : "none";
    $("newHighScoreBadge").style.display = isHighScore ? "block" : "none";
    showScreen("gameOverScreen");
  }

  function setMuteIcon(muted) {
    $("muteBtn").textContent = muted ? "🔇" : "🔊";
  }

  return {
    showScreen, updateHud, flashBossWarning, renderUpgradeChoices,
    renderLeaderboard, showGameOver, setMuteIcon, $
  };
})();
