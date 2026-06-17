// Static world: ground, boundary walls and scattered cover. Exposes `obstacles`
// (AABBs) used by player/camera collision.
import * as THREE from 'three';
import { scene } from './core.js';
import { ARENA, rand } from './constants.js';
import { mat, rbox } from './voxel.js';

export const obstacles = []; // { box: THREE.Box3 }

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#1b2415'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const s = Math.random() * 2 + 0.5;
    const g = 18 + Math.random() * 28;
    x.fillStyle = `rgba(${g * 0.6 | 0},${g | 0},${g * 0.5 | 0},${Math.random() * 0.5})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ARENA / 3, ARENA / 3);
  return t;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA * 2, ARENA * 2),
  new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Boundary walls
const wallMat = new THREE.MeshStandardMaterial({ color: 0x10140d, roughness: 1 });
const wallGeo = new THREE.BoxGeometry(ARENA * 2, 6, 0.6);
[[0, -ARENA, 0], [0, ARENA, 0], [-ARENA, 0, Math.PI / 2], [ARENA, 0, Math.PI / 2]].forEach(([x, z, ry]) => {
  const w = new THREE.Mesh(wallGeo, wallMat);
  w.position.set(x, 3, z); w.rotation.y = ry;
  w.castShadow = true; w.receiveShadow = true;
  scene.add(w);
});

// Scattered cover: crates + tombstones (rounded voxels)
for (let i = 0; i < 26; i++) {
  const x = rand(-ARENA + 6, ARENA - 6);
  const z = rand(-ARENA + 6, ARENA - 6);
  if (Math.hypot(x, z) < 8) continue; // keep spawn clear
  let mesh;
  if (Math.random() < 0.55) {
    const s = rand(1.4, 2.6);
    mesh = new THREE.Mesh(rbox(s, s, s, 0.12), mat(0x6b4a2a));
    mesh.position.set(x, s / 2, z);
    mesh.rotation.y = rand(0, Math.PI);
  } else {
    const h = rand(1.6, 2.6), w = rand(1, 1.6);
    mesh = new THREE.Mesh(rbox(w, h, 0.4, 0.1), mat(0x3a3f3a));
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = rand(0, Math.PI);
  }
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  mesh.updateMatrixWorld(true);
  obstacles.push({ box: new THREE.Box3().setFromObject(mesh) });
}
