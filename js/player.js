/* ============================================================
   PLAYER.JS — Player state, movement, XP/leveling, drawing.
   Only touches its own object (Player.state). Other files read
   Player.state fields but never mutate them directly except via
   the functions exported here.
   ============================================================ */
window.Player = (function () {
  let state = null;

  function init() {
    const c = CFG.player;
    state = {
      x: 0, y: 0,
      hp: c.baseHp, maxHp: c.baseHp,
      speed: c.baseSpeed,
      fireRate: c.baseFireRate,
      fireCooldown: 0,
      damage: c.baseDamage,
      projectiles: c.baseProjectiles,
      pierce: c.basePierce,
      magnet: c.baseMagnet,
      radius: c.radius,
      level: 1,
      xp: 0,
      xpToNext: CFG.xpCurve(1),
      invuln: 0,
      regen: 0,
      facing: 0,
      facingRight: true,
      shield: false,   // orbiting shield upgrade
      shieldAngle: 0,
      alive: true
    };
    return state;
  }

  function respawnAt(x, y) { state.x = x; state.y = y; }

  function takeDamage(amount) {
    if (state.invuln > 0 || !state.alive) return false;
    state.hp -= amount;
    state.invuln = CFG.player.invulnAfterHit;
    Sfx.play("playerHurt");
    Particles.shake(CFG.screenShake.hitMagnitude);
    if (state.hp <= 0) {
      state.hp = 0;
      state.alive = false;
    }
    return true;
  }

  function heal(amount) {
    state.hp = Utils.clamp(state.hp + amount, 0, state.maxHp);
  }

  function gainXp(amount, onLevelUp) {
    state.xp += amount;
    while (state.xp >= state.xpToNext) {
      state.xp -= state.xpToNext;
      state.level += 1;
      state.xpToNext = CFG.xpCurve(state.level);
      if (onLevelUp) onLevelUp(state.level);
    }
  }

  function update(dt, input, bounds) {
    if (!state.alive) return;

    // Movement from combined input vector (keyboard or joystick), normalized
    let mx = input.x, my = input.y;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }

    state.x += mx * state.speed * dt;
    state.y += my * state.speed * dt;
    state.x = Utils.clamp(state.x, bounds.minX, bounds.maxX);
    state.y = Utils.clamp(state.y, bounds.minY, bounds.maxY);

    if (len > 0.05) state.facing = Utils.angleTo(0, 0, mx, my);
    if (Math.abs(mx) > 0.2) state.facingRight = mx > 0;

    if (state.fireCooldown > 0) state.fireCooldown -= dt;
    if (state.invuln > 0) state.invuln -= dt;

    if (state.regen > 0) heal(state.regen * dt);

    state.shieldAngle += dt * 2.4;
  }

  function canFire() { return state.fireCooldown <= 0; }
  function resetFireCooldown() { state.fireCooldown = state.fireRate; }

  function draw(ctx) {
    if (!state.alive) return;
    ctx.save();
    ctx.globalAlpha = state.invuln > 0 ? (Math.floor(state.invuln * 20) % 2 === 0 ? 0.4 : 1) : 1;
    ctx.translate(state.x, state.y);

    // Ground shadow — gives the sprite weight/depth instead of floating flat
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, state.radius * 0.85, state.radius * 0.8, state.radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Glow aura — reads as "player-controlled hero" even before real art exists
    const glowR = state.radius * 2.1;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
    glow.addColorStop(0, "rgba(124,247,255,0.35)");
    glow.addColorStop(1, "rgba(124,247,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Facing indicator — small chevron so movement direction is always readable
    ctx.save();
    ctx.rotate(state.facing);
    ctx.fillStyle = "rgba(124,247,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(state.radius + 10, 0);
    ctx.lineTo(state.radius - 2, -6);
    ctx.lineTo(state.radius - 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Character body: real art if loaded, else emoji fallback (never blocks rendering)
    const img = Assets.get("player");
    if (img) {
      const targetH = state.radius * 2.6;
      const scale = targetH / img.height;
      const dw = img.width * scale, dh = img.height * scale;
      ctx.save();
      if (!state.facingRight) ctx.scale(-1, 1);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.font = `${state.radius * 2}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6;
      ctx.fillText(CFG.player.emoji, 0, 0);
    }
    ctx.restore();

    if (state.shield) {
      const sx = state.x + Math.cos(state.shieldAngle) * 46;
      const sy = state.y + Math.sin(state.shieldAngle) * 46;
      ctx.save();
      const sglow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 22);
      sglow.addColorStop(0, "rgba(140,255,180,0.5)");
      sglow.addColorStop(1, "rgba(140,255,180,0)");
      ctx.fillStyle = sglow;
      ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🛡️", sx, sy);
      ctx.restore();
    }
  }

  return { init, respawnAt, takeDamage, heal, gainXp, update, canFire, resetFireCooldown, draw, get state() { return state; } };
})();
