# Opportunity — exploração e futura base em Marte

Jogo educativo de exploração espacial em desenvolvimento, com menu inicial, treinamento guiado em laboratório, instrumentos científicos, animações 3D de preparação e lançamento, e exploração de mapas de Marte em tela inteira.

**Estado atual:** protótipo jogável de treinamento e exploração. Ainda não é um simulador completo de administração de uma base. Os indicadores visuais de suporte vital e os equipamentos disponíveis não significam que os respectivos sistemas de sobrevivência já estejam implementados.

Documentação referente ao código disponível em **15 de novembro de 2026**. Os próximos passos abaixo são propostas de desenvolvimento, não funcionalidades já entregues.

## Objetivo do projeto

O desafio de referência é:

> Space-themed STEM content often oversimplifies the engineering trade-offs that define a real mission or presents them at a level too complex to hold a young learner's attention. Few tools make those trade-offs both tangible and fun. Your challenge is to design and build an interactive game or app that lets students run a lunar or Martian outpost, balancing competing demands like life support, radiation shielding, power, and food production, so they experience firsthand the decisions that determine whether a mission fails or succeeds.

Nossa direção é transformar a exploração de Marte em um jogo no qual estudantes administram uma base e percebem as consequências de suas escolhas. O jogador deverá decidir como distribuir energia, água, materiais e tempo entre sobrevivência, proteção, alimentação, manutenção e pesquisa.

Uma decisão precisa produzir uma consequência compreensível: dedicar energia à estufa melhora a alimentação, mas pode reduzir a reserva disponível para reciclar água ou atravessar a noite. Construir proteção contra radiação exige materiais e tempo que também poderiam ampliar a base. Esses conflitos ainda precisam ser implementados como um sistema integrado.

## Como executar

É necessário Node.js com npm. O Dockerfile usa Node 22.

```powershell
npm install
npm run server
```

Abra `http://localhost:3000/`. A variável de ambiente `PORT` permite alterar a porta.

Com Docker e Compose:

```powershell
docker compose up --build
```

`npm start` executa esse mesmo fluxo do Docker. O Compose publica a porta 3000 e não monta o código como volume: alterações exigem reconstruir a imagem. Para executar diretamente com Node, use `npm run server`.

O servidor e os mapas 2D usam arquivos locais. Alguns exemplos de animação 3D contêm importmaps com dependências via CDN; não considerar todo o projeto validado para uso offline. A rota local `/vendor/three` também está disponível.

## Fluxo jogável atual

1. Abrir o menu e selecionar **Iniciar**.
2. Informar ou reutilizar o nome do cadete, vestir traje e capacete.
3. Completar o treinamento de movimento, navegação, baixa gravidade e instrumentos.
4. Conferir os resultados na mochila e entrar na sala MARS 01.
5. Acionar o foguete e acompanhar o lançamento 3D.
6. Ao terminar o voo, entrar na **Área de pouso**, o mapa com a nave de `static/assets/marte_tilemap`.
7. Caminhar pela passagem leste entre as balizas para acessar a **Bacia de mineração**; outra passagem leste leva à **Cratera de pesquisa**. As passagens oeste permitem voltar.

O mapa da nave fornecido é uma área externa de pouso, com a nave desenhada sobre o terreno. O pacote não contém um interior navegável da nave.

## O que já foi desenvolvido

### Menu, preparação e preferências

- Menu independente com Iniciar, Configurações, Info e Créditos.
- Música do menu, controle de volumes e efeitos.
- Preferências de idioma português/inglês e legendas, compartilhadas com o treinamento.
- Seleção de idioma com bandeiras e interação por teclado e mouse.
- Perfil local do cadete e preparação com traje e capacete.
- Animações de preparação incorporadas ao fluxo, com conclusão e opção de pular.

A tradução do treinamento não representa cobertura completa dos mapas de exploração, cujos textos permanecem majoritariamente em português.

### Laboratório e tutorial

- Astronauta com sprites e animações; movimento com teclado e toque.
- Colisões com paredes e equipamentos, salas, portas e navegação pelo mapa.
- Tutorial sequencial com condições de avanço, briefings e instruções consultáveis.
- Trilha de orientação que respeita obstáculos e destaca o objetivo atual.
- Treino de movimento e simulação de baixa gravidade.
- Quatro instrumentos: câmera científica, microscópio portátil, sensor de temperatura e furadeira de amostras.
- Validação de ferramenta e estação correta antes de avançar.
- Mochila com os resultados da sessão, incluindo a fotografia científica.
- HUD com perfil, localização, recursos e atalhos de pesquisa, mapa e mochila.
- Pausa, reinício, tela cheia e controles de toque.

