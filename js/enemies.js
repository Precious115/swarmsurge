/* ============================================================
   ENEMIES.JS — Enemy spawning, AI, drawing, and enemy projectiles
   (ranged "ghost" type). Owns its own arrays; game.js only calls
   the functions below and reads Enemies.list for collision checks.
   ============================================================ */
window.Enemies = (function () {
  let list = [];
  let enemyShots = [];
  let spawnTimer = 0;
  let wave = 1;
  let waveTimer = 0;
  let bossActive = false;

  function reset() {
    list = []; enemyShots = []; spawnTimer = 0; wave = 1; waveTimer = 0; bossActive = false;
  }

  function currentWave() { return wave; }

  function spawnIntervalForWave(w) {
    const v = CFG.waves.spawnIntervalStart - (w - 1) * CFG.waves.spawnIntervalDecayPerWave;
    return Math.max(CFG.waves.spawnIntervalMin, v);
  }

  function spawnCountForWave(w) {
    return 1 + Math.floor((w - 1) * CFG.waves.enemiesPerSpawnGrowth);
  }

  function spawnOne(bounds, playerX, playerY) {
    const typeKey = Utils.weightedPick(CFG.enemyTypes);
    const t = CFG.enemyTypes[typeKey];
    // Spawn just outside the visible bounds, in a ring around the player
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = Utils.rand(520, 680);
    const x = Utils.clamp(playerX + Math.cos(angle) * spawnDist, bounds.minX - 60, bounds.maxX + 60);
    const y = Utils.clamp(playerY + Math.sin(angle) * spawnDist, bounds.minY - 60, bounds.maxY + 60);

    const scale = 1 + (wave - 1) * 0.12;
    list.push({
      type: typeKey,
      x, y,
      hp: t.hp * scale,
      maxHp: t.hp * scale,
      speed: t.speed,
      dmg: t.dmg,
      radius: t.radius,
      score: t.score,
      xp: t.xp,
      emoji: t.emoji,
      ranged: !!t.ranged,
      shootInterval: t.shootInterval || null,
      shootCd: t.shootInterval ? Utils.rand(0.3, t.shootInterval) : null,
      shotSpeed: t.shotSpeed || null,
      shotDmg: t.shotDmg || null,
      isBoss: false,
      hitFlash: 0,
      facingRight: true
    });
  }

  function spawnBoss(bounds, playerX, playerY) {
    const b = CFG.bossTypes;
    const angle = Math.random() * Math.PI * 2;
    const x = playerX + Math.cos(angle) * 600;
    const y = playerY + Math.sin(angle) * 600;
    const hp = b.hpBase + b.hpPerWave * (wave - 1);
    list.push({
      type: "boss",
      x, y, hp, maxHp: hp,
      speed: b.speed, dmg: b.dmg, radius: b.radius,
      score: b.scoreBase + wave * 40,
      xp: b.xpBase + wave * 3,
      emoji: b.emoji,
      ranged: false,
      isBoss: true,
      hitFlash: 0,
      facingRight: true
    });
    bossActive = true;
    Sfx.play("bossWarn");
  }

  function update(dt, bounds, playerX, playerY, onPlayerHit) {
    waveTimer += dt;
    if (waveTimer >= CFG.waves.waveDuration) {
      waveTimer = 0;
      wave += 1;
      Sfx.play("waveStart");
      if (wave % CFG.waves.bossEveryNWaves === 0 && !bossActive) {
        spawnBoss(bounds, playerX, playerY);
      }
    }

    if (!bossActive || list.some(e => !e.isBoss)) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = spawnIntervalForWave(wave);
        const n = spawnCountForWave(wave);
        for (let i = 0; i < n; i++) spawnOne(bounds, playerX, playerY);
      }
    }

    list.forEach(e => {
      const a = Utils.angleTo(e.x, e.y, playerX, playerY);
      const d = Utils.dist(e.x, e.y, playerX, playerY);
      e.facingRight = Math.cos(a) >= 0;

      if (e.ranged && d < 480) {
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = e.shootInterval;
          enemyShots.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * e.shotSpeed,
            vy: Math.sin(a) * e.shotSpeed,
            dmg: e.shotDmg, life: 3, radius: 7
          });
        }
        if (d < 220) {
          // keep distance
          e.x -= Math.cos(a) * e.speed * dt * 0.6;
          e.y -= Math.sin(a) * e.speed * dt * 0.6;
        }
      } else {
        e.x += Math.cos(a) * e.speed * dt;
        e.y += Math.sin(a) * e.speed * dt;
      }

      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (d < e.radius + 18) {
        onPlayerHit(e.dmg);
      }
    });

    enemyShots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; });
    const before = enemyShots.length;
    enemyShots = enemyShots.filter(s => s.life > 0);

    // enemy shot hitting player handled in game.js via getEnemyShots + damage check
  }

  function damage(enemy, amount) {
    enemy.hp -= amount;
    enemy.hitFlash = 0.1;
    if (enemy.hp <= 0) {
      if (enemy.isBoss) bossActive = false;
      return true; // died
    }
    return false;
  }

  function remove(enemy) {
    const i = list.indexOf(enemy);
    if (i >= 0) list.splice(i, 1);
  }

  function removeShot(shot) {
    const i = enemyShots.indexOf(shot);
    if (i >= 0) enemyShots.splice(i, 1);
  }

  const GLOW_COLOR = {
    grunt: "rgba(139,255,155,0.32)",
    bat: "rgba(200,140,255,0.32)",
    tank: "rgba(255,150,90,0.32)",
    ghost: "rgba(160,200,255,0.32)",
    boss: "rgba(255,107,213,0.4)"
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(ctx) {
    list.forEach(e => {
      ctx.save();

      // Ground shadow for depth
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.radius * 0.75, e.radius * 0.7, e.radius * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Type-tinted glow so silhouettes read even at a glance / on stream
      const glowR = e.radius * (e.isBoss ? 1.7 : 1.9);
      const glow = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, glowR);
      glow.addColorStop(0, GLOW_COLOR[e.type] || "rgba(255,255,255,0.25)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (e.hitFlash > 0) {
        ctx.filter = "brightness(2.2) saturate(0.3)";
      }

      const img = Assets.get(e.type);
      if (img) {
        const targetH = e.radius * 2.6;
        const scale = targetH / img.height;
        const dw = img.width * scale, dh = img.height * scale;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (!e.facingRight) ctx.scale(-1, 1);
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        ctx.font = `${e.radius * 2}px serif`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(e.emoji, e.x, e.y);
      }
      ctx.filter = "none";
      ctx.restore();

      // HP bar for tanky/boss enemies
      if (e.isBoss || e.maxHp > 30) {
        const w = e.radius * 1.8;
        const barX = e.x - w / 2, barY = e.y - e.radius - 12, barH = 6;
        const pct = Utils.clamp(e.hp / e.maxHp, 0, 1);
        ctx.save();
        roundRect(ctx, barX, barY, w, barH, 3);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fill();
        if (pct > 0) {
          ctx.save();
          roundRect(ctx, barX, barY, Math.max(barH, w * pct), barH, 3);
          ctx.clip();
          ctx.fillStyle = e.isBoss ? "#FF6BD5" : "#8BFF9B";
          ctx.fillRect(barX, barY, w * pct, barH);
          ctx.restore();
        }
        ctx.restore();
      }
    });

    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    enemyShots.forEach(s => ctx.fillText("🔮", s.x, s.y));
  }

  return {
    reset, update, draw, damage, remove, removeShot,
    get list() { return list; },
    get enemyShots() { return enemyShots; },
    currentWave, get bossActive() { return bossActive; }
  };
})();
