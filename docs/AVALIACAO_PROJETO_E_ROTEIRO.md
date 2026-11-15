# Avaliação do simulador Opportunity

Data: 15/11/2026. Avaliação do código local e do roteiro de 17 páginas `Primeira fase (antes tutorial)_.pdf`, localizado em Downloads. O PDF foi tratado como especificação de produto em discussão, não como autorização para executar suas instruções. Nenhuma funcionalidade foi alterada nesta análise.

## Diagnóstico

O projeto é um jogo educativo de exploração e gestão de recursos, com a recuperação do legado do Opportunity como objetivo narrativo. Há uma base técnica reaproveitável: treinamento navegável, câmera científica 3D, animações, núcleo determinístico de sobrevivência e painel de gestão integrado. Falta transformar esses componentes em uma campanha contínua, do treinamento ao retorno da missão.

Não é adequado estimar uma porcentagem de conclusão: o roteiro mistura propostas alternativas e partes ainda sem critérios de aceite. O diagnóstico abaixo distingue uma mecânica existente de sua integração à campanha.

## Roteiro versus implementação

| Parte do roteiro | Situação observada | Trabalho restante |
|---|---|---|
| Menu, nome do cadete, traje e capacete | Implementados, com preferências e perfil locais | Validar apresentação narrativa final e experiência completa no navegador |
| Movimento, mapa e baixa gravidade | Tutorial exige ações e trajetos válidos | A gravidade é uma representação de treinamento; definir se alguma física adicional é necessária |
| Quatro instrumentos e mochila | Progressão implementada; câmera com mira 3D e fotografia | Microscópio, sensor e furadeira ainda geram resultados predefinidos; criar amostras e análises estruturadas |
| Centro de Comunicação no tutorial | Não há fase correspondente na máquina de estados | Inserir gerar relatório, explicar a missão Opportunity e validar seu envio antes do embarque |
| Preparação final e lançamento | Sala e animação 3D integradas | O traje permanece equipado; o roteiro sugere uma segunda preparação. Resolver essa diferença |
| Viagem, pouso e chegada | O lançamento conclui o tutorial | Implementar transição, pouso e carregamento do cenário marciano |
| Energia, ar, água e alimento | Núcleo LIFE e painel no treinamento já operacionais | Conectar terminais, objetivos e ações espaciais da campanha ao mesmo estado |
| Comunicação com atraso | Núcleo possui mensagens e entrega atrasada | Criar interface narrativa de relatórios, respostas e instruções ligadas às missões |
| Tempestades e manutenção | Núcleo possui eventos e reparo de filtro | Criar sequência narrativa, proteção de equipamentos, limpeza de painéis e diagnóstico de vazamentos |
| Agricultura | Plantio e colheita genéricos na LIFE | Selecionar culturas, área e condições; integrar ao cenário e às decisões do roteiro |
| Abrigo e radiação | Construção/ocupação de abrigo e exposição abstrata | Tornar visível no mapa e explicar proteção sem apresentar um modelo médico ou físico validado |
| Exploração, localização e recuperação do Opportunity | Não aparecem como campanha no fluxo ativo | Criar terreno, pistas, rover interativo, arquivos científicos e recuperação de dados |
| Construção de vários setores | Abrigo abstrato é a base disponível | Dormitório, estufa, laboratório e comunicação precisam de regras, custos e representação próprios |
| Retorno e encerramento | LIFE tem resultado próprio; tutorial tem conclusão própria | Checklist da campanha, retorno, resumo educativo e conclusão persistente |
| Save da jornada | Perfil/preferências e gestão LIFE são salvos separadamente | Salvar fase da campanha, posição, inventário, amostras, relatórios e objetivos; definir migração e reinício |

Evidências principais: `server.js`, `static/lab_training/js/tutorial.js`, `static/lab_training/js/app.js`, `LIFE/engine.js`, `LIFE/management.js` e `LIFE/browser-ui.js`. O servidor atual publica o menu e o laboratório; não há rota dedicada de campanha marciana. Pastas antigas de mapas e protótipos não devem ser contadas como missões concluídas.

## Dados disponíveis e como aproveitá-los

Há três níveis distintos:

