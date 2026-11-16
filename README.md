# Opportunity — O legado de Marte

Jogo educativo de exploração e gestão de uma base marciana. A campanha conecta preparação, treinamento, relatório de comunicação, lançamento 3D, pouso, sobrevivência, ciência, recuperação de arquivos do Opportunity e embarque de retorno.

**Entrega de 15/11/2026:** campanha curta implementada, com sucesso/fracasso e progresso persistente. Os testes automatizados verificam uma missão completa, inclusive os comandos da interface. A apresentação visual e a experiência com estudantes ainda precisam de homologação.

## Executar

Requer Node.js com npm. O Dockerfile utiliza Node 22.

```powershell
npm install
npm run server
```

Abra `http://localhost:3000/`. `PORT` permite escolher outra porta.

```powershell
docker compose up --build
```

`npm start` executa o fluxo Docker. O Compose publica a porta 3000, sem montar o código como volume; alterações exigem reconstruir a imagem.

## Missão jogável

1. Em **Iniciar**, informar o nome, vestir traje e capacete e concluir o treinamento de movimento e quatro instrumentos.
2. Conferir a mochila, seguir ao Centro de comunicação e enviar o relatório de treinamento antes do embarque.
3. Concluir o lançamento para começar **dentro da nave MARS 01**, com suporte vital já ativo. Caminhar até a porta verde e pressionar E para sair à superfície; a nave externa permite entrar novamente.
4. Montar a comunicação. Abrir **B / Base Opportunity** para planejar os cuidados da equipe.
5. Construir estufa, laboratório e proteção; cultivar alimentos, reciclar água, administrar energia e reparar equipamentos.
6. Extrair uma amostra, comparar seu espectro ilustrativo e realizar o ensaio no laboratório.
7. Atravessar os eventos, encontrar o rover na mineração e recuperar seus arquivos.
8. Enviar o relatório final, receber a autorização, voltar à nave e registrar uma escolha e sua consequência para concluir a missão.

Uma expedição salva aparece como **Continuar expedição** no menu. O acesso direto a `/mars-test/` também permite iniciar ou continuar a campanha sem repetir o treinamento.

A narrativa é uma **expedição fictícia** de recuperação do legado MER-B, orientada por NOVA. Não representa um novo sinal real do Opportunity. Os mapas e depósitos de recursos são cenários de jogo.

## Gestão e consequências

- **Fonte única:** todos os estoques da campanha, reservas, atividades e mensagens pertencem à LIFE. A energia simplificada antiga dos mapas não é usada como um segundo saldo.
- **Sobrevivência em todo Marte:** a LIFE é ativada na chegada e avança uma etapa a cada 20 segundos de exploração, dentro da nave e em todas as oito regiões externas. Planejamento, inspeções, pausa e aba oculta suspendem o relógio. É possível ajudar uma tarefa ou aguardar uma etapa pelo painel, com previsão antes da escolha.
- **Interface para 7–12 anos:** tema azul/ciano, bordas pixeladas, avatar, barras em blocos e ações em slots com ícones. A base tem quatro grupos: Cuidar, Construir, Horta e Energia. Custos aparecem em símbolos; missão, mochila, mensagens, mapa, pausa e interações usam o mesmo tema. Medalhas têm tela própria; registros e detalhes abrem sob demanda. A reflexão final aceita uma descoberta escolhida entre três ícones.
- **Assistente NOVA:** as 12 imagens fornecidas no ZIP acompanham instruções em balões azul/ciano, no preparo, treinamento, câmera, lançamento, cuidados LIFE e campanha em Marte. Orientações, descobertas, comemorações e avisos usam variações diferentes. No mapa, × recolhe o balão; tocar na NOVA permite reler. A animação termina após três imagens e respeita a preferência de reduzir movimento. Veja [os arquivos do assistente](static/assets/assistant/README.md).
- **Energia:** geração solar, poeira, noite, bateria e prioridades entre suporte vital, ar, O₂, temperatura, cultivo, pesquisa e reciclagem.
- **Água e ar:** consumo da equipe, recuperação parcial, reciclagem com perda e energia, produção de oxigênio que também exige água, CO₂ e falha do filtro.
- **Agricultura:** alface, batata e tomate têm diferentes custos de água, tempo e rendimento; crescem com energia e podem ser perdidos por falta de água. O crescimento é mostrado com os sprites existentes.
- **Construção:** comunicação, estufa, laboratório, dormitório e reforço do abrigo usam materiais e tempo. Setores aparecem em plataformas livres no pouso.
- **Radiação e manutenção:** abrigo precisa ser ocupado para proteger; painéis precisam de limpeza e filtros de reparo. Descanso reduz fadiga; dormitório reduz sua duração.
- **Ciência:** amostra identificada com origem/material, comparação de dois picos e ensaio dependente de energia. Aparência ou um elemento isolado não comprovam água ou vida.
- **Comunicação:** respostas levam no mínimo cinco passos e podem esperar a restauração do canal.
- **Encerramento:** oito objetivos, retorno à nave, reflexão, relatório das decisões e resultado salvo. Escassez crítica, exposição ou prazo encerram a tentativa com explicação.

