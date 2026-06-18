// Game orchestration: state machine, waves, shooting, weapon switching (B menu),
// input wiring and the main loop.
import * as THREE from 'three';
import { scene, camera, clock, setExposure } from './core.js';
import { composer, updateFx } from './postfx.js';
import { game, zombies, hooks } from './state.js';
import {
  player, look, lockPointer, unlockPointer, updatePlayer, updateCamera,
  weaponFlash, setWeaponVisual, addRecoil,
} from './player.js';
import { spawnZombie, spawnBoss, updateZombies, killZombie, findRoot } from './zombies.js';
import { updateBlood } from './particles.js';
import { WEAPONS, resetAmmo } from './weapons.js';
import { rand } from './constants.js';
import { shotSound } from './audio.js';
import { spurt } from './particles.js';
import * as hud from './hud.js';

const ray = new THREE.Raycaster();
const centerV2 = new THREE.Vector2(0, 0);
let mouseDown = false;

// ---------------------------------------------------------------- waves / state
function startWave() {
  game.wave++;
  game.toSpawn = 5 + game.wave * 3;
  game.spawnT = 0;
  hud.setWave(game.wave);
  // every wave has exactly one boss (cycles through the 10 boss types)
  const boss = spawnBoss(game.wave);
  hud.toast(`WAVE ${game.wave} · BOSS: ${boss.toUpperCase()}`);
}

function startGame() {
  game.state = 'playing';
  game.health = 100; game.score = 0; game.wave = 0;
  game.reloading = false; game.weaponMenu = false;
  resetAmmo();
  zombies.splice(0).forEach(z => scene.remove(z));
  player.position.set(0, 0, 0);
  look.yaw = 0; look.pitch = 0;
  hud.setScore(0); hud.setHealth(100);
  hud.showHud(true); hud.showOverlay(false); hud.showWeaponMenu(false);
  hud.ui.panel.classList.remove('dead');
  switchWeapon(0);
  startWave();
  updateCamera();
  lockPointer();
}

function gameOver() {
  game.state = 'dead';
  unlockPointer();
  hud.ui.panel.classList.add('dead');
  hud.ui.panel.querySelector('h1').innerHTML = 'VOCÊ<span> MORREU</span>';
  hud.ui.panel.querySelector('.tagline').textContent = `Wave ${game.wave} · Score ${game.score}`;
  hud.ui.startBtn.textContent = 'TENTAR DE NOVO';
  hud.ui.overlaySub.textContent = 'Clique para travar o mouse';
  hud.showOverlay(true); hud.showHud(false);
}

function updateSpawning(dt) {
  if (game.toSpawn > 0) {
    game.spawnT -= dt;
    if (game.spawnT <= 0) { spawnZombie(); game.toSpawn--; game.spawnT = rand(0.4, 1.1); }
  } else if (zombies.length === 0) {
    startWave();
  }
}

// ---------------------------------------------------------------- weapons
function switchWeapon(i) {
  if (i < 0 || i >= WEAPONS.length) return;
  game.weapon = i;
  game.reloading = false; hud.setReloadHint(false);
  const w = WEAPONS[i];
  setWeaponVisual(w);
  hud.setWeaponName(w.name);
  hud.setAmmo(w);
  hud.highlightWeapon(i);
}

function reload() {
  const w = WEAPONS[game.weapon];
  if (game.state !== 'playing' || game.reloading || w.ammo === w.mag) return;
  game.reloading = true; game.reloadT = w.reload; game.reloadDur = w.reload;
  hud.setReloadHint(true);
}

function fire() {
  if (game.weaponMenu) return;
  const w = WEAPONS[game.weapon];
  if (game.reloading || game.fireT > 0) return;
  if (w.ammo <= 0) { reload(); return; }
  w.ammo--; game.fireT = w.cooldown; game.recoil = 0.028 + w.dmg * 0.00022;
  hud.setAmmo(w);
  shotSound(w.tone);
  weaponFlash();
  const rk = look.ads ? 0.55 : 1;                            // steadier while aiming
  addRecoil((0.006 + w.dmg * 0.00022) * rk, (0.008 + w.dmg * 0.00028) * rk);

  const spread = (look.ads ? 0.35 : 1) * w.spread;           // tighter spread when aiming
  for (let p = 0; p < w.pellets; p++) {
    ray.setFromCamera(centerV2, camera);
    if (spread > 0) {
      ray.ray.direction.x += rand(-spread, spread);
      ray.ray.direction.y += rand(-spread, spread);
      ray.ray.direction.z += rand(-spread, spread);
      ray.ray.direction.normalize();
    }
    const hits = ray.intersectObjects(zombies, true);
    if (hits.length && hits[0].distance <= w.range) {
      const z = findRoot(hits[0].object);
      if (z && z.userData.alive) {
        z.userData.hp -= w.dmg;
        spurt(hits[0].point, 6);
        if (z.userData.hp <= 0) killZombie(z);
      }
    }
  }
  if (w.ammo === 0) reload();
}

