/* ============================================================
   INPUT.JS — Reads keyboard AND touch/mouse joystick, exposes a
   single Input.getVector() {x,y}. game.js and player.js never
   touch raw DOM events; if you need to add gamepad support later,
   only this file changes.
   ============================================================ */
window.Input = (function () {
  const keys = {};
  let joyActive = false;
  let joyVec = { x: 0, y: 0 };
  let joyOrigin = { x: 0, y: 0 };
  const JOY_RADIUS = 55;

  window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  function keyVector() {
    let x = 0, y = 0;
    if (keys["a"] || keys["arrowleft"]) x -= 1;
    if (keys["d"] || keys["arrowright"]) x += 1;
    if (keys["w"] || keys["arrowup"]) y -= 1;
    if (keys["s"] || keys["arrowdown"]) y += 1;
    return { x, y };
  }

  function initJoystick(zoneEl, stickEl) {
    function start(clientX, clientY) {
      joyActive = true;
      const rect = zoneEl.getBoundingClientRect();
      joyOrigin = { x: clientX, y: clientY };
      stickEl.style.left = `${clientX - rect.left}px`;
      stickEl.style.top = `${clientY - rect.top}px`;
      zoneEl.classList.add("joy-visible");
    }
    function move(clientX, clientY) {
      if (!joyActive) return;
      let dx = clientX - joyOrigin.x;
      let dy = clientY - joyOrigin.y;
      const d = Math.hypot(dx, dy);
      const clamped = Math.min(d, JOY_RADIUS);
      const angle = Math.atan2(dy, dx);
      const sx = Math.cos(angle) * clamped;
      const sy = Math.sin(angle) * clamped;
      const rect = zoneEl.getBoundingClientRect();
      stickEl.style.left = `${(joyOrigin.x - rect.left) + sx}px`;
      stickEl.style.top = `${(joyOrigin.y - rect.top) + sy}px`;
      joyVec = { x: sx / JOY_RADIUS, y: sy / JOY_RADIUS };
    }
    function end() {
      joyActive = false;
      joyVec = { x: 0, y: 0 };
      zoneEl.classList.remove("joy-visible");
    }

    zoneEl.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      start(t.clientX, t.clientY);
    }, { passive: false });
    zoneEl.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      move(t.clientX, t.clientY);
    }, { passive: false });
    zoneEl.addEventListener("touchend", (e) => { e.preventDefault(); end(); }, { passive: false });
    zoneEl.addEventListener("touchcancel", (e) => { e.preventDefault(); end(); }, { passive: false });

    // Mouse fallback so desktop users can also drag the on-screen stick
    let mouseDown = false;
    zoneEl.addEventListener("mousedown", (e) => { mouseDown = true; start(e.clientX, e.clientY); });
    window.addEventListener("mousemove", (e) => { if (mouseDown) move(e.clientX, e.clientY); });
    window.addEventListener("mouseup", () => { if (mouseDown) { mouseDown = false; end(); } });
  }

  function getVector() {
    const kv = keyVector();
    if (kv.x !== 0 || kv.y !== 0) return kv;
    return joyVec;
  }

  return { initJoystick, getVector };
})();
