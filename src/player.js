// The player avatar: third-person over-the-shoulder rig, voxel hero model,
// held weapon, mouse-look, WASD + jump, and the chase camera.
import * as THREE from 'three';
import { scene, camera, clock } from './core.js';
import { obstacles } from './world.js';
import { rbox, rboxTop, mat } from './voxel.js';
import { EYE, ARENA, PLAYER_SPEED, RUN_MULT, RELOAD_TIME } from './constants.js';
import { setHealth, hitFlash } from './hud.js';
import { hurtSound } from './audio.js';
import { game, hooks } from './state.js';
import { WEAPONS } from './weapons.js';
import { loadHeroModel, updateHeroModel, getHandBone } from './herogltf.js';

export const player = new THREE.Group();
player.position.set(0, 0, 0);
scene.add(player);

export const look = { yaw: 0, pitch: 0, locked: false, ads: false };
const SENS = 0.0022;

// hero palette
const C = { skin: 0xb9885f, jacket: 0x2c2a24, pants: 0x23303a, hair: 0x2a1d12, boot: 0x14140f };

// smooth limb: a capsule pivoted at its TOP (rounded cylinder, not a box)
function capsuleTop(r, len) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  g.translate(0, -(len / 2 + r), 0);
  return g;
}

// --- legs (on the root, so they can stride) ---
const heroLegs = new THREE.Group();
function mkHeroLeg(x) {
  const l = new THREE.Mesh(capsuleTop(0.12, 0.6), mat(C.pants));
  l.position.set(x, 0.85, 0); l.castShadow = true;
  const foot = new THREE.Mesh(rbox(0.2, 0.13, 0.34, 0.06), mat(C.boot));
  foot.position.set(0, -0.86, 0.07); foot.castShadow = true;
  l.add(foot);
  return l;
}
const heroLegL = mkHeroLeg(-0.16), heroLegR = mkHeroLeg(0.16);
heroLegs.add(heroLegL, heroLegR);
player.add(heroLegs);

// --- upper body pivot (pitches with aim) ---
const aim = new THREE.Group();
aim.position.y = 1.30;
player.add(aim);

// pelvis bridges legs ↔ torso (removes the mid-body gap)
const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.32, 12), mat(C.pants));
pelvis.position.y = 0.95; pelvis.castShadow = true; player.add(pelvis);

// tapered torso (wide shoulders → narrow waist), flattened front-to-back
const heroTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.21, 0.74, 16), mat(C.jacket));
heroTorso.position.y = 0.02; heroTorso.scale.z = 0.78; heroTorso.castShadow = true;
const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10), mat(C.jacket));
shoulders.position.y = 0.34; shoulders.scale.set(1, 0.5, 0.78); shoulders.castShadow = true;
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.16, 10), mat(C.skin));
neck.position.y = 0.44; neck.castShadow = true;
const heroHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), mat(C.skin));
heroHead.position.y = 0.6; heroHead.scale.set(0.95, 1.06, 0.95); heroHead.castShadow = true;
const heroHair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 12), mat(C.hair));
heroHair.position.set(0, 0.66, -0.03); heroHair.scale.set(1.04, 0.72, 1.06);
aim.add(heroTorso, shoulders, neck, heroHead, heroHair);

// --- held weapon ---
const gun = new THREE.Group();
const gunBody = new THREE.Mesh(rbox(0.12, 0.16, 0.62, 0.04),
  new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.6 }));
const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12),
  new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.3, metalness: 0.8 }));
gunBarrel.rotation.x = Math.PI / 2;
gunBarrel.position.set(0, 0.02, 0.4);
gun.add(gunBody, gunBarrel);
aim.add(gun);

const muzzle = new THREE.PointLight(0xffd27a, 0, 8, 2);
muzzle.position.set(0, 0.02, 0.7);
gun.add(muzzle);
const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffe08a, emissiveIntensity: 3.4, transparent: true, opacity: 0, roughness: 1 }));
flashMesh.position.copy(muzzle.position);
gun.add(flashMesh);