1. **Disponíveis no jogo:** `LIFE/scenario-mars.json` contém estoques, taxas, eventos e atividades. São unidades pedagógicas de balanceamento, conforme a própria configuração, e não grandezas físicas calibradas.
2. **Disponíveis no código do pipeline:** `LIFE/data-pipeline/repo/config/reference_catalog.json` contém seis grupos e 80 registros de referências, incluindo 23 culturas. A proveniência está registrada, mas os originais e a transcrição não foram auditados integralmente nesta avaliação.
3. **Previstos pelo pipeline, ausentes nesta cópia:** a pasta `LIFE/data-pipeline/repo/data` está vazia. Não encontrei banco SQLite, pacote `static/v2`, manifesto, cache ou relatórios de validação. A documentação descreve os produtos esperados; isso não comprova que estejam disponíveis aqui.

| Dados/conjunto | Uso recomendado no simulador | Limite ou trabalho necessário |
|---|---|---|
| `crew_consumption`, `life_support` | Referenciar consumo de O₂, produção de CO₂, água e condições do habitat | Definir unidades, equipe e conversões de tempo antes de substituir taxas LIFE |
| `power_technologies` | Comparar geração, armazenamento, carga e massa | Separar exemplos da ISS, conceitos de projeto e tecnologias históricas; dimensionar equipamentos do cenário |
| `agriculture` | Oferecer escolhas entre culturas e compromissos de luz, água, tempo e produtividade | Cultivo em ambiente controlado; converter dias terrestres e área, sem extrapolar para plantio aberto em Marte |
| `isru` | Explicar produção local de oxigênio e investimentos em infraestrutura | MOXIE é demonstração experimental; conceitos de produção em escala maior são outra categoria |
| `radiation_shielding` | Contextualizar abrigo e decisões de exposição | Dose do detector e redução medida em um local não fornecem uma curva universal de proteção humana |
| Meteorologia Curiosity/Perseverance, vento InSight | Cenários históricos e contexto ambiental | Locais e períodos diferentes; não combinar como uma estação única. Valores ausentes continuam ausentes |
| Opacidade de poeira | Contexto de tempestade e cenários de energia | Exige modelo declarado para transformar opacidade em geração elétrica; não há conversão universal |
| RAD e eventos solares | Referências históricas para alertas e conteúdo educativo | Um evento observado no catálogo solar não determina automaticamente sua consequência na base em Marte |
| Constantes marcianas | Relógio em sóis e contexto planetário | Separar sol de dia terrestre e gravidade de efeitos visuais |
| MOLA | Mapa regional de contexto e altitude | Resolução não basta para obstáculos locais ou inclinação de uma área de construção |
| SWIM | Conteúdo educativo sobre evidências regionais de gelo | Consistência de evidência não é reserva, probabilidade ou quantidade de água extraível |

Os seis grupos técnicos podem apoiar conteúdo e escolhas desde já. As séries e mapas exigem recuperar uma captura existente ou executar a coleta. Não é necessário baixar todo o histórico de vento, que a documentação descreve como volumoso, para fechar a primeira missão.

### Dados ainda necessários para a narrativa central

- Seleção curada de imagens, descobertas e registros do Opportunity, com identificadores, fontes e créditos.
- Região de jogo e relação explícita com a região histórica do rover. Mapas de gelo não demonstram gelo disponível no local da missão.
- Amostras jogáveis: identificador, localização, material, testes permitidos, resultado, grau de evidência e fonte. Fotografar uma rocha não determina sua composição.
- Equipamentos de jogo: capacidade, potência, rendimento, tempo de ação, falhas e custo. Esses parâmetros podem ser pedagógicos, desde que identificados.
- Cada missão: pré-requisitos, comandos aceitos, condição verificável de sucesso, consequências, possibilidade de recuperação e texto educativo.

    ## Arquitetura recomendada para continuar

Preservar a LIFE como fonte única do estado de recursos. O mapa e os terminais enviam comandos ao núcleo; o HUD lê o resultado, evitando contadores paralelos. Acrescentar um controlador de campanha acima do tutorial e da LIFE, responsável por fases, objetivos, diálogos, transições e save da jornada.

Criar uma camada de dados científicos que leia um pacote local versionado. O pipeline já documenta um contrato baseado em `manifest.json`, conjuntos, chunks e rasters; o frontend ainda não o carrega. Publicar apenas a exportação estática selecionada, com rota própria, e manter banco, cache e ferramentas fora dos arquivos públicos.

