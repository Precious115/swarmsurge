/* ============================================================
   PARTICLES.JS — Visual juice: hit sparks, death bursts, screen
   shake, floating combat text. Independent system: game.js just
   calls Particles.burst(...) / Particles.shake(...) / Particles.
   floatText(...) and draws via Particles.draw(ctx). Deleting this
   file only removes visual flair, nothing else breaks.
   ============================================================ */
window.Particles = (function () {
  let list = [];
  let texts = [];
  let shakeTime = 0;
  let shakeMag = 0;

  function burst(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = Utils.rand(60, 260);
      list.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: Utils.rand(0.25, 0.55),
        age: 0,
        size: Utils.rand(2, 5),
        color: colors[Utils.randInt(0, colors.length - 1)]
      });
    }
  }

  function floatText(x, y, text, color = "#fff", size = 16) {
    texts.push({ x, y, text, color, size, age: 0, life: 0.8, vy: -40 });
  }

  function shake(mag) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTime = 0.18;
  }

  function getShakeOffset() {
    if (shakeTime <= 0) return { x: 0, y: 0 };
    return {
      x: Utils.rand(-shakeMag, shakeMag),
      y: Utils.rand(-shakeMag, shakeMag)
    };
  }

  function update(dt) {
    list.forEach(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; });
    list = list.filter(p => p.age < p.life);

    texts.forEach(t => { t.age += dt; t.y += t.vy * dt; t.vy *= 0.9; });
    texts = texts.filter(t => t.age < t.life);

    if (shakeTime > 0) { shakeTime -= dt; if (shakeTime <= 0) shakeMag = 0; }
  }

  function draw(ctx) {
    list.forEach(p => {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    texts.forEach(t => {
      const alpha = 1 - t.age / t.life;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `bold ${t.size}px 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;
  }

  function reset() { list = []; texts = []; shakeTime = 0; shakeMag = 0; }

  return { burst, floatText, shake, getShakeOffset, update, draw, reset };
})();
