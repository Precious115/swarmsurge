/* ============================================================
   UPGRADES.JS — Defines the upgrade pool and applies effects to
   Player.state. To add a new upgrade, add one entry to POOL; no
   other file needs to change.
   ============================================================ */
window.Upgrades = (function () {
  const POOL = [
    {
      id: "damage", name: "Overcharged Rounds", icon: "💥",
      desc: "+30% projectile damage",
      apply: (s) => { s.damage = Math.round(s.damage * 1.3); }
    },
    {
      id: "firerate", name: "Rapid Fire", icon: "⚡",
      desc: "+20% fire rate",
      apply: (s) => { s.fireRate = Math.max(0.08, s.fireRate * 0.8); }
    },
    {
      id: "multishot", name: "Split Shot", icon: "🔱",
      desc: "+1 projectile",
      apply: (s) => { s.projectiles += 1; }
    },
    {
      id: "pierce", name: "Piercing Rounds", icon: "🎯",
      desc: "+1 pierce (hit more enemies per shot)",
      apply: (s) => { s.pierce += 1; }
    },
    {
      id: "speed", name: "Jet Boots", icon: "👟",
      desc: "+15% move speed",
      apply: (s) => { s.speed = Math.round(s.speed * 1.15); }
    },
    {
      id: "maxhp", name: "Reinforced Suit", icon: "🦺",
      desc: "+25 max HP and heal to full",
      apply: (s) => { s.maxHp += 25; s.hp = s.maxHp; }
    },
    {
      id: "magnet", name: "XP Magnet", icon: "🧲",
      desc: "+40% pickup radius",
      apply: (s) => { s.magnet = Math.round(s.magnet * 1.4); }
    },
    {
      id: "regen", name: "Nano Regen", icon: "💚",
      desc: "Regenerate 1 HP/sec",
      apply: (s) => { s.regen += 1; }
    },
    {
      id: "shield", name: "Orbit Shield", icon: "🛡️",
      desc: "A shield orbits you, damaging enemies it touches",
      apply: (s) => { s.shield = true; },
      // Only offer once
      once: true
    }
  ];

  function rollChoices(playerState, count) {
    let candidates = POOL.filter(u => !(u.once && playerState[u.id + "Taken"]));
    const picks = [];
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) picks.push(shuffled[i]);
    return picks;
  }

  function apply(upgrade, playerState) {
    upgrade.apply(playerState);
    if (upgrade.once) playerState[upgrade.id + "Taken"] = true;
  }

  return { rollChoices, apply };
})();
