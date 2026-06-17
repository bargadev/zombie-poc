// Undead roster, voxel builders (humanoid / quadruped / flying), spawning and
// per-frame AI + animation.
import * as THREE from 'three';
import { scene } from './core.js';
import { ARENA, rand } from './constants.js';
import { rbox, rboxTop, rboxFree, mat, glow } from './voxel.js';
import { spurt } from './particles.js';
import { setScore, setRemaining } from './hud.js';
import { game, zombies } from './state.js';
import { player, damagePlayer } from './player.js';

const HUMANOID_TYPES = [
  { name: 'Walker',   kind: 'humanoid', skin: 0x4f7a3a, shirt: 0x2e3d4a, hair: 0x1d150c, eye: 0xff3320, scale: 1.00, wide: 1.00, hp: 100, speed: [1.6, 2.2], score: 10, minWave: 1 },
  { name: 'Crawler',  kind: 'humanoid', skin: 0x5a6a3a, shirt: 0x2a2a2a, hair: 0x141008, eye: 0xff3320, scale: 0.70, wide: 1.10, hp: 60,  speed: [1.4, 1.9], score: 10, minWave: 1 },
  { name: 'Runner',   kind: 'humanoid', skin: 0x6f8a3a, shirt: 0x5a2030, hair: 0x241008, eye: 0xff6010, scale: 0.96, wide: 0.90, hp: 70,  speed: [3.4, 4.2], score: 15, minWave: 2 },
  { name: 'Spitter',  kind: 'humanoid', skin: 0x8a9a3a, shirt: 0x4a5a1a, hair: 0x2a2a08, eye: 0xaaff20, scale: 1.00, wide: 1.00, hp: 90,  speed: [1.8, 2.4], score: 15, minWave: 3 },
  { name: 'Screamer', kind: 'humanoid', skin: 0x8a8a8a, shirt: 0x3a3a3a, hair: 0x202020, eye: 0x40d0ff, scale: 0.96, wide: 0.95, hp: 80,  speed: [2.2, 2.8], score: 15, minWave: 3 },
  { name: 'Soldier',  kind: 'humanoid', skin: 0x5a6a4a, shirt: 0x1a3a5a, hair: 0x101820, eye: 0xff3320, scale: 1.06, wide: 1.05, hp: 200, speed: [1.8, 2.4], score: 25, minWave: 4 },
  { name: 'Bloated',  kind: 'humanoid', skin: 0x9aa884, shirt: 0x6a5a4a, hair: 0x40382a, eye: 0xff8080, scale: 1.20, wide: 1.40, hp: 160, speed: [1.0, 1.5], score: 20, minWave: 4 },
  { name: 'Child',    kind: 'humanoid', skin: 0x6a8a4a, shirt: 0x7a3a5a, hair: 0x2a1808, eye: 0xff2060, scale: 0.60, wide: 0.95, hp: 40,  speed: [3.0, 3.6], score: 12, minWave: 5 },
  { name: 'Brute',    kind: 'humanoid', skin: 0x3f5a2a, shirt: 0x33291f, hair: 0x161008, eye: 0xffd020, scale: 1.45, wide: 1.25, hp: 320, speed: [1.0, 1.4], score: 35, minWave: 5 },
  { name: 'Ghoul',    kind: 'humanoid', skin: 0x2a3a2a, shirt: 0x101010, hair: 0x0a0a0a, eye: 0xff0000, scale: 0.92, wide: 0.90, hp: 55,  speed: [3.8, 4.6], score: 20, minWave: 6 },
];