Os medidores de oxigênio, água, energia e alimentação do laboratório são nominais. Não há consumo integrado de sobrevivência nessa fase. Construção e reparo ainda não estão disponíveis como ações de jogo.

### Câmera e animações 3D

- Visão científica 3D gerada a partir da planta do laboratório.
- Mira, rotação, zoom, centralização e perfis de qualidade.
- Captura científica com validação de alvo, alcance e oclusão.
- Suporte a arrastar com mouse/toque e captura de mouse quando disponível.
- Engine reutilizável de animações Three.js, controle de reprodução e descarte de recursos.
- Modelos procedurais dos equipamentos do laboratório.
- Cena interativa de lançamento MARS 01 com trajetória e telemetria.
- Comunicação entre a animação incorporada e o treinamento; concluir o voo carrega a fase de Marte. Cancelar permite retornar ao laboratório.

### Exploração de Marte em tela inteira

- Mapa ocupa toda a janela, sem cabeçalho, cartões de regiões, painel lateral ou minimapa permanente.
- Câmera ajusta a área visível à proporção da tela.
- Movimento, colisões, inspeção e ações em objetos próximos.
- Menus de pausa e viagem aparecem somente quando solicitados.
- Controles de toque sobre o mapa em dispositivos compatíveis.
- Energia simplificada: deslocamento e algumas ações consomem energia; pontos de recarga restauram energia.
- Análise de amostras por sintonia, comunicações, registros e suprimentos.
- Persistência local de descobertas, região, energia, distância, coleta e diário.

Essa energia ainda não é uma rede elétrica de base. Não existem geradores conectados a consumidores, distribuição por prioridade ou dimensionamento de baterias. Oxigênio coletável também não equivale a um modelo de atmosfera de habitat.

### Mapas do pacote `marte_tilemap`

| Área | Conteúdo | Conexões |
|---|---|---|
| Área de pouso | Nave, abrigo, painel solar, antena, oxigênio, suprimentos e minérios | Leste → mineração |
| Bacia de mineração | Ferro, cristais, extratores, rover e energia | Oeste → pouso; leste → pesquisa |
| Cratera de pesquisa | Amostras, depósitos, instalações e recursos científicos | Oeste → mineração |

- Três mapas de 24 × 16 tiles, com tiles de 32 pixels; cada área mede 768 × 512 pixels.
- Arte PNG, terrenos, sprites, versões Tiled JSON/TMX, tilesets TSX e arquivo de mundo.
- Manifesto com posições dos objetos, máscara de colisão, spawns e transições.
- Integração usa os PNGs compostos dos mapas como cenário e os dados do manifesto para colisões, interações e passagens. Não é um editor de mapas nem um importador Tiled completo.
- Começo junto à nave pelo ponto inicial fornecido pelo pacote.
- Travessia automática das passagens laterais, com entrada no lado correto e possibilidade de retorno.
- A área de pouso substitui Meridiani como destino do lançamento.

Consulte [a documentação do pacote](static/assets/marte_tilemap/LEIA-ME.md) para estrutura, paleta, origem dos assets e restrições de redistribuição. Não presumir que toda a coleção tem a mesma licença.

### Cinco regiões procedurais preservadas

O atlas anterior continua disponível no seletor de regiões: Meridiani Planum, Dunas de Purgatory, Cratera Victoria, Borda de Endeavour e Perseverance Valley.

- Cada região possui 128 × 92 tiles, totalizando 58.880 tiles e 53 interações nos cinco mapas originais.
- Cenários determinísticos com crateras, dunas, rochas e pontos científicos.
- Climas e efeitos visuais, incluindo poeira e tempestade.
- Missões simplificadas de análise e comunicação, com progresso consultável pela API.
- Locais inspirados na missão Opportunity; distâncias e instalações são fictícias para gameplay.

Esses números descrevem somente os cinco mapas procedurais. Os três mapas do pacote de pouso são adicionais.

### Protótipos e materiais existentes fora do fluxo principal

- `static/opportunity-game`: jogo narrativo anterior sobre o rover Opportunity, com capítulos, diálogos, cenas e atividades de fotografia, análise espectral, planejamento de rota, recuperação de atolamento e orçamento energético de um sol.
- Esses minijogos existem no código, mas não estão integrados ao fluxo atual menu → laboratório → mapas. São candidatos a reaproveitamento pedagógico.
- `static/opportunity-map-engine` e `static/opportunity-map-engine-v2`: versões e exemplos da engine de mapas. O laboratório usa módulos da versão v2.
- `static/assets/Animations`: animações e demos, incluindo câmera POV e modelos 3D aprimorados.
- `docs/Engine_3D_Threejs.docx`: material de documentação presente no repositório; seu conteúdo não foi usado como evidência de funcionalidades nesta revisão.

