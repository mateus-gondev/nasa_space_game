# Camera POV — mecânica isolada para Three.js

Este pacote **não inclui o foguete, o cenário anterior, objetivos, captura de imagens ou minigames**.

- `CameraPOVController.js`: controlador autônomo, para importar em qualquer projeto Three.js.
- `index.html`: demonstração mínima com grade e marcadores geométricos de referência.

## Rodar

Com Python instalado, dentro desta pasta:

```bash
python -m http.server 8000
```

Acesse http://localhost:8000/. A demo carrega Three.js por CDN e necessita de conexão à internet. Pointer Lock precisa de interação direta do usuário; no celular o controle usa arrastar.

## Incorporar ao seu jogo

```js
import { CameraPOVController } from './CameraPOVController.js';

const controller = new CameraPOVController({
  camera: minhaPerspectiveCamera,
  element: renderer.domElement,
  minPitch: -80,
  maxPitch: 80,
  maxZoom: 4,
  // minYaw: -135, maxYaw: 135, // opcional: limite mecânico do rover
});

botaoAtivar.addEventListener('click', () => controller.enable());
botaoSair.addEventListener('click', () => controller.disable());

// Dentro do requestAnimationFrame:
controller.update(clock.getDelta());
renderer.render(scene, minhaPerspectiveCamera);

// Ao desmontar o sistema:
controller.dispose();
```

Recursos: rotação por mouse (Pointer Lock), arrastar (inclusive touch), suavização independente do FPS, limite vertical, limites horizontais opcionais, zoom por FOV, scroll, reset, Escape, setas, métodos e callbacks de estado, limpeza de event listeners. A câmera fica em posição fixa; movimentação espacial é responsabilidade do jogo que a integrar.
