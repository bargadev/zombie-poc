// Tunables shared across the game.
export const ARENA = 60;           // half-extent of the playable square
export const EYE = 1.7;            // player collision/eye height
export const PLAYER_SPEED = 7;     // m/s walk
export const RUN_MULT = 1.7;
export const MAG_SIZE = 30;
export const RELOAD_TIME = 1.4;    // seconds
export const FIRE_COOLDOWN = 0.09; // seconds between shots
export const DAMAGE = 34;          // damage per bullet

export function rand(a, b) { return a + Math.random() * (b - a); }