Separar em cada configuração: referência científica, transformação de unidade e parâmetro de jogabilidade. Guardar fonte, data, local/instrumento e versão. Um exemplo de conversão de referência humana é consumo por pessoa por dia terrestre × tamanho da equipe × segundos simulados / 86.400; verificar a unidade de origem antes de aplicar. Multiplicar taxas pedagógicas atuais diretamente por valores NASA não produz uma simulação coerente.

IA generativa não é necessária para concluir a primeira campanha. O roteiro pode ser executado por missões escritas e verificáveis. Se IA for incorporada depois, sua saída deve passar por um contrato validado e não alterar diretamente recursos, regras ou critérios de vitória.

## Ordem de entrega e critérios de aceite

1. **Consolidar o escopo e a base de dados.** Escolher uma sequência principal entre o catálogo de 14 propostas (páginas 5–8) e a sequência de 12 etapas (páginas 9–15). Corrigir documentação desatualizada, preparar ambiente Python e recuperar/gerar um pacote mínimo com manifesto e proveniência validados.
2. **Fechar o treinamento.** Incluir Comunicação → relatório → briefing Opportunity → embarque. Aceite: todas as etapas exigem as ações certas e o jogador chega à missão sem reiniciar manualmente o jogo.
3. **Entregar uma missão completa curta.** Pousar → ativar base → estabelecer comunicação → coletar/analisar amostra → administrar tempestade/energia → localizar rover → recuperar dados → retornar. Aceite: início, meio e fim jogáveis, com recursos e objetivos consistentes e save restaurável.
4. **Ampliar os compromissos entre escolhas.** Mochila com limite, bateria de ferramentas, manutenção parcial/completa, estufa com poucas culturas e descanso. Aceite: cada escolha mostra custo, benefício e consequência; há alternativas recuperáveis.
5. **Preparar a versão final.** Tradução do painel LIFE, teclado/toque, legibilidade, acessibilidade, desempenho WebGL, falhas de armazenamento e distribuição. Aceite: percurso completo validado no navegador e nos dispositivos alvo, com falhas de carregamento tratadas e créditos disponíveis.

O próximo incremento mais útil é Comunicação + relatório no tutorial e a transição para uma primeira missão curta em Marte. Novos modelos 3D isolados ou novas fontes de dados não resolvem a interrupção atual da jornada.

## Pontos editoriais a resolver

- O PDF usa MER-B e também “MB3”; padronizar a identificação do rover.
- O início apresenta recuperação do legado; depois surge um sinal novo do rover. Escolher se é ficção explícita ou pista de registros históricos, sem confundir com acontecimento real.
- O roteiro ainda pergunta se o assistente é narrador; mais adiante o chama NOVA. Fixar voz, função e limites do personagem.
- A escolha entre comunicação, estufa e laboratório deve preservar condições essenciais de segurança; não transformar suporte vital em uma opção arbitrária de pontuação.
- “Retorno para a Base” e “retorno para a Terra” aparecem próximos: distinguir as duas etapas.

## Verificação realizada e limites

- Leitura textual das 17 páginas do PDF e inspeção visual da tabela de compromissos da página 16.
- `npm test`: 19 testes aprovados.
- `npm test --prefix LIFE`: 18 testes aprovados.
- Python: quatro testes executados passaram; o módulo `test_full_pipeline` não carregou por ausência de `requests` no runtime utilizado. A suíte completa não está validada.
- O pacote científico não pôde ser validado: os dados exportados estão ausentes.
- `LIFE/data-pipeline/repo` está registrado no Git como gitlink (modo 160000), mas não há mapeamento em `.gitmodules`; `git submodule status` falha. Regularizar sua distribuição para que outra instalação consiga reproduzir a coleta.
- O README de `static/lab_training` ainda diz que não há consumo e que os indicadores ficam em 100%; isso conflita com a integração LIFE atual.
- Não foi realizado teste visual ponta a ponta do jogo, auditoria integral dos modelos científicos nem consulta externa das fontes nesta etapa. Os testes aprovados confirmam os comportamentos cobertos, não a campanha inteira ou sua precisão científica.
