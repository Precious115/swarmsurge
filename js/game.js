/* ============================================================
   GAME.JS — The conductor. Owns the requestAnimationFrame loop
   and world/projectile arrays, and calls into Player, Enemies,
   Particles, Upgrades, Leaderboard, UI, Input, Sfx. It does NOT
   contain enemy AI, upgrade definitions, or DOM markup — those
   live in their own files and can be edited independently.
   ============================================================ */
(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  let projectiles = [];
  let xpOrbs = [];
  let score = 0;
  let runTime = 0;
  let comboMultiplier = 1;
  let comboTimer = 0;
  let running = false;
  let paused = false;
  let lastTs = 0;
  let worldBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  // Static starfield for background atmosphere — cheap to draw, no image files needed
  let stars = [];
  let bgPattern = null; // lazily built once the background-tile image finishes loading
  function buildStars() {
    stars = [];
    const count = Math.floor((canvas.width * canvas.height) / 9000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Utils.rand(0.5, 1.8),
        a: Utils.rand(0.2, 0.8),
        tw: Utils.rand(1, 3) // twinkle speed
      });
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    buildStars();
  }
  window.addEventListener("resize", resize);
  resize();

  function computeBounds() {
    // A generous play area larger than the viewport so movement feels open
    const pad = 400;
    worldBounds = {
      minX: -pad, minY: -pad,
      maxX: canvas.width + pad, maxY: canvas.height + pad
    };
  }

  function resetRun() {
    Player.init();
    const cx = canvas.width / 2, cy = canvas.height / 2;
    Player.respawnAt(cx, cy);
    Enemies.reset();
    Particles.reset();
    projectiles = [];
    xpOrbs = [];
    score = 0;
    runTime = 0;
    comboMultiplier = 1;
    comboTimer = 0;
    computeBounds();
  }

  function startGame() {
    resetRun();
    running = true;
    paused = false;
    UI.showScreen(null);
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function addScore(base) {
    score += Math.round(base * comboMultiplier);
    comboTimer = CFG.combo.windowSeconds;
    comboMultiplier = Math.min(CFG.combo.maxMultiplier, comboMultiplier + CFG.combo.scorePerComboStep);
  }

  function fireProjectiles() {
    const p = Player.state;
    // find nearest N distinct enemies to spread shots across, else fire straight ahead
    const targets = [...Enemies.list]
      .sort((a, b) => Utils.dist(p.x, p.y, a.x, a.y) - Utils.dist(p.x, p.y, b.x, b.y))
      .slice(0, Math.max(1, p.projectiles));

    if (targets.length === 0) {
      // no enemies yet — fire in facing direction
      for (let i = 0; i < p.projectiles; i++) {
        const spread = (i - (p.projectiles - 1) / 2) * 0.15;
        const a = p.facing + spread;
        spawnProjectile(p.x, p.y, Math.cos(a) * CFG.projectile.speed, Math.sin(a) * CFG.projectile.speed);
      }
    } else {
      for (let i = 0; i < p.projectiles; i++) {
        const t = targets[i % targets.length];
        const a = Utils.angleTo(p.x, p.y, t.x, t.y);
        spawnProjectile(p.x, p.y, Math.cos(a) * CFG.projectile.speed, Math.sin(a) * CFG.projectile.speed);
      }
    }
    Sfx.play("shoot");
  }

  function spawnProjectile(x, y, vx, vy) {
    projectiles.push({
      x, y, vx, vy,
      life: CFG.projectile.life,
      pierceLeft: Player.state.pierce,
      hitSet: new Set()
    });
  }

  function spawnXpOrb(x, y, value) {
    xpOrbs.push({ x, y, value, radius: CFG.xpOrb.radius });
  }

  function update(dt) {
    if (!running || paused) return;
    runTime += dt;

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) comboMultiplier = 1;
    }

    const input = Input.getVector();
    Player.update(dt, input, worldBounds);
    const p = Player.state;

    if (!p.alive) {
      endRun();
      return;
    }

    if (Player.canFire() && Enemies.list.length >= 0) {
      fireProjectiles();
      Player.resetFireCooldown();
    }

    // projectiles
    projectiles.forEach(pr => {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    });
    projectiles = projectiles.filter(pr => pr.life > 0 && pr.pierceLeft > 0);

    // orbit shield collision
    if (p.shield) {
      const sx = p.x + Math.cos(p.shieldAngle) * 46;
      const sy = p.y + Math.sin(p.shieldAngle) * 46;
      Enemies.list.forEach(e => {
        if (Utils.dist(sx, sy, e.x, e.y) < e.radius + 14) {
          const died = Enemies.damage(e, dt * 40); // continuous shield damage
          if (died) killEnemy(e);
        }
      });
    }

    // projectile vs enemy collision
    projectiles.forEach(pr => {
      if (pr.pierceLeft <= 0) return;
      Enemies.list.forEach(e => {
        if (pr.hitSet.has(e)) return;
        if (Utils.dist(pr.x, pr.y, e.x, e.y) < e.radius + CFG.projectile.radius) {
          pr.hitSet.add(e);
          pr.pierceLeft -= 1;
          const died = Enemies.damage(e, p.damage);
          Particles.burst(e.x, e.y, CFG.particles.hitCount, CFG.particles.colors);
          Particles.shake(e.isBoss ? CFG.screenShake.bossHitMagnitude : CFG.screenShake.hitMagnitude);
          Sfx.play("hit");
          if (died) killEnemy(e);
        }
      });
    });

    // enemies + enemy shots + player damage
    Enemies.update(dt, worldBounds, p.x, p.y, (dmg) => Player.takeDamage(dmg));
    Enemies.enemyShots.forEach(s => {
      if (Utils.dist(s.x, s.y, p.x, p.y) < p.radius + s.radius) {
        Player.takeDamage(s.dmg);
        Enemies.removeShot(s);
      }
    });

    // xp orb magnet + pickup
    xpOrbs.forEach(orb => {
      const d = Utils.dist(orb.x, orb.y, p.x, p.y);
      if (d < p.magnet) {
        const a = Utils.angleTo(orb.x, orb.y, p.x, p.y);
        orb.x += Math.cos(a) * 340 * dt;
        orb.y += Math.sin(a) * 340 * dt;
      }
      if (d < p.radius + orb.radius + 4) {
        Player.gainXp(orb.value, onLevelUp);
        Sfx.play("pickup");
        orb.dead = true;
      }
    });
    xpOrbs = xpOrbs.filter(o => !o.dead);

    Particles.update(dt);

    UI.flashBossWarning(Enemies.bossActive);

    UI.updateHud({
      hp: p.hp, maxHp: p.maxHp, xp: p.xp, xpToNext: p.xpToNext,
      level: p.level, score, wave: Enemies.currentWave(), time: runTime,
      combo: comboMultiplier
    });
  }

  function killEnemy(e) {
    Enemies.remove(e);
    addScore(e.score);
    spawnXpOrb(e.x, e.y, e.xp);
    Particles.burst(e.x, e.y, e.isBoss ? 40 : CFG.particles.deathCount, CFG.particles.colors);
    Particles.floatText(e.x, e.y - 20, `+${e.score}`, "#FFD166", e.isBoss ? 22 : 14);
    Particles.shake(e.isBoss ? 14 : CFG.screenShake.deathMagnitude);
    Sfx.play("enemyDeath");
    if (e.isBoss) Sfx.play("levelUp");
  }

  function onLevelUp(level) {
    Sfx.play("levelUp");
    paused = true;
    const choices = Upgrades.rollChoices(Player.state, CFG.upgrades.choicesPerLevelUp);
    UI.renderUpgradeChoices(choices, (choice) => {
      Upgrades.apply(choice, Player.state);
      paused = false;
      UI.showScreen(null);
      lastTs = performance.now();
    });
  }

  function endRun() {
    running = false;
    Sfx.play("gameOver");
    const hs = Leaderboard.isHighScore(score);
    UI.showGameOver({ score, wave: Enemies.currentWave(), isHighScore: hs });
  }

  function draw() {
    ctx.save();
    const shakeOff = Particles.getShakeOffset();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background — layered nebula instead of a flat gradient
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 50,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
    );
    grad.addColorStop(0, CFG.world.bgColor2);
    grad.addColorStop(1, CFG.world.bgColor1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // real tiled floor texture, drawn under the neon atmosphere so the sci-fi
    // wash/grid/vignette still do the mood-setting on top of it
    if (!bgPattern && Assets.isReady("backgroundTile")) {
      bgPattern = ctx.createPattern(Assets.get("backgroundTile"), "repeat");
    }
    if (bgPattern) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = bgPattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // soft color-wash blobs for depth (very cheap, no images)
    const wash1 = ctx.createRadialGradient(canvas.width * 0.18, canvas.height * 0.15, 0, canvas.width * 0.18, canvas.height * 0.15, canvas.width * 0.5);
    wash1.addColorStop(0, "rgba(124,247,255,0.06)");
    wash1.addColorStop(1, "rgba(124,247,255,0)");
    ctx.fillStyle = wash1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const wash2 = ctx.createRadialGradient(canvas.width * 0.85, canvas.height * 0.9, 0, canvas.width * 0.85, canvas.height * 0.9, canvas.width * 0.5);
    wash2.addColorStop(0, "rgba(255,107,213,0.05)");
    wash2.addColorStop(1, "rgba(255,107,213,0)");
    ctx.fillStyle = wash2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // twinkling starfield
    const t = runTime;
    stars.forEach(s => {
      const a = s.a * (0.6 + 0.4 * Math.sin(t * s.tw + s.x));
      ctx.globalAlpha = a;
      ctx.fillStyle = "#cfeaff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.translate(shakeOff.x, shakeOff.y);

    // grid
    ctx.strokeStyle = CFG.world.gridColor;
    ctx.lineWidth = 1;
    const g = CFG.world.gridSize;
    for (let x = 0; x < canvas.width; x += g) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += g) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // xp orbs — small glow behind each so pickups pop against the dark bg
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    xpOrbs.forEach(o => {
      const og = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 14);
      og.addColorStop(0, "rgba(124,247,255,0.5)");
      og.addColorStop(1, "rgba(124,247,255,0)");
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(o.x, o.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.font = "20px serif";
      ctx.fillText(CFG.xpOrb.emoji, o.x, o.y);
    });

    // projectiles — motion trail + glow core reads much better than a flat emoji
    projectiles.forEach(pr => {
      const angle = Math.atan2(pr.vy, pr.vx);
      const tailX = pr.x - Math.cos(angle) * 16;
      const tailY = pr.y - Math.sin(angle) * 16;
      const trail = ctx.createLinearGradient(tailX, tailY, pr.x, pr.y);
      trail.addColorStop(0, "rgba(124,247,255,0)");
      trail.addColorStop(1, "rgba(124,247,255,0.8)");
      ctx.strokeStyle = trail;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(pr.x, pr.y);
      ctx.stroke();

      const pglow = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 10);
      pglow.addColorStop(0, "rgba(255,255,255,0.9)");
      pglow.addColorStop(1, "rgba(124,247,255,0)");
      ctx.fillStyle = pglow;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 10, 0, Math.PI * 2); ctx.fill();
    });

    Enemies.draw(ctx);
    Player.draw(ctx);
    Particles.draw(ctx);

    ctx.restore();

    // vignette on top of everything for cinematic framing
    const vgn = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.4,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75
    );
    vgn.addColorStop(0, "rgba(0,0,0,0)");
    vgn.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vgn;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- wire up screens / buttons ----
  function initMenus() {
    UI.$("playBtn").addEventListener("click", startGame);
    UI.$("restartBtn").addEventListener("click", () => {
      const nameInput = UI.$("nameInput");
      if (UI.$("nameEntryRow").style.display !== "none" && nameInput.value.trim()) {
        Leaderboard.save(nameInput.value.trim(), score, Enemies.currentWave());
      }
      startGame();
    });
    UI.$("submitScoreBtn").addEventListener("click", () => {
      const nameInput = UI.$("nameInput");
      Leaderboard.save(nameInput.value.trim() || "YOU", score, Enemies.currentWave());
      UI.$("nameEntryRow").style.display = "none";
      UI.renderLeaderboard(Leaderboard.getAll());
    });
    UI.$("viewLeaderboardBtn").addEventListener("click", () => {
      UI.renderLeaderboard(Leaderboard.getAll());
      UI.showScreen("leaderboardScreen");
    });
    UI.$("leaderboardBackBtn").addEventListener("click", () => UI.showScreen("startScreen"));
    UI.$("gameOverLeaderboardBtn").addEventListener("click", () => {
      UI.renderLeaderboard(Leaderboard.getAll());
      UI.showScreen("leaderboardScreen");
    });
    UI.$("pauseBtn").addEventListener("click", () => {
      if (!running) return;
      paused = !paused;
      UI.showScreen(paused ? "pauseScreen" : null);
      if (!paused) lastTs = performance.now();
    });
    UI.$("resumeBtn").addEventListener("click", () => {
      paused = false;
      UI.showScreen(null);
      lastTs = performance.now();
    });
    UI.$("quitBtn").addEventListener("click", () => {
      running = false;
      paused = false;
      UI.showScreen("startScreen");
    });
    UI.$("muteBtn").addEventListener("click", () => {
      const next = !Sfx.isMuted();
      Sfx.setMuted(next);
      UI.setMuteIcon(next);
    });

    UI.setMuteIcon(Sfx.isMuted());
    Input.initJoystick(UI.$("joyZone"), UI.$("joyStick"));
    UI.showScreen("startScreen");
  }

  document.addEventListener("DOMContentLoaded", initMenus);
})();
