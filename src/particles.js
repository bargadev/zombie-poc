// Pooled blood particles.
import * as THREE from 'three';
import { scene } from './core.js';
import { rand } from './constants.js';

const pool = [];
const bloodMat = new THREE.MeshBasicMaterial({ color: 0xa3140f });
const bloodGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(bloodGeo, bloodMat);
  m.visible = false;
  scene.add(m);
  pool.push({ mesh: m, life: 0, vel: new THREE.Vector3() });
}

export function spurt(pos, n = 10) {
  for (let i = 0, c = 0; i < pool.length && c < n; i++) {
    const p = pool[i];
    if (p.life > 0) continue;
    c++;
    p.mesh.position.copy(pos);
    p.mesh.visible = true;
    p.life = rand(0.4, 0.8);
    p.vel.set(rand(-3, 3), rand(2, 6), rand(-3, 3));
  }
}

export function updateBlood(dt) {
  for (const p of pool) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.vel.y -= 14 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    if (p.mesh.position.y < 0.04 || p.life <= 0) { p.life = 0; p.mesh.visible = false; }
  }
}