## Rotas e estrutura

| Rota | Função |
|---|---|
| `/` e `/main-menu/` | Menu inicial |
| `/game` | Redireciona ao menu |
| `/lab-training/` | Preparação e treinamento |
| `/mars-test/` | Exploração; retoma região salva quando válida, ou inicia no pouso |
| `/mars-test/?world=mapa_01_pouso` | Início explícito na área da nave; destino do lançamento |
| `/mars-test/?world=mapa_02_mineracao` | Acesso direto à mineração para desenvolvimento |
| `/mars-test/?world=mapa_03_pesquisa` | Acesso direto à pesquisa para desenvolvimento |
| `/map-engine-v2/` | Exemplo e módulos da engine v2 |
| `/assets/` | Arquivos de arte, mapas, áudio e animações |
| `/vendor/three/` | Build local da dependência Three.js |

```text
server.js                          Servidor Express e rotas estáticas
package.json                       Dependências e comandos
Dockerfile / compose.yaml          Execução em contêiner
static/main_menu/                  Menu e identidade visual
static/lab_training/               Treinamento e instrumentos
static/opportunity-mars-five-worlds/ Exploração e menus
  js/map-data.js                   Cinco mapas procedurais
  js/tilemap-data.js               Adaptação do manifesto dos mapas novos
  js/engine.js                     Movimento, colisões e travessia
  js/renderer.js                   Renderização Canvas 2D
  js/controls.js                   Teclado e toque
  js/app.js                        Inicialização, ações e persistência
static/assets/marte_tilemap/        Arte e dados das três áreas conectadas
static/assets/Animations/           Engine e cenas 3D
static/opportunity-game/           Protótipo narrativo anterior
tests/                             Testes automatizados do projeto
docs/                              Material complementar
```

Tecnologias: JavaScript no navegador, HTML/CSS, Canvas 2D, Three.js nas partes 3D, Node.js e Express no servidor. Não há banco de dados nem serviço de contas implementado.

## Controles e dados salvos

No laboratório: WASD/setas movem; E interage; M abre o mapa; Tab abre a mochila; os atalhos 1–4 selecionam instrumentos conforme o contexto do tutorial. Consulte [o README do treinamento](static/lab_training/README.md) para os detalhes.

Na exploração: WASD/setas movem; E/espaço inspecionam; Esc fecha interação ou menu e, durante a exploração, pausa; P alterna a pausa; M abre o seletor de regiões. As passagens entre balizas funcionam ao caminhar sobre elas. No celular, há botões sobre o mapa.

As preferências ficam em `opportunity.labTraining.settings`, o perfil em `opportunity.labTraining.profile`, e a exploração em `opportunity_mars_atlas_progress_v1`, no `localStorage` do navegador. Não há sincronização entre dispositivos. A mochila do treinamento e seu progresso não constituem um save completo de campanha. O inventário do laboratório ainda não é transferido como inventário unificado para a exploração.

## Distância entre o protótipo e o desafio

| Requisito do desafio | O que existe | O que falta |
|---|---|---|
| Estudantes administram uma base | Cenários, equipamentos e navegação | Estado de base, população, construção, operação e evolução |
| Suporte de vida | HUD e recursos representados | Consumo de O₂/água, reciclagem, capacidade e consequências de escassez |
| Proteção contra radiação | Ambientação espacial | Dose, exposição, abrigo, blindagem e custos de proteção |
| Energia | Medidor do rover, recarga e atividade antiga de orçamento | Produção/consumo da base, armazenamento, noite e prioridades |
| Produção de alimentos | Indicador visual de alimentação | Estufa, ciclos de cultivo, consumo de água/energia e colheita |
| Escolhas concorrentes | Algumas ações têm custos locais | Recursos compartilhados e decisões que alteram vários sistemas |
| Sucesso ou fracasso | Progresso de tutorial e descobertas | Metas da missão, falhas explicáveis, recuperação e encerramento |
| Aprendizado acessível | Briefings e instrumentos guiados | Explicações causais, dificuldade calibrada e avaliação com estudantes |

## Plano para chegar ao objetivo

### 1. Definir a missão e construir o ciclo mínimo

Proposta inicial: sobreviver por uma sequência curta de sóis em Marte com uma pequena tripulação, mantendo a base operacional e cumprindo um objetivo científico. A faixa etária, duração da sessão, tamanho da tripulação, quantidade de sóis e metas ainda precisam ser definidos e testados.