// Animal undead: quadrupeds + one flyer.
const ANIMAL_TYPES = [
  { name: 'Rato',   kind: 'quadruped', body: 0x6a6258, accent: 0x4a443c, eye: 0xff2060, scale: 0.50, wide: 1.0,  hp: 28,  speed: [3.6, 4.4], score: 8,  minWave: 1 },
  { name: 'Cão',    kind: 'quadruped', body: 0x5a5a44, accent: 0x3a3a2e, eye: 0xff3320, scale: 0.85, wide: 1.0,  hp: 70,  speed: [3.0, 3.9], score: 18, minWave: 2 },
  { name: 'Javali', kind: 'quadruped', body: 0x6b5a44, accent: 0x4a3e2e, eye: 0xff5020, scale: 1.00, wide: 1.3,  hp: 150, speed: [2.2, 2.8], score: 24, minWave: 3 },
  { name: 'Corvo',  kind: 'flyer',     body: 0x20242a, wing: 0x161a20, beak: 0xd8a020, eye: 0xff3320, scale: 0.70, hp: 32, speed: [3.4, 4.2], score: 16, minWave: 4, hover: 1.6 },
  { name: 'Urso',   kind: 'quadruped', body: 0x4a4030, accent: 0x342c20, eye: 0xffd020, scale: 1.60, wide: 1.25, hp: 380, speed: [1.5, 2.0], score: 42, minWave: 6 },
];

const ALL_TYPES = HUMANOID_TYPES.concat(ANIMAL_TYPES);

// 10 bosses — one spawns every wave, cycling weakest → strongest.
const BOSS_TYPES = [
  { name: 'Brutamontes', kind: 'humanoid',  skin: 0x3f5a2a, shirt: 0x2a3320, hair: 0x161008, eye: 0xffd020, scale: 2.2, wide: 1.30, hp: 600,  speed: [1.1, 1.4], score: 80 },
  { name: 'Lobo Alfa',   kind: 'quadruped', body: 0x4a4a52, accent: 0x2a2a30, eye: 0xff3020, scale: 2.2, wide: 1.00, hp: 680,  speed: [1.6, 2.1], score: 90 },
  { name: 'Touro',       kind: 'quadruped', body: 0x5a2a22, accent: 0x3a1a14, eye: 0xff5020, scale: 2.4, wide: 1.40, hp: 820,  speed: [1.4, 1.9], score: 100, horns: true },
  { name: 'Rei Corvo',   kind: 'flyer',     body: 0x181c22, wing: 0x101318, beak: 0xd8a020, eye: 0xff3320, scale: 1.8,            hp: 700,  speed: [2.0, 2.6], score: 100, hover: 2.4 },
  { name: 'Demônio',     kind: 'humanoid',  skin: 0x6a1a14, shirt: 0x2a0a08, hair: 0x100404, eye: 0xff2020, scale: 2.4, wide: 1.15, hp: 900,  speed: [1.8, 2.3], score: 120, horns: true },
  { name: 'Golem',       kind: 'humanoid',  skin: 0x6a6a66, shirt: 0x4a4a46, hair: 0x3a3a36, eye: 0x40d0ff, scale: 2.7, wide: 1.40, hp: 1200, speed: [0.9, 1.2], score: 140 },
  { name: 'Aberração',   kind: 'humanoid',  skin: 0x9aa884, shirt: 0x6a5a4a, hair: 0x40382a, eye: 0xff8080, scale: 2.8, wide: 1.60, hp: 1050, speed: [1.0, 1.4], score: 130 },
  { name: 'Elefante',    kind: 'quadruped', body: 0x6a6e72, accent: 0x55585c, eye: 0xff3320, scale: 3.1, wide: 1.50, hp: 950,  speed: [0.8, 1.1], score: 110, trunk: true },
  { name: 'Mamute',      kind: 'quadruped', body: 0x5a4632, accent: 0x3a2c1e, eye: 0xffd020, scale: 3.3, wide: 1.60, hp: 1200, speed: [0.8, 1.1], score: 150, trunk: true, horns: true },
  { name: 'Colosso',     kind: 'humanoid',  skin: 0x2a3a2a, shirt: 0x141a14, hair: 0x0a0a0a, eye: 0xff0000, scale: 3.2, wide: 1.50, hp: 1600, speed: [0.8, 1.1], score: 200, horns: true },
];

function pickType(wave) {
  const pool = ALL_TYPES.filter(t => wave >= t.minWave);
  return pool[Math.floor(Math.random() * pool.length)];
}

const EYE_GEO = new THREE.BoxGeometry(0.08, 0.08, 0.02);
const shadowAll = (g) => g.traverse(o => { if (o.isMesh) o.castShadow = true; });

