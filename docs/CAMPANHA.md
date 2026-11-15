# Campanha: O legado de Opportunity

Implementação de 15/11/2026. A avaliação recebida foi usada como referência de produto. A entrega fecha uma missão curta jogável; não representa homologação científica, pedagógica ou visual.

## Jornada

Menu → nome/traje/capacete → navegação e quatro instrumentos → mochila → Centro de comunicação → relatório e briefing MER-B → lançamento 3D → interior da nave → escotilha → base/expedição → relatório final → embarque → resultado persistente.

### Interface infantil e sobrevivência contínua

A interface principal foi adaptada para crianças de 7 a 12 anos e refatorada a partir da referência de mochila fornecida: fundo azul-escuro, bordas ciano com relevo pixelado, barras segmentadas e slots com imagens locais. A missão destaca personagem/status/próximo objetivo; a base separa Cuidar, Construir, Horta e Energia. Custos são chips de recurso, com nome acessível para leitores de tela. Mochila, mensagens, interações, mapa, pausa e retorno compartilham o tema. Textos extensos, registros, créditos e números técnicos ficam em detalhes ou telas secundárias. As medalhas têm uma tela própria.

`js/ui-components.js` concentra ícones, medidores acessíveis e slots; `css/pixel-ui.css` aplica o tema e as adaptações para telas menores. Os testes verificam que a navegação entre grupos não consome recursos, que as barras acompanham a LIFE e que a missão completa continua executável com as ações novas. A inspeção da versão atual no navegador ficou bloqueada pela conexão à prévia local; a página disponível na porta 3000 ainda apresentava a versão anterior. Adequação de leitura, aparência e diversão precisam de conferência no navegador atualizado e com crianças.

A LIFE é ativada automaticamente na chegada, com uma etapa de ativação já concluída. Durante a exploração, a cada 20 segundos o mesmo motor executa um tick: consome água, oxigênio e comida, distribui energia, progride trabalhos/cultivos e processa eventos/mensagens. Isso funciona no interior e em todos os mapas externos. O HUD lê o estado real, sem medidores nominais ou reservas paralelas. Pausa, painel de planejamento, inspeção e aba oculta suspendem a simulação; não há consumo offline. O restante do relógio é salvo. A API `window.lifeManagement` também aponta para essa campanha em Marte.

O interior é um mapa de 26 × 18 tiles, com piso transitável, colisões, painel, descanso, caixa de emergência de uso único e porta. A nave externa permite voltar ao interior. Não é uma sobreposição visual do mapa externo. A nave oferece proteção abstrata de 65% durante o alerta; sair para o exterior remove essa proteção. Caminhar para longe do habitat também remove o estado de abrigo.

NOVA orienta a missão. A recuperação de arquivos é ficção explícita. Não se afirma que o Opportunity voltou a transmitir, que o cenário reproduz sua localização histórica ou que o gelo desenhado demonstra uma reserva real.

O treinamento exporta nome, quatro registros e fotografia para a primeira campanha. A gestão opcional de treinamento permanece um exercício separado: suas reservas não são importadas para o cenário marciano, que inicia com os estoques de desembarque. Uma campanha já existente continua disponível pelo menu; refazer o treinamento não apaga uma expedição em andamento.

## Estado e comandos

- `LIFE/engine.js` é a única autoridade de recursos, reservas, energia, atividades, exposição e mensagens.
- `campaign.js` cria uma configuração isolada a partir do cenário LIFE, controla objetivos, decisões, metadados e encerramento.
- `campaign-ui.js` conecta os objetos do mapa, o painel sob demanda, os setores e o armazenamento.
- A energia simplificada antiga da exploração não participa da campanha; caminhar não consome um contador paralelo.
- Tarefas reservam custos ao iniciar e os consomem ao concluir. Cancelar libera os custos ainda reservados; os consumos de suporte vital já ocorridos permanecem.
- A previsão usa uma cópia restaurada da própria LIFE e não altera o save real.

Cada comando é atômico e versionado. Recursos coletados no mapa são finitos e identificados por objeto. Construções únicas e arquivos recuperados não podem ser duplicados.

