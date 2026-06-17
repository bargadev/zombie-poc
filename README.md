# ZOMBIE-POC

Shooter de sobrevivência zumbi com **câmera over-the-shoulder (Resident Evil 4)**, visual **voxel** (cubos arredondados), rodando no navegador com **WebGL + Three.js** — sem build, sem dependências instaladas (Three.js via CDN/importmap).

- **Personagem jogável**: herói voxel procedural que segura a arma com as **duas mãos**, firme. Suporta **drop-in de modelo riggado** (Mixamo): coloque `assets/hero.glb` e o jogo troca sozinho (detecta osso da mão + clip de mira). Veja `assets/README.md`.
- **16 inimigos**: 10 zumbis humanoides + 6 **animais** (Rato, Cão, Javali, Urso, **Elefante** quadrúpedes e Corvo voador), liberados conforme a wave avança.
- **5 armas** trocáveis com dano/pente/cadência/spread próprios.
- Pulo, recarga animada, partículas de sangue, áudio procedural, pós-processamento (bloom/ACES/grão) e **brilho ajustável** no menu.
- Herói com modelo arredondado (cápsulas/esferas, menos "voxel duro").

## Rodar

ES modules exigem HTTP (não funciona em `file://`):

```bash
python3 -m http.server 8080   # ou: npx serve .
```

Abra http://localhost:8080

## Controles

| Tecla        | Ação                          |
|--------------|-------------------------------|
| `W A S D`    | mover (relativo à câmera)     |
| `Space`      | pular                         |
| `Mouse`      | girar câmera / mirar          |
| `Click`      | atirar (auto nas armas auto)  |
| `Shift`      | correr                        |
| `R`          | recarregar                    |
| `B`          | menu de armas                 |
| `1`–`5`      | troca rápida de arma          |
| `Esc`        | pausar                        |

## Armas

| # | Arma    | Dano | Pente | Cadência | Modo |
|---|---------|------|-------|----------|------|
| 1 | Pistola | 34   | 12    | média    | semi |
| 2 | SMG     | 17   | 30    | rápida   | auto |
| 3 | Shotgun | 14×9 | 6     | lenta    | semi |
| 4 | Rifle   | 46   | 20    | rápida   | auto |
| 5 | Sniper  | 150  | 5     | lenta    | semi |

## Inimigos

**Humanoides:** Walker · Crawler · Runner · Spitter · Screamer · Soldier · Bloated · Child · Brute · Ghoul
**Animais:** Rato · Cão · Javali · Corvo (voa) · Urso · Elefante (tromba + presas, chefão)

Cada um tem cor, escala, vida, velocidade, pontuação e wave de entrada próprias.

## Arquitetura

Tudo em ES modules sob `src/` (entry: `main.js` → `src/game.js`):

| Arquivo            | Responsável por |
|--------------------|-----------------|
| `constants.js`     | tunables + `rand` |
| `core.js`          | renderer, scene, camera, clock, luzes, resize |
| `voxel.js`         | cache de materiais + `RoundedBoxGeometry` helpers + paleta |
| `world.js`         | chão, paredes, obstáculos (AABB de colisão) |
| `particles.js`     | pool de sangue |
| `audio.js`         | tiro/dano procedurais (WebAudio) |
| `hud.js`           | DOM/HUD, toast, menu de armas |
| `state.js`         | estado mutável compartilhado + hooks |
| `weapons.js`       | roster de armas |
| `player.js`        | herói voxel, arma, mouse-look, pulo, câmera RE4 |
| `zombies.js`       | tipos, builders (humanoide/quadrúpede/voador), IA + animação |
| `game.js`          | máquina de estados, waves, tiro, troca de arma, loop |

Grafo de dependências acíclico: módulos-folha (`constants`, `voxel`, `audio`, `hud`, `state`, `weapons`) → `core`/`world`/`particles` → `player` → `zombies` → `game` → `main`.

## Créditos

- Herói padrão: modelo **procedural** (sem assets externos).
- Modelo riggado opcional (drop-in): traga o seu (ex.: **Mixamo**, grátis). Se usar um asset de terceiros (CesiumMan/Sketchfab/etc.), respeite a licença (CC-BY exige atribuição).
- Engine: [Three.js](https://threejs.org) r160 (CDN).
