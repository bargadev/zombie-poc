// Optional rigged glTF hero. Drop a Mixamo (or any rigged) .glb at MODEL.url and
// the game swaps the procedural hero for it, auto-detecting the hand bone and an
// idle/aim clip. If the file is absent it silently keeps the procedural hero
// (which already holds the gun two-handed). See assets/README.md.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ───────────────────────── tweak these for your model ─────────────────────────
const MODEL = {
  url: './assets/hero.glb', // put your Mixamo export here
  scale: 1.0,               // adjust if the character is too big/small
  faceYaw: 0,               // rotate to face +Z (try Math.PI if it faces away)
  clip: null,               // clip name to play (null = auto: prefer aim/idle)
};
// ───────────────────────────────────────────────────────────────────────────────

const HAND_PATTERNS = [
  /mixamorig.*righthand/i, /right.?hand/i, /hand.?r\b/i, /\br.?hand/i,
  /arm_joint_r__3_/i, /wrist.*r/i,
];

let mixer = null, ready = false, handBone = null;
export function getHandBone() { return handBone; }

export function loadHeroModel(parent, onReady) {
  new GLTFLoader().load(
    MODEL.url,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      model.scale.setScalar(MODEL.scale);
      model.position.set(0, 0, 0);
      model.rotation.y = MODEL.faceYaw;
      parent.add(model);

      model.traverse((o) => {
        if (o.isBone && !handBone) { for (const re of HAND_PATTERNS) if (re.test(o.name)) { handBone = o; break; } }
      });

      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        const clip = (MODEL.clip && gltf.animations.find((a) => a.name === MODEL.clip))
          || gltf.animations.find((a) => /aim|idle/i.test(a.name))
          || gltf.animations[0];
        mixer.clipAction(clip).play();
      }
      ready = true;
      onReady?.(model);
      console.info('[hero] loaded', MODEL.url,
        '· clips:', gltf.animations.map((a) => a.name).join(', ') || 'none',
        '· hand bone:', handBone?.name || 'not found');
    },
    undefined,
    () => console.info(`[hero] no ${MODEL.url} — keeping the procedural hero. Drop a Mixamo .glb there to swap.`),
  );
}

// plays the model's holding/idle clip at normal speed (no jittery walk-in-place)
export function updateHeroModel(dt) {
  if (!ready) return false;
  if (mixer) mixer.update(dt);
  return true;
}