## Escala de jogo e relações causais

Um sol **de jogo** contém 16 passos: 12 iluminados e quatro noturnos. O limite de campanha é 96 passos; cumprir o tempo sozinho não vence. É preciso completar os oito objetivos, voltar à nave e registrar uma escolha e sua consequência.

O número de minutos herdado do cenário é metadado de simulação, não uma conversão científica para o sol marciano. Estoques, produção, dose, tempos de construção e cultivo são unidades abstratas de balanceamento. Não são parâmetros de engenharia, exposição humana ou agricultura validados.

| Sistema | Implementação |
|---|---|
| Solar | 12 unidades por passo iluminado, multiplicadas pela condição dos painéis e pela poeira; zero à noite |
| Bateria | Capacidade de 48; recebe excedente e cobre demandas. Energia reservada por uma tarefa fica protegida |
| Distribuição | Consumidores por prioridade numérica; prioridades menores atendidas primeiro, sem fornecimento parcial |
| Água | Consumo da equipe e da produção de O₂; recuperação parcial como água usada; reciclagem de 10 → 9 com energia |
| Ar | Consumo/produção de O₂ e CO₂ separado; filtro quebrado acumula CO₂ mesmo com reserva de oxigênio |
| Agricultura | Alface, batata e tomate; custos, tempo e rendimento distintos; crescimento exige energia, falta de água perde o cultivo |
| Abrigo | Reforço custa oito materiais e quatro passos; proteção de 80% exige ocupar o abrigo |
| Setores | Comunicação, estufa, laboratório, dormitório e reforço do habitat; plataformas livres no mapa de pouso |
| Manutenção | Limpeza restaura painéis; reparo do filtro usa uma peça; dormitório reduz descanso de seis para três passos |
| Ciência | Amostra AM-01 com origem/material, comparação de picos de espectro ilustrativo e ensaio dependente de energia no laboratório |
| Comunicação | Dois passos de ida, um de processamento, dois de volta; interrupção pode atrasar a entrega |

A atividade APXS reaproveita a ideia de comparação dos picos do protótipo narrativo, com um padrão local determinístico. Não importa dados espectrais reais. A conclusão é uma hipótese que exige outras evidências; não uma identificação automática de água ou vida.

## Eventos anunciados

- Poeira: passos 12–19; geração a 30%, incluindo o ciclo noturno. No passo 20, o céu melhora e os painéis ficam com condição de 65% até a limpeza.
- Filtro: aviso no passo 24 e falha no 26.
- Radiação: passos 32–36. Exposição é abstrata e cumulativa; permanecer sem proteção pode interromper a missão.
- Comunicação: canal indisponível nos passos 40–42; restabelecido no 43.

A limpeza custa trabalho externo e tempo, permitindo recuperação mesmo sem carga na bateria. Não remove a poeira suspensa. A limpeza e a análise podem exigir reorganizar a fila de tarefas: cancelar uma análise sem energia libera a equipe para manutenção.

## Percurso reproduzível de demonstração

Este percurso contém spoilers e é usado nos testes. Avance exatamente a duração indicada; durante cada espera, acompanhe a previsão.

1. Começar dentro da nave, já no passo 1 com a LIFE ativa. Sair pela porta verde. Para reproduzir exatamente os passos seguintes, usar o planejamento e as ações de ajuda; caminhar também avança o relógio em tempo de jogo.
2. Construir estufa (3), plantar alface (1), montar comunicação (2).
3. Na antena, estabelecer enlace (1); opcionalmente enviar situação.
4. Reforçar abrigo (4), construir laboratório (3).
5. Extrair amostra de um minério (2). Em Ciência, identificar Silício e Ferro como os dois maiores picos e registrar a comparação.
6. Aguardar até o passo 20, limpar painéis (2), colher (1), analisar amostra (3).
7. Reparar filtro (4), ocupar abrigo (1). Aguardar até o passo 37.
8. Reciclar água (2). Na mineração, recuperar arquivos do rover (3).
9. Enviar relatório final e aguardar pelo menos cinco passos. A interrupção pode prolongar mensagens enviadas em outro momento.
10. Voltar à nave de pouso, preencher a reflexão e confirmar embarque.

