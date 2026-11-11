import { ENDING } from '../content/hajj.js';
import { buildKaaba } from '../world/kaaba.js';
import { buildHaram } from '../world/haram.js';
import { SUNNAH_LIST } from '../core/kit.js';

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
  sky.setHour(5.9);
  sky.state.artificial = 1;
  buildKaaba(engine.world);
  const { glow } = buildHaram(engine.world);
  ui.el.day.textContent = 'Abgeschlossen';
  ui.el.title.textContent = 'Hadsch mabrur';
  const pf = ctx.profile || {};
  ui.goal(null); ui.hold(null);
  ui.el.stick.classList.add('off');
  const done = SUNNAH_LIST.filter(([k]) => ctx.progress.sunnah.has(k));
  ui.counter(`Sunnah: ${done.length} von ${SUNNAH_LIST.length}`);
  ui.el.panel.classList.remove('collapsed');
  ui.info(`${ui.prayer(ENDING)}
    <div class="cert"><div class="k">Urkunde</div><b>${pf.name || 'Du'}</b>${pf.age ? ` (${pf.age >= 18 ? '18+' : pf.age} Jahre)` : ''} ${pf.name ? 'hat' : 'hast'} alle 12 Stationen des Hadsch-Pfads geschafft.</div>
    ${ctx.progress.quizN ? `<p><b>Quiz:</b> ${ctx.progress.quizOk} von ${ctx.progress.quizN} Fragen beim ersten Versuch richtig ${ctx.progress.quizOk === ctx.progress.quizN ? '– hervorragend!' : ''}</p>` : ''}
    <ul class="sunnah-list">${SUNNAH_LIST.map(([k, label]) => `<li class="${ctx.progress.sunnah.has(k) ? 'ok' : ''}">${ctx.progress.sunnah.has(k) ? '✓' : '○'} ${label}</li>`).join('')}</ul>
    <p class="tr">Gezählt wird nur, was du wirklich getan hast – Sunnah ist freiwillig.</p>`);
  ui.actions([{ label: 'Nochmal spielen', kind: 'primary', onClick: () => location.reload() }]);
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const m of glow) m.emissiveIntensity = sky.art * 0.55;
      engine.camera.position.set(Math.cos(t * 0.04) * 60, 24, Math.sin(t * 0.04) * 60);
      engine.camera.lookAt(0, 8, 0);
    },
  };
}