// --- arms: upper + forearm capsules, elbow dropped below the shoulder→hand
// line so it bends naturally. Both hands are pinned to the weapon's grip
// points, and the whole rig is rebuilt per weapon (each gun held its own way).
function bone(p0, p1, r, material) {
  const v = new THREE.Vector3().subVectors(p1, p0);
  const len = v.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.02, len - 2 * r), 5, 12), material);
  m.position.copy(p0).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
  m.castShadow = true;
  return m;
}
const SHO_R = new THREE.Vector3(0.22, 0.30, 0), SHO_L = new THREE.Vector3(-0.22, 0.30, 0);
const vec3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function mkBoneArm(shoulder, hand, outSign) {
  const grp = new THREE.Group(); grp.position.copy(shoulder);
  const S = new THREE.Vector3();
  const H = hand.clone().sub(shoulder);                       // hand in shoulder-local space
  const elbow = S.clone().lerp(H, 0.5).add(new THREE.Vector3(outSign * 0.06, -0.20, -0.04));
  grp.add(bone(S, elbow, 0.07, mat(C.jacket)));               // upper arm
  grp.add(bone(elbow, H, 0.057, mat(C.jacket)));              // forearm
  const hnd = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(C.skin));
  hnd.position.copy(H); hnd.castShadow = true; grp.add(hnd);
  return grp;
}
let heroArmL = null, heroArmR = null;
let modelActive = false;   // true once the rigged glTF hero replaces the procedural one
function rebuildArms(hold) {
  if (heroArmR) aim.remove(heroArmR);
  if (heroArmL) aim.remove(heroArmL);
  heroArmR = mkBoneArm(SHO_R, vec3(hold.rHand), 1);
  heroArmL = mkBoneArm(SHO_L, vec3(hold.lHand), -1);
  heroArmR.visible = heroArmL.visible = !modelActive;
  aim.add(heroArmR, heroArmL);
}

const gunBase = new THREE.Vector3(0, -0.04, 0.40);
export function setWeaponVisual(w) {
  gun.scale.z = w.len / 0.62;
  gunBody.material.color.setHex(w.color);
  if (w.hold) {
    gunBase.set(w.hold.gun[0], w.hold.gun[1], w.hold.gun[2]);
    rebuildArms(w.hold);
  }
}
export function weaponFlash() {
  muzzle.intensity = 6;
  flashMesh.material.opacity = 1;
  flashMesh.scale.setScalar(0.8 + Math.random() * 0.6);
}

setWeaponVisual(WEAPONS[0]);   // initial pose

// Swap in the rigged glTF character; the procedural hero stays as fallback and
// is hidden once the model loads.
const procParts = [pelvis, heroLegs, heroTorso, shoulders, neck, heroHead, heroHair];
loadHeroModel(player, () => {
  modelActive = true;
  procParts.forEach((p) => { p.visible = false; });
  if (heroArmL) heroArmL.visible = false;
  if (heroArmR) heroArmR.visible = false;
});

// --- input ---
export const keys = Object.create(null);
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });

export function lockPointer() { document.querySelector('canvas').requestPointerLock(); }
export function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => {
  look.locked = document.pointerLockElement === document.querySelector('canvas');
  hooks.onLockChange?.(look.locked);
});
addEventListener('mousemove', (e) => {
  if (!look.locked) return;
  // forward is +Z at yaw 0, which mirrors world-X on screen, so turning right
  // (mouse right) means decreasing yaw.
  const s = SENS * (look.ads ? 0.55 : 1);   // finer aim while aiming down sights
  look.yaw -= e.movementX * s;
  look.pitch -= e.movementY * s;
  look.pitch = Math.max(-0.9, Math.min(0.9, look.pitch));
});

