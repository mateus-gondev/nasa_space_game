# Opportunity — Lab Training

Projeto separado que preserva a planta top-down original do Opportunity, com o astronauta como único personagem no Instrument Lab. A geometria e os objetos do mapa vêm de `opportunity-map-engine/js/map-data.js`; os sprites são carregados da pasta original CC0, sem duplicar os PNGs.

## Executar

Na raiz do projeto, use `npm run server` ou `npm run start` e abra:

```text
http://localhost:3000/lab-training/
```

O atalho `http://localhost:3000/game` redireciona para a mesma página. O servidor entrega o projeto em `/lab-training` e os sprites em `/assets`. Se estiver usando Docker, reconstrua a imagem após alterações com `docker compose up --build -d`.

## Estrutura

```text
static/lab_training/
├── index.html
├── README.md
├── css/style.css
└── js/
    ├── config.js       # Início no Instrument Lab, velocidade e sprites
    ├── map-data.js     # Planta original, salas, portas e objetos Opportunity
    ├── animation.js    # Carregamento e reprodução dos spritesheets
    ├── character.js    # Estado e animações do astronauta
    ├── renderer.js     # Desenho do mapa original e do astronauta
    ├── controls.js     # WASD, setas e controles de toque
    ├── engine.js       # Movimento top-down, colisão, interação e loop
    └── app.js          # Inicialização, UI e API pública
```

## Controles

- `WASD` ou setas: mover pelo mapa top-down.
- `E` ou espaço: interagir com o objeto próximo.
- `1`–`4`: selecionar ferramenta científica.
- `M`: abrir/fechar o mapa; `Tab`: abrir/fechar a mochila.
- `Esc`: fechar painéis. No celular, use os controles sobre o mapa.
- Os controles de pausa, reinício e tela cheia ficam no canto superior direito.

O mapa ocupa a tela inteira; o canvas mantém a proporção da planta. O perfil do cadete (nome e personagem) fica salvo em `localStorage` na chave `opportunity.labTraining.profile`.

## API

Após carregar, use `window.labTraining`:

```js
labTraining.goToRoom("Instrument Lab");
labTraining.playAnimation("jump");
labTraining.playAnimation("death");
labTraining.setPosition(13, 4);
labTraining.setMoveSpeed(4);
labTraining.pause();
labTraining.resume();
labTraining.reset();
```

`window.opportunityMap` continua disponível com a API original da engine do mapa. Ajustes de salas e objetos ficam em `js/map-data.js`; coordenadas são medidas em tiles de 40 px. Animações, número e dimensões dos quadros e FPS ficam em `js/config.js`.
