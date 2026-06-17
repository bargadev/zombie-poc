# Modelo riggado — o que é e dá pra usar no ZOMBIE-POC?

## TL;DR

- **Modelo riggado** = uma malha 3D ("pele") deformada por um **esqueleto de ossos** (rig), com **animações** (andar, atirar, morrer) gravadas como rotação dos ossos ao longo do tempo.
- **Dá pra implementar?** Sim, tecnicamente é direto no Three.js (`GLTFLoader` + `SkinnedMesh` + `AnimationMixer`). O custo **não é código** — é **conteúdo**: alguém precisa modelar, riggar, pesar (skin weights) e animar o personagem, ou baixar um asset pronto (com licença).
- Para o nosso jogo atual (estilo **voxel, sem assets, tudo em código**), trocar para riggado **muda a natureza do projeto**: passa a depender de arquivos de modelo externos.

---

## O que compõe um modelo riggado

1. **Malha (mesh / skin)** — a geometria visível (o "corpo"). Hoje montamos o corpo com caixas/cápsulas/esferas; num modelo riggado é uma única malha contínua, geralmente esculpida.

2. **Esqueleto (armature / rig)** — uma hierarquia de **ossos** (`THREE.Bone`): quadril → coluna → ombro → braço → antebraço → mão, etc. Os ossos não aparecem; servem de "controle".

3. **Skinning / skin weights** — cada vértice da malha é "amarrado" a um ou mais ossos com um **peso** (0–1). Quando o osso do cotovelo gira, os vértices do antebraço acompanham (peso alto) e o ombro quase não mexe (peso baixo). Isso é o que faz a malha **dobrar suavemente** em vez de quebrar em blocos. No Three.js isso é uma `THREE.SkinnedMesh` + `THREE.Skeleton`.

4. **Animações (clips)** — sequências de keyframes (rotação/posição dos ossos no tempo): `idle`, `walk`, `run`, `aim`, `shoot`, `reload`, `death`. No Three.js são `THREE.AnimationClip`, tocadas e misturadas por um `THREE.AnimationMixer` (dá pra fazer *crossfade* entre andar e correr, por exemplo).

### Como o Three.js carrega isso

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('hero.glb', (gltf) => {
  const hero = gltf.scene;              // SkinnedMesh + Skeleton já montados
  scene.add(hero);

  const mixer = new THREE.AnimationMixer(hero);
  const clips = gltf.animations;        // ['idle','walk','shoot',...]
  const walk = mixer.clipAction(THREE.AnimationClip.findByName(clips, 'walk'));
  walk.play();

  // no loop:  mixer.update(dt);
});
```

O formato padrão é **glTF/GLB** (`.glb` = binário, um arquivo só com malha + esqueleto + animações + texturas).

---

## O que nós temos hoje (e por que é "duro")

No ZOMBIE-POC o personagem é montado **proceduralmente** com primitivas (`RoundedBoxGeometry`, `CapsuleGeometry`, `SphereGeometry`) e animado **girando partes** (`mesh.rotation.x`) — ver `src/player.js` e `src/zombies.js`.

- ✅ Sem assets, sem build, carrega na hora, 100% no código.
- ✅ Fácil de variar (16 inimigos saem de tabelas de cor/tamanho).
- ❌ Não tem deformação contínua: membros são peças rígidas → aspecto "Minecraft".
- ❌ Pose realista exige IK/ajuste manual (foi o que fizemos pras duas mãos na arma).

---

## Caminhos para deixar mais realista

### Opção A — Adotar modelos riggados (glTF) **[mais realista, maior custo de conteúdo]**

Passos:
1. Conseguir um `hero.glb` riggado e animado:
   - **Pronto/grátis**: Mixamo (Adobe) — personagens + animações riggadas, exporta glTF/FBX. Quattro/Sketchfab/Poly Pizza/Kenney também têm assets (conferir **licença** antes de redistribuir).
   - **Próprio**: modelar no Blender, riggar (Rigify), pesar, animar, exportar `.glb`.
2. Código (pequeno): trocar o `buildHero()` por `GLTFLoader` + `AnimationMixer`; mapear estados do jogo (parado/andando/atirando/recarregando) para clips com crossfade.
3. Mirar: ainda dá pra usar a câmera over-shoulder; o tronco/cabeça podem seguir o pitch via **bone override** (girar o osso da coluna no `mixer.update`).

Trade-offs:
- Depende de arquivos externos (tamanho, carregamento, **licença**).
- Quebra a estética voxel coesa (a não ser que os assets também sejam low-poly).
- Animar 16 inimigos diferentes (incl. animais e elefante) = muito mais conteúdo.

**Esforço:** código ~baixo; conteúdo ~alto. Melhor se aceitarmos assets de terceiros.

### Opção B — Riggar o nosso próprio modelo procedural **[meio-termo, fica no estilo]**

Montar uma `SkinnedMesh` em código: gerar uma malha (ou costurar as cápsulas numa malha só), criar `THREE.Bone`s, definir `skinIndices`/`skinWeights` e animar os ossos. Mantém "sem assets", ganha deformação contínua nas juntas.

**Esforço:** código ~alto (skinning manual é trabalhoso); sem dependência externa. É a rota "engenharia" se quisermos manter tudo no código.

### Opção C — Melhorar o procedural atual **[barato, já em andamento]**

Sem rig: mais segmentos, cápsulas/esferas (já feito no herói), **IK de 2 ossos** pra poses (já feito nas mãos na arma), juntas arredondadas, e animação por *easing* (mais fluida). Não fica fotorrealista, mas sai bem do "Minecraft".

**Esforço:** baixo; sem dependência. É o que estamos fazendo.

---

## Recomendação

- Quer **o melhor visual com menos código** e aceita asset de terceiro → **Opção A** com um personagem do **Mixamo** (riggado + animações prontas). Posso fazer a integração `GLTFLoader`/`AnimationMixer` assim que houver um `.glb`.
- Quer **manter "tudo no código / sem assets"** → seguimos na **Opção C** (e, se valer a pena, parto pra **Opção B** no herói).

> Observação honesta: **fotorrealismo** de verdade (PBR, normal maps, animação capturada) sempre vem de **assets**; não dá pra gerar isso só com primitivas em código.