// --- damage / death ---
export function damagePlayer(amount) {
  game.health -= amount;
  hurtSound();
  setHealth(game.health);
  hitFlash();
  if (game.health <= 0) { game.health = 0; hooks.onDeath?.(); }
}

// --- per-frame ---
const GRAVITY = 22, JUMP_V = 7.6;
let velY = 0;
let heroPhase = 0;
const playerBox = new THREE.Box3();
const vel = new THREE.Vector3();
const curVel = new THREE.Vector3();   // smoothed velocity (fluid accel/decel)
const _hand = new THREE.Vector3();    // scratch: hand-bone position for the held gun

export function updatePlayer(dt) {
  // muzzle flash decay
  if (muzzle.intensity > 0) muzzle.intensity = Math.max(0, muzzle.intensity - dt * 60);
  if (flashMesh.material.opacity > 0) flashMesh.material.opacity = Math.max(0, flashMesh.material.opacity - dt * 12);

  const running = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = PLAYER_SPEED * (running ? RUN_MULT : 1);
  const yaw = look.yaw;

  const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
  const rightX = -Math.cos(yaw), rightZ = Math.sin(yaw); // screen-right

  let mz = 0, mx = 0;
  if (keys['KeyW']) mz += 1;
  if (keys['KeyS']) mz -= 1;
  if (keys['KeyD']) mx += 1;
  if (keys['KeyA']) mx -= 1;

  vel.set(0, 0, 0);
  if (mz || mx) {
    const inv = 1 / Math.hypot(mz, mx);
    mz *= inv; mx *= inv;
    vel.x = (fwdX * mz + rightX * mx) * speed;
    vel.z = (fwdZ * mz + rightZ * mx) * speed;
  }
  // smooth accel/decel for fluid movement (ease toward the target velocity)
  const accelK = 1 - Math.exp(-16 * dt);
  curVel.x += (vel.x - curVel.x) * accelK;
  curVel.z += (vel.z - curVel.z) * accelK;
  if (Math.abs(curVel.x) < 0.01) curVel.x = 0;
  if (Math.abs(curVel.z) < 0.01) curVel.z = 0;

  // axis-separated collision vs props
  const px = player.position.x, pz = player.position.z;
  let nx = px + curVel.x * dt, nz = pz + curVel.z * dt;
  const R = 0.4;
  playerBox.min.set(nx - R, 0, pz - R); playerBox.max.set(nx + R, EYE, pz + R);
  if (obstacles.some(o => o.box.intersectsBox(playerBox))) { nx = px; curVel.x = 0; }
  playerBox.min.set(nx - R, 0, nz - R); playerBox.max.set(nx + R, EYE, nz + R);
  if (obstacles.some(o => o.box.intersectsBox(playerBox))) { nz = pz; curVel.z = 0; }
  const lim = ARENA - 1;
  player.position.x = Math.max(-lim, Math.min(lim, nx));
  player.position.z = Math.max(-lim, Math.min(lim, nz));

  // jump + gravity
  const grounded = player.position.y <= 0.001;
  if (grounded && keys['Space']) velY = JUMP_V;
  velY -= GRAVITY * dt;
  player.position.y += velY * dt;
  if (player.position.y < 0) { player.position.y = 0; velY = 0; }

  // orient + aim pitch
  player.rotation.y = yaw;
  game.recoil *= 0.82;
  aim.rotation.x = -look.pitch - game.recoil * 0.6;

  // hero animation: glTF skinned mixer if loaded, else procedural leg stride
  const sp = Math.hypot(curVel.x, curVel.z);
  if (!updateHeroModel(dt, sp)) {
    if (grounded) heroPhase += dt * (sp * 0.9 + 0.5);
    const swing = grounded ? Math.sin(heroPhase) * Math.min(0.55, sp * 0.08) : 0.5;
    heroLegL.rotation.x = swing;
    heroLegR.rotation.x = -swing;
  }

  // gun base: track the model's right-hand bone when the glTF hero is active,
  // else the procedural hold point. (Gun stays a child of `aim`, so it still
  // points down the aim direction — it's positioned at the hand, not rotated by it.)
  let bx = gunBase.x, by = gunBase.y, bz = gunBase.z;
  const hb = getHandBone();
  if (modelActive && hb) {
    hb.getWorldPosition(_hand);          // world hand position (updates matrices)
    aim.updateWorldMatrix(true, false);
    aim.worldToLocal(_hand);             // → aim-local
    bx = _hand.x; by = _hand.y; bz = _hand.z;
  }

  // gun recoil + reload dip
  let rl = 0;
  if (game.reloading) { const p = 1 - game.reloadT / (game.reloadDur || RELOAD_TIME); rl = Math.sin(p * Math.PI); }
  gun.position.set(bx - rl * 0.04, by - rl * 0.18, bz - game.recoil * 0.6);
  gun.rotation.x = rl * 0.8;
  gun.rotation.z = rl * 0.3;
  if (heroArmL && heroArmL.visible) heroArmL.rotation.x = rl * 0.7;   // left hand drops off the gun to grab the mag
}

