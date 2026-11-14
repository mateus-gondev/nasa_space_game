# Opportunity — Lab Training

Projeto de treinamento baseado no mapa ampliado do Opportunity Map Engine v2. O personagem jogável é o astronauta com sprites e animações; a câmera, colisões, salas e renderização usam a engine v2.

## Executar

Na raiz do projeto, use `npm run server` ou `npm run start` e abra:

```text
http://localhost:3000/lab-training/
```

O atalho `http://localhost:3000/game` redireciona para a mesma página. O servidor entrega o projeto em `/lab-training`, os sprites em `/assets` e o código da engine v2 em `/map-engine-v2`. A engine é carregada de `static/opportunity-map-engine-v2/opportunity-map-engine`; mantenha essa pasta junto ao projeto. Se estiver usando Docker, reconstrua a imagem após alterações com `docker compose up --build -d`.

## Estrutura

```text
static/lab_training/
├── index.html
├── README.md
├── assets/             # Logo e arte de fundo do menu inicial
├── css/style.css       # Layout fullscreen, HUD e menu
└── js/
    ├── config.js       # Parâmetros v2, início no Instrument Lab e sprites
    ├── map-data-training.js # Ajustes do mapa para o treinamento, sem logos NASA
    ├── animation.js    # Carregamento e reprodução dos spritesheets
    ├── character.js    # Estado e animações do astronauta
    └── app.js          # Inicialização, UI e API pública
```

`renderer.js`, `controls.js`, `engine.js` e `map-data.js` são servidos diretamente da pasta da Opportunity Map Engine v2 em `/map-engine-v2/js/`. A engine mantém seu comportamento genérico quando usada sem o personagem customizado; no Lab Training, ela conecta o `LabCharacter` e a interação do tutorial.

## Menu inicial

O menu com Play, Settings, Info e Créditos aparece antes de cada nova sessão. Settings altera a ambientação e permite alternar a tela cheia; Info resume os controles. Play inicia a missão com o perfil salvo ou abre o cadastro e a preparação do traje no primeiro acesso.

Na preparação, selecionar traje e capacete reproduz as animações 8-bit correspondentes. Cada etapa avança ao terminar a sequência e também pode ser pulada.

Durante a missão, o HUD usa os ícones pixelados do pacote `static/assets/visuals/hud_assets`: perfil e localização, indicadores de suporte vital e atalhos para pesquisa, mapa e mochila. Os recursos aparecem como nominais (100%) nesta fase; ainda não há consumo de sobrevivência implementado. Obra e reparo ficam sinalizados como indisponíveis neste treinamento.

## Controles

- `WASD` ou setas: mover pelo mapa top-down.
- `E` ou espaço: interagir com o objeto próximo.
- `1`–`4`: selecionar ferramenta científica.
- `M`: abrir/fechar o mapa; `Tab`: abrir/fechar a mochila.
- Clique em Pesquisa para abrir as ferramentas científicas ou em Mapa/Mochila para abrir esses painéis.
- `Esc`: fechar painéis. No celular, use os controles sobre o mapa.
- Os controles de pausa, reinício e tela cheia ficam no canto superior direito.

O mapa ocupa a tela inteira; o canvas mantém a proporção da planta. O perfil do cadete (nome e personagem) fica salvo em `localStorage` na chave `opportunity.labTraining.profile`.

## API

Após carregar, use `window.labTraining`:

```js
labTraining.goToRoom("Instrument Lab");
labTraining.playAnimation("jump");
labTraining.playAnimation("death");
labTraining.setPosition(60, 11);
labTraining.setMoveSpeed(4);
labTraining.pause();
labTraining.resume();
labTraining.reset();
```

`window.opportunityMap` continua disponível com a API do mapa. A planta base e os objetos vêm de `static/opportunity-map-engine-v2/opportunity-map-engine/js/map-data.js`; coordenadas são medidas em tiles de 40 px. O treinamento remove decals e logos NASA. Animações, número e dimensões dos quadros e FPS ficam em `js/config.js`.