Não é necessário coletar todos os suprimentos para vencer. O inventário de campo permite estratégias alternativas e recuperação de erros. As outras regiões continuam acessíveis pelo atlas.

## Assets e licenças

NOVA usa as 12 imagens originais do arquivo `assistente-pixel-art.zip`, em `static/assets/assistant`. O componente compartilhado acompanha preparação, instruções do laboratório, câmera científica, lançamento e mensagens da LIFE. Em Marte, fica no mapa, no painel de missão ou na inspeção ativa, evitando sobrepor dois balões. Eventos ficam visíveis por sete segundos antes de voltar ao objetivo; o objetivo permanece disponível. Recolher/reler instruções não executa comandos de jogo nem avança o relógio. Mensagens idênticas não reiniciam a animação; reduzir movimento mantém uma imagem estática. Não há geração de respostas ou serviço externo em tempo de jogo.

`npm run assets:catalog` gera `static/assets/catalog.json`, com caminho de arquivo e URL pública. Todos os arquivos de `static/assets`, arquivos das demais pastas de assets e mídias avulsas em `static` são inventariados. A interface pagina o catálogo para evitar carregar centenas de imagens durante a exploração.

Mapas e estruturas usam `marte_tilemap`; o astronauta usa o atlas direcional `static/assets/astronaut/explorer-v2.png`, gerado com ImageGen a partir da referência do usuário, com sprites Space Runner preservados como fallback. O leitor de frames é compartilhado com o laboratório. A interface usa o HUD existente; culturas usam os estágios de `growing_plants` e os vegetais de `250 pixel Veggie`. Agricultura, variações, áudio, imagens de menu, referências e cenas ficam consultáveis no acervo. As animações de preparação e lançamento continuam no fluxo principal. O protótipo narrativo e as demos antigas são preservados como código de referência, sem compartilhar seus contadores antigos com a campanha.

Catálogo não altera licenças. Space Runner é declarado CC0; o tilemap documenta referências com condições diferentes. Não se afirma que o conjunto inteiro pode ser redistribuído isoladamente. Consulte os arquivos de origem no acervo antes de uma publicação externa.

## Save e recuperação

- Campanha: `opportunity.campaign.v1`, com estado LIFE completo e metadados.
- Transferência do treinamento: `opportunity.training.handoff.v1`.
- Perfil/preferências: chaves anteriores mantidas.
- Atlas antigo: preservado como exploração legada; não transforma descobertas antigas em objetivos concluídos da campanha.

O save guarda posição, mundo, atividades, reservas, amostra, mensagens, decisões, resultados de treino e resultado final. Relatórios permite exportar/importar JSON. Saves inválidos são recusados; o conteúdo anterior fica preservado até uma ação explícita de salvar a nova tentativa ou reiniciar. Falha de armazenamento é comunicada e permite exportação manual. Não há nuvem nem conta de usuário.

## Validação e pendências de homologação

Testes automatizados cobrem a sequência completa pelo controlador e pelos comandos da interface, reservas, prioridades, dia/noite, cultivo, radiação, coleta única, previsão sem mutação, persistência, recuperação de save inválido, relatório de treinamento e navegação. O teste de interface usa um DOM de teste e o bootstrap real; não mede CSS, WebGL ou desempenho de navegador.

Nesta entrega, a inspeção visual foi bloqueada: o navegador integrado não acessou o servidor local e a ferramenta recusou controlar o Firefox por falta de suporte à política de URLs. As verificações HTTP também foram impedidas por restrição de sockets do ambiente. Não há homologação visual em desktop/celular nem prova de funcionamento offline integral de todas as demos.

Ainda exigem avaliação humana: compreensão e diversão com estudantes, duração/dificuldade da sessão, revisão científica, aparelhos físicos, tradução integral da campanha (atualmente em português) e auditoria das licenças. Nenhum conjunto externo do pipeline de dados foi baixado ou apresentado como validado.