function buildHumanoid(t) {
  const g = new THREE.Group();
  const upper = new THREE.Group(); upper.position.y = 0.78; g.add(upper);

  const torso = new THREE.Mesh(rbox(0.6, 0.8, 0.34, 0.08), mat(t.shirt)); torso.position.y = 0.4;
  const head = new THREE.Mesh(rbox(0.36, 0.4, 0.36, 0.07), mat(t.skin)); head.position.y = 1.02;
  const hair = new THREE.Mesh(rbox(0.4, 0.22, 0.42, 0.05), mat(t.hair)); hair.position.set(0, 1.16, -0.03);
  const eyeL = new THREE.Mesh(EYE_GEO, glow(t.eye)); const eyeR = eyeL.clone();
  eyeL.position.set(-0.09, 1.06, 0.19); eyeR.position.set(0.09, 1.06, 0.19);

  const mkArm = () => {
    const a = new THREE.Mesh(rboxTop(0.16, 0.7, 0.16), mat(t.skin));
    const hand = new THREE.Mesh(rbox(0.2, 0.2, 0.2, 0.05), mat(t.skin)); hand.position.y = -0.72;
    a.add(hand); return a;
  };
  const armL = mkArm(); armL.position.set(-0.42, 0.74, 0);
  const armR = mkArm(); armR.position.set(0.42, 0.74, 0);
  upper.add(torso, head, hair, eyeL, eyeR, armL, armR);

  if (t.horns) {
    const horn = (s) => {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), mat(0xe8e2cf));
      h.position.set(s * 0.13, 1.26, 0); h.rotation.z = -s * 0.45;
      return h;
    };
    upper.add(horn(-1), horn(1));
  }

  const mkLeg = () => {
    const l = new THREE.Mesh(rboxTop(0.2, 0.78, 0.2), mat(t.shirt));
    const foot = new THREE.Mesh(rbox(0.24, 0.16, 0.34, 0.05), mat(0x14140f)); foot.position.set(0, -0.8, 0.05);
    l.add(foot); return l;
  };
  const legL = mkLeg(); legL.position.set(-0.16, 0.78, 0);
  const legR = mkLeg(); legR.position.set(0.16, 0.78, 0);
  g.add(legL, legR);

  shadowAll(g);
  g.scale.set(t.scale * t.wide, t.scale, t.scale * t.wide);
  g.userData.limbs = { armL, armR, legL, legR, upper };
  return g;
}

function buildQuad(t) {
  const g = new THREE.Group();
  const legLen = 0.5, hipY = legLen, bodyY = hipY + 0.22;

  const body = new THREE.Mesh(rbox(0.5 * t.wide, 0.5, 1.1, 0.12), mat(t.body)); body.position.y = bodyY;
  const neck = new THREE.Mesh(rbox(0.34, 0.34, 0.34, 0.08), mat(t.body)); neck.position.set(0, bodyY + 0.16, 0.5);
  const head = new THREE.Mesh(rbox(0.4, 0.4, 0.42, 0.08), mat(t.body)); head.position.set(0, bodyY + 0.22, 0.7);
  const snout = new THREE.Mesh(rbox(0.22, 0.2, 0.28, 0.05), mat(t.accent)); snout.position.set(0, bodyY + 0.14, 0.96);
  const earGeo = rbox(0.12, 0.18, 0.06, 0.03);
  const earL = new THREE.Mesh(earGeo, mat(t.accent)); earL.position.set(-0.14, bodyY + 0.5, 0.62);
  const earR = new THREE.Mesh(earGeo, mat(t.accent)); earR.position.set(0.14, bodyY + 0.5, 0.62);
  const eyeL = new THREE.Mesh(EYE_GEO, glow(t.eye)); const eyeR = eyeL.clone();
  eyeL.position.set(-0.12, bodyY + 0.3, 0.9); eyeR.position.set(0.12, bodyY + 0.3, 0.9);
  const tail = new THREE.Mesh(rboxTop(0.1, 0.4, 0.1), mat(t.body)); tail.position.set(0, bodyY + 0.1, -0.55); tail.rotation.x = -0.8;

  const mkLeg = (x, z) => {
    const l = new THREE.Mesh(rboxTop(0.16, legLen, 0.16), mat(t.accent)); l.position.set(x, hipY, z);
    const paw = new THREE.Mesh(rbox(0.2, 0.12, 0.24, 0.04), mat(0x14140f)); paw.position.set(0, -legLen - 0.02, 0.04);
    l.add(paw); return l;
  };
  const legFL = mkLeg(-0.18, 0.4), legFR = mkLeg(0.18, 0.4), legBL = mkLeg(-0.18, -0.4), legBR = mkLeg(0.18, -0.4);

  g.add(body, neck, head, snout, earL, earR, eyeL, eyeR, tail, legFL, legFR, legBL, legBR);

  // elephant extras: floppy ears, a hanging trunk and tusks
  if (t.trunk) {
    earL.scale.set(2.6, 2.4, 1); earR.scale.set(2.6, 2.4, 1);
    earL.position.set(-0.34, bodyY + 0.34, 0.5); earR.position.set(0.34, bodyY + 0.34, 0.5);
    let ty = bodyY + 0.08, tz = 1.02, r = 0.13;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(rbox(r * 2, 0.24, r * 2, r * 0.6), mat(t.body));
      seg.position.set(0, ty, tz); g.add(seg);
      ty -= 0.2; tz += 0.05; r *= 0.84;
    }
    const tusk = (s) => {
      const m = new THREE.Mesh(rbox(0.07, 0.07, 0.42, 0.03), mat(0xe8e2cf));
      m.position.set(s * 0.13, bodyY + 0.06, 1.08); m.rotation.x = 0.5;
      return m;
    };
    g.add(tusk(-1), tusk(1));
  }

  if (t.horns) {
    const horn = (s) => {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 6), mat(0xe8e2cf));
      h.position.set(s * 0.16, bodyY + 0.5, 0.66); h.rotation.set(-0.4, 0, -s * 0.5);
      return h;
    };
    g.add(horn(-1), horn(1));
  }

  shadowAll(g);
  g.scale.setScalar(t.scale);
  g.userData.limbs = { legFL, legFR, legBL, legBR, head, tail };
  return g;
}

