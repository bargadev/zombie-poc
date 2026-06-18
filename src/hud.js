// All DOM/HUD glue lives here so the game modules never touch the document
// directly.
const el = (id) => document.getElementById(id);

export const ui = {
  hud: el('hud'), overlay: el('overlay'), startBtn: el('start-btn'),
  wave: el('wave'), score: el('score'), remaining: el('remaining'),
  healthFill: el('health-fill'), ammo: el('ammo'), ammoMax: el('ammo-max'),
  reloadHint: el('reload-hint'), toast: el('toast'), hitflash: el('hitflash'),
  weaponName: el('weapon-name'),
  weaponMenu: el('weapon-menu'), weaponGrid: el('weapon-grid'),
  panel: document.querySelector('.panel'), overlaySub: el('overlay-sub'),
  perfFps: el('perf-fps'),
};

// Smoothed FPS readout, throttled to ~4 Hz so the DOM write isn't itself a cost.
let _fps = 60, _acc = 0;
export function setPerf(rawDt, dt) {
  if (!ui.perfFps) return;                 // never let a missing element kill the loop
  _fps += (1 / Math.max(rawDt, 1e-4) - _fps) * 0.1;
  _acc += dt;
  if (_acc < 0.25) return;
  _acc = 0;
  const v = Math.round(_fps);
  ui.perfFps.textContent = v;
  ui.perfFps.style.color = v >= 50 ? 'var(--green)' : v >= 30 ? '#e8d24a' : '#e0564a';
}

let toastT = 0;
export function toast(msg, dur = 1.6) { ui.toast.textContent = msg; ui.toast.classList.add('show'); toastT = dur; }
export function tickToast(dt) { if (toastT > 0) { toastT -= dt; if (toastT <= 0) ui.toast.classList.remove('show'); } }

export function setHealth(v) { ui.healthFill.style.width = Math.max(0, v) + '%'; }
export function setScore(v) { ui.score.textContent = v; }
export function setWave(v) { ui.wave.textContent = v; }
export function setRemaining(v) { ui.remaining.textContent = v; }

export function setAmmo(w) { ui.ammo.textContent = w.ammo; ui.ammoMax.textContent = w.mag; }
export function setWeaponName(name) { ui.weaponName.textContent = name; }
export function setReloadHint(on) { ui.reloadHint.classList.toggle('hidden', !on); }

export function hitFlash() {
  ui.hitflash.classList.add('show');
  setTimeout(() => ui.hitflash.classList.remove('show'), 90);
}

export function showHud(on) { ui.hud.classList.toggle('hidden', !on); }
export function showOverlay(on) { ui.overlay.classList.toggle('hidden', !on); }

// --- weapon picker (B) ---
export function buildWeaponMenu(weapons, onPick) {
  ui.weaponGrid.innerHTML = '';
  weapons.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'weapon-card';
    b.innerHTML = `<span class="wk-key">${i + 1}</span>
      <span class="wk-name">${w.name}</span>
      <span class="wk-stat">DANO ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} · PENTE ${w.mag}</span>
      <span class="wk-stat">${w.auto ? 'AUTO' : 'SEMI'} · ${w.cooldown <= 0.1 ? 'RÁPIDO' : 'LENTO'}</span>`;
    b.addEventListener('click', () => onPick(i));
    ui.weaponGrid.appendChild(b);
  });
}
export function showWeaponMenu(on) { ui.weaponMenu.classList.toggle('hidden', !on); }
export function highlightWeapon(i) {
  [...ui.weaponGrid.children].forEach((c, k) => c.classList.toggle('active', k === i));
}
