// Renderer, scene, camera, clock and lighting — the engine bedrock.
import * as THREE from 'three';
import { ARENA } from './constants.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // applied by the post OutputPass
renderer.toneMappingExposure = 1.45;
document.getElementById('app').appendChild(renderer.domElement);

// live brightness control (wired to the HUD slider)
export function setExposure(v) { renderer.toneMappingExposure = v; }
export function getExposure() { return renderer.toneMappingExposure; }

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121711);
scene.fog = new THREE.FogExp2(0x121711, 0.013);

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
export const clock = new THREE.Clock();

const hemi = new THREE.HemisphereLight(0x6a7a52, 0x141810, 0.95);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xb8c8ff, 1.05);
moon.position.set(-30, 50, -20);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -ARENA; moon.shadow.camera.right = ARENA;
moon.shadow.camera.top = ARENA; moon.shadow.camera.bottom = -ARENA;
moon.shadow.camera.near = 1; moon.shadow.camera.far = 160;
moon.shadow.bias = -0.0004;
scene.add(moon);

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
