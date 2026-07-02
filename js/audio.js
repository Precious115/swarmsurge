/* ============================================================
   AUDIO.JS — Procedural sound effects via WebAudio.
   No external sound files. Completely independent module:
   exposes Audio1.play('shoot') etc. If this file is deleted,
   the rest of the game keeps working (calls are wrapped safely).
   ============================================================ */
window.Sfx = (function () {
  let ctx = null;
  let muted = false;

  try {
    muted = localStorage.getItem(CFG.storageKeys.muted) === "1";
  } catch (e) {}

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  // Resume audio on first user gesture (required by mobile browsers / CrazyGames requirement)
  ["touchend", "click", "keydown"].forEach(evt => {
    window.addEventListener(evt, () => { ensureCtx(); }, { once: false, passive: true });
  });

  function tone({ freq = 440, type = "sine", duration = 0.1, volume = 0.15, slideTo = null }) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration + 0.02);
  }

  const sounds = {
    shoot: () => tone({ freq: 720, type: "triangle", duration: 0.06, volume: 0.06, slideTo: 900 }),
    hit: () => tone({ freq: 220, type: "square", duration: 0.07, volume: 0.08, slideTo: 120 }),
    enemyDeath: () => tone({ freq: 340, type: "sawtooth", duration: 0.12, volume: 0.09, slideTo: 90 }),
    playerHurt: () => tone({ freq: 160, type: "sawtooth", duration: 0.18, volume: 0.14, slideTo: 60 }),
    pickup: () => tone({ freq: 900, type: "sine", duration: 0.08, volume: 0.07, slideTo: 1400 }),
    levelUp: () => {
      tone({ freq: 523, type: "sine", duration: 0.12, volume: 0.12 });
      setTimeout(() => tone({ freq: 659, type: "sine", duration: 0.12, volume: 0.12 }), 90);
      setTimeout(() => tone({ freq: 784, type: "sine", duration: 0.2, volume: 0.14 }), 180);
    },
    waveStart: () => tone({ freq: 200, type: "square", duration: 0.25, volume: 0.1, slideTo: 400 }),
    bossWarn: () => tone({ freq: 100, type: "sawtooth", duration: 0.5, volume: 0.16, slideTo: 70 }),
    gameOver: () => {
      tone({ freq: 300, type: "sawtooth", duration: 0.3, volume: 0.14, slideTo: 80 });
      setTimeout(() => tone({ freq: 200, type: "sawtooth", duration: 0.4, volume: 0.14, slideTo: 50 }), 200);
    }
  };

  function play(name) {
    try { if (sounds[name]) sounds[name](); } catch (e) {}
  }

  function setMuted(v) {
    muted = v;
    try { localStorage.setItem(CFG.storageKeys.muted, v ? "1" : "0"); } catch (e) {}
  }
  function isMuted() { return muted; }

  return { play, setMuted, isMuted };
})();