O mapa continua em tela inteira. Gestão, ciência, relatórios e acervo abrem sob demanda.

## Mapas e assets

| Área | Conteúdo e conexões |
|---|---|
| Área de pouso | Nave, habitat, energia, antena, suprimentos e plataformas de setores; leste → mineração |
| Bacia de mineração | Ferro, cristais, extratores, rover e reservas; oeste → pouso, leste → pesquisa |
| Cratera de pesquisa | Amostras, depósitos e equipamentos; oeste → mineração |
| Cinco regiões do atlas | Meridiani, Purgatory, Victoria, Endeavour e Perseverance Valley; acessíveis com M |

Os três mapas autorais medem 24 × 16 tiles de 32 px. Os cinco mapas procedurais medem 128 × 92 tiles cada, com 53 interações legadas. Um novo interior caminhável de 26 × 18 tiles foi acrescentado à nave: painel, descanso, caixa de ajuda e escotilha. O total é nove ambientes conectados ao mesmo estado LIFE.

O astronauta usa um novo atlas RGBA com quatro direções e caminhada, gerado a partir da captura fornecida. Laboratório e Marte compartilham o mesmo desenho e leitor de frames; os sprites Space Runner originais permanecem como fallback. Veja [origem e prompt do sprite](static/assets/astronaut/README.md).

O jogo reaproveita mapas e estruturas de `marte_tilemap`, astronauta Space Runner, ícones do HUD, vegetais e estágios de cultivo, áudio, imagens e animações de preparação/lançamento. O acervo permite consultar todos os conjuntos e suas variantes, incluindo agricultura, referências e cenas 3D.

```powershell
npm run assets:catalog
```

Esse comando regenera o catálogo local com arquivos e URLs públicas. As imagens são paginadas e carregadas sob demanda. O catálogo também inclui documentos de origem; não transforma todos os arquivos em mecânicas distintas.

Consulte [origem e licenças do tilemap](static/assets/marte_tilemap/LEIA-ME.md). Space Runner é declarado CC0; os demais conjuntos têm origens e restrições diferentes. Não considerar toda a coleção redistribuível como um pacote independente.

## Controles e progresso

**Treinamento:** WASD/setas movem, E interage, M abre mapa, Tab abre mochila, 1–4 selecionam instrumentos conforme a etapa. Consulte o [README do laboratório](static/lab_training/README.md).

**Marte:** WASD/setas movem, E/espaço interagem, B abre missão/gestão, M abre regiões, Esc fecha painéis ou pausa, P alterna pausa. Há controles de toque e botão visível para abrir a gestão. Transições laterais funcionam ao atravessar as balizas.

O HUD de Marte inclui botões para base, mochila, mensagens, mapa, câmera e pausa, com recursos ligados ao estado LIFE. **1 ou C** abre a câmera 3D na posição do astronauta, dentro da nave e em todas as regiões; **Tab** abre a mochila. Arraste ou use as setas para olhar, ajuste o zoom e use Fotografar para baixar uma imagem. **R** centraliza e **Esc** retorna ao mapa, preservando posição e pausa anterior. A câmera requer WebGL 2 e suspende a simulação enquanto está aberta.

