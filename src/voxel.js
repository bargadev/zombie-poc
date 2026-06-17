// Voxel toolkit: cached materials + rounded-box geometry helpers so the whole
// game shares a small, cohesive set of GPU resources and a chunky-but-soft look.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// --- material cache (one material per colour, reused everywhere) ---
const _matCache = new Map();
export function mat(hex, basic = false) {
  const key = (basic ? 'b' : 's') + hex;
  let m = _matCache.get(key);
  if (!m) {
    m = basic
      ? new THREE.MeshBasicMaterial({ color: hex })
      : new THREE.MeshStandardMaterial({ color: hex, roughness: 1 });
    _matCache.set(key, m);
  }
  return m;
}

// Emissive "glow" material (HDR) so eyes/flash punch through the bloom pass.
const _glowCache = new Map();
export function glow(hex, intensity = 2.6) {
  const key = hex + '|' + intensity;
  let m = _glowCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: hex, emissiveIntensity: intensity, roughness: 1 });
    _glowCache.set(key, m);
  }
  return m;
}

function safeR(w, h, d, r) {
  return Math.max(0.008, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
}

// --- shared, centred rounded box (NEVER translate the returned geometry) ---
const _geoCache = new Map();
export function rbox(w, h, d, r = 0.06, seg = 2) {
  const rr = safeR(w, h, d, r);
  const key = `${w},${h},${d},${rr},${seg}`;
  let g = _geoCache.get(key);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, seg, rr); _geoCache.set(key, g); }
  return g;
}

// --- unique rounded box translated so the pivot sits at the TOP (for limbs) ---
export function rboxTop(w, h, d, r = 0.05, seg = 1) {
  const rr = safeR(w, h, d, r);
  const g = new RoundedBoxGeometry(w, h, d, seg, rr);
  g.translate(0, -h / 2, 0);
  return g;
}

// --- fresh, UNcached rounded box (safe to translate however you like) ---
export function rboxFree(w, h, d, r = 0.05, seg = 1) {
  const rr = safeR(w, h, d, r);
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

// Cohesive rotten palette shared by props, hero and undead.
export const PALETTE = {
  bg: 0x0a0d0a,
  ground: 0x1b2415,
  crate: 0x6b4a2a,
  stone: 0x3a3f3a,
  blood: 0xa3140f,
  dark: 0x14140f,
};
