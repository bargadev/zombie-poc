// Procedural sound — no asset files.
let actx = null;
function ctx() { return actx || (actx = new (window.AudioContext || window.webkitAudioContext)()); }

// `tone` shapes the gunshot: shorter+brighter for small guns, longer for big.
export function shotSound(tone = 1) {
  const a = ctx(); const t = a.currentTime;
  const dur = 0.12 + 0.08 * tone;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
  const src = a.createBufferSource(); src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200 + 1400 / tone;
  src.connect(lp).connect(g).connect(a.destination); src.start();
}

export function hurtSound() {
  const a = ctx(); const t = a.currentTime;
  const o = a.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
  const g = a.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g).connect(a.destination); o.start(); o.stop(t + 0.26);
}