- Criar um estado central de missão: tempo, população, inventário, instalações, recursos e objetivos.
- Fazer um sol avançar por ação explícita ou por tempo controlado; permitir pausa para planejar.
- Implementar o ciclo: observar reservas → escolher prioridades → construir/operar → avançar tempo → ver consequências → ajustar.
- Unificar laboratório, mochila, exploração e base no mesmo progresso de campanha.

Critério de conclusão: o jogador faz uma escolha de alocação, avança o sol e identifica claramente seu efeito nos recursos e na sobrevivência.

### 2. Integrar energia e suporte de vida

- Painéis solares com geração por período e condição ambiental.
- Baterias com capacidade, carga e descarga limitadas.
- Consumidores com prioridades: suporte de vida, estufa, pesquisa, extração e manutenção.
- Estoques e taxas de produção/consumo de oxigênio e água; reciclagem com custo de energia.
- Consumo da tripulação, capacidade dos equipamentos e avisos de autonomia restante.
- Escassez com consequências graduais e opções de recuperação.

Critério de conclusão: energia destinada a um sistema deixa de estar disponível para outro; o jogador consegue antecipar essa consequência antes de confirmar.

### 3. Adicionar alimentos, radiação e construção

- Estufa com plantio, crescimento, colheita e reservas alimentares.
- Cultivos dependentes de água, energia e tempo.
- Exposição à radiação por atividade e localização, com alertas e abrigos.
- Blindagem e estruturas com custo em materiais, energia, manutenção e tempo.
- Construção e reparo com regras de posicionamento, capacidade e degradação.
- Extração e coleta alimentam o inventário da base e suas decisões de expansão.

Critério de conclusão: existem escolhas viáveis entre ampliar produção, aumentar segurança e preservar reservas; nenhuma melhoria é gratuita ou sempre a melhor opção.

### 4. Tornar as decisões tangíveis e divertidas

- Mostrar previsões antes de decidir e comparações depois: “água para 2 sóis”, “estufa sem energia à noite”, “abrigo reduz a exposição”.
- Explicar consequências com frases curtas e animações no cenário.
- Oferecer eventos com resposta possível: poeira, falha de equipamento, atraso de suprimentos ou alerta de radiação.
- Reaproveitar os minijogos científicos existentes quando eles afetarem a missão.
- Introduzir os sistemas aos poucos, com dificuldade ajustável e retorno rápido após erros.
- Manter a exploração em tela cheia; abrir informações de gestão sob demanda, sem restaurar o painel permanente removido.

Critério de conclusão: em uma sessão curta, o estudante consegue explicar uma escolha, seu custo e o motivo do resultado.

### 5. Validar ciência, experiência e entrega

- Definir unidades e escalas consistentes; documentar simplificações e distinguir modelo educativo de simulação de engenharia validada.
- Revisar parâmetros e relações causais com referências técnicas e apoio de educadores.
- Implementar sucesso/fracasso de missão com relatório das decisões e oportunidade de tentar novamente.
- Testar com o público-alvo: compreensão, tempo de sessão, diversão, dificuldade e legibilidade.
- Completar tradução, navegação por teclado, contraste, descrições acessíveis e testes de toque.
- Criar save versionado de campanha e recuperação de dados inválidos.
- Verificar desempenho em computadores escolares e celulares, dependências offline e licenças dos assets.
- Preparar demo reproduzível e guia de apresentação do desafio.

Critério de conclusão: uma missão completa pode ser jogada do início ao fim, com escolhas reais entre os quatro sistemas do desafio e evidências de aprendizado observadas em testes com estudantes.

## Testes e limites de validação

```powershell
npm test
node static/opportunity-mars-five-worlds/tests/worlds.test.cjs
node static/opportunity-mars-five-worlds/tests/renderer.test.cjs
```

Os testes cobrem engine de animação, descarte de recursos 3D, câmera, modelos procedurais, preferências, progressão do tutorial, acessibilidade dos percursos e as transições dos mapas novos. Os testes próprios do atlas original verificam os cinco mundos e executam a renderização com Canvas simulado.

Essas verificações não substituem testes visuais em navegador, avaliação em aparelhos reais, revisão científica ou testes pedagógicos. A última tentativa de inspeção visual automatizada no Firefox foi interrompida por uma limitação da ferramenta de controle do navegador; não apresentar a aparência final como visualmente homologada.

## Próxima entrega recomendada

Uma missão curta na área da nave com painel de gestão sob demanda, produção solar, bateria, água e oxigênio consumidos por sol, uma estufa básica e um abrigo contra radiação. O objetivo é provar o ciclo de decisões do desafio antes de ampliar quantidade de mapas, cenários ou animações.
