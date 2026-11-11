import { STATIONS } from '../content/hajj.js';
import * as tawaf from '../stations/tawaf.js';
import * as miqat from '../stations/miqat.js';
import * as sai from '../stations/sai.js';
import * as mina from '../stations/mina.js';
import * as arafat from '../stations/arafat.js';
import * as muzdalifa from '../stations/muzdalifa.js';
import * as jamarat from '../stations/jamarat.js';
import * as info from '../stations/info.js';

// Neue Stationen hier eintragen, sobald die Datei in src/stations/ existiert.
const IMPL = { tawaf, miqat, sai, mina, arafat, muzdalifa, jamarat };

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