function buildBird(t) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(0.3, 0.32, 0.6, 0.1), mat(t.body));
  const head = new THREE.Mesh(rbox(0.26, 0.26, 0.26, 0.07), mat(t.body)); head.position.set(0, 0.1, 0.34);
  const beak = new THREE.Mesh(rbox(0.1, 0.1, 0.2, 0.02), mat(t.beak)); beak.position.set(0, 0.08, 0.52);
  const eyeL = new THREE.Mesh(EYE_GEO, glow(t.eye)); const eyeR = eyeL.clone();
  eyeL.position.set(-0.08, 0.14, 0.45); eyeR.position.set(0.08, 0.14, 0.45);

  const mkWing = (side) => {
    const geo = rboxFree(0.55, 0.05, 0.4, 0.02); geo.translate(side * 0.275, 0, 0);
    const w = new THREE.Mesh(geo, mat(t.wing)); w.position.set(side * 0.14, 0.06, 0);
    return w;
  };
  const wingL = mkWing(-1), wingR = mkWing(1);
  const tail = new THREE.Mesh(rbox(0.18, 0.05, 0.3, 0.02), mat(t.wing)); tail.position.set(0, 0.02, -0.4);
  const legGeo = rbox(0.05, 0.18, 0.05, 0.02);
  const legL = new THREE.Mesh(legGeo, mat(t.beak)); legL.position.set(-0.07, -0.22, 0);
  const legR = new THREE.Mesh(legGeo, mat(t.beak)); legR.position.set(0.07, -0.22, 0);

  g.add(body, head, beak, eyeL, eyeR, wingL, wingR, tail, legL, legR);
  shadowAll(g);
  g.scale.setScalar(t.scale);
  g.userData.limbs = { wingL, wingR };
  g.userData.hover = t.hover;
  return g;
}

function spawnType(t) {
  const kind = t.kind || 'humanoid';
  const g = kind === 'quadruped' ? buildQuad(t) : kind === 'flyer' ? buildBird(t) : buildHumanoid(t);

  const edge = Math.random() * Math.PI * 2;
  const r = ARENA - rand(3, 8);
  const baseY = kind === 'flyer' ? t.hover : 0;
  g.position.set(Math.cos(edge) * r, baseY, Math.sin(edge) * r);

  // mild per-wave scaling so later waves bite harder
  const wf = game.wave - 1;
  Object.assign(g.userData, {
    typeName: t.name, kind,
    hp: Math.round(t.hp * (1 + wf * 0.06)),
    speed: rand(t.speed[0], t.speed[1]) * (1 + wf * 0.025),
    score: t.score,
    alive: true, attackCd: 0, phase: rand(0, Math.PI * 2), dying: 0,
  });
  g.traverse(o => { o.userData.root = g; });
  scene.add(g);
  zombies.push(g);
}

