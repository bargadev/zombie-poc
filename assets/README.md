# assets/

Drop a rigged character here as **`hero.glb`** and the game swaps the procedural
hero for it automatically (no code change). If this file is absent, the game uses
the built-in procedural hero (which already holds the gun two-handed).

## Getting a model from Mixamo (free, rigged + animated)

1. Go to **https://www.mixamo.com** (free Adobe account).
2. Pick a **Character** (e.g. "Y Bot" or any humanoid).
3. Pick an **Animation** — search for **"Rifle Idle"**, **"Pistol Idle"** or
   **"Aiming Idle"** so the character holds the gun steady (not walking).
4. **Download** with:
   - Format: **glTF Binary (.glb)** *(if only FBX is offered, export FBX then
     convert to .glb in Blender: File → Import FBX → File → Export glTF 2.0)*
   - Skin: **With Skin**
   - Frames per Second: 30, Keyframe Reduction: none
5. Rename the file to **`hero.glb`** and put it in this folder.
6. Reload the game. Open DevTools console — `[hero] loaded …` shows the detected
   clips and hand bone.

## Tuning (src/herogltf.js → MODEL)

| Field     | What it does |
|-----------|--------------|
| `url`     | path to the model (default `./assets/hero.glb`) |
| `scale`   | bump up/down if the character is too big/small |
| `faceYaw` | set to `Math.PI` if the character faces away from where it walks |
| `clip`    | force a specific animation name (default auto-picks aim/idle) |

The gun is positioned at the detected **right-hand bone** each frame, pointing
down the aim direction — so a model in an aiming pose looks like it's holding and
aiming the weapon.

## Quick test without Mixamo

Set `MODEL.url` in `src/herogltf.js` to a CC-licensed sample to verify the
pipeline, e.g. CesiumMan (note: it only has a *walk* clip, so it won't aim):
`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb`
