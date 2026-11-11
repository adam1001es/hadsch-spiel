// Eingabe für Smartphone, Tablet und Laptop.
// - Linke Bildschirmhälfte: virtueller Joystick (erscheint dort, wo der Daumen aufsetzt) → s.move {x, y}
// - Rechte Hälfte / Maus ziehen: Umschauen → s.yaw, s.pitch
// - Kurzes Tippen: s.onTap(x, y)
// - Wurf-Modus (s.mode = 'throw'): Ziehen auf der rechten Hälfte = zurückziehen wie eine Schleuder, Loslassen = Wurf
// - Tastatur: WASD / Pfeiltasten = Gehen, Umschalt = zügig gehen, Q/E = Kamera drehen
// - Halte-Knopf (#hold) für Handlungen, die Zeit brauchen (Gebet, Dua, Schlafen): s.holding
export function createInput(canvas, holdBtn, stickEl) {
  const s = {
    holding: false, yaw: 0, pitch: 0, onTap: null,
    move: { x: 0, y: 0 }, fast: false, stick: true,
    mode: 'look', aim: null, onThrow: null,
  };
  const keys = new Set();
  const knob = stickEl.querySelector('i');
  let stick = null, look = null;
  const R = 52;

  function showStick(x, y) {
    stickEl.style.left = x + 'px'; stickEl.style.top = y + 'px';
    stickEl.classList.add('on');
  }
  function hideStick() {
    stickEl.classList.remove('on');
    stickEl.style.left = ''; stickEl.style.top = '';
    knob.style.transform = '';
  }

  canvas.addEventListener('pointerdown', (e) => {
    const left = e.clientX < window.innerWidth * 0.5 && e.pointerType !== 'mouse'; // Joystick nur bei Touch
    if (left && s.stick && !stick) {
      stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
      showStick(e.clientX, e.clientY);
    } else if (!look) {
      look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
      if (s.mode === 'throw') s.aim = { dx: 0, dy: 0 };
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (stick && stick.id === e.pointerId) {
      let dx = e.clientX - stick.x, dy = e.clientY - stick.y;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      s.move.x = dx / R; s.move.y = dy / R;
      s.fast = l > R * 1.25;
    } else if (look && look.id === e.pointerId) {
      if (s.mode === 'throw') {
        s.aim = { dx: e.clientX - look.sx, dy: e.clientY - look.sy };
      } else {
        s.yaw -= (e.clientX - look.x) * 0.006;
        s.pitch = Math.max(-0.5, Math.min(0.9, s.pitch + (e.clientY - look.y) * 0.004));
      }
      look.x = e.clientX; look.y = e.clientY;
    }
  });

  const end = (e) => {
    if (stick && stick.id === e.pointerId) {
      stick = null; s.move.x = s.move.y = 0; s.fast = false; hideStick();
    } else if (look && look.id === e.pointerId) {
      const moved = Math.hypot(e.clientX - look.sx, e.clientY - look.sy);
      if (s.mode === 'throw' && s.aim && moved > 25 && e.type === 'pointerup') { s.onThrow?.(s.aim); }
      else if (moved < 10 && performance.now() - look.t < 450 && e.type === 'pointerup') s.onTap?.(e.clientX, e.clientY);
      s.aim = null;
      look = null;
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // Halte-Knopf
  const on = (e) => { if (holdBtn.hidden) return; s.holding = true; holdBtn.classList.add('on'); if (e?.pointerId != null) holdBtn.setPointerCapture?.(e.pointerId); };
  const off = () => { s.holding = false; holdBtn.classList.remove('on'); };
  holdBtn.addEventListener('pointerdown', on);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) holdBtn.addEventListener(ev, off);
  holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  // Tastatur
  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE'];
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.code === 'Space') { if (!holdBtn.hidden) { e.preventDefault(); on(); } return; }
    if (MOVE_KEYS.includes(e.code)) { keys.add(e.code); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') off();
    keys.delete(e.code);
  });
  window.addEventListener('blur', () => { keys.clear(); off(); });

  // Tastatur in s.move umrechnen (pro Frame aufrufen)
  s.update = (dt) => {
    if (keys.has('KeyQ')) s.yaw += dt * 1.8;
    if (keys.has('KeyE')) s.yaw -= dt * 1.8;
    if (stick) return;
    let x = 0, y = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (keys.has('KeyA')) x -= 1;
    if (keys.has('KeyD')) x += 1;
    // Pfeil links/rechts dreht die Kamera (bequemer am Laptop)
    if (keys.has('ArrowLeft')) s.yaw += dt * 1.8;
    if (keys.has('ArrowRight')) s.yaw -= dt * 1.8;
    const l = Math.hypot(x, y) || 1;
    s.move.x = x / l; s.move.y = y / l;
    s.fast = keys.has('ShiftLeft') || keys.has('ShiftRight');
  };

  s.reset = () => {
    s.yaw = 0; s.pitch = 0.15; s.onTap = null; s.onThrow = null; s.mode = 'look'; s.aim = null; s.stick = true;
    stick = null; look = null; s.move.x = s.move.y = 0; hideStick(); off();
  };
  return s;
}