// ---------------------------------------------------------------- B weapon menu
function openMenu() {
  if (game.state !== 'playing') return;
  game.weaponMenu = true;
  hud.showWeaponMenu(true);
  unlockPointer();
}
function closeMenu(i) {
  if (i != null) switchWeapon(i);
  game.weaponMenu = false;
  hud.showWeaponMenu(false);
  lockPointer();
}

// ---------------------------------------------------------------- hooks
hooks.onDeath = gameOver;
hooks.onLockChange = (locked) => {
  if (!locked) setAds(false);   // drop aim when the pointer unlocks
  if (game.state !== 'playing' || game.weaponMenu) return;
  if (locked) hud.showOverlay(false);
  else { hud.showOverlay(true); hud.ui.overlaySub.textContent = 'Pausado — clique para continuar'; }
};

// ---------------------------------------------------------------- input wiring
hud.buildWeaponMenu(WEAPONS, (i) => closeMenu(i));

// brightness slider (persisted)
const brightnessEl = document.getElementById('brightness');
const savedB = parseFloat(localStorage.getItem('zpoc_brightness'));
if (!Number.isNaN(savedB)) brightnessEl.value = savedB;
setExposure(parseFloat(brightnessEl.value));
brightnessEl.addEventListener('input', () => {
  const v = parseFloat(brightnessEl.value);
  setExposure(v);
  localStorage.setItem('zpoc_brightness', v);
});

hud.ui.startBtn.addEventListener('click', () => { if (game.state !== 'playing') startGame(); });
hud.ui.overlay.addEventListener('click', (e) => {
  if (e.target === hud.ui.startBtn) return;
  if (game.state === 'playing') lockPointer();
});

function setAds(on) { look.ads = on; document.body.classList.toggle('aiming', on); }

addEventListener('mousedown', (e) => {
  if (game.weaponMenu || game.state !== 'playing' || !look.locked) return;
  if (e.button === 0) { mouseDown = true; fire(); }
  else if (e.button === 2) setAds(true);   // right mouse = aim down sights
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
  else if (e.button === 2) setAds(false);
});
addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  if (game.state !== 'playing') return;
  if (e.code === 'KeyR') reload();
  else if (e.code === 'KeyB') game.weaponMenu ? closeMenu(null) : openMenu();
  else if (e.code.startsWith('Digit')) {
    const i = parseInt(e.code.slice(5), 10) - 1;
    if (i >= 0 && i < WEAPONS.length) game.weaponMenu ? closeMenu(i) : switchWeapon(i);
  }
});

// ---------------------------------------------------------------- main loop
function tick() {
  setTimeout(tick, 0);                     // FPS livre: ignora o vsync do rAF (teto = refresh do monitor)
  const raw = clock.getDelta();           // unclamped: true frame time for FPS
  const dt = Math.min(raw, 0.05);

  if (game.state === 'playing' && look.locked && !game.weaponMenu) {
    if (game.fireT > 0) game.fireT -= dt;
    if (game.reloading) {
      game.reloadT -= dt;
      if (game.reloadT <= 0) {
        game.reloading = false;
        const w = WEAPONS[game.weapon];
        w.ammo = w.mag; hud.setAmmo(w); hud.setReloadHint(false);
      }
    }
    if (mouseDown && WEAPONS[game.weapon].auto) fire();

    updatePlayer(dt);
    updateCamera(dt);
    updateZombies(dt);
    updateSpawning(dt);
    updateBlood(dt);
  }

  hud.tickToast(dt);
  hud.setPerf(raw, dt);
  updateFx(clock.elapsedTime);
  composer.render();
}
tick();
