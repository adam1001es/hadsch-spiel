import { STATIONS } from '../content/hajj.js';
import * as tawaf from '../stations/tawaf.js';
import * as info from '../stations/info.js';

// Neue Stationen hier eintragen, sobald die Datei in src/stations/ existiert.
const IMPL = { tawaf };

export function createStations(ctx) {
  let current = null, index = -1;

  async function go(i) {
    await ctx.ui.fade(true);
    current?.dispose?.();
    ctx.engine.clearWorld();
    ctx.sky.reset();
    ctx.input.reset();
    ctx.ui.reset();
    index = i;
    if (i >= STATIONS.length) { current = info.ending(ctx); ctx.ui.fade(false); return; }
    const st = STATIONS[i];
    ctx.ui.station(i, STATIONS.length, st);
    const impl = IMPL[st.id] || info;
    current = impl.create(ctx, st);
    ctx.ui.fade(false);
  }

  ctx.next = () => go(index + 1);
  return {
    go,
    update(dt) { current?.update?.(dt); },
  };
}
