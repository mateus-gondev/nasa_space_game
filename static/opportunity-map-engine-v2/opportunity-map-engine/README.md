# Opportunity — Map Engine

Uma pequena engine 2D top-down, baseada no protótipo `nasa-facility-map.html`, reorganizada em arquivos separados e com pontos de personalização centralizados.

## Como executar

1. Extraia a pasta `opportunity-map-engine`.
2. Abra `index.html` no navegador (Chrome, Edge ou Firefox atual).
3. Para desenvolvimento, recomenda-se usar a extensão **Live Server** do VS Code e abrir a pasta pelo servidor local.

Não há dependências de npm ou build. A fonte IBM Plex Mono / Space Grotesk é carregada do Google Fonts; se estiver offline, fontes locais alternativas serão usadas.

## Estrutura

```text
opportunity-map-engine/
├── index.html
├── README.md
├── css/
│   └── style.css       # Interface, painéis e responsividade
└── js/
    ├── config.js       # Ajustes globais, velocidade, cores e atmosferas
    ├── map-data.js     # Planta, salas, portas, objetos e destinos
    ├── renderer.js     # Desenho do mapa, sprites e efeitos visuais
    ├── controls.js     # Teclado e controles de toque
    ├── engine.js       # Movimento, colisão, interação e loop do jogo
    └── app.js          # Inicialização e ligação com a interface
```

## Personalizar a ambientação

Edite `js/config.js`, em `atmosphere.presets`. Cada preset aceita:

- `label`: nome mostrado na interface.
- `tint`: camada de cor sobre o mapa (CSS rgba ou `null`).
- `accent`: cor de destaque para portas e seleção de objetos.
- `lightColor`: cor das luminárias.
- `lightOpacity`: intensidade base da iluminação.
- `flicker`: intensidade da oscilação das luzes (0 a 1).
- `grime`: intensidade das marcas de abandono (0 a 1).
- `vignette`: escurecimento nas bordas / lanterna (0 a 1).

Exemplo para criar um preset novo:

```js
window.MAP_ENGINE_CONFIG.atmosphere.presets.dustStorm = {
  label: "Tempestade de poeira",
  tint: "rgba(176, 91, 40, 0.28)",
  accent: "#ff9a45",
  lightColor: "#ffb66e",
  lightOpacity: 0.45,
  flicker: 0.2,
  grime: 0.8,
  vignette: 0.25
};
```

Depois de adicionar o preset, recarregue a página. O botão é criado automaticamente a partir dos presets configurados.

## Alterar o mapa

Abra `js/map-data.js`:

- `room(x1, y1, x2, y2, floorType)` cria uma área retangular com paredes e piso.
- `addProp(type, x, y, w, h, name, description, options)` adiciona um objeto.
- `destinations` define os atalhos de teletransporte entre salas.
- `lights`, `roomLabels` e `decals` controlam luminárias, placas e marcas do piso.

Coordenadas e dimensões são em tiles, não em pixels. Com o tamanho padrão, cada tile mede 40 px.

Tipos de objeto com desenho procedural incluído: `screen`, `console`, `rover`, `crate`, `spec`, `telescope`, `dish`, `bench`, `solar`, `rtg`, `rack`, `tank`, `cart`, `shelf`, `micro` e `globe`.

## Carregar seus próprios PNGs

Use o botão **Carregar imagens PNG** na lateral. O nome do arquivo (sem `.png`) identifica o sprite:

- `rover.png` substitui o desenho do rover.
- `crate.png` substitui as caixas.
- `floor0.png`, `floor1.png`, `floor2.png` e `floor3.png` substituem os pisos correspondentes.

Os sprites de objetos são ajustados ao retângulo do objeto no mapa. Para usar um sprite em vários objetos do mesmo tipo, basta carregar uma vez.

## API JavaScript

Depois da inicialização, a API fica disponível em `window.opportunityMap`:

```js
opportunityMap.setAtmosphere("emergency");
opportunityMap.goToRoom("Rover Bay");
opportunityMap.pause();
opportunityMap.resume();
opportunityMap.reset();
opportunityMap.inspect("Painel de Operações");

opportunityMap.addProp({
  type: "crate",
  x: 10,
  y: 14,
  w: 1,
  h: 1,
  name: "Amostra de solo",
  description: "Amostra coletada durante a exploração.",
  solid: true
});

// Também é possível carregar um sprite por URL:
opportunityMap.loadAsset("crate", "assets/crate.png");
```

Para adicionar uma atmosfera por código, atualize `MAP_ENGINE_CONFIG.atmosphere.presets` antes da inicialização da engine (ou adicione-a em `config.js`).

## Controles

- `WASD` ou setas: mover.
- `E` ou espaço: inspecionar objeto próximo.
- `Esc`: fechar a inspeção.
- Clique em um objeto: abrir sua descrição.
- Botões na interface: trocar atmosfera, ir para sala, pausar e reiniciar.
- Em telas touch: controles direcionais na parte inferior do mapa.

## Observações

- A colisão é baseada na grade e nos retângulos dos objetos (`solid: true`). Para permitir atravessar um objeto, defina `solid: false`.
- O mapa é desenhado em Canvas 2D e os desenhos dos objetos são vetoriais/procedurais; não há sprites externos obrigatórios.
- A engine mantém o código-fonte legível e separado por responsabilidade. Não há JavaScript minificado.

## Versão com cômodos separados (mapa ampliado)

- O mundo agora tem 80 × 52 tiles. Cada cômodo é uma sala independente (Mission Control, Atrium, Instrument Lab, Rover Bay, Storage e Power), ligada às outras por corredores com portas duplas.
- A câmera acompanha o jogador. Ajuste a área visível em `config.camera.viewTiles` e a suavidade em `config.camera.smooth`.
- `map-data.js` agora define `rooms` (retângulos e tipo de piso), `links` (corredores) e `floorDecals` (logos, faixas, cabos, texto no piso). Objetos sem nome e com `solid: false` são apenas decoração (ex.: cadeiras).
- Novos tipos de objeto: `desk`, `chair`, `plant`, `locker`, `holotable`, `whiteboard`, `rockcase`, `pallet`, `battery`, `transformer`, `roboarm`, `wheelrack`, `coffee` e `cabinet`.
- Novos pisos: `floor4` (Storage), `floor5` (Power) e `floor6` (Atrium).
