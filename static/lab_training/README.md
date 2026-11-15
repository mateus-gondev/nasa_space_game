# Opportunity — Lab Training

Projeto de treinamento baseado no mapa ampliado do Opportunity Map Engine v2. O personagem jogável é o astronauta com sprites e animações; a câmera, colisões, salas e renderização usam a engine v2.

## Executar

Na raiz do projeto, use `npm run server` ou `npm run start` e abra:

```text
http://localhost:3000/lab-training/
```

O atalho `http://localhost:3000/game` redireciona para o menu em `/`. Play abre o treinamento em `/lab-training/`. O servidor entrega os sprites em `/assets` e o código da engine v2 em `/map-engine-v2`. A engine é carregada de `static/opportunity-map-engine-v2/opportunity-map-engine`; mantenha essa pasta junto ao projeto. Se estiver usando Docker, reconstrua a imagem após alterações com `docker compose up --build -d`.

## Estrutura

```text
static/lab_training/
├── index.html
├── README.md
├── css/style.css       # Layout fullscreen e HUD
└── js/
    ├── config.js       # Parâmetros v2, início no Instrument Lab e sprites
    ├── map-data-training.js # Ajustes do mapa para o treinamento, sem logos NASA
    ├── animation.js    # Carregamento e reprodução dos spritesheets
    ├── character.js    # Estado e animações do astronauta
    ├── tutorial.js     # Etapas e condições de progresso do tutorial
    ├── tutorial-navigation.js # Percursos, destaques e desenho da espaçonave
    └── app.js          # Inicialização, UI e API pública
```

`renderer.js`, `controls.js`, `engine.js` e `map-data.js` são servidos diretamente da pasta da Opportunity Map Engine v2 em `/map-engine-v2/js/`. A engine mantém seu comportamento genérico quando usada sem o personagem customizado; no Lab Training, ela conecta o `LabCharacter` e a interação do tutorial.

## Menu inicial

O menu com Play, Settings, Info e Créditos fica em `static/main_menu/`, com `index.html`, CSS, JavaScript e imagens próprios. Acesse `http://localhost:3000/` ou `/game`. Settings seleciona a ambientação enviada ao treinamento pelo parâmetro `atmosphere` e permite alternar a tela cheia; Info resume os controles. Play abre a preparação do treinamento, preenchendo o nome do perfil salvo quando disponível. O acesso direto a `/lab-training/` também funciona sem passar pelo menu.

Na preparação, selecionar traje e capacete reproduz as animações 8-bit correspondentes. Cada etapa avança ao terminar a sequência e também pode ser pulada.

## Tutorial guiado

O treinamento avança por ações do jogador, com briefings, objetivo persistente, atalhos destacados e uma trilha âmbar que respeita as paredes e os equipamentos. O mapa mostra o percurso e o objetivo atual. Use **Rever instrução** para consultar novamente o briefing.

1. Vestir traje e capacete; o nome salvo é reutilizado, mas a preparação acontece em cada sessão.
2. Caminhar com WASD ou setas e abrir/fechar o mapa com M.
3. Interagir com a Antena de Alto Ganho usando E e caminhar na simulação de baixa gravidade.
4. Seguir ao laboratório na sala Atrium e testar, em ordem, câmera (1), microscópio (2), sensor de temperatura (3) e furadeira (4). E usa a ferramenta no alvo destacado; ferramentas ou estações incorretas não avançam o tutorial.
5. Abrir a mochila com Tab para conferir os quatro resultados nos slots centrais e fechá-la.
6. Seguir a trilha até a sala de lançamento MARS 01 no Rover Bay, mantendo o traje e o capacete colocados no início. Atravesse a porta para entrar no protótipo 3D.
7. Usar **Iniciar lançamento** e acompanhar o voo do foguete para concluir o treinamento. **Voltar ao laboratório** ou Esc sai da sala sem concluir; é possível entrar de novo. Ao terminar o voo, a mensagem final permite continuar explorando ou voltar ao menu; a próxima missão ainda não é carregada.

O botão Reiniciar limpa o progresso e retorna à preparação. Os controles de toque permitem realizar as mesmas etapas no celular. Execute `npm test` para verificar a progressão e os percursos de todos os objetivos na planta real.

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

## Câmera científica 3D

Perto do alvo fotográfico, pressione **1** (ou Pesquisa → Câmera científica) para abrir a visão 3D do ambiente na posição atual do astronauta. Paredes, pisos, passagens e equipamentos são gerados da mesma planta usada no mapa. A câmera fica fixa; use **Esc** ou **Voltar ao mapa** para caminhar até outro ponto.

Arraste com mouse/toque ou use as setas para olhar. **Capturar mouse** ativa Pointer Lock quando disponível; arrastar continua disponível se o navegador negar. Scroll e controle Zoom ajustam a lente de 1× a 4×; **R** ou Centralizar restaura a orientação de abertura. **E** ou Fotografar registra a imagem quando o terreno simulado está na mira, ao alcance do personagem, durante a etapa da câmera. Paredes e objetos bloqueiam a mira. A foto aparece no primeiro slot da mochila durante a sessão; sair sem fotografar não avança o tutorial.

O Three.js 0.180.0 é servido localmente em `/vendor/three`, sem CDN. A integração está em `js/camera-view.js` e reutiliza `CameraPOVController` em `static/assets/Animations/CameraPOV_arquivos`. A vista exige WebGL 2; falhas de inicialização exibem uma mensagem e permitem voltar ao mapa. `npm test` verifica o controller e a geometria/mira contra a planta real.

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
