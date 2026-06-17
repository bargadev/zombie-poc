// Shared mutable game state — kept dependency-free so every module can import it
// without creating cycles.
export const game = {
  state: 'menu',     // menu | playing | dead
  health: 100,
  score: 0,
  wave: 0,
  weapon: 0,         // index into WEAPONS
  reloading: false,
  reloadT: 0,
  fireT: 0,
  toSpawn: 0,
  spawnT: 0,
  recoil: 0,
  weaponMenu: false, // is the B weapon picker open?
};

export const zombies = [];

// Hooks wired up by game.js so lower-level modules can signal events without
// importing the game loop (avoids import cycles).
export const hooks = {};
