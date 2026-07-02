/* ============================================================
   CONFIG.JS — All tunable numbers live here.
   Change balance/values in this file only. Nothing else in the
   game reads raw numbers directly from other files, so editing
   this file cannot break enemies.js, player.js, etc.
   ============================================================ */
window.CFG = {
  world: {
    bgColor1: "#070912",
    bgColor2: "#0d1224",
    gridColor: "rgba(120,180,255,0.06)",
    gridSize: 64
  },

  player: {
    emoji: "🧑‍🚀",
    baseHp: 100,
    baseSpeed: 220,       // px/sec
    baseFireRate: 0.55,   // seconds between shots
    baseDamage: 10,
    baseProjectiles: 1,
    basePierce: 1,
    baseMagnet: 70,
    radius: 20,
    invulnAfterHit: 0.6
  },

  projectile: {
    emoji: "✦",
    speed: 520,
    radius: 8,
    life: 1.6
  },

  xpOrb: {
    emoji: "💠",
    radius: 8,
    valueBase: 5
  },

  // XP required to reach next level (index = level-1)
  xpCurve: (level) => Math.floor(20 + level * 18 + level * level * 2.2),

  waves: {
    // seconds per wave
    waveDuration: 25,
    // difficulty scaling
    spawnIntervalStart: 1.1,
    spawnIntervalMin: 0.22,
    spawnIntervalDecayPerWave: 0.07,
    enemiesPerSpawnGrowth: 0.12, // extra simultaneous spawns per wave
    bossEveryNWaves: 4
  },

  enemyTypes: {
    grunt:  { emoji: "👾", hp: 18,  speed: 70,  dmg: 8,  radius: 18, score: 10, xp: 1, weight: 55 },
    bat:    { emoji: "🦇", hp: 10,  speed: 150, dmg: 6,  radius: 15, score: 15, xp: 1, weight: 25 },
    tank:   { emoji: "🐗", hp: 70,  speed: 45,  dmg: 16, radius: 26, score: 30, xp: 3, weight: 12 },
    ghost:  { emoji: "👻", hp: 24,  speed: 90,  dmg: 10, radius: 20, score: 20, xp: 2, weight: 8,
              ranged: true, shootInterval: 1.8, shotSpeed: 220, shotDmg: 8 }
  },

  bossTypes: {
    emoji: "👹",
    hpBase: 400,
    hpPerWave: 220,
    speed: 55,
    dmg: 24,
    radius: 46,
    scoreBase: 500,
    xpBase: 30
  },

  particles: {
    hitCount: 6,
    deathCount: 14,
    colors: ["#7CF7FF", "#FF6BD5", "#FFD166", "#8BFF9B"]
  },

  screenShake: {
    hitMagnitude: 3,
    deathMagnitude: 6,
    bossHitMagnitude: 8
  },

  combo: {
    windowSeconds: 2.2,   // time since last kill before combo resets
    scorePerComboStep: 0.08 // +8% score per combo stack, capped
    ,maxMultiplier: 3.0
  },

  upgrades: {
    choicesPerLevelUp: 3
  },

  storageKeys: {
    leaderboard: "swarmsurge_leaderboard_v1",
    muted: "swarmsurge_muted_v1"
  }
};