const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
const curCamPos = new THREE.Vector3();
let camInit = false;
let kick = 0, shake = 0;
const CAM_BACK = 2.2, CAM_HEIGHT = 2.0, CAM_SIDE = -0.85;

// fired on each shot: punches the view up + adds screen shake
export function addRecoil(punch, shk) { kick += punch; if (shk > shake) shake = shk; }

export function updateCamera(dt = 0.016) {
  const yaw = look.yaw;
  const pitch = look.pitch + kick;            // recoil punch
  const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);

  // FOV zoom when aiming down sights
  const targetFov = look.ads ? 50 : 75;
  if (Math.abs(camera.fov - targetFov) > 0.04) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-16 * dt));
    camera.updateProjectionMatrix();
  }

  const inspect = !!keys['KeyC'];
  if (inspect) {
    // INSPECT: orbit to the front (hold C)
    camPos.set(player.position.x + fwdX * 2.8, player.position.y + 1.45, player.position.z + fwdZ * 2.8);
  } else {
    const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    // tighter over-the-shoulder framing while aiming
    const back = look.ads ? 1.5 : CAM_BACK;
    const side = look.ads ? -0.5 : CAM_SIDE;
    const height = look.ads ? 1.85 : CAM_HEIGHT;
    camPos.set(
      player.position.x - fwdX * back + rightX * side,
      player.position.y + height,
      player.position.z - fwdZ * back + rightZ * side
    );
    const cl = ARENA - 0.5;
    camPos.x = Math.max(-cl, Math.min(cl, camPos.x));
    camPos.z = Math.max(-cl, Math.min(cl, camPos.z));
    for (const o of obstacles) {
      if (o.box.containsPoint(camPos)) { camPos.set(player.position.x, player.position.y + CAM_HEIGHT + 0.4, player.position.z); break; }
    }
  }

  // smooth the camera POSITION (fluid follow); shake added on top
  if (!camInit) { curCamPos.copy(camPos); camInit = true; }
  curCamPos.lerp(camPos, 1 - Math.exp(-20 * dt));
  camera.position.set(
    curCamPos.x + (Math.random() - 0.5) * shake,
    curCamPos.y + (Math.random() - 0.5) * shake,
    curCamPos.z + (Math.random() - 0.5) * shake
  );

  // Look target is derived from the camera's ACTUAL (smoothed) position, so the
  // position lag during strafing translates the view instead of rotating it.
  if (inspect) {
    camTarget.set(player.position.x, player.position.y + 1.25, player.position.z);
  } else {
    const cp = Math.cos(pitch);
    camTarget.set(curCamPos.x + Math.sin(yaw) * cp, curCamPos.y + Math.sin(pitch), curCamPos.z + Math.cos(yaw) * cp);
  }
  camera.lookAt(camTarget);

  kick *= Math.exp(-11 * dt);
  shake *= Math.exp(-9 * dt);
}
