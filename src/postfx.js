// Post-processing chain: bloom on the emissive eyes/muzzle, a film
// grain + vignette + subtle chromatic-aberration grade, ACES output and SMAA.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { renderer, scene, camera } from './core.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom — strength, radius, threshold. Threshold sits below the emissive HDR
// values so glowing eyes / muzzle flash bleed light, but lit surfaces don't.
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.6, 0.5);
composer.addPass(bloom);

// Vignette + film grain + chromatic aberration (operates in linear HDR, pre-output).
const GradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignette: { value: 1.15 },
    grain: { value: 0.05 },
    aberration: { value: 0.0016 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vignette, grain, aberration;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      vec2 off = d * aberration;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col *= smoothstep(0.95, 0.25, length(d) * vignette);    // vignette
      col += (rnd(vUv * vec2(1024.0, 768.0) + time) - 0.5) * grain; // film grain
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(GradePass);

composer.addPass(new OutputPass());                  // ACES tone map + sRGB
composer.addPass(new SMAAPass(innerWidth, innerHeight));

addEventListener('resize', () => composer.setSize(innerWidth, innerHeight));

export { composer };
export function updateFx(t) { GradePass.uniforms.time.value = t; }
