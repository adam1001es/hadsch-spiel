// Touch-Eingabe: Halte-Knopf (Gehen), Wischen auf dem Canvas (Kamera), kurzes Tippen (onTap).
export function createInput(canvas, holdBtn) {
  const s = { holding: false, yaw: 0, pitch: 0, onTap: null };
  let drag = null;

  canvas.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    s.yaw -= (e.clientX - drag.x) * 0.006;
    s.pitch = Math.max(-0.6, Math.min(0.8, s.pitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    if (moved < 10 && performance.now() - drag.t < 400 && s.onTap) s.onTap(e.clientX, e.clientY);
    drag = null;
  });

  const on = (e) => { s.holding = true; holdBtn.classList.add('on'); if (e) holdBtn.setPointerCapture?.(e.pointerId); };
  const off = () => { s.holding = false; holdBtn.classList.remove('on'); };
  holdBtn.addEventListener('pointerdown', on);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) holdBtn.addEventListener(ev, off);
  holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => { if (!holdBtn.hidden && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); on(); } });
  window.addEventListener('keyup', (e) => { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) off(); });

  s.reset = () => { s.yaw = 0; s.pitch = 0; s.onTap = null; off(); };
  return s;
}
