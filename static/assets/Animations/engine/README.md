# Engine de animações Three.js

`index.js` exporta `createAnimation(options)`. O capacete em
`../animação capacete atualizada/index.js` é a primeira integração.
O HTML existente continua funcionando sozinho e dentro do iframe do treinamento.

O foguete `../opportunity_mars01_rocket.html` também usa a engine, por meio de
`../mars01-rocket/index.js`. A cena procedural fica em `mars01-rocket/scene.js`;
o HTML mantém a interface, a telemetria e o fallback CSS. Os dois exemplos usam
a mesma versão Three.js 0.170.0 pelo importmap.

A engine reutiliza o player do capacete: renderização pixelada, limite de FPS,
HUD, legendas, bipes e controles. Cena, coreografia e paleta ficam na animação.
Os módulos ES são servidos pela rota `/assets` existente, sem build.
O HTML deve definir o importmap de `three` antes de importar os módulos
(o exemplo mantém Three.js 0.170.0 via CDN e exige internet).

## Nova animação

```js
import { createAnimation } from '/assets/Animations/engine/index.js';
import { createScene } from './scene.js';

const animation = createAnimation({
  container: document.getElementById('stage'),
  createScene,
  duration: 8, // segundos
  width: 192, // altura padrão 16:9; CSS amplia o canvas
  fps: 15,
  captions: [[0, 'INICIANDO'], [4, 'PRONTO']],
  hud: [[4, 'SISTEMA OK']],
  beeps: [[4, 880, 0.1]], // tempo, frequência, duração
  onComplete: () => console.log('Concluído'),
});

// Habilite áudio a partir de um clique do usuário.
document.getElementById('sound').onclick = () => animation.setSound(true);
window.addEventListener('pagehide', () => animation.dispose(), { once: true });
```

`createScene({ width, height })` retorna:

- `scene` e `camera`: objetos Three.js.
- `update(seconds)`: aplica a pose para um tempo absoluto, inclusive ao voltar a zero.
- `dispose()`: libera geometrias, materiais, texturas e demais recursos próprios.

Configurações opcionais: `height`, `autoplay` (padrão `true`), `loop` e `sound`
(padrão `false`), `showHud` (padrão `true`) e `fontFamily`.
As listas de HUD, legendas e bipes devem estar ordenadas pelo tempo.

O retorno oferece `play()`, `pause()`, `reset()`, `restart()`, `setSound(on)`, `dispose()`
e as propriedades `root`, `time`, `duration`, `playing` e `completed`.
`reset()` volta ao início sem iniciar a reprodução e chama `world.reset()`, se existir.
Ao terminar sem loop, dispara `animation:complete` no elemento raiz e chama
`onComplete(api)` uma vez. Use `restart()` para reproduzir novamente.
Com loop, a linha do tempo e o áudio voltam ao início sem disparar conclusão.
Pausas e abas inativas não causam saltos grandes na coreografia.

O adaptador do capacete também preserva `helmet-intro:complete`.
Seu HTML envia `helmet-animation-complete` ao treinamento no modo `?embed=1`.
Ao descartar, a engine cancela o frame, fecha o áudio, libera a cena e o renderer
e remove seu elemento. Cada animação é responsável por descartar seus recursos
compartilhados uma única vez.

Execute `npm test` para verificar reprodução, pausa, reinício, loop, FPS,
HUD, conclusão, validação de parâmetros e descarte, além do tutorial existente.

## Recursos extraídos do foguete

- `pixelated: false`: canvas suave com antialias e transparência, sem scanlines.
- `responsive: true`: ocupa o container e acompanha seu tamanho com `ResizeObserver`;
  atualiza a câmera e chama `world.resize(width, height)`, se existir.
- `maxPixelRatio` (padrão `1.6`): limita a resolução em telas de alta densidade.
- `rendererOptions`: opções adicionais do construtor WebGLRenderer.
- `configureRenderer(renderer)`: configura sombras, tone mapping e exposição.
- `animateWhenPaused: true`: mantém a prévia animada sem avançar a reprodução.
  `pause()` congela a linha do tempo; `dispose()` também encerra a prévia.
- `onUpdate(state, api)`: recebe `time`, `duration`, `playing`, `completed` e `data`.
  `data` é o retorno de `world.update`, usado pelo foguete para altitude e status.

`createScene` agora também recebe `element`, o elemento raiz da animação.
`world.update(seconds, context)` recebe `elapsed` (tempo visual, inclusive na prévia),
`playing` e `completed`. A linha do tempo de lançamento continua em `seconds`.

Helpers disponíveis, sem dependências além do próprio Three.js:

```js
import { createDragRotation } from '/assets/Animations/engine/controls.js';
import { createExhaustParticles } from '/assets/Animations/engine/particles.js';
import { addMesh } from '/assets/Animations/engine/scene.js';
import { disposeScene } from '/assets/Animations/engine/resources.js';
```

`createDragRotation(element, { initial, sensitivity })` expõe `angle`, `reset()` e
`dispose()`. Suporta mouse e toque com captura do ponteiro e remove seus listeners.
Use `angle` na rotação de um objeto durante `update`.

`createExhaustParticles({ count, color, opacity, spread, fall })` expõe `group`,
`update(seconds, height)`, `reset()` e `dispose()`. As partículas usam a fórmula de
poeira do foguete, com quatro geometrias compartilhadas e sem criar objetos por frame.
Adicione `group` à cena. Se `disposeScene` já descartar essa cena, não chame também
o descarte individual das partículas.

`addMesh(parent, geometry, material, { position, rotation, scale, castShadow,
receiveShadow })` compõe modelos de geometrias nativas.
`disposeScene(scene, extraResources)` libera geometrias, materiais, mapas de textura,
sombras e recursos de malhas instanciadas, evitando duplicações. Serve para recursos
que pertencem à animação; recursos compartilhados entre players precisam de gestão externa.

O adaptador `createRocketIntro(options)` fornece o preset suave com sombras,
lançamento de 5,8 segundos e evento `rocket-intro:complete`. O HTML envia
`rocket-animation-complete` ao hospedeiro no modo `?embed=1`.