export function spawnZombie() { spawnType(pickType(game.wave)); }

// One boss per wave, cycling through the 10 boss types (weakest → strongest).
export function spawnBoss(wave) {
  const t = BOSS_TYPES[(wave - 1) % BOSS_TYPES.length];
  spawnType(t);
  return t.name;
}

export function findRoot(obj) {
  while (obj) { if (obj.userData && obj.userData.root) return obj.userData.root; obj = obj.parent; }
  return null;
}

export function killZombie(z) {
  z.userData.alive = false;
  z.userData.dying = z.userData.kind === 'flyer' ? 1.0 : 0.7;
  game.score += z.userData.score;
  setScore(game.score);
  spurt(z.position.clone().setY(z.position.y + 0.6), 16);
}

// --- animation per body plan ---
function animHumanoid(z, d, dt) {
  d.phase += dt * d.speed * 2.2; const sw = Math.sin(d.phase); const L = d.limbs;
  L.legL.rotation.x = sw * 0.5; L.legR.rotation.x = -sw * 0.5;
  L.armL.rotation.x = -1.3 - sw * 0.25; L.armR.rotation.x = -1.3 + sw * 0.25;
  L.upper.rotation.x = 0.24 + Math.sin(d.phase * 2) * 0.04; L.upper.rotation.z = sw * 0.06;
  z.position.y = Math.abs(sw) * 0.06;
}
function animQuad(z, d, dt) {
  d.phase += dt * d.speed * 3.0; const sw = Math.sin(d.phase); const L = d.limbs;
  L.legFL.rotation.x = sw * 0.7; L.legBR.rotation.x = sw * 0.7;
  L.legFR.rotation.x = -sw * 0.7; L.legBL.rotation.x = -sw * 0.7;
  L.head.rotation.x = 0.08 + Math.sin(d.phase * 2) * 0.08;
  L.tail.rotation.x = -0.8 + Math.sin(d.phase * 1.5) * 0.2;
  z.position.y = Math.abs(sw) * 0.05;
}
function animFlyer(z, d, dt) {
  d.phase += dt * 16; const flap = Math.sin(d.phase); const L = d.limbs;
  L.wingL.rotation.z = 0.3 + flap * 0.7; L.wingR.rotation.z = -0.3 - flap * 0.7;
  z.position.y = d.hover + Math.sin(d.phase * 0.4) * 0.18;
}

const tmp = new THREE.Vector3();
export function updateZombies(dt) {
  const pp = player.position;
  let aliveCount = 0;
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i]; const d = z.userData;

    if (!d.alive) {
      d.dying -= dt;
      z.rotation.x = Math.min(Math.PI / 2, z.rotation.x + dt * 3);
      const fall = d.kind === 'flyer' ? dt * 3 : dt * 0.6;
      z.position.y = Math.max(-0.4, z.position.y - fall);
      if (d.dying <= 0) { scene.remove(z); zombies.splice(i, 1); }
      continue;
    }
    aliveCount++;

    tmp.set(pp.x - z.position.x, 0, pp.z - z.position.z);
    const dist = tmp.length(); tmp.normalize();
    if (dist > 1.1) { z.position.x += tmp.x * d.speed * dt; z.position.z += tmp.z * d.speed * dt; }

    const ty = Math.atan2(tmp.x, tmp.z);
    let dy = ty - z.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    z.rotation.y += dy * Math.min(1, dt * 9);

    if (d.kind === 'quadruped') animQuad(z, d, dt);
    else if (d.kind === 'flyer') animFlyer(z, d, dt);
    else animHumanoid(z, d, dt);

    d.attackCd -= dt;
    if (dist <= 1.4 && d.attackCd <= 0) { d.attackCd = 0.8; damagePlayer(rand(9, 15)); }
  }
  setRemaining(aliveCount + game.toSpawn);
}