A superfície 3D usa terreno contínuo com relevo e crateras, cascalho, horizonte em camadas, céu em degradê e iluminação adaptada ao dia, à noite e à tempestade. A nave tem modelo próprio; rochas, minerais e crateras conservam sua identidade visual. Setores ainda não construídos aparecem como plataformas, e as estruturas prontas acompanham o estado da campanha. O relevo é ilustrativo, sem correspondência com topografia científica.

| Chave local | Conteúdo |
|---|---|
| `opportunity.campaign.v1` | Estado LIFE, objetivos derivados, posição, setor, amostra, registros, decisões e resultado |
| `opportunity.training.handoff.v1` | Nome, relatório e mochila transferidos pelo treinamento |
| `opportunity.labTraining.profile` | Perfil do cadete |
| `opportunity.labTraining.settings` | Preferências compartilhadas |
| `nasaJourney.life.management.v1` | Exercício opcional de gestão do laboratório, separado das reservas de desembarque |
| `opportunity_mars_atlas_progress_v1` | Progresso legado do atlas |

Relatórios permite exportar/importar o save JSON e iniciar outra tentativa com confirmação. Saves inválidos são recusados e preservados até uma escolha explícita. Não há conta, banco de dados ou sincronização entre dispositivos.

O treinamento transfere seus registros à primeira campanha. Refazer o treinamento preserva uma campanha existente. Os estoques do exercício LIFE do laboratório não são importados: a expedição usa uma configuração própria e identificada de desembarque.

## Rotas e implementação

| Rota | Função |
|---|---|
| `/` e `/main-menu/` | Menu |
| `/lab-training/` | Preparação, treinamento, relatório e lançamento |
| `/mars-test/` | Campanha e exploração |
| `/mars-test/?arrival=1` | Interior da nave, destino do lançamento |
| `/mars-test/?world=mars01_ship_interior` | Acesso direto ao interior |
| `/mars-test/?world=mapa_01_pouso` | Área externa de pouso |
| `/mars-test/?world=mapa_02_mineracao` | Mineração |
| `/mars-test/?world=mapa_03_pesquisa` | Pesquisa |
| `/map-engine-v2/` | Exemplo e módulos compartilhados |
| `/life/` | Somente arquivos de runtime explicitamente permitidos |
| `/assets/` | Arte, áudio, mapas, animações e catálogo |
| `/vendor/three/` | Three.js local |

Arquivos centrais: `LIFE/engine.js`, `static/opportunity-mars-five-worlds/js/campaign.js`, `campaign-ui.js`, `app.js`, `engine.js`, `renderer.js` e `tilemap-data.js`. O servidor Express mantém o pipeline, banco e ferramentas científicas fora da rota LIFE pública.

As versões antigas de engines, o protótipo narrativo em `static/opportunity-game` e as demos 3D são preservados. A atividade de comparação APXS foi adaptada para a campanha; os contadores antigos dos minijogos não alteram as reservas LIFE.

## Verificação e limites

```powershell
npm test
npm test --prefix LIFE
node static/opportunity-mars-five-worlds/tests/worlds.test.cjs
node static/opportunity-mars-five-worlds/tests/renderer.test.cjs
```

Os testes cobrem a missão completa pelo controlador e pela interface em DOM de teste, previsão, prioridades, reservas, cultivo, radiação, dados salvos, recuperação de dados inválidos, relatório do treinamento, navegação e componentes 3D. O DOM e o Canvas simulados não validam aparência, WebGL em aparelhos físicos ou desempenho.

A inspeção visual desta entrega foi bloqueada: o navegador integrado não acessou o servidor local; o controle do Firefox foi recusado pela ferramenta por falta de suporte à política de URLs. As verificações HTTP também encontraram restrição de sockets. **Não apresentar a aparência final ou o comportamento em celulares como homologados.**

Unidades de recurso e exposição, ciclo de sol e tempos de cultivo são parâmetros pedagógicos, sem precisão de engenharia ou médica. Nenhuma série externa do pipeline foi importada como dado validado. A campanha nova está em português; menu e treinamento mantêm sua tradução existente. Algumas demos/fontes têm dependências externas, portanto não há homologação offline integral.

Consulte [a especificação da campanha e o percurso reproduzível](docs/CAMPANHA.md) para regras, balanceamento, limites e pendências de avaliação científica e com estudantes.
