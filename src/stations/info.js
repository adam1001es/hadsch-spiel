import { ENDING } from '../content/hajj.js';

// Platzhalter für Stationen, die noch nicht gebaut sind: zeigt Text und Schritte, dann "Weiter".
// Claude Code ersetzt jede Station durch eine eigene Datei (siehe CLAUDE.md).
export function create(ctx, st) {
  const { ui, sky, engine } = ctx;
  sky.setHour(st.hour ?? 14);
  let i = 0;
  const steps = st.steps || [];
  const show = () => {
    ui.info(`<p>${st.intro}</p><p class="tr">Diese Station ist noch in Arbeit.</p>`);
    if (i < steps.length) ui.actions([{ label: steps[i], kind: 'primary', onClick: () => { ui.toast(steps[i] + ' ✓'); i++; show(); } }]);
    else ui.actions([{ label: 'Weiter', kind: 'primary', onClick: ctx.next }]);
  };
  show();
  let t = 0;
  return { update(dt) { t += dt; engine.camera.position.set(Math.cos(t * 0.03) * 40, 25, Math.sin(t * 0.03) * 40); engine.camera.lookAt(0, 0, 0); } };
}

export function ending(ctx) {
  const { ui, sky, engine } = ctx;
  sky.setHour(5.8);
  ui.el.day.textContent = 'Abgeschlossen';
  ui.el.title.textContent = 'Hadsch mabrur';
  ui.info(ui.prayer(ENDING));
  ui.actions([{ label: 'Nochmal spielen', kind: 'primary', onClick: () => location.reload() }]);
  return { update() { engine.camera.position.set(0, 30, 60); engine.camera.lookAt(0, 0, 0); } };
}
