// Weapon roster. Each weapon carries its own runtime `ammo` so switching keeps
// per-gun reserves. Press 1-5 to quick-switch, or B for the picker.
// `hold` poses each weapon differently: gun = gun position (aim-local),
// rHand/lHand = where the right/left hand grip it (arms are rebuilt to reach).
export const WEAPONS = [
  { name: 'Pistola', dmg: 34,  mag: 12, cooldown: 0.18, reload: 1.1, auto: false, pellets: 1, spread: 0.0,   range: 200, color: 0x9aa0a6, len: 0.55, tone: 0.7, ammo: 12,
    hold: { gun: [0.05, 0.18, 0.46], rHand: [0.05, 0.18, 0.40], lHand: [-0.02, 0.17, 0.45] } },
  { name: 'SMG',     dmg: 17,  mag: 30, cooldown: 0.07, reload: 1.4, auto: true,  pellets: 1, spread: 0.025, range: 120, color: 0x6a6f75, len: 0.70, tone: 0.6, ammo: 30,
    hold: { gun: [0.04, 0.26, 0.44], rHand: [0.12, 0.25, 0.30], lHand: [-0.03, 0.21, 0.52] } },
  { name: 'Shotgun', dmg: 14,  mag: 6,  cooldown: 0.55, reload: 2.0, auto: false, pellets: 9, spread: 0.10,  range: 40,  color: 0x7a5a3a, len: 0.80, tone: 1.6, ammo: 6,
    hold: { gun: [0.04, 0.26, 0.47], rHand: [0.12, 0.25, 0.32], lHand: [-0.03, 0.21, 0.56] } },
  { name: 'Rifle',   dmg: 46,  mag: 20, cooldown: 0.12, reload: 1.6, auto: true,  pellets: 1, spread: 0.006, range: 200, color: 0x4a5a3a, len: 0.85, tone: 1.0, ammo: 20,
    hold: { gun: [0.04, 0.28, 0.46], rHand: [0.13, 0.27, 0.30], lHand: [-0.03, 0.23, 0.56] } },
  { name: 'Sniper',  dmg: 150, mag: 5,  cooldown: 0.95, reload: 2.3, auto: false, pellets: 1, spread: 0.0,   range: 320, color: 0x2a2f3a, len: 1.05, tone: 1.8, ammo: 5,
    hold: { gun: [0.04, 0.30, 0.52], rHand: [0.13, 0.29, 0.32], lHand: [-0.03, 0.25, 0.62] } },
];

export function resetAmmo() { for (const w of WEAPONS) w.ammo = w.mag; }
